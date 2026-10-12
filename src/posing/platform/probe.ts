import { CapacitorException, registerPlugin } from '@capacitor/core';
import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { poseLandmarks } from '../landmarks';
import { measure, MIN_VISIBILITY } from '../metrics';
import type { BodyhackPosePlugin, NativeLandmark, NativePoseFrame, PreviewRect } from './posePlugin';
import type { Delegate } from './types';
import figureUrl from './probe-sideChest.png';

// Dev-only check page for the native pose plugin (probe.html, the app's start page until tutor.html exists).
// `window.probe` gives automated runs (CDP) the same calls and numbers the page shows.

/** Elbow flexion of the bundled render from MediaPipe web, CPU delegate, desktop Chrome
 * (prototypes/android-native/web-gpu.json, results.CPU.metrics.sideChest). */
const WEB_CPU_ELBOW_FLEX = { left: 74.55, right: 114.31 } as const;

interface ProbeStats {
  readonly delegate: Delegate | undefined;
  readonly frames: number;
  /** Frames and frames with a person over the last second. */
  readonly fps: number;
  readonly poseFps: number;
  readonly last: NativePoseFrame | undefined;
}

interface Probe {
  start(): Promise<Delegate>;
  stop(): Promise<void>;
  reset(): Promise<void>;
  stats(): ProbeStats;
  capture(maxWidth: number): Promise<string | null>;
  detect(dataUrl: string): Promise<{ frame: NativePoseFrame; delegate: Delegate; ms: number }>;
  detectBundled(): Promise<string>;
}

declare global {
  interface Window {
    probe: Probe;
  }
}

function element<T extends HTMLElement>(id: string, type: { new (): T; prototype: T }): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`#${id} is not a ${type.name}`);
  return el;
}

const pose = registerPlugin<BodyhackPosePlugin>('BodyhackPose');
const box = element('box', HTMLDivElement);
const overlay = element('overlay', HTMLCanvasElement);
const statsOut = element('stats', HTMLDivElement);
const errorOut = element('error', HTMLDivElement);
const photo = element('photo', HTMLImageElement);
const detectOut = element('detect', HTMLDivElement);
const still = element('still', HTMLCanvasElement);

let delegate: Delegate | undefined;
let running = false;
let frames = 0;
let last: NativePoseFrame | undefined;
/** Arrival times (performance.now) of the frames in the last second, and whether each had a person. */
let recent: { readonly at: number; readonly person: boolean }[] = [];

function showError(err: unknown): void {
  const code = err instanceof CapacitorException ? `${err.code ?? 'error'}: ` : '';
  errorOut.textContent = `${code}${err instanceof Error ? err.message : String(err)}`;
}

function previewRect(): PreviewRect {
  const r = box.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  points: readonly NativeLandmark[],
  place: (p: NativeLandmark) => readonly [number, number],
): void {
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#38bdf8';
  for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
    const a = points[start];
    const b = points[end];
    if (a.visibility < MIN_VISIBILITY || b.visibility < MIN_VISIBILITY) continue;
    ctx.beginPath();
    ctx.moveTo(...place(a));
    ctx.lineTo(...place(b));
    ctx.stroke();
  }
  ctx.fillStyle = '#facc15';
  for (const p of points) {
    if (p.visibility < MIN_VISIBILITY) continue;
    const [x, y] = place(p);
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }
}

/** Draws the landmarks as they sit on the mirrored preview, which fills the box like `object-fit: cover`. */
function drawOverlay(frame: NativePoseFrame): void {
  const dpr = window.devicePixelRatio;
  const w = Math.round(box.clientWidth * dpr);
  const h = Math.round(box.clientHeight * dpr);
  if (overlay.width !== w || overlay.height !== h) Object.assign(overlay, { width: w, height: h });
  const ctx = overlay.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!frame.landmarks) return;
  const scale = Math.max(w / frame.width, h / frame.height);
  const dw = frame.width * scale;
  const dh = frame.height * scale;
  const ox = (w - dw) / 2;
  const oy = (h - dh) / 2;
  drawSkeleton(ctx, frame.landmarks, (p) => [ox + (1 - p.x) * dw, oy + p.y * dh]);
}

function stats(): ProbeStats {
  const now = performance.now();
  recent = recent.filter((f) => now - f.at <= 1000);
  return { delegate, frames, fps: recent.length, poseFps: recent.filter((f) => f.person).length, last };
}

function showStats(): void {
  const s = stats();
  const size = s.last ? `${s.last.width}x${s.last.height}` : '-';
  statsOut.textContent = running
    ? `Delegate ${s.delegate}, ${s.fps} frames/s (${s.poseFps} with a person)\nFrames ${s.frames}, latest ${size}`
    : 'Stopped.';
}

function onFrame(frame: NativePoseFrame): void {
  frames++;
  last = frame;
  recent.push({ at: performance.now(), person: frame.landmarks !== null });
  drawOverlay(frame);
}

function followBox(): void {
  if (running) pose.setPreviewRect({ rect: previewRect() }).catch(showError);
}

async function start(): Promise<Delegate> {
  errorOut.textContent = '';
  const res = await pose.start({ rect: previewRect(), devicePixelRatio: window.devicePixelRatio });
  delegate = res.delegate;
  running = true;
  return res.delegate;
}

async function stop(): Promise<void> {
  running = false;
  await pose.stop();
  overlay.getContext('2d')?.clearRect(0, 0, overlay.width, overlay.height);
}

async function capture(maxWidth: number): Promise<string | null> {
  const { dataUrl } = await pose.capturePhoto({ maxWidth });
  photo.hidden = dataUrl === null;
  if (dataUrl) photo.src = dataUrl;
  return dataUrl;
}

async function detect(dataUrl: string): Promise<{ frame: NativePoseFrame; delegate: Delegate; ms: number }> {
  const t0 = performance.now();
  const res = await pose.detectImage({ dataUrl });
  return { ...res, ms: performance.now() - t0 };
}

async function detectBundled(): Promise<string> {
  const blob = await (await fetch(figureUrl)).blob();
  const reader = new FileReader();
  const read = Promise.withResolvers<string>();
  reader.onload = () => read.resolve(String(reader.result));
  reader.onerror = () => read.reject(reader.error);
  reader.readAsDataURL(blob);
  const dataUrl = await read.promise;
  const { frame, delegate: used, ms } = await detect(dataUrl);
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  Object.assign(still, { width: image.naturalWidth, height: image.naturalHeight, hidden: false });
  const ctx = still.getContext('2d');
  ctx?.drawImage(image, 0, 0);
  if (!frame.landmarks) return (detectOut.textContent = `detectImage (${used}, ${ms.toFixed(0)} ms): no person`);
  if (ctx) drawSkeleton(ctx, frame.landmarks, (p) => [p.x * frame.width, p.y * frame.height]);
  const m = measure(poseLandmarks(frame.landmarks, frame.width, frame.height));
  const flex = (side: 'left' | 'right') => `${m[`elbowFlex.${side}`]?.toFixed(2) ?? '-'} (web CPU ${WEB_CPU_ELBOW_FLEX[side]})`;
  return (detectOut.textContent =
    `detectImage (${used}, ${ms.toFixed(0)} ms), ${frame.width}x${frame.height}\n` +
    `elbowFlex left ${flex('left')}\nelbowFlex right ${flex('right')}`);
}

function wire(id: string, action: () => Promise<unknown>): void {
  element(id, HTMLButtonElement).addEventListener('click', () => {
    action().catch(showError);
  });
}

wire('start', start);
wire('stop', stop);
wire('reset', () => pose.reset());
wire('capture', () => capture(1280));
wire('detectButton', detectBundled);

await pose.addListener('frame', onFrame);
new ResizeObserver(followBox).observe(box);
window.addEventListener('scroll', followBox, { passive: true });
window.addEventListener('resize', followBox);
setInterval(showStats, 500);

window.probe = { start, stop, reset: () => pose.reset(), stats, capture, detect, detectBundled };
