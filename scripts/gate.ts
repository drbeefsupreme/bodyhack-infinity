// Tracking gate: npm run gate [-- --save=<label> --note=<text>] [-- --backend=gpu|swiftshader]
// Serves gate.html with Vite on port 5361, runs it in a separate headless google-chrome (real GPU first, SwiftShader as
// the fallback; audio muted, no camera), writes docs/posing-tutor/gate-report.md and the contact sheet, and exits 1
// when a pass criterion fails. `--save` stores the run under a label in src/posing/gate/snapshots.json (replacing a
// run with the same label); the report compares the current run with every stored run, the first being the baseline.
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';
import type { GateInput, GateOutput, Snapshot } from '../src/posing/gate/criteria.ts';

const ROOT = join(import.meta.dirname, '..');
const PORT = 5361;
const URL = `http://127.0.0.1:${PORT}/gate.html`;
const REPORT = join(ROOT, 'docs/posing-tutor/gate-report.md');
const SHEET = join(ROOT, 'docs/posing-tutor/img/gate-poses.webp');
const SNAPSHOTS = join(ROOT, 'src/posing/gate/snapshots.json');
const SCRATCH = join(tmpdir(), 'bodyhack-gate');
const SHEET_MAX_BYTES = 150 * 1024;
const READY_TIMEOUT_MS = 90_000;
const RUN_TIMEOUT_MS = 10 * 60_000;

const BACKENDS = {
  gpu: ['--use-angle=vulkan', '--enable-features=Vulkan', '--ignore-gpu-blocklist'],
  swiftshader: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} as const;
type BackendName = keyof typeof BACKENDS;
const isBackendName = (s: string): s is BackendName => Object.hasOwn(BACKENDS, s);

interface CdpMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly message: string };
}

interface RemoteObject {
  readonly value?: unknown;
  readonly description?: string;
}

interface EvaluateResult {
  readonly result: RemoteObject;
  readonly exceptionDetails?: { readonly text: string; readonly exception?: RemoteObject };
}

interface Cdp {
  evaluate(expression: string, awaitPromise: boolean, timeoutMs: number): Promise<unknown>;
  close(): void;
}

async function connect(wsUrl: string): Promise<Cdp> {
  const ws = new WebSocket(wsUrl);
  const opened = Promise.withResolvers<void>();
  ws.onopen = () => opened.resolve();
  ws.onerror = () => opened.reject(new Error(`Cannot connect to ${wsUrl}`));
  await opened.promise;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  let nextId = 0;
  ws.onmessage = (event) => {
    const msg = JSON.parse(String(event.data)) as CdpMessage;
    if (msg.id !== undefined) {
      const call = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) call?.reject(new Error(msg.error.message));
      else call?.resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const { type, args } = msg.params as { type: string; args: readonly RemoteObject[] };
      console.log(`[page ${type}]`, args.map((a) => (a.value === undefined ? a.description : String(a.value))).join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const { exceptionDetails } = msg.params as Pick<EvaluateResult, 'exceptionDetails'>;
      console.error('[page exception]', exceptionDetails?.exception?.description ?? exceptionDetails?.text);
    }
  };
  ws.onclose = () => {
    for (const call of pending.values()) call.reject(new Error('The page connection closed.'));
    pending.clear();
  };
  const send = (method: string, params: object): Promise<unknown> => {
    const call = Promise.withResolvers<unknown>();
    const id = ++nextId;
    pending.set(id, call);
    ws.send(JSON.stringify({ id, method, params }));
    return call.promise;
  };
  await send('Runtime.enable', {});
  return {
    async evaluate(expression, awaitPromise, timeoutMs) {
      const timeout = Promise.withResolvers<never>();
      const timer = setTimeout(
        () => timeout.reject(new Error(`Timed out after ${timeoutMs} ms: ${expression.slice(0, 60)}`)),
        timeoutMs,
      );
      try {
        const res = (await Promise.race([
          send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }),
          timeout.promise,
        ])) as EvaluateResult;
        if (res.exceptionDetails) {
          throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
        }
        return res.result.value;
      } finally {
        clearTimeout(timer);
      }
    },
    close: () => ws.close(),
  };
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/** Starts Chrome on `url` and returns it with the DevTools socket of that page. */
async function launch(backend: BackendName, profile: string, url: string): Promise<{ chrome: ChildProcess; page: string }> {
  const chrome = spawn(
    'google-chrome',
    [
      '--headless=new',
      `--user-data-dir=${profile}`,
      '--remote-debugging-port=0',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--window-size=1280,720',
      ...BACKENDS[backend],
      url,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'], detached: true },
  );
  const listening = Promise.withResolvers<string>();
  let log = '';
  chrome.stderr?.on('data', (chunk: Buffer) => {
    log += chunk.toString();
    const match = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(log);
    if (match) listening.resolve(match[1]);
  });
  chrome.once('exit', (code) => listening.reject(new Error(`google-chrome exited with ${code}:\n${log}`)));
  const port = await listening.promise;
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as readonly {
      type: string;
      url: string;
      webSocketDebuggerUrl: string;
    }[];
    const page = targets.find((t) => t.type === 'page' && t.url.startsWith(url));
    if (page) return { chrome, page: page.webSocketDebuggerUrl };
    await sleep(250);
  }
  throw new Error(`No page target for ${url}.`);
}

/** Runs the harness once. Retries when the page reloads, as it does once Vite has optimized its dependencies. */
async function runPage(cdp: Cdp, input: GateInput): Promise<GateOutput> {
  for (let attempt = 1; ; attempt++) {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (!(await cdp.evaluate('typeof window.gate === "object"', false, 5000).catch(() => false))) {
      if (Date.now() > deadline) throw new Error('gate.html did not load.');
      await sleep(250);
    }
    try {
      return (await cdp.evaluate(`window.gate.run(${JSON.stringify(input)})`, true, RUN_TIMEOUT_MS)) as GateOutput;
    } catch (err) {
      if (attempt >= 3 || !/context was destroyed|navigated|closed/i.test(String(err))) throw err;
      console.log('The page reloaded during the run; running it again.');
    }
  }
}

async function gate(backend: BackendName, input: GateInput): Promise<GateOutput> {
  const profile = mkdtempSync(join(tmpdir(), 'bodyhack-gate-chrome-'));
  let chrome: ChildProcess | undefined;
  let cdp: Cdp | undefined;
  try {
    const launched = await launch(backend, profile, URL);
    chrome = launched.chrome;
    cdp = await connect(launched.page);
    return await runPage(cdp, input);
  } finally {
    cdp?.close();
    if (chrome?.pid !== undefined) await stopGroup(chrome.pid);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    } catch (err) {
      console.warn(`Could not remove the Chrome profile ${profile}: ${String(err)}`);
    }
  }
}

const groupAlive = (pid: number): boolean => {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** Stops Chrome and its GPU, renderer and utility processes, which keep writing the profile after the main one exits. */
async function stopGroup(pid: number): Promise<void> {
  for (const signal of ['SIGTERM', 'SIGKILL'] as const) {
    if (!groupAlive(pid)) return;
    process.kill(-pid, signal);
    for (let waited = 0; waited < 5000 && groupAlive(pid); waited += 100) await sleep(100);
  }
}

function writePng(path: string, dataUrl: string): void {
  writeFileSync(path, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const option = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const save = option('save');
  const note = option('note') ?? '';
  const forced = option('backend');
  if (forced !== undefined && !isBackendName(forced)) throw new Error(`Unknown backend ${forced}; use gpu or swiftshader.`);
  const stored = existsSync(SNAPSHOTS) ? (JSON.parse(readFileSync(SNAPSHOTS, 'utf8')) as Snapshot[]) : [];
  const snapshots = stored.filter((s) => s.label !== save);

  const server = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: 'warn',
    cacheDir: 'node_modules/.vite-gate',
    server: { port: PORT, strictPort: true, host: '127.0.0.1' },
    optimizeDeps: { entries: ['gate.html'] },
  });
  await server.listen();
  let out: GateOutput;
  try {
    try {
      out = await gate(forced ?? 'gpu', { snapshots });
    } catch (err) {
      if (forced !== undefined) throw err;
      console.error(`The GPU run failed (${String(err)}); running on SwiftShader.`);
      out = await gate('swiftshader', { snapshots });
    }
  } finally {
    await server.close();
  }

  mkdirSync(SCRATCH, { recursive: true });
  const sheetPng = join(SCRATCH, 'gate-poses.png');
  writePng(sheetPng, out.sheet);
  writePng(join(SCRATCH, 'gate-faults.png'), out.faultSheet);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', sheetPng, '-c:v', 'libwebp', '-quality', '82', SHEET]);
  const sheetBytes = statSync(SHEET).size;
  if (sheetBytes > SHEET_MAX_BYTES) console.warn(`The contact sheet is ${sheetBytes} bytes, over ${SHEET_MAX_BYTES}.`);
  if (save !== undefined) {
    const at = stored.findIndex((s) => s.label === save);
    const entry: Snapshot = { label: save, note, run: out.run };
    const next = at < 0 ? [...stored, entry] : stored.map((s, i) => (i === at ? entry : s));
    writeFileSync(SNAPSHOTS, `${JSON.stringify(next, null, 1)}\n`);
  }
  writeFileSync(REPORT, out.report);
  writeFileSync(join(SCRATCH, 'gate-run.json'), JSON.stringify({ run: out.run, trace: out.trace }, null, 1));

  const { renderer, software, delegate } = out.run.backend;
  console.log(`Backend: ${software ? 'SwiftShader' : 'GPU'} (${renderer}), MediaPipe on the ${delegate}.`);
  console.log(`Wrote ${REPORT}${save === undefined ? '' : ` and snapshot "${save}" in ${SNAPSHOTS}`}, ${SHEET} (${sheetBytes} bytes); fault sheet in ${SCRATCH}.`);
  for (const f of out.failures) console.log(`FAIL ${f}`);
  console.log(out.failures.length === 0 ? 'Tracking gate: PASS' : `Tracking gate: FAIL (${out.failures.length})`);
  return out.failures.length === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err);
    process.exit(2);
  },
);
