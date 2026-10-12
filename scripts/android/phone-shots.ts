// The phone layout on Android: node scripts/android/phone-shots.ts [--bridge-port 5196] [--build | --no-build]
// Boots the harness emulator with a camera video (empty room, relaxed front, the move into front double biceps and
// back), installs the APK with cleared data and drives tutor.html over CDP in portrait, then in landscape
// (`adb emu rotate`). It pairs the app through the `bodyhack://pair` link with the real `npm run bridge` values (the
// Vite server with the bridge must run on --bridge-port), restarts the app to check that the pairing persists, runs
// Learn to two hits with the coach debrief, opens Progress and deletes one photo. With a 15 s screen timeout, the run
// stays idle for 25 s and the screen must stay on; outside a run the same idle must turn it off. Screenshots, the
// score legibility and the checks go to docs/android/shots/phone/ (results.md, results.json). Exits 1 when a check
// fails.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import type { FrameSpec } from '../../src/posing/gate/androidGate.ts';
import type { PoseId } from '../../src/posing/types.ts';
import { attachApp, bootEmulator, EMULATOR_LOG, ensureApk, installApp, lockHarness, screenshot, startApp, type AppPage, type BuildMode } from './lib/device.ts';
import { renderFrames } from './lib/frames.ts';
import { adb, APP_ID, main, ROOT, runVisible, sleep, waitFor } from './lib/tools.ts';

const SHOTS = join(ROOT, 'docs/android/shots/phone');
const WORK = join(tmpdir(), 'bodyhack-phone-shots');
const POSE: PoseId = 'frontDoubleBiceps';
const SECONDS_PER_FRAME = 0.25;
const SETTINGS = { voiceCommands: false, debrief: true, coachModel: '', holdGoal: 10 };
/** The score must be at least this share of the screen height to read from 2-3 m. */
const MIN_SCORE_SHARE = 0.12;
/** The emulator's screen capture lags the page by about a second on -gpu host. */
const CAPTURE_LAG_MS = 1500;
/** The keep-awake check: the screen timeout during the run, and how long the run stays idle. */
const SCREEN_TIMEOUT_MS = 15_000;
const IDLE_MS = 25_000;
/** The screenshot of each drill stage; one per orientation, taken when the stage lasts past the capture lag. */
const STAGE_SHOTS: Readonly<Record<string, string>> = {
  framing: '11-run-framing',
  correcting: '12-run-correcting',
  holding: '13-run-holding',
};

interface Check {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

/** What the checks read of the tutor state (window.__tutorState in TutorRun.tsx). */
interface Seen {
  readonly stage?: string;
  readonly stepsLeft?: number;
  readonly facing?: string;
  readonly calibration: string;
  readonly debrief: string;
  readonly photo?: string;
  readonly score?: number;
}

const SEEN = `(() => {
  const s = window.__tutorState?.();
  const stage = s?.view?.stage;
  return s ? { stage: stage?.kind, stepsLeft: stage?.kind === 'step' ? stage.count - stage.index - 1 : undefined, facing: s.facing,
    calibration: s.calibration.kind, debrief: s.debrief.kind, photo: s.photo?.id, score: s.score } : null;
})()`;

/**
 * Logs every stage change in the page, every 50 ms, so a short stage (the hold before a quick hit) is seen even while
 * the driver waits on a screenshot.
 */
const RECORD_STAGES = `(() => {
  clearInterval(window.__stageTimer);
  const log = [];
  window.__stageLog = log;
  window.__stageTimer = setInterval(() => {
    const kind = window.__tutorState?.()?.view?.stage.kind;
    if (kind !== undefined && log.at(-1) !== kind) log.push(kind);
  }, 50);
})()`;

/** The score's size on screen: the digits' ink height (canvas metrics of the same font) against the page height. */
const LEGIBILITY = `(() => {
  const el = document.querySelector('.tutor-score-value');
  const cs = getComputedStyle(el);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = cs.fontSize + ' ' + cs.fontFamily;
  const m = ctx.measureText(el.textContent);
  return { text: el.textContent, fontPx: parseFloat(cs.fontSize), inkPx: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
    boxPx: el.getBoundingClientRect().height, pageHeightPx: innerHeight, pageWidthPx: innerWidth, dpr: devicePixelRatio };
})()`;

interface Legibility {
  readonly text: string;
  readonly fontPx: number;
  readonly inkPx: number;
  readonly boxPx: number;
  readonly pageHeightPx: number;
  readonly pageWidthPx: number;
  readonly dpr: number;
}

/** Empty room 4 s, relaxed front 8 s, the move into the pose, the pose 10 s, the move back. */
function timeline(): { readonly spec: FrameSpec | 'empty'; readonly seconds: number }[] {
  const move = (from: PoseId, to: PoseId) => Array.from({ length: 6 }, (_, i) => ({ spec: { from, to, t: (i + 1) / 7 }, seconds: SECONDS_PER_FRAME }));
  return [
    { spec: 'empty', seconds: 4 },
    { spec: { pose: 'relaxedFront' }, seconds: 8 },
    ...move('relaxedFront', POSE),
    { spec: { pose: POSE }, seconds: 10 },
    ...move(POSE, 'relaxedFront'),
  ];
}

async function makeVideo(): Promise<string> {
  const steps = timeline();
  const specs = steps.flatMap((s) => (s.spec === 'empty' ? [] : [s.spec]));
  const pngs = await renderFrames(specs);
  rmSync(WORK, { recursive: true, force: true });
  const renders = join(WORK, 'renders');
  const frames = join(WORK, 'frames');
  mkdirSync(renders, { recursive: true });
  mkdirSync(frames, { recursive: true });
  const empty = join(renders, 'empty.png');
  execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=0x9A9EA6:s=1280x720', '-frames:v', '1', empty]);
  let n = 0;
  let rendered = 0;
  for (const [i, step] of steps.entries()) {
    let file = empty;
    if (step.spec !== 'empty') {
      file = join(renders, `${String(i).padStart(2, '0')}.png`);
      writeFileSync(file, pngs[rendered++]);
    }
    for (let k = 0; k < Math.round(step.seconds / SECONDS_PER_FRAME); k++) symlinkSync(file, join(frames, `${String(n++).padStart(4, '0')}.png`));
  }
  const video = join(SHOTS, 'camera.mp4');
  runVisible('scripts/android/camera-video.sh', [frames, video, String(SECONDS_PER_FRAME)]);
  return video;
}

/** The URL and token that `npm run bridge` prints for a server on `port`. */
function bridgeValues(port: string): { url: string; token: string } {
  const out = execFileSync('node', ['scripts/bridge.ts', '--port', port], { cwd: ROOT, encoding: 'utf8' });
  const url = /Server URL:\s+(\S+)/.exec(out)?.[1];
  const token = /Token:\s+(\S+)/.exec(out)?.[1];
  if (!url || !token) throw new Error(`npm run bridge printed no URL and token:\n${out}`);
  return { url, token };
}

main(async (cleanup) => {
  const { values } = parseArgs({ options: { 'bridge-port': { type: 'string', default: '5196' }, build: { type: 'boolean' }, 'no-build': { type: 'boolean' } } });
  const build: BuildMode = values.build ? 'always' : values['no-build'] ? 'never' : 'auto';
  mkdirSync(SHOTS, { recursive: true });
  for (const file of readdirSync(SHOTS)) if (file.endsWith('.png')) rmSync(join(SHOTS, file));
  const bridge = bridgeValues(values['bridge-port']);
  const video = await makeVideo();
  const apk = ensureApk(build, ['tutor.html']);
  cleanup(lockHarness());
  const emulator = await bootEmulator({ camera: `videofile:${video}`, gpu: 'host', reuse: false });
  cleanup(() => emulator.stop());
  installApp(apk);
  adb('logcat', '-c');
  for (const [namespace, key, value] of [['system', 'screen_off_timeout', String(SCREEN_TIMEOUT_MS)], ['global', 'stay_on_while_plugged_in', '0']]) {
    const before = adb('shell', 'settings', 'get', namespace, key).trim();
    adb('shell', 'settings', 'put', namespace, key, value);
    cleanup(() => void adb('shell', 'settings', ...(before === 'null' ? ['delete', namespace, key] : ['put', namespace, key, before])));
  }

  const checks: Check[] = [];
  const shots: string[] = [];
  const legibility: Record<string, Legibility> = {};
  const check = (name: string, ok: boolean, detail: string) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
  };

  let app: AppPage = await startApp();
  cleanup(() => app.close());
  const ev = async <T>(expression: string, timeoutMs?: number): Promise<T> => (await app.cdp.evaluate(expression, timeoutMs)) as T;
  const shot = async (name: string) => {
    await sleep(CAPTURE_LAG_MS);
    screenshot(join(SHOTS, `${name}.png`));
    shots.push(name);
  };
  const click = async (selector: string, text?: string): Promise<void> => {
    const ok = await ev<boolean>(`(() => {
      const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => ${JSON.stringify(text ?? '')} === '' || e.textContent.includes(${JSON.stringify(text ?? '')}));
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`);
    if (!ok) throw new Error(`Nothing to click: ${selector} ${text ?? ''}`);
  };
  const scrollTo = (selector: string) => ev<boolean>(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el?.scrollIntoView({ block: 'start' }); return !!el; })()`);
  const seen = async () => (await ev<Seen | null>(SEEN).catch(() => null)) ?? undefined;
  const until = (label: string, timeoutMs: number, accept: (s: Seen) => boolean) =>
    waitFor(label, timeoutMs, async () => {
      const s = await seen();
      return s && accept(s) ? s : undefined;
    }, 200);
  /** The app's own keep-awake flag (FLAG_KEEP_SCREEN_ON in the window attributes), not the one DevTools adds. */
  const keptAwake = async () => (await ev<{ isKeptAwake: boolean }>('window.Capacitor.Plugins.KeepAwake.isKeptAwake()')).isKeptAwake;
  /**
   * Leaves the device without input for IDLE_MS and returns its wakefulness. DevTools is detached meanwhile, as an
   * attached client keeps the screen on; the screen is woken before it attaches again.
   */
  const idle = async (): Promise<string> => {
    app.close();
    await sleep(IDLE_MS);
    const wakefulness = /mWakefulness=(\w+)/.exec(adb('shell', 'dumpsys', 'power'))?.[1] ?? 'unknown';
    adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
    adb('shell', 'wm', 'dismiss-keyguard');
    app = await attachApp();
    return wakefulness;
  };
  const photoFiles = () => adb('shell', 'run-as', APP_ID, 'ls', 'files/photos').split(/\s+/).filter((f) => f.endsWith('.jpg') || f.endsWith('.webp'));
  const homeReady = () => waitFor('the home screen', 60_000, async () => ((await ev<boolean>(`!!document.querySelector('.tutor-pose img')`).catch(() => false)) ? true : undefined));

  /**
   * Drives one drill from the build-up to the hit and returns its stages in order, as the page logged them. With
   * `fromEmptyRoom`, the last build-up step waits for an empty camera view, so the drill starts in framing. The score
   * is measured once per `tag`. Each stage of STAGE_SHOTS is captured once per `tag`, and only when the drill is still
   * in that stage after the capture lag, so the picture shows the stage it is named after.
   */
  const toHit = async (tag: string, fromEmptyRoom: boolean): Promise<readonly string[]> => {
    await ev(RECORD_STAGES);
    for (let i = 0; i < 12; i++) {
      const s = await seen();
      if (s?.stage !== 'step') break;
      if (fromEmptyRoom && s.stepsLeft === 0) await until('an empty room', 60_000, (x) => x.facing === undefined).catch(() => undefined);
      await click('.tutor-controls button', 'Next');
      await sleep(250);
    }
    let last: string | undefined = 'step';
    for (;;) {
      const { stage } = await until('the hit', 120_000, (x) => x.stage !== last);
      last = stage;
      if (stage === 'done') {
        return waitFor('the logged hit', 2000, async () => {
          const log = await ev<string[]>('window.__stageLog');
          return log.at(-1) === 'done' ? log : undefined;
        }, 50);
      }
      if ((stage === 'correcting' || stage === 'holding') && legibility[tag] === undefined) legibility[tag] = await ev<Legibility>(LEGIBILITY);
      const name = stage !== undefined && Object.hasOwn(STAGE_SHOTS, stage) ? `${tag}-${STAGE_SHOTS[stage]}` : undefined;
      if (name === undefined || shots.includes(name)) continue;
      await sleep(CAPTURE_LAG_MS);
      if ((await seen())?.stage !== stage) continue;
      screenshot(join(SHOTS, `${name}.png`));
      shots.push(name);
    }
  };

  /** Learn to a hit; `tag` prefixes the screenshots, and the coach note is waited for when `coach`. */
  const learn = async (tag: string, coach: boolean) => {
    await click('button[data-mode="learn"]');
    if (tag === 'port') {
      await until('calibration', 90_000, (s) => s.calibration === 'capturing');
      await shot(`${tag}-09-run-calibrating`);
    }
    await until('the first step', 90_000, (s) => s.stage === 'step');
    await shot(`${tag}-10-run-step`);
    await click('.tutor-swap');
    await shot(`${tag}-14-run-swapped`);
    check(`${tag}: tapping the inset swaps the figure and the camera`, await ev<boolean>(`document.querySelector('.tutor-stage').hasAttribute('data-swapped')`), 'data-swapped set');
    await click('.tutor-swap');
    if (tag === 'port') {
      check('keep-awake during a session', await keptAwake(), 'KeepAwake.isKeptAwake() on the build-up step');
      const awake = await idle();
      const stage = (await seen())?.stage;
      check(
        `the screen stays on through ${IDLE_MS / 1000} s without input during a run (screen timeout ${SCREEN_TIMEOUT_MS / 1000} s, DevTools detached)`,
        awake === 'Awake' && stage === 'step',
        `mWakefulness=${awake} after ${IDLE_MS / 1000} s on the build-up step; stage afterwards ${stage}`,
      );
    }
    const stages = await toHit(tag, tag === 'port');
    check(`${tag}: the Next button ends the build-up and the drill passes the hold to a hit`, stages.includes('holding') && stages.at(-1) === 'done', `stages ${stages.join(' > ')}`);
    const done = await until('the photo', 30_000, (s) => s.stage === 'done' && s.photo !== undefined);
    await shot(`${tag}-15-run-hit`);
    check(`${tag}: Learn reaches a hit with a photo`, done.photo !== undefined, `photo ${done.photo}`);
    if (coach) {
      const note = await until('the coach note', 150_000, (s) => s.debrief === 'note').catch(() => undefined);
      await shot(`${tag}-16-run-coach-note`);
      check(`${tag}: the coach note arrives through the bridge`, note?.debrief === 'note', `debrief ${note?.debrief ?? 'timeout'}`);
      if (note?.debrief === 'note') {
        await click('.tutor-debrief-close');
        check(`${tag}: the coach note can be dismissed`, !(await ev<boolean>(`!!document.querySelector('.tutor-debrief')`)), 'card gone');
      }
    }
  };

  try {
    await ev(`localStorage.setItem('posing-tutor-settings', ${JSON.stringify(JSON.stringify(SETTINGS))})`);
    await app.open('tutor.html');
    await homeReady();
    await shot('port-01-home');
    await click('.tutor-pose', 'Side chest');
    await shot('port-02-picker');
    await click('.tutor-pose', 'Front double biceps');
    await scrollTo('.tutor-settings');
    await waitFor('the bridge state', 15_000, async () => ((await ev<string>(`document.querySelector('.tutor-bridge-state')?.dataset.state ?? ''`)) === 'unpaired' ? true : undefined));
    await shot('port-03-settings-unpaired');
    check('Settings shows unpaired on a fresh install', true, 'data-state=unpaired');

    const link = `bodyhack://pair?${new URLSearchParams(bridge)}`;
    adb('shell', `am start -a android.intent.action.VIEW -d '${link}' ${APP_ID}`);
    await waitFor('the pair dialog', 15_000, async () => ((await ev<boolean>(`!!document.querySelector('[data-testid="pair-dialog"][open]')`)) ? true : undefined));
    await shot('port-04-pair-dialog');
    await click('[data-testid="pair-dialog"] .btn', 'Pair');
    const step = await waitFor('the pairing', 20_000, async () => {
      const s = await ev<string>(`document.querySelector('[data-testid="pair-dialog"]')?.dataset.step ?? ''`);
      return s === 'paired' || s === 'failed' ? s : undefined;
    });
    await shot('port-05-pair-done');
    await click('[data-testid="pair-dialog"] .btn', 'Done');
    const paired = await ev<{ state: string; url?: string }>(`window.__bodyhackBridge.status()`, 15_000);
    check('Pairing by the bodyhack://pair link', step === 'paired' && paired.state === 'online' && paired.url === bridge.url, `dialog ${step}, status ${paired.state} ${paired.url ?? ''}`);
    await scrollTo('.tutor-bridge');
    await shot('port-06-settings-paired');

    const bad = `bodyhack://pair?${new URLSearchParams({ url: 'http://192.168.1.20:5173', token: bridge.token })}`;
    adb('shell', `am start -a android.intent.action.VIEW -d '${bad}' ${APP_ID}`);
    await waitFor('the refused link', 15_000, async () => ((await ev<string>(`document.querySelector('[data-testid="pair-dialog"]')?.dataset.step ?? ''`)) === 'failed' ? true : undefined));
    await shot('port-07-pair-refused');
    await click('[data-testid="pair-dialog"] .btn', 'Done');
    const still = await ev<{ state: string; url?: string }>(`window.__bodyhackBridge.status()`, 15_000);
    check('A non-Tailscale link is refused and keeps the pairing', still.url === bridge.url, `status ${still.state} ${still.url ?? ''}`);

    app.close();
    app = await startApp();
    await homeReady();
    await scrollTo('.tutor-bridge');
    const kept = await waitFor('the bridge state after restart', 15_000, async () => {
      const s = await ev<string>(`document.querySelector('.tutor-bridge-state')?.dataset.state ?? ''`);
      return s && s !== 'checking' ? s : undefined;
    });
    await shot('port-08-settings-after-restart');
    check('The pairing survives an app restart', kept === 'online', `after restart: ${kept}`);
    await ev(`scrollTo(0, 0); document.querySelector('.tutor-home')?.scrollTo(0, 0)`);

    const awakeBefore = await keptAwake();
    await learn('port', true);
    await click('.tutor-summary .btn', 'Again');
    await until('the second build-up', 90_000, (s) => s.stage === 'step');
    const again = await toHit('port', false);
    check('port: a second drill passes the hold to a hit', again.includes('holding') && again.at(-1) === 'done', `stages ${again.join(' > ')}`);
    await until('the second photo', 30_000, (s) => s.stage === 'done' && s.photo !== undefined);
    await click('.tutor-summary .pill', 'Back to the tutor');
    await sleep(1000);
    check('keep-awake is released after the session', !awakeBefore && !(await keptAwake()), `isKeptAwake before the run ${awakeBefore}, after ${await keptAwake()}`);

    await homeReady();
    await click('button[data-mode="progress"]');
    await waitFor('the timeline', 20_000, async () => ((await ev<number>(`document.querySelectorAll('.progress-thumb').length`)) >= 2 ? true : undefined));
    await shot('port-17-progress');
    await scrollTo('.progress-compare');
    await shot('port-18-progress-compare');
    await click('.progress-compare-bar .seg button', 'Onion');
    await shot('port-19-progress-onion');
    await scrollTo('.progress-trend');
    await shot('port-20-progress-trend');
    const before = photoFiles();
    await scrollTo('.progress-timeline');
    await click('.progress-thumb-delete');
    await shot('port-21-progress-delete-confirm');
    await click('.progress-dialog .btn', 'Delete photo');
    await waitFor('the photo to go', 10_000, async () => (photoFiles().length < before.length ? true : undefined));
    await shot('port-22-progress-after-delete');
    const thumbs = await ev<number>(`document.querySelectorAll('.progress-thumb').length`);
    const after = photoFiles();
    check(
      'Deleting one photo removes it from app storage (run-as ls files/photos)',
      after.length === before.length - 1 && after.every((f) => before.includes(f)) && thumbs === after.length,
      `before [${before.join(', ')}], after [${after.join(', ')}], timeline ${thumbs}`,
    );

    adb('emu', 'rotate');
    await waitFor('landscape', 15_000, async () => ((await ev<boolean>('innerWidth > innerHeight')) ? true : undefined));
    await shot('land-17-progress');
    await click('.tutor-back');
    await homeReady();
    await shot('land-01-home');
    await scrollTo('.tutor-bridge');
    await shot('land-03-settings');
    await ev(`document.querySelector('.tutor-home')?.scrollTo(0, 0)`);
    await learn('land', false);
    await click('.tutor-summary .pill', 'Back to the tutor');
    await homeReady();
    const asleep = await idle();
    check(
      `control: outside a run the screen turns off within ${IDLE_MS / 1000} s (screen timeout ${SCREEN_TIMEOUT_MS / 1000} s, DevTools detached)`,
      asleep !== 'Awake',
      `mWakefulness=${asleep} after ${IDLE_MS / 1000} s on the home screen`,
    );
  } catch (err) {
    check('Drive the phone screens', false, err instanceof Error ? err.message : String(err));
    await shot('zz-failure').catch(() => undefined);
  }
  for (let i = 0; i < 3 && (await ev<boolean>('innerWidth > innerHeight').catch(() => false)); i++) {
    adb('emu', 'rotate');
    await sleep(1500);
  }

  for (const [tag, l] of Object.entries(legibility)) {
    const share = l.inkPx / l.pageHeightPx;
    check(`${tag}: score digits are at least ${MIN_SCORE_SHARE * 100}% of the screen height`, share >= MIN_SCORE_SHARE, `"${l.text}" ink ${l.inkPx.toFixed(0)} px (font ${l.fontPx.toFixed(0)} px) of ${l.pageHeightPx} px = ${(share * 100).toFixed(1)}%`);
  }

  const passed = checks.every((c) => c.ok);
  writeFileSync(join(SHOTS, 'results.json'), JSON.stringify({ checks, legibility, shots, bridgeUrl: bridge.url }, null, 1));
  writeFileSync(
    join(SHOTS, 'results.md'),
    [
      '# Phone layout on Android',
      '',
      'Generated by `node scripts/android/phone-shots.ts` (`scripts/android/phone-shots.ts`). Do not edit by hand.',
      '',
      `**Result: ${passed ? 'PASS' : 'FAIL'}.** ${checks.filter((c) => c.ok).length} of ${checks.length} checks passed.`,
      '',
      `- When: ${new Date().toISOString()}`,
      `- Device: emulator AVD bodyhack-harness (pixel_7 profile, -gpu host), front camera \`${relative(ROOT, video)}\``,
      `- Bridge: ${bridge.url} (from \`npm run bridge -- --port ${values['bridge-port']}\`)`,
      '',
      '| Check | Result | Detail |',
      '|---|---|---|',
      ...checks.map((c) => `| ${c.name} | ${c.ok ? 'pass' : '**FAIL**'} | ${c.detail.replaceAll('|', '\\|')} |`),
      '',
      '## Screenshots',
      '',
      ...shots.map((s) => `- \`${s}.png\``),
      '',
      `Emulator log: \`${EMULATOR_LOG}\`.`,
      '',
    ].join('\n'),
  );
  console.log(`Wrote ${relative(ROOT, join(SHOTS, 'results.md'))}.`);
  return passed ? 0 : 1;
});
