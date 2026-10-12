// Tracking gate harness (gate.html), driven by scripts/gate.ts: renders the figure in every pose and fault from the
// judges' view, runs the frames through the live tracking pipeline and returns the run, the report and a contact sheet.
// The Android app runs the same harness with its native detector (androidGate.ts).
import { PoseLandmarker } from '@mediapipe/tasks-vision';
import { Viewer } from '../../three/Viewer';
import { DEFAULT_PRESENTATION } from '../../three/skin';
import { FIGURE_POSES } from '../figurePoses';
import { REFS } from '../fixtures';
import type { PoseLandmarks } from '../landmarks';
import { filterFacing, NO_FACING, type FacingFilter } from '../facing';
import { calibrate, classifyFacing, measure, type Calibration } from '../metrics';
import { faultCue, scoreCall } from '../score';
import { LandmarkSmoother } from '../smoothing';
import { POSE_SPECS } from '../spec';
import type { Delegate } from '../platform/types';
import { createTracker } from '../tracker';
import type { Facing, FigurePose, PoseId } from '../types';
import { FAULTS } from './cases';
import {
  POSE_IDS,
  judge,
  median,
  mostCommon,
  type Backend,
  type CaseResult,
  type FaultResult,
  type GateInput,
  type GateOutput,
  type GateRun,
  type RefScore,
} from './criteria';
import { renderReport } from './report';

const W = 1280;
const H = 720;
const FRAMES = 10;
const FRAME_MS = 1000 / 30;
/** Frames of an empty scene, then of the relaxed stance, before each case. */
const LEAD_IN = 5;
const RELAXED: { readonly [F in Facing]: PoseId } = {
  front: 'relaxedFront',
  back: 'relaxedBack',
  leftSide: 'quarterTurnLeftSide',
  rightSide: 'quarterTurnRightSide',
};
/** A plain wall behind the athlete. */
const BACKGROUND = '#9a9ea6';
/** Contact sheet tiles: the middle of the frame, where the figure stands, at half size. */
const CROP = { x: 400, w: 480 } as const;
const TILE = { w: 240, h: 360, cols: 6 } as const;
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software/i;

declare global {
  interface Window {
    gate?: { readonly run: (input: GateInput) => Promise<GateOutput> };
  }
}

interface Frame {
  readonly detected: boolean;
  readonly facing: Facing | undefined;
  readonly scores: { readonly [P in PoseId]: number | undefined };
  readonly topCue: string | undefined;
}

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D canvas.');
  return [canvas, ctx];
}

const sheetCanvas = (tiles: number) =>
  canvas2d(TILE.w * Math.min(tiles, TILE.cols), TILE.h * Math.ceil(tiles / TILE.cols));

function drawTile(ctx: CanvasRenderingContext2D, index: number, frame: HTMLCanvasElement, lm: PoseLandmarks | undefined, label: string): void {
  const x0 = (index % TILE.cols) * TILE.w;
  const y0 = Math.floor(index / TILE.cols) * TILE.h;
  const scale = TILE.w / CROP.w;
  ctx.drawImage(frame, CROP.x, 0, CROP.w, H, x0, y0, TILE.w, TILE.h);
  if (lm) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
      ctx.moveTo(x0 + (lm.points[start].x * W - CROP.x) * scale, y0 + lm.points[start].y * H * scale);
      ctx.lineTo(x0 + (lm.points[end].x * W - CROP.x) * scale, y0 + lm.points[end].y * H * scale);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x0, y0, TILE.w, 22);
  ctx.fillStyle = '#fff';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(label, x0 + 6, y0 + 15);
}

function rendererName(viewer: Viewer): string {
  const gl = viewer.renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
}

/** The 26 reference photos scored for their own pose, as score.test.ts does. */
function referenceScores(): RefScore[] {
  const byId = new Map(REFS.map((r) => [r.id, r]));
  return REFS.map((ref) => {
    const base = ref.calibration === undefined ? undefined : byId.get(ref.calibration);
    const metrics = measure(ref.landmarks, { calibration: base && calibrate(base.landmarks) });
    const score = scoreCall(ref.pose, metrics, classifyFacing(ref.landmarks)).result.score;
    return { id: ref.id, pose: ref.pose, score: score ?? null };
  });
}

/** What the gate needs from a pose detector: the web tracker, or the native plugin in the Android app. */
export interface GateTracker {
  readonly delegate: Delegate;
  /** As `Tracker.detect`; the native detector answers asynchronously. */
  detect(frame: HTMLCanvasElement, timestampMs: number): PoseLandmarks | undefined | Promise<PoseLandmarks | undefined>;
  close(): void;
}

export interface GateRig {
  /** Where the figure's model files are, relative to the page. */
  readonly modelBase: string;
  readonly tracker: GateTracker;
}

/** The figure in front of a plain wall, drawn into a W x H canvas as the gate's camera sees it. */
export interface Stage {
  /** What the last `show` drew. */
  readonly frame: HTMLCanvasElement;
  /** The WebGL renderer's name. */
  readonly renderer: string;
  show(figure: FigurePose): void;
  dispose(): void;
}

/** Loads the figure into the page's <div id="v">. */
export async function openStage(modelBase: string): Promise<Stage> {
  const host = document.getElementById('v');
  if (!(host instanceof HTMLDivElement)) throw new Error('The gate page needs <div id="v">');
  host.style.width = `${W}px`;
  host.style.height = `${H}px`;
  const [frame, frameCtx] = canvas2d(W, H);
  const viewer = new Viewer(host, { reducedMotion: true, modelBase });
  await viewer.load();
  viewer.setPresentation(DEFAULT_PRESENTATION);
  viewer.setLighting('neutral');
  viewer.setView('front', 'full');
  return {
    frame,
    renderer: rendererName(viewer),
    show(figure) {
      viewer.setPose('A', figure, { instant: true });
      viewer.render();
      frameCtx.fillStyle = BACKGROUND;
      frameCtx.fillRect(0, 0, W, H);
      frameCtx.drawImage(viewer.renderer.domElement, 0, 0, W, H);
    },
    dispose: () => viewer.dispose(),
  };
}

export async function runGate({ snapshots }: GateInput, { modelBase, tracker }: GateRig): Promise<GateOutput> {
  const stage = await openStage(modelBase);
  const { frame, show } = stage;
  let clock = 0;

  const [empty, emptyCtx] = canvas2d(W, H);
  emptyCtx.fillStyle = BACKGROUND;
  emptyCtx.fillRect(0, 0, W, H);

  /**
   * One pose call as the live loop sees it, with a fresh smoother. Empty frames first make MediaPipe lose the previous
   * case; then the athlete stands relaxed in the call's facing, as between calls at prejudging, and hits the pose
   * for FRAMES frames. Without the lead-in, the detector misplaces the trunk of a figure with the hands behind the
   * head (abs and thighs read 35).
   */
  const track = async (figure: FigurePose, pose: PoseId, calibration: Calibration | undefined): Promise<{ frames: Frame[]; last: PoseLandmarks | undefined }> => {
    for (let i = 0; i < LEAD_IN; i++) await tracker.detect(empty, (clock += FRAME_MS));
    show(FIGURE_POSES[RELAXED[POSE_SPECS[pose][0].facing]]);
    for (let i = 0; i < LEAD_IN; i++) await tracker.detect(frame, (clock += FRAME_MS));
    show(figure);
    const smoother = new LandmarkSmoother();
    let filter: FacingFilter = NO_FACING;
    const frames: Frame[] = [];
    let last: PoseLandmarks | undefined;
    for (let i = 0; i < FRAMES; i++) {
      clock += FRAME_MS;
      const raw = await tracker.detect(frame, clock);
      const lm = smoother.next(raw, clock);
      last = lm;
      const metrics = lm && measure(lm, { calibration });
      filter = lm ? filterFacing(filter, classifyFacing(lm), clock) : NO_FACING;
      const facing = filter.facing;
      const calls = POSE_IDS.map((id) => [id, metrics && scoreCall(id, metrics, facing)] as const);
      const own = calls.find(([id]) => id === pose)?.[1];
      const top = own?.result.faults.at(0);
      frames.push({
        detected: raw !== undefined,
        facing,
        scores: Object.fromEntries(calls.map(([id, call]) => [id, call?.result.score])) as Frame['scores'],
        topCue: top && faultCue(top)?.text,
      });
    }
    return { frames, last };
  };

  const summarize = (id: string, pose: PoseId, frames: readonly Frame[]): CaseResult => ({
    id,
    pose,
    detected: frames.filter((f) => f.detected).length,
    facing: mostCommon(frames.map((f) => f.facing)) ?? null,
    scores: Object.fromEntries(POSE_IDS.map((called) => [called, median(frames.map((f) => f.scores[called]))])) as CaseResult['scores'],
    topCue: mostCommon(frames.map((f) => f.topCue)) ?? null,
  });

  const relaxed = (await track(FIGURE_POSES.relaxedFront, 'relaxedFront', undefined)).last;
  const calibration = relaxed && calibrate(relaxed);
  const landmarks: Record<string, PoseLandmarks | null> = {};

  const [sheet, sheetCtx] = sheetCanvas(POSE_IDS.length);
  const poses: CaseResult[] = [];
  for (const [i, pose] of POSE_IDS.entries()) {
    const { frames, last } = await track(FIGURE_POSES[pose], pose, calibration);
    const result = summarize(pose, pose, frames);
    drawTile(sheetCtx, i, frame, last, `${pose} ${result.scores[pose]?.toFixed(0) ?? '–'}`);
    landmarks[pose] = last ?? null;
    poses.push(result);
  }

  const [faultSheet, faultCtx] = sheetCanvas(FAULTS.length);
  const faults: FaultResult[] = [];
  for (const [i, f] of FAULTS.entries()) {
    const { frames, last } = await track(f.figure, f.pose, calibration);
    const result = { ...summarize(f.id, f.pose, frames), label: f.label, expectedCue: f.expectedCue };
    drawTile(faultCtx, i, frame, last, `${f.id} ${result.scores[f.pose]?.toFixed(0) ?? '–'}`);
    landmarks[f.id] = last ?? null;
    faults.push(result);
  }

  const { renderer } = stage;
  const backend: Backend = { renderer, software: SOFTWARE_GL.test(renderer), delegate: tracker.delegate };
  tracker.close();
  stage.dispose();
  const gateRun: GateRun = {
    at: new Date().toISOString(),
    backend,
    size: [W, H],
    frames: FRAMES,
    calibrated: calibration !== undefined,
    poses,
    faults,
    references: referenceScores(),
  };
  return {
    run: gateRun,
    report: renderReport(gateRun, snapshots),
    failures: judge(gateRun).failures,
    sheet: sheet.toDataURL('image/png'),
    faultSheet: faultSheet.toDataURL('image/png'),
    trace: { calibration: calibration ?? null, landmarks },
  };
}

window.gate = { run: async (input) => runGate(input, { modelBase: 'model', tracker: await createTracker() }) };
