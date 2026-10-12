// Tracking gate on Android: npm run android:gate [-- --build | --no-build] [-- --desktop=fresh|snapshot[:<label>]]
// [-- --mode=video|image] [-- --gpu=host|swiftshader] [-- --save-baseline]
// Runs the tracking gate inside the app on emulator-5564 (android-gate.html): the WebView renders the app's figure in
// every pose and fault, the native plugin's detectImage finds the landmarks and the TypeScript scoring judges them.
// By default detectImage tracks in VIDEO mode, frame to frame with the desktop gate's lead-in, as the live app does;
// `--mode=image` detects every frame afresh. PASS needs 0 criterion failures and every own-pose score within 5 points
// of the desktop gate (by default a fresh `npm run gate`; `--desktop=snapshot` takes the last run in
// src/posing/gate/snapshots.json). Exits 1 on FAIL. Writes docs/android/android-gate-report.md; the first run (or
// `--save-baseline`) is kept as the baseline in docs/android/android-gate-baseline.json. Contact sheets and the raw
// run go to docs/android/shots/gate/.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { AndroidGateOutput, DetectMode, NativeTimings } from '../../src/posing/gate/androidGate.ts';
import type { CaseResult, GateRun, Snapshot } from '../../src/posing/gate/criteria.ts';
import { bootEmulator, ensureApk, installApp, lockHarness, startApp, type BuildMode } from './lib/device.ts';
import { adb, APP_ID, AVD, ENV, main, median, quantile, ROOT, SERIAL, waitFor } from './lib/tools.ts';

const MAX_DIFF = 5;
const REPORT = join(ROOT, 'docs/android/android-gate-report.md');
const BASELINE = join(ROOT, 'docs/android/android-gate-baseline.json');
const SHOTS = join(ROOT, 'docs/android/shots/gate');
const SNAPSHOTS = join(ROOT, 'src/posing/gate/snapshots.json');
/** Where scripts/gate.ts leaves its last run. */
const DESKTOP_RUN = join(tmpdir(), 'bodyhack-gate', 'gate-run.json');
const RUN_TIMEOUT_MS = 30 * 60_000;

interface Desktop {
  /** How the reference run was made. */
  readonly source: string;
  readonly run: GateRun;
  /** The desktop gate's verdict, when this run made it. */
  readonly passed: boolean | undefined;
}

interface Spread {
  readonly median: number;
  readonly p90: number;
  readonly max: number;
}

interface TimingSummary {
  readonly runS: number;
  readonly frames: number;
  readonly warmupMs: number;
  readonly detectMs: Spread;
  readonly encodeMs: Spread;
  readonly delegates: NativeTimings['delegates'];
}

interface Baseline {
  readonly mode: DetectMode;
  readonly at: string;
  readonly device: string;
  readonly desktop: string;
  readonly failures: readonly string[];
  readonly maxDiff: number;
  readonly timings: TimingSummary;
  readonly run: GateRun;
}

interface Row {
  readonly id: string;
  readonly desktop: CaseResult;
  readonly android: CaseResult;
  readonly baseline: CaseResult | undefined;
  /** Android minus desktop own-pose score; null when either has no score. */
  readonly diff: number | null;
  readonly ok: boolean;
}

const own = (c: CaseResult): number | null => c.scores[c.pose];
const cases = (r: GateRun): readonly CaseResult[] => [...r.poses, ...r.faults];
const spread = (values: readonly number[]): Spread => ({ median: median(values), p90: quantile(values, 0.9), max: Math.max(...values) });

function desktopReference(option: string): Desktop {
  if (option === 'fresh') {
    const startedAt = Date.now();
    console.log('Running the desktop gate (npm run gate) for the reference scores.');
    const res = spawnSync('node', ['scripts/gate.ts'], { cwd: ROOT, env: ENV, stdio: ['ignore', 'ignore', 'inherit'] });
    if (res.status !== 0 && res.status !== 1) throw new Error(`npm run gate failed (exit ${res.status ?? res.signal}).`);
    if (!existsSync(DESKTOP_RUN) || statSync(DESKTOP_RUN).mtimeMs < startedAt) throw new Error(`npm run gate wrote no ${DESKTOP_RUN}.`);
    const { run } = JSON.parse(readFileSync(DESKTOP_RUN, 'utf8')) as { run: GateRun };
    return { source: 'fresh `npm run gate`', run, passed: res.status === 0 };
  }
  const label = option.startsWith('snapshot:') ? option.slice('snapshot:'.length) : undefined;
  if (option !== 'snapshot' && label === undefined) throw new Error(`Unknown --desktop=${option}; use fresh or snapshot[:<label>].`);
  const snapshots = JSON.parse(readFileSync(SNAPSHOTS, 'utf8')) as Snapshot[];
  const snap = label === undefined ? snapshots.at(-1) : snapshots.find((s) => s.label === label);
  if (!snap) throw new Error(`No desktop snapshot ${label ?? ''} in ${SNAPSHOTS}.`);
  return { source: `snapshot "${snap.label}" in src/posing/gate/snapshots.json`, run: snap.run, passed: undefined };
}

function compare(desktop: GateRun, android: GateRun, baseline: GateRun | undefined): Row[] {
  const byId = (r: GateRun | undefined) => new Map(r ? cases(r).map((c) => [c.id, c]) : []);
  const desk = byId(desktop);
  const base = byId(baseline);
  return cases(android).map((a) => {
    const d = desk.get(a.id);
    if (!d) throw new Error(`The desktop run has no case ${a.id}.`);
    const [ds, as] = [own(d), own(a)];
    const diff = ds === null || as === null ? null : as - ds;
    return { id: a.id, desktop: d, android: a, baseline: base.get(a.id), diff, ok: diff === null ? ds === as : Math.abs(diff) <= MAX_DIFF };
  });
}

const fmt = (n: number | null | undefined, digits = 1): string => (n === null || n === undefined ? '–' : n.toFixed(digits));

const MODE_TEXT: Record<DetectMode, string> = {
  video:
    'VIDEO mode: every frame carries the gate clock and the landmarker tracks from frame to frame, as live tracking does, with the desktop gate\'s lead-in (5 empty frames, 5 frames of the relaxed stance, then 10 of the pose).',
  image:
    'IMAGE mode: every frame is a fresh detection, so the 10 frames of one render give the same landmarks. The desktop gate tracks in VIDEO mode.',
};

function report(o: {
  passed: boolean;
  mode: DetectMode;
  device: string;
  userAgent: string;
  desktop: Desktop;
  run: GateRun;
  failures: readonly string[];
  rows: readonly Row[];
  timings: TimingSummary;
  baseline: Baseline;
  baselineIsThisRun: boolean;
}): string {
  const { run, desktop, timings: t, rows, baseline } = o;
  const maxDiff = Math.max(0, ...rows.map((r) => Math.abs(r.diff ?? 0)));
  const off = rows.filter((r) => !r.ok);
  const webView = /Chrome\/[\d.]+/.exec(o.userAgent)?.[0] ?? o.userAgent;
  const msRow = (name: string, s: Spread) => `| ${name} | ${s.median.toFixed(0)} | ${s.p90.toFixed(0)} | ${s.max.toFixed(0)} |`;
  const lines = [
    '# Tracking gate on Android',
    '',
    'Generated by `npm run android:gate` (`scripts/android/gate.ts`, page `android-gate.html`, harness',
    '`src/posing/gate/androidGate.ts`). Do not edit by hand.',
    '',
    `**Result: ${o.passed ? 'PASS' : 'FAIL'}.** ${o.failures.length} criterion failures; ${rows.length - off.length} of ${rows.length} own-pose scores within ${MAX_DIFF} points of desktop (largest difference ${maxDiff.toFixed(1)}).`,
    '',
    '## Run',
    '',
    `- When: ${run.at}.`,
    `- Device: ${o.device}, WebView ${webView}.`,
    `- Figure: \`model-lite\` (the model the app ships), rendered in the WebView by \`${run.backend.renderer}\`${run.backend.software ? ' (software GL)' : ''}.`,
    `- Tracker: the native plugin's \`detectImage\` (MediaPipe Tasks for Android, full model), delegate ${t.delegates.join(' and ')}. Frames ${run.size.join('x')}, ${run.frames} per case, PNG.`,
    `- Detection: ${MODE_TEXT[o.mode]}`,
    `- Desktop reference: ${desktop.source}, ${desktop.run.at}, \`${desktop.run.backend.renderer}\`, delegate ${desktop.run.backend.delegate}${desktop.passed === undefined ? '' : `, desktop result ${desktop.passed ? 'PASS' : 'FAIL'}`}.`,
    '',
    '## Timings',
    '',
    `Whole run ${t.runS.toFixed(0)} s for ${t.frames} frames. The first \`detectImage\` (it builds the landmarker) took ${t.warmupMs.toFixed(0)} ms.`,
    '',
    '| ms | median | p90 | max |',
    '|---|---|---|---|',
    msRow('`detectImage` round trip (plugin call + detection)', t.detectMs),
    msRow('PNG encode of the frame in the WebView', t.encodeMs),
    '',
    '## Own-pose scores, Android against desktop',
    '',
    `Baseline: the Android run of ${baseline.at} in ${baseline.mode.toUpperCase()} mode${o.baselineIsThisRun ? ' (this run)' : ''}.`,
    '',
    `| case | desktop | android | diff | baseline (${baseline.mode.toUpperCase()}) | detected (desktop / android) | facing (desktop / android) | top cue desktop | top cue android |`,
    '|---|---|---|---|---|---|---|---|---|',
    ...rows.map((r) => {
      const cells = [
        r.id,
        fmt(own(r.desktop)),
        fmt(own(r.android)),
        `${fmt(r.diff)}${r.ok ? '' : ' ✗'}`,
        fmt(r.baseline && own(r.baseline)),
        `${r.desktop.detected} / ${r.android.detected}`,
        `${r.desktop.facing ?? '–'} / ${r.android.facing ?? '–'}`,
        r.desktop.topCue ?? '–',
        r.android.topCue ?? '–',
      ];
      return `| ${cells.join(' | ')} |`;
    }),
    '',
    '## Criterion failures (Android run)',
    '',
    ...(o.failures.length === 0 ? ['None.'] : o.failures.map((f) => `- ${f}`)),
    ...(off.length === 0 ? [] : ['', `Own-pose scores more than ${MAX_DIFF} points from desktop: ${off.map((r) => r.id).join(', ')}.`]),
    '',
    '## Baseline',
    '',
    `The baseline Android run (${baseline.mode.toUpperCase()} mode) is kept in \`${relative(ROOT, BASELINE)}\` (replace it with \`--save-baseline\`): ${baseline.at},`,
    `${baseline.device}; ${baseline.failures.length} criterion failures, largest difference from desktop ${baseline.maxDiff.toFixed(1)} points,`,
    `\`detectImage\` median ${baseline.timings.detectMs.median.toFixed(0)} ms, whole run ${baseline.timings.runS.toFixed(0)} s, delegate ${baseline.timings.delegates.join(' and ')}.`,
    `Desktop reference then: ${baseline.desktop}.`,
    '',
    '## Files (git-ignored)',
    '',
    `- \`${relative(ROOT, SHOTS)}/android-gate-poses.png\`, \`android-gate-faults.png\`: contact sheets with the native landmarks.`,
    `- \`${relative(ROOT, SHOTS)}/android-gate-run.json\`: the run, the timings and the landmarks of every case.`,
    `- \`${relative(ROOT, SHOTS)}/android-gate-full-report.md\`: the desktop-style gate report (matrix, faults, references) of this run.`,
    '',
  ];
  return lines.join('\n');
}

const writePng = (path: string, dataUrl: string) => writeFileSync(path, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));

main(async (cleanup) => {
  const args = process.argv.slice(2);
  const option = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const build: BuildMode = args.includes('--build') ? 'always' : args.includes('--no-build') ? 'never' : 'auto';
  const modeOption = option('mode') ?? 'video';
  if (modeOption !== 'video' && modeOption !== 'image') throw new Error(`Unknown --mode=${modeOption}; use video or image.`);
  const mode: DetectMode = modeOption;

  const desktop = desktopReference(option('desktop') ?? 'fresh');
  const apk = ensureApk(build, ['android-gate.html']);
  cleanup(lockHarness());
  const gpu = option('gpu') ?? 'host';
  if (gpu !== 'host' && gpu !== 'swiftshader') throw new Error(`Unknown --gpu=${gpu}; use host or swiftshader.`);
  const emulator = await bootEmulator({ camera: 'none', gpu, reuse: true });
  cleanup(() => emulator.stop());
  installApp(apk);
  const device = `${SERIAL} (AVD ${AVD}, Android ${adb('shell', 'getprop', 'ro.build.version.release').trim()}, ${adb('shell', 'getprop', 'ro.product.cpu.abi').trim()}, ${emulator.started ? `-gpu ${gpu}` : 'an emulator that was already running'})`;
  cleanup(() => void adb('shell', 'am', 'force-stop', APP_ID));
  const app = await startApp((type, text) => {
    if (type === 'error' || type === 'warning') console.log(`[app ${type}] ${text}`);
  });
  cleanup(() => app.close());
  await app.open('android-gate.html');
  await waitFor('window.androidGate', 60_000, async () => ((await app.cdp.evaluate('typeof window.androidGate')) === 'object' ? true : undefined));

  console.log(`Running the gate in the app (every frame through detectImage, ${mode.toUpperCase()} mode).`);
  const snapshots = JSON.parse(readFileSync(SNAPSHOTS, 'utf8')) as Snapshot[];
  const t0 = Date.now();
  const result = (await app.cdp.evaluate(`window.androidGate.run(${JSON.stringify({ snapshots })}, '${mode}')`, RUN_TIMEOUT_MS)) as AndroidGateOutput;
  const runS = (Date.now() - t0) / 1000;
  const { output, timings: raw, userAgent } = result;
  const timings: TimingSummary = {
    runS,
    frames: raw.detectMs.length,
    warmupMs: raw.warmupMs,
    detectMs: spread(raw.detectMs),
    encodeMs: spread(raw.encodeMs),
    delegates: raw.delegates,
  };

  const stored = existsSync(BASELINE) ? (JSON.parse(readFileSync(BASELINE, 'utf8')) as Baseline) : undefined;
  const rows = compare(desktop.run, output.run, stored?.run);
  const maxDiff = Math.max(0, ...rows.map((r) => Math.abs(r.diff ?? 0)));
  const passed = output.failures.length === 0 && rows.every((r) => r.ok);
  const desktopLine = `${desktop.source}, ${desktop.run.at}, delegate ${desktop.run.backend.delegate}`;
  const saveBaseline = stored === undefined || args.includes('--save-baseline');
  const baseline: Baseline = saveBaseline
    ? { mode, at: output.run.at, device, desktop: desktopLine, failures: output.failures, maxDiff, timings, run: output.run }
    : stored;
  if (saveBaseline) writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 1)}\n`);

  mkdirSync(SHOTS, { recursive: true });
  writePng(join(SHOTS, 'android-gate-poses.png'), output.sheet);
  writePng(join(SHOTS, 'android-gate-faults.png'), output.faultSheet);
  writeFileSync(join(SHOTS, 'android-gate-full-report.md'), output.report);
  writeFileSync(join(SHOTS, 'android-gate-run.json'), JSON.stringify({ run: output.run, timings: raw, trace: output.trace }, null, 1));
  writeFileSync(
    REPORT,
    report({ passed, mode, device, userAgent, desktop, run: output.run, failures: output.failures, rows, timings, baseline, baselineIsThisRun: saveBaseline }),
  );

  for (const f of output.failures) console.log(`FAIL ${f}`);
  for (const r of rows.filter((x) => !x.ok)) console.log(`FAIL ${r.id}: android ${fmt(own(r.android))}, desktop ${fmt(own(r.desktop))}`);
  console.log(
    `Delegate ${timings.delegates.join('/')}; detectImage median ${timings.detectMs.median.toFixed(0)} ms (p90 ${timings.detectMs.p90.toFixed(0)}); ` +
      `${timings.frames} frames in ${runS.toFixed(0)} s; largest own-pose difference ${maxDiff.toFixed(1)} (limit ${MAX_DIFF}).`,
  );
  console.log(`Wrote ${relative(ROOT, REPORT)}${saveBaseline ? ` and the baseline ${relative(ROOT, BASELINE)}` : ''}.`);
  console.log(passed ? 'Android tracking gate: PASS' : 'Android tracking gate: FAIL');
  return passed ? 0 : 1;
});
