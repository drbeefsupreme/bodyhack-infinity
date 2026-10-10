// Seeds a scratch photo store with a fake progress history, so the progress views can be checked without a camera:
// 3 poses x 6 dates, the figure rendered by shot.html in headless Chrome (a little leaner on every date), landmarks
// from the real MediaPipe model on each render, rising scores and the pose spec's own cues as faults.
//
//   BODYHACK_DATA_DIR=/tmp/bodyhack-seed bun scripts/seed-progress.ts [--app http://localhost:5173] [--chrome google-chrome]
//
// Needs the dev server (`npm run dev`) at --app and the MediaPipe assets (`npm run mediapipe`). Refuses the real data
// directory. Re-running replaces the seeded poses' photos.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { join, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { DEFAULT_DATA_DIR, deletePhotos, photosDir, savePhoto } from '../server/photos.ts';
import { parsePhotoRequest } from '../server/validate.ts';
import type { Landmark } from '../src/posing/landmarks';
import type { PhotoFault, SavePhotoRequest } from '../src/posing/progress/types';
import { POSE_SPECS } from '../src/posing/spec';
import type { PoseId } from '../src/posing/types';
import type { Appearance } from '../src/three/appearance';

const WIDTH = 600;
const HEIGHT = 800;
const DAY_MS = 86_400_000;
const DATES = 6;
const SCORES: Partial<Record<PoseId, readonly number[]>> = {
  frontDoubleBiceps: [64, 69, 77, 82, 88, 93],
  sideChest: [58, 66, 70, 78, 85, 90],
  backDoubleBiceps: [71, 74, 80, 86, 89, 95],
};
const FAULTS_PER_DATE = [4, 3, 3, 2, 1, 0];

const { values: args } = parseArgs({
  options: { app: { type: 'string', default: 'http://localhost:5173' }, chrome: { type: 'string', default: process.env.CHROME ?? 'google-chrome' } },
});
const app = args.app.replace(/\/$/, '');

const rawDir = process.env.BODYHACK_DATA_DIR?.trim();
if (!rawDir) throw new Error('Set BODYHACK_DATA_DIR to a scratch directory. This script never seeds the real data directory.');
const root = resolve(rawDir);
if (root === DEFAULT_DATA_DIR || root.startsWith(DEFAULT_DATA_DIR + sep)) {
  throw new Error(`${root} is the real data directory. Use a scratch directory such as /tmp/bodyhack-seed.`);
}
const dir = photosDir({ BODYHACK_DATA_DIR: root });

/** Leaner, fuller and more detailed from the first date (t = 0) to the last (t = 1). */
const appearanceAt = (t: number): Partial<Appearance> => ({
  size: -0.15 + 0.4 * t,
  fullness: 0.2 * t,
  bodyFat: 0.5 - 0.38 * t,
  separation: 0.3 + 0.4 * t,
  striations: 0.45 * t,
  vascularity: 0.1 + 0.45 * t,
  detail: 0.15 + 0.35 * t,
});

/** The first `count` distinct cues of the pose's taught variant. */
function faultsOf(pose: PoseId, count: number): PhotoFault[] {
  const faults: PhotoFault[] = [];
  for (const check of POSE_SPECS[pose][0].checks) {
    const cue = (check.low ?? check.high)?.text;
    if (!cue || faults.some((f) => f.cue === cue)) continue;
    faults.push({ metric: check.metric, ...(check.side ? { side: check.side } : {}), cue });
  }
  return faults.slice(0, count);
}

type Send = <T>(method: string, params?: object) => Promise<T>;

async function launchChrome(bin: string): Promise<{ page: Send; close: () => Promise<void> }> {
  const profile = await mkdtemp(join(tmpdir(), 'bodyhack-seed-chrome-'));
  const child = spawn(bin, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--mute-audio', '--no-first-run',
    '--no-default-browser-check', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const listening = Promise.withResolvers<string>();
  let log = '';
  child.stderr.setEncoding('utf8').on('data', (s: string) => {
    log += s;
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(log);
    if (m) listening.resolve(m[1]);
  });
  child.once('exit', (code) => listening.reject(new Error(`Chrome exited with ${code}: ${log.slice(-400)}`)));
  child.once('error', listening.reject);

  const ws = new WebSocket(await listening.promise);
  const opened = Promise.withResolvers<void>();
  ws.onopen = () => opened.resolve();
  ws.onerror = () => opened.reject(new Error('cannot connect to Chrome'));
  await opened.promise;
  let nextId = 0;
  const pending = new Map<number, PromiseWithResolvers<unknown>>();
  ws.onmessage = (event) => {
    const msg = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string } };
    const call = msg.id === undefined ? undefined : pending.get(msg.id);
    if (!call || msg.id === undefined) return;
    pending.delete(msg.id);
    if (msg.error) call.reject(new Error(msg.error.message));
    else call.resolve(msg.result);
  };
  const send = <T>(sessionId: string | undefined, method: string, params: object = {}): Promise<T> => {
    const call = Promise.withResolvers<unknown>();
    pending.set(++nextId, call);
    ws.send(JSON.stringify({ id: nextId, method, params, sessionId }));
    return call.promise as Promise<T>;
  };

  const { targetId } = await send<{ targetId: string }>(undefined, 'Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send<{ sessionId: string }>(undefined, 'Target.attachToTarget', { targetId, flatten: true });
  return {
    page: (method, params) => send(sessionId, method, params),
    close: async () => {
      ws.close();
      child.kill();
      if (child.exitCode === null) await once(child, 'exit');
      await rm(profile, { recursive: true, force: true });
    },
  };
}

async function evaluate<T>(page: Send, expression: string): Promise<T> {
  const { result, exceptionDetails } = await page<{ result: { value: T }; exceptionDetails?: { text: string; exception?: { description?: string } } }>(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
  );
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

/** Renders the figure in `pose` and returns the JPEG as a data URL with the landmarks MediaPipe finds in it. */
async function render(page: Send, pose: PoseId, appearance: Partial<Appearance>): Promise<{ dataUrl: string; points: Landmark[] | null }> {
  await evaluate(page, 'window.__ready = false');
  const query = new URLSearchParams({ model: 'model', pose, view: 'front', focus: 'full', a: JSON.stringify(appearance) });
  await page('Page.navigate', { url: `${app}/shot.html?${query}` });
  const deadline = Date.now() + 180_000;
  for (;;) {
    const state = await evaluate<string>(page, 'window.__error ?? (window.__ready === true ? "ready" : "")').catch(() => '');
    if (state === 'ready') break;
    if (state) throw new Error(`shot.html failed: ${state}`);
    if (Date.now() > deadline) throw new Error(`shot.html did not get ready for ${pose}`);
    await sleep(250);
  }
  const { data } = await page<{ data: string }>('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  const dataUrl = `data:image/jpeg;base64,${data}`;
  // This import runs inside the page, which loads MediaPipe from the dev server.
  const points = await evaluate<Landmark[] | null>(page, `(async (src) => {
    const { FilesetResolver, PoseLandmarker } = await import('/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs');
    const landmarker = await PoseLandmarker.createFromOptions(await FilesetResolver.forVisionTasks('/mediapipe/wasm'), {
      baseOptions: { modelAssetPath: '/mediapipe/pose_landmarker_full.task', delegate: 'CPU' }, runningMode: 'IMAGE', numPoses: 1,
    });
    const img = new Image();
    img.src = src;
    await img.decode();
    const found = landmarker.detect(img).landmarks[0];
    landmarker.close();
    return found ? found.map(({ x, y, visibility }) => ({ x, y, visibility })) : null;
  })(${JSON.stringify(dataUrl)})`);
  return { dataUrl, points };
}

const health = await fetch(`${app}/api/health`).catch(() => null);
if (!health?.ok) throw new Error(`No dev server at ${app}. Start it with npm run dev, then pass --app.`);

const chrome = await launchChrome(args.chrome);
try {
  await chrome.page('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  const lastDate = Date.now() - 2 * DAY_MS;
  for (const [pose, scores] of Object.entries(SCORES) as [PoseId, readonly number[]][]) {
    await deletePhotos(dir, { pose });
    for (let i = 0; i < DATES; i++) {
      const { dataUrl, points } = await render(chrome.page, pose, appearanceAt(i / (DATES - 1)));
      const body: SavePhotoRequest = {
        pose,
        imageDataUrl: dataUrl,
        score: scores[i],
        faults: faultsOf(pose, FAULTS_PER_DATE[i]),
        ...(points ? { landmarks: { aspect: WIDTH / HEIGHT, points } } : {}),
        mode: i % 3 === 2 ? 'hold' : 'learn',
      };
      const parsed = parsePhotoRequest(body);
      if (!parsed.ok) throw new Error(`seed photo for ${pose} is invalid: ${parsed.error}`);
      const takenAt = new Date(lastDate - (DATES - 1 - i) * 21 * DAY_MS);
      const photo = await savePhoto(dir, parsed.value, takenAt);
      console.log(`${pose} ${takenAt.toISOString().slice(0, 10)} score ${scores[i]} ${points ? 'with' : 'WITHOUT'} landmarks -> ${photo.id}`);
    }
  }
} finally {
  await chrome.close();
}
console.log(`Seeded ${dir}`);
