import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { JOINTS, type PoseLandmarks } from './landmarks';
import { calibrate, classifyFacing, measure, MIN_VISIBILITY, type Calibration } from './metrics';
import { faultCue, scoreCall, type CallScore } from './score';
import { advance, inView, SCHEDULER, startSession, type Phase, type SessionEvent, type SessionState } from './session';
import { LandmarkSmoother } from './smoothing';
import { POSE_SPECS } from './spec';
import { Speech, type SayResult } from './speech';
import { CameraError, createTracker, openCamera, type Tracker } from './tracker';
import type { Metrics, PoseId } from './types';

// Verification surface for the live loop: camera or dropped file → tracker → smoother → score → cue scheduler →
// speech, with every stage on screen. `window.posingDebug` hands the same data to automated runs.

function element<T extends HTMLElement>(id: string, type: { new (): T; prototype: T }): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`#${id} is not a ${type.name}`);
  return el;
}

const view = element('view', HTMLCanvasElement);
const stage = element('stage', HTMLElement);
const hint = element('hint', HTMLParagraphElement);
const video = element('video', HTMLVideoElement);
const fileInput = element('file', HTMLInputElement);
const poseSelect = element('pose', HTMLSelectElement);
const voiceSelect = element('voice', HTMLSelectElement);
const muteBox = element('mute', HTMLInputElement);
const speakingOut = element('speaking', HTMLSpanElement);
const statusOut = element('status', HTMLDivElement);
const errorOut = element('error', HTMLDivElement);
const phaseOut = element('phase', HTMLDivElement);
const sessionOut = element('session', HTMLDivElement);
const scoreOut = element('score', HTMLDivElement);
const scoreInfo = element('scoreInfo', HTMLDivElement);
const faultsOut = element('faults', HTMLOListElement);
const checksOut = element('checks', HTMLTableElement);
const eventsOut = element('events', HTMLOListElement);
const metricsOut = element('metrics', HTMLTableElement);
const context = view.getContext('2d');
if (!context) throw new Error('This browser has no 2D canvas.');
const ctx = context;

const isPoseId = (id: string): id is PoseId => Object.hasOwn(POSE_SPECS, id);
const requestedPose = new URLSearchParams(location.search).get('pose') ?? '';

const PHASE_COLORS: { readonly [K in Phase['kind']]: string } = {
  framing: '#ff8a65',
  correcting: '#4fc3f7',
  holding: '#ffd54f',
  hit: '#69f0ae',
};
/** Elbows and wrists: the landmarks whose frame-to-frame motion the panel reports as jitter. */
const JITTER_POINTS = [JOINTS.elbow.left, JOINTS.elbow.right, JOINTS.wrist.left, JOINTS.wrist.right];

interface Source {
  readonly kind: 'camera' | 'video' | 'image';
  readonly frame: HTMLVideoElement | HTMLCanvasElement;
  readonly stop: () => void;
}

interface Scored {
  readonly metrics: Metrics;
  readonly call: CallScore;
}

interface Frame {
  readonly raw: PoseLandmarks | undefined;
  readonly lm: PoseLandmarks | undefined;
  readonly scored: Scored | undefined;
  readonly rawScore: number | undefined;
}

interface LoggedEvent {
  /** Seconds since the session started. */
  readonly t: number;
  readonly kind: SessionEvent['kind'];
  readonly detail: string;
  readonly say: string | undefined;
  readonly speech: SayResult | undefined;
}

interface TracePoint {
  readonly t: number;
  readonly rawScore: number | undefined;
  readonly score: number | undefined;
  /** Pixel x, y of each `JITTER_POINTS` landmark, before and after smoothing. */
  readonly rawPx: readonly number[] | undefined;
  readonly px: readonly number[] | undefined;
}

const speech = new Speech();
let pose: PoseId = isPoseId(requestedPose) ? requestedPose : 'frontDoubleBiceps';
let trackerLoad: Promise<Tracker> | undefined;
let tracker: Tracker | undefined;
let source: Source | undefined;
let smoother = new LandmarkSmoother();
let calibration: Calibration | undefined;
let session: SessionState = startSession(performance.now());
let last: Frame | undefined;
let frames = 0;
let posed = 0;
let panelAt = 0;
const detectMs: number[] = [];
const frameTimes: number[] = [];
const events: LoggedEvent[] = [];
const trace: TracePoint[] = [];

function keep<T>(list: T[], item: T, max: number): void {
  list.push(item);
  if (list.length > max) list.shift();
}

function percentile(values: readonly number[], q: number): number | undefined {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(q * (sorted.length - 1))];
}

function fmt(value: number | undefined): string {
  if (value === undefined) return '-';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '-∞';
  return Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(2);
}

function frameSize(frame: HTMLVideoElement | HTMLCanvasElement): readonly [number, number] {
  return frame instanceof HTMLVideoElement ? [frame.videoWidth, frame.videoHeight] : [frame.width, frame.height];
}

function scoreFrame(lm: PoseLandmarks): Scored {
  const metrics = measure(lm, { calibration });
  return { metrics, call: scoreCall(pose, metrics, classifyFacing(lm)) };
}

/** Mean frame-to-frame change of a trace field over the last 2 s: score points, or pixels a landmark moved. */
function jitter(now: number, key: 'rawScore' | 'score' | 'rawPx' | 'px'): number | undefined {
  const dims = key === 'rawPx' || key === 'px' ? 2 : 1;
  let sum = 0;
  let n = 0;
  let prev: readonly number[] | undefined;
  for (const point of trace) {
    if (point.t < now - 2000) continue;
    const value = point[key];
    const cur = typeof value === 'number' ? [value] : value;
    if (prev && cur) {
      for (let i = 0; i < cur.length; i += dims) {
        sum += dims === 1 ? Math.abs(cur[i] - prev[i]) : Math.hypot(cur[i] - prev[i], cur[i + 1] - prev[i + 1]);
        n += 1;
      }
    }
    prev = cur;
  }
  return n > 0 ? sum / n : undefined;
}

function record(event: SessionEvent): void {
  const said = 'say' in event ? event.say : undefined;
  let detail = '';
  if (event.kind === 'framing') detail = event.reason;
  if (event.kind === 'hit') {
    const r = event.result;
    detail = `score ${r.score.toFixed(1)}, time to hit ${(r.timeToHitMs / 1000).toFixed(1)} s, mean ${r.meanScore.toFixed(1)}, sd ${r.scoreSd.toFixed(2)}`;
  }
  const spoken = said && speech.say(said.text, said.interrupt);
  events.push({ t: (event.at - session.startedAt) / 1000, kind: event.kind, detail, say: said?.text, speech: spoken });
}

function onFrame(frame: HTMLVideoElement | HTMLCanvasElement, now: number): void {
  if (!tracker) return;
  const started = performance.now();
  const raw = tracker.detect(frame, now);
  keep(detectMs, performance.now() - started, 150);
  keep(frameTimes, now, 150);
  frames += 1;
  if (raw) posed += 1;
  const lm = smoother.next(raw, now);
  const scored = lm && scoreFrame(lm);
  const rawScore = raw && scoreFrame(raw).call.result.score;
  const step = advance(
    session,
    !lm || !scored ? { kind: 'nobody' } : inView(lm) ? { kind: 'body', score: scored.call.result } : { kind: 'cropped' },
    now,
  );
  session = step.state;
  for (const event of step.events) record(event);
  last = { raw, lm, scored, rawScore };
  const [width, height] = frameSize(frame);
  const rawPx = raw && JITTER_POINTS.flatMap((i) => [raw.points[i].x * width, raw.points[i].y * height]);
  const px = lm && JITTER_POINTS.flatMap((i) => [lm.points[i].x * width, lm.points[i].y * height]);
  keep(trace, { t: now, rawScore, score: scored?.call.result.score, rawPx, px }, 900);
  draw(frame, now);
  if (now - panelAt > 100) {
    panelAt = now;
    renderPanel(now);
  }
}

function drawPose(lm: PoseLandmarks, color: string, radius: number): void {
  const { width, height } = view;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, radius / 2);
  ctx.beginPath();
  for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
    ctx.moveTo(lm.points[start].x * width, lm.points[start].y * height);
    ctx.lineTo(lm.points[end].x * width, lm.points[end].y * height);
  }
  ctx.stroke();
  for (const p of lm.points) {
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, radius, 0, 2 * Math.PI);
    if (p.visibility >= MIN_VISIBILITY) ctx.fill();
    else ctx.stroke();
  }
}

function phaseLabel(now: number): string {
  const { phase } = session;
  if (phase.kind === 'framing') return `framing: ${phase.reason}`;
  if (phase.kind === 'holding') return `holding ${((now - phase.since) / 1000).toFixed(1)} of ${SCHEDULER.holdMs / 1000} s`;
  return phase.kind;
}

function draw(frame: HTMLVideoElement | HTMLCanvasElement, now: number): void {
  const [width, height] = frameSize(frame);
  if (view.width !== width || view.height !== height) {
    view.width = width;
    view.height = height;
  }
  ctx.drawImage(frame, 0, 0, width, height);
  if (last?.raw) drawPose(last.raw, 'rgba(255, 255, 255, 0.5)', Math.max(2, height / 360));
  if (last?.lm) drawPose(last.lm, PHASE_COLORS[session.phase.kind], Math.max(3, height / 200));
  const score = last?.scored?.call.result.score;
  const lines = [`${phaseLabel(now)}${score === undefined ? '' : `   score ${score.toFixed(0)}`}`];
  const spoken = events.findLast((e) => e.say !== undefined);
  if (spoken?.say) lines.push(`"${spoken.say}"`);
  const size = Math.round(height / 24);
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  const boxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width)) + size;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.fillRect(0, 0, boxWidth, size * (1.45 * lines.length + 0.5));
  ctx.fillStyle = PHASE_COLORS[session.phase.kind];
  lines.forEach((line, i) => ctx.fillText(line, size / 2, size * 1.45 * (i + 1)));
}

function row(cells: readonly string[], tag: 'td' | 'th' = 'td'): HTMLTableRowElement {
  const tr = document.createElement('tr');
  for (const text of cells) tr.appendChild(document.createElement(tag)).textContent = text;
  return tr;
}

function item(text: string): HTMLLIElement {
  const li = document.createElement('li');
  li.textContent = text;
  return li;
}

function renderPanel(now: number): void {
  const [width, height] = source ? frameSize(source.frame) : [0, 0];
  const fps = frameTimes.length > 1 ? (1000 * (frameTimes.length - 1)) / (now - frameTimes[0]) : undefined;
  statusOut.textContent =
    `${tracker?.delegate ?? '-'} delegate · ${source?.kind ?? 'no source'} ${width}x${height} · ${fmt(fps)} fps · ` +
    `detect ${fmt(percentile(detectMs, 0.5))} ms (p90 ${fmt(percentile(detectMs, 0.9))}) · pose in ${posed} of ${frames} frames`;

  phaseOut.textContent = phaseLabel(now);
  phaseOut.dataset.phase = session.phase.kind;
  const hit = session.phase.kind === 'hit' ? events.find((e) => e.kind === 'hit') : undefined;
  sessionOut.textContent = [
    `${((now - session.startedAt) / 1000).toFixed(1)} s since the call`,
    session.focus ? `working on "${session.focus.text}"` : '',
    hit ? `hit: ${hit.detail}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const call = last?.scored?.call;
  scoreOut.textContent = call?.result.score === undefined ? '-' : call.result.score.toFixed(1);
  scoreInfo.textContent =
    `${call?.variant.name ?? POSE_SPECS[pose][0].name} · raw ${fmt(last?.rawScore)} · facing ${call?.result.facing ?? '-'} · ` +
    `${calibration ? 'calibrated' : 'not calibrated'} · jitter over 2 s: score ${fmt(jitter(now, 'rawScore'))} raw, ` +
    `${fmt(jitter(now, 'score'))} smoothed; elbows and wrists ${fmt(jitter(now, 'rawPx'))} px raw, ` +
    `${fmt(jitter(now, 'px'))} px smoothed`;
  faultsOut.replaceChildren(
    ...(call?.result.faults ?? []).map((f) =>
      item(`${faultCue(f)?.text ?? f.miss}  (${f.check.metric}${f.check.side ? `.${f.check.side}` : ''} ${fmt(f.value)})`),
    ),
  );
  checksOut.replaceChildren(
    row(['check', 'value', 'band', 'score', 'cue'], 'th'),
    ...(call?.result.results ?? []).map((r) => {
      const { metric, side, band } = r.check;
      const tr = row([
        side ? `${metric}.${side}` : metric,
        fmt(r.value),
        `${fmt(band.min)} to ${fmt(band.max)}`,
        r.score === undefined ? '-' : (100 * r.score).toFixed(0),
        r.miss ? (faultCue(r)?.text ?? r.miss) : '',
      ]);
      tr.classList.toggle('miss', r.miss !== undefined);
      return tr;
    }),
  );
  eventsOut.replaceChildren(
    ...events
      .slice()
      .reverse()
      .map((e) => {
        const li = item(` ${e.kind} ${e.detail}${e.say ? ` "${e.say}" (${e.speech})` : ''}`);
        li.prepend(Object.assign(document.createElement('span'), { textContent: `+${e.t.toFixed(1)} s` }));
        return li;
      }),
  );
  metricsOut.replaceChildren(
    ...Object.entries(last?.scored?.metrics ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => row([key, fmt(value)])),
  );
}

function restart(): void {
  session = startSession(performance.now());
  events.length = 0;
  speech.cancel();
}

async function loadTracker(): Promise<Tracker> {
  statusOut.textContent = 'Loading the pose model…';
  trackerLoad ??= createTracker().catch((err: unknown) => {
    trackerLoad = undefined;
    throw err;
  });
  tracker = await trackerLoad;
  statusOut.textContent = `Tracker ready on the ${tracker.delegate}.`;
  return tracker;
}

function play(next: Source): void {
  source?.stop();
  source = next;
  smoother = new LandmarkSmoother();
  frameTimes.length = 0;
  hint.hidden = true;
  errorOut.textContent = '';
  restart();
  const { frame } = next;
  if (frame instanceof HTMLVideoElement) {
    const tick = (now: number) => {
      if (source !== next) return;
      onFrame(frame, now);
      frame.requestVideoFrameCallback(tick);
    };
    frame.requestVideoFrameCallback(tick);
  } else {
    const tick = (now: number) => {
      if (source !== next) return;
      onFrame(frame, now);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

async function useCamera(): Promise<void> {
  try {
    await loadTracker();
    const stream = await openCamera();
    video.removeAttribute('src');
    video.srcObject = stream;
    await video.play();
    play({
      kind: 'camera',
      frame: video,
      stop: () => {
        for (const track of stream.getTracks()) track.stop();
        video.srcObject = null;
      },
    });
  } catch (err) {
    errorOut.textContent = err instanceof CameraError ? err.message : String(err);
  }
}

async function useFile(file: File): Promise<void> {
  try {
    await loadTracker();
    if (file.type.startsWith('image/')) {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
      bitmap.close();
      play({ kind: 'image', frame: canvas, stop: () => {} });
      return;
    }
    const url = URL.createObjectURL(file);
    video.srcObject = null;
    video.src = url;
    video.loop = true;
    await video.play();
    play({
      kind: 'video',
      frame: video,
      stop: () => {
        video.pause();
        video.removeAttribute('src');
        URL.revokeObjectURL(url);
      },
    });
  } catch (err) {
    errorOut.textContent = String(err);
  }
}

function renderVoices(): void {
  const options = [new Option('Browser default (English)', ''), ...speech.voices().map((v) => new Option(`${v.name} (${v.lang})`, v.voiceURI))];
  voiceSelect.replaceChildren(...options);
  voiceSelect.value = speech.voice ?? '';
  muteBox.checked = speech.muted;
  speakingOut.textContent = !speech.available ? 'no speech synthesis' : speech.speaking ? 'speaking…' : '';
}

function snapshot() {
  const now = performance.now();
  const { phase } = session;
  const result = last?.scored?.call.result;
  return {
    pose,
    source: source?.kind,
    size: source && frameSize(source.frame),
    delegate: tracker?.delegate,
    frames,
    posed,
    detectMsMedian: percentile(detectMs, 0.5),
    detectMsP90: percentile(detectMs, 0.9),
    elapsedMs: now - session.startedAt,
    phase: phase.kind,
    reason: phase.kind === 'framing' ? phase.reason : undefined,
    hit: phase.kind === 'hit' ? phase.result : undefined,
    score: result?.score,
    rawScore: last?.rawScore,
    facing: result?.facing,
    faults: result?.faults.map((f) => faultCue(f)?.text ?? f.miss),
    calibrated: calibration !== undefined,
    jitter: {
      rawScore: jitter(now, 'rawScore'),
      score: jitter(now, 'score'),
      rawPx: jitter(now, 'rawPx'),
      px: jitter(now, 'px'),
    },
    events: [...events],
    speech: { available: speech.available, voices: speech.voices().length, muted: speech.muted },
  };
}

declare global {
  interface Window {
    posingDebug: { readonly snapshot: typeof snapshot; readonly trace: () => readonly TracePoint[] };
  }
}
window.posingDebug = { snapshot, trace: () => [...trace] };

poseSelect.replaceChildren(
  ...Object.keys(POSE_SPECS)
    .filter(isPoseId)
    .map((id) => new Option(POSE_SPECS[id][0].name, id)),
);
poseSelect.value = pose;
poseSelect.addEventListener('change', () => {
  if (isPoseId(poseSelect.value)) pose = poseSelect.value;
  restart();
});
element('camera', HTMLButtonElement).addEventListener('click', () => void useCamera());
element('open', HTMLButtonElement).addEventListener('click', () => fileInput.click());
element('restart', HTMLButtonElement).addEventListener('click', restart);
element('calibrate', HTMLButtonElement).addEventListener('click', () => {
  const relaxed = last?.lm && calibrate(last.lm);
  if (relaxed) calibration = relaxed;
  errorOut.textContent = relaxed ? '' : 'Calibration needs a relaxed front frame with an ear visible.';
});
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) void useFile(file);
});
stage.addEventListener('dragover', (e) => {
  e.preventDefault();
  stage.classList.add('dragging');
});
stage.addEventListener('dragleave', () => stage.classList.remove('dragging'));
stage.addEventListener('drop', (e) => {
  e.preventDefault();
  stage.classList.remove('dragging');
  const file = e.dataTransfer?.files[0];
  if (file) void useFile(file);
});
muteBox.addEventListener('change', () => speech.setMuted(muteBox.checked));
voiceSelect.addEventListener('change', () => speech.setVoice(voiceSelect.value || undefined));
speech.subscribe(renderVoices);
renderVoices();
