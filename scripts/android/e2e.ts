// Camera loop on Android: npm run android:e2e [-- --build | --no-build]
// Renders a loop of the figure (relaxed front, the move into front double biceps, the pose, the move back), makes it the
// front camera of emulator-5564 (camera-video.sh), installs the APK and drives tutor.html over CDP: Learn a pose up to
// the hit. Checks that a photo of the hit is in app storage (adb run-as), that the native TTS finished at least one
// spoken line (window.__bodyhackSpeech, fed by the plugin's done callbacks; logcat kept as evidence) and that a voice
// command handed to the Android voice input (window.__bodyhackVoice) moved the build-up on. Exits 1 when a check fails.
// Writes docs/android/e2e-report.md; screenshots, the camera video, the photo and logs go to docs/android/shots/e2e/.
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import type { FrameSpec } from '../../src/posing/gate/androidGate.ts';
import type { Stage } from '../../src/posing/modes/mode.ts';
import type { PhotoMeta } from '../../src/posing/progress/types.ts';
import type { PoseId } from '../../src/posing/types.ts';
import type { Snapshot } from '../../src/posing/ui/engine.ts';
import { bootEmulator, EMULATOR_LOG, emulatorRunning, ensureApk, installApp, lockHarness, screenshot, startApp, type AppPage, type BuildMode } from './lib/device.ts';
import { renderFrames } from './lib/frames.ts';
import { adb, adbBytes, APP_ID, AVD, main, ROOT, runVisible, SERIAL, sleep, waitFor } from './lib/tools.ts';

const REPORT = join(ROOT, 'docs/android/e2e-report.md');
const SHOTS = join(ROOT, 'docs/android/shots/e2e');
const WORK = join(tmpdir(), 'bodyhack-e2e');
const POSE: PoseId = 'frontDoubleBiceps';
const SECONDS_PER_FRAME = 0.25;
const TRANSITION_FRAMES = 6;
const SETTINGS = { voiceCommands: true, debrief: false, coachModel: '', holdGoal: 10 };
const VOICE_PHRASE = 'next one please';

/** One camera loop: relaxed front for calibration and the build-up, the move into the pose, the pose, the move back. */
function timeline(): { readonly spec: FrameSpec; readonly seconds: number }[] {
  const move = (from: PoseId, to: PoseId) =>
    Array.from({ length: TRANSITION_FRAMES }, (_, i) => ({ spec: { from, to, t: (i + 1) / (TRANSITION_FRAMES + 1) }, seconds: SECONDS_PER_FRAME }));
  return [
    { spec: { pose: 'relaxedFront' }, seconds: 8 },
    ...move('relaxedFront', POSE),
    { spec: { pose: POSE }, seconds: 10 },
    ...move(POSE, 'relaxedFront'),
  ];
}

/** The part of the tutor state the checks read (window.__tutorState in TutorRun.tsx). */
interface Seen {
  readonly camera: Snapshot['camera'];
  readonly calibration: Snapshot['calibration'];
  readonly stage?: Stage;
  readonly scoring?: PoseId;
  readonly score?: number;
  readonly photo?: Pick<PhotoMeta, 'id' | 'pose' | 'score'>;
  readonly heard?: NonNullable<Snapshot['heard']>;
  readonly listening: Snapshot['listening'];
  readonly listenError?: string;
  readonly notice?: string;
}

const SEEN = `(() => {
  const s = window.__tutorState?.();
  if (!s) return null;
  return {
    camera: s.camera, calibration: s.calibration, stage: s.view?.stage, scoring: s.view?.scoring, score: s.score,
    photo: s.photo && { id: s.photo.id, pose: s.photo.pose, score: s.photo.score },
    heard: s.heard, listening: s.listening, listenError: s.listenError, notice: s.notice,
  };
})()`;

/** One spoken line as the Android speech engine logs it (window.__bodyhackSpeech, android.ts). Times: Date.now(). */
interface Utterance {
  readonly text: string;
  readonly voice: string | undefined;
  readonly startedAt: number;
  readonly endedAt?: number;
  readonly end?: 'done' | 'error' | 'cancelled';
  readonly error?: string;
  /** The preferred voice that failed before the line was said with the engine default. */
  readonly failedVoice?: string;
}

interface Check {
  readonly name: string;
  readonly ok: boolean;
  readonly detail: string;
}

async function makeVideo(): Promise<string> {
  const steps = timeline();
  console.log(`Rendering ${steps.length} figure frames for the camera video.`);
  const pngs = await renderFrames(steps.map((s) => s.spec));
  rmSync(WORK, { recursive: true, force: true });
  const renders = join(WORK, 'renders');
  const frames = join(WORK, 'frames');
  mkdirSync(renders, { recursive: true });
  mkdirSync(frames);
  let n = 0;
  for (const [i, step] of steps.entries()) {
    const file = join(renders, `${String(i).padStart(2, '0')}.png`);
    writeFileSync(file, pngs[i]);
    for (let k = 0; k < Math.round(step.seconds / SECONDS_PER_FRAME); k++) symlinkSync(file, join(frames, `${String(n++).padStart(4, '0')}.png`));
  }
  const video = join(SHOTS, 'camera.mp4');
  runVisible('scripts/android/camera-video.sh', [frames, video, String(SECONDS_PER_FRAME)]);
  console.log(`Camera video: ${relative(ROOT, video)}, ${(n * SECONDS_PER_FRAME).toFixed(1)} s loop.`);
  return video;
}

async function seen(app: AppPage): Promise<Seen | undefined> {
  return ((await app.cdp.evaluate(SEEN).catch(() => null)) as Seen | null) ?? undefined;
}

const until = (app: AppPage, label: string, timeoutMs: number, accept: (s: Seen) => boolean) =>
  waitFor(label, timeoutMs, async () => {
    const s = await seen(app);
    return s && accept(s) ? s : undefined;
  }, 250);

function report(o: { passed: boolean; checks: readonly Check[]; events: readonly string[]; speech: readonly Utterance[]; logcatLines: number; device: string; video: string }): string {
  const lines = [
    '# Camera loop on Android',
    '',
    'Generated by `npm run android:e2e` (`scripts/android/e2e.ts`). Do not edit by hand.',
    '',
    `**Result: ${o.passed ? 'PASS' : 'FAIL'}.** ${o.checks.filter((c) => c.ok).length} of ${o.checks.length} checks passed.`,
    '',
    `- When: ${new Date().toISOString()}.`,
    `- Device: ${o.device}.`,
    `- Front camera: \`${relative(ROOT, o.video)}\` (camera-video.sh, ${SECONDS_PER_FRAME} s per frame): relaxed front 8 s, ${TRANSITION_FRAMES} in-between frames into ${POSE}, ${POSE} 10 s, ${TRANSITION_FRAMES} frames back. The emulator loops it.`,
    '- Driver: CDP into the app WebView through `adb forward`; Learn started with `button[data-mode="learn"]`, the build-up advanced with the Space key after the voice check.',
    '',
    '## Checks',
    '',
    '| check | result | detail |',
    '|---|---|---|',
    ...o.checks.map((c) => `| ${c.name} | ${c.ok ? 'pass' : '**FAIL**'} | ${c.detail.replaceAll('|', '\\|')} |`),
    '',
    '## Timeline (seconds after Learn was started)',
    '',
    ...o.events.map((e) => `- ${e}`),
    '',
    '## Spoken lines (window.__bodyhackSpeech)',
    '',
    ...(o.speech.length === 0
      ? ['None.']
      : o.speech.map((u) => `- "${u.text}": ${u.end ?? 'not ended'}${u.endedAt === undefined ? '' : ` after ${((u.endedAt - u.startedAt) / 1000).toFixed(1)} s`}${u.voice ? `, voice ${u.voice}` : ''}${u.failedVoice ? ` (${u.failedVoice} failed)` : ''}${u.error ? `, error ${u.error}` : ''}`)),
    '',
    `TTS lines in logcat during the run: ${o.logcatLines} (\`${relative(ROOT, SHOTS)}/logcat-tts.txt\`).`,
    '',
    '## Files (git-ignored)',
    '',
    `\`${relative(ROOT, SHOTS)}/\`: camera.mp4, the screenshots 01-learn-live.png to 04-hit.png, the saved photo and its sidecar,`,
    'logcat-tts.txt and run.json (all states the checks read).',
    '',
  ];
  return lines.join('\n');
}

main(async (cleanup) => {
  const args = process.argv.slice(2);
  const build: BuildMode = args.includes('--build') ? 'always' : args.includes('--no-build') ? 'never' : 'auto';
  if (!existsSync(join(ROOT, 'tutor.html'))) throw new Error('tutor.html does not exist yet; the e2e needs the Android tutor entry.');
  mkdirSync(SHOTS, { recursive: true });
  const video = await makeVideo();
  const apk = ensureApk(build, ['tutor.html']);
  cleanup(lockHarness());
  const emulator = await bootEmulator({ camera: `videofile:${video}`, gpu: 'host', reuse: false });
  cleanup(() => emulator.stop());
  installApp(apk);
  const device = `${SERIAL} (AVD ${AVD}, Android ${adb('shell', 'getprop', 'ro.build.version.release').trim()}, -gpu host)`;
  adb('logcat', '-c');
  cleanup(() => void adb('shell', 'am', 'force-stop', APP_ID));
  const app = await startApp((type, text) => {
    if (type === 'error' || type === 'warning') console.log(`[app ${type}] ${text}`);
  });
  cleanup(() => app.close());
  await app.cdp.evaluate(`localStorage.setItem('posing-tutor-settings', ${JSON.stringify(JSON.stringify(SETTINGS))})`);
  await app.open('tutor.html');

  const checks: Check[] = [];
  const events: string[] = [];
  const states: { t: number; label: string; state: Seen | undefined }[] = [];
  const check = (name: string, ok: boolean, detail: string) => {
    checks.push({ name, ok, detail });
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${detail}`);
  };
  await waitFor('the Learn button', 90_000, async () => ((await app.cdp.evaluate('!!document.querySelector(\'button[data-mode="learn"]\')')) ? true : undefined));
  await app.cdp.evaluate('document.querySelector(\'button[data-mode="learn"]\').click()');
  const t0 = Date.now();
  const event = (text: string, state?: Seen) => {
    const t = (Date.now() - t0) / 1000;
    events.push(`${t.toFixed(1)}: ${text}`);
    states.push({ t, label: text, state });
  };

  try {
    const live = await until(app, 'the camera', 90_000, (s) => s.camera.kind !== 'starting');
    event(`camera ${JSON.stringify(live.camera)}`, live);
    check('Camera starts', live.camera.kind === 'live', JSON.stringify(live.camera));
    if (live.camera.kind !== 'live') throw new Error('the camera is not live, so the drive stops here');
    await sleep(1500);
    screenshot(join(SHOTS, '01-learn-live.png'));

    const step = await until(app, 'calibration and the first build-up step', 90_000, (s) => s.calibration.kind === 'ready' && s.stage?.kind === 'step');
    event(`calibration ${JSON.stringify(step.calibration)}, step ${JSON.stringify(step.stage)}, scoring ${step.scoring}`, step);
    check('Learn scores the chosen pose', step.scoring === POSE, `scoring ${step.scoring}`);
    screenshot(join(SHOTS, '02-build-up.png'));

    const before = step.stage?.kind === 'step' ? step.stage.index : -1;
    const accepted = (await app.cdp.evaluate(`window.__bodyhackVoice(${JSON.stringify(VOICE_PHRASE)})`)) === true;
    const after = await until(app, 'the voice command', 20_000, (s) => s.heard?.text === VOICE_PHRASE).catch(() => undefined);
    const moved = after !== undefined && (after.stage?.kind !== 'step' || after.stage.index > before);
    event(`voice "${VOICE_PHRASE}": accepted ${accepted}, heard ${JSON.stringify(after?.heard)}, stage ${JSON.stringify(after?.stage)}`, after);
    check(
      'Injected voice command acts',
      accepted && after?.heard?.command === 'next' && moved,
      `__bodyhackVoice returned ${accepted}; heard command ${after?.heard?.command ?? 'none'} via ${after?.heard?.via ?? '-'}; step ${before} -> ${after?.stage?.kind === 'step' ? after.stage.index : after?.stage?.kind ?? '-'}`,
    );

    for (let i = 0; i < 20; i++) {
      const s = await seen(app);
      if (s?.stage?.kind !== 'step') break;
      await app.cdp.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
      await sleep(400);
    }
    const practice = await seen(app);
    event(`build-up done, stage ${JSON.stringify(practice?.stage)}`, practice);

    const holding = await until(app, 'holding', 120_000, (s) => s.stage?.kind === 'holding' || s.stage?.kind === 'done');
    event(`stage ${holding.stage?.kind}, score ${holding.score?.toFixed(1)}`, holding);
    screenshot(join(SHOTS, '03-holding.png'));
    const done = await until(app, 'the hit', 60_000, (s) => s.stage?.kind === 'done');
    const summary = done.stage?.kind === 'done' ? done.stage.summary : undefined;
    const hit = summary?.mode === 'learn' ? summary.result : undefined;
    event(`done, result ${JSON.stringify(hit && { score: hit.score })}`, done);
    check('Learn reaches a hit', hit !== undefined, hit ? `hit score ${hit.score.toFixed(1)}` : `summary ${JSON.stringify(summary)}`);

    const withPhoto = await until(app, 'the photo', 30_000, (s) => s.photo !== undefined || s.notice !== undefined).catch(() => done);
    await sleep(1000);
    screenshot(join(SHOTS, '04-hit.png'));
    const photo = withPhoto.photo;
    event(`photo ${JSON.stringify(photo)}, notice ${withPhoto.notice ?? '-'}`, withPhoto);
    if (photo) {
      const files = adb('shell', 'run-as', APP_ID, 'ls', 'files/photos').split(/\s+/).filter(Boolean);
      const image = files.find((f) => f.startsWith(`${photo.id}.`) && !f.endsWith('.json'));
      const sidecar = files.includes(`${photo.id}.json`) ? adb('shell', 'run-as', APP_ID, 'cat', `files/photos/${photo.id}.json`) : undefined;
      const data = image ? adbBytes('exec-out', 'run-as', APP_ID, 'cat', `files/photos/${image}`) : Buffer.alloc(0);
      const jpeg = data[0] === 0xff && data[1] === 0xd8;
      const webp = data.subarray(8, 12).toString() === 'WEBP';
      if (image) writeFileSync(join(SHOTS, `photo-${image}`), data);
      if (sidecar) writeFileSync(join(SHOTS, `photo-${photo.id}.json`), sidecar);
      const meta = sidecar ? (JSON.parse(sidecar) as Partial<PhotoMeta>) : undefined;
      check(
        'Photo saved in app storage',
        image !== undefined && (jpeg || webp) && meta?.pose === POSE,
        `files/photos: ${image ?? 'no image'} (${data.length} bytes, ${jpeg ? 'JPEG' : webp ? 'WebP' : 'not an image'}), sidecar pose ${meta?.pose ?? 'missing'}, ${files.length} files`,
      );
    } else {
      check('Photo saved in app storage', false, `no photo in the tutor state; notice ${withPhoto.notice ?? '-'}`);
    }
  } catch (err) {
    check('Drive the tutor', false, String(err instanceof Error ? err.message : err));
  }

  const up = emulatorRunning();
  check('Emulator stays up', up, up ? `${SERIAL} ran to the end` : `${SERIAL} exited during the run (log ${EMULATOR_LOG})`);
  await sleep(3000);
  const speech = ((await app.cdp.evaluate('window.__bodyhackSpeech ?? null').catch(() => null)) as Utterance[] | null) ?? [];
  const spoken = speech.filter((u) => u.end === 'done');
  check(
    'Native TTS spoke',
    spoken.length > 0,
    `${spoken.length} of ${speech.length} lines ended with done${speech.some((u) => u.error) ? `; errors: ${[...new Set(speech.flatMap((u) => (u.error ? [u.error] : [])))].join(', ')}` : ''}`,
  );
  const logcat = up
    ? adb('logcat', '-d', '-v', 'time')
        .split('\n')
        .filter((l) => /tts|texttospeech/i.test(l))
    : [];
  writeFileSync(join(SHOTS, 'logcat-tts.txt'), logcat.join('\n'));
  writeFileSync(join(SHOTS, 'run.json'), JSON.stringify({ checks, states, speech }, null, 1));

  const passed = checks.every((c) => c.ok);
  writeFileSync(REPORT, report({ passed, checks, events, speech, logcatLines: logcat.length, device, video }));
  console.log(`Wrote ${relative(ROOT, REPORT)}.`);
  console.log(passed ? `Android e2e: PASS (${checks.length} checks)` : `Android e2e: FAIL (${checks.filter((c) => !c.ok).length} of ${checks.length} checks)`);
  return passed ? 0 : 1;
});
