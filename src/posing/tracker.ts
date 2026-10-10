import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { poseLandmarks, type PoseLandmarks } from './landmarks';

// Self-hosted assets written by `npm run mediapipe`. Relative to the page, like the figure's model files.
const WASM_DIR = 'mediapipe/wasm';
const MODEL_URL = 'mediapipe/pose_landmarker_full.task';

export type Delegate = 'GPU' | 'CPU';

export interface Tracker {
  /** Where inference runs. */
  readonly delegate: Delegate;
  /** The one person in the frame, or undefined when there is none. `timestampMs` must grow from call to call. */
  detect(frame: HTMLVideoElement | HTMLCanvasElement, timestampMs: number): PoseLandmarks | undefined;
  close(): void;
}

/** WebGL renderers that run on the CPU. Chrome falls back to SwiftShader without a usable GPU. */
const SOFTWARE_GL = /swiftshader|llvmpipe|softpipe|software/i;

/**
 * Whether WebGL 2 runs on graphics hardware. On SwiftShader the GPU delegate took 129 to 463 ms a frame and the CPU
 * delegate 25 to 30 ms. `failIfMajorPerformanceCaveat` alone still returned a SwiftShader context.
 */
function hardwareWebGl2(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  if (gl === null) return false;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return !SOFTWARE_GL.test(renderer);
}

/** MediaPipe Pose Landmarker, full model, VIDEO mode: on the GPU when it has one, else or on failure on the CPU. */
export async function createTracker(): Promise<Tracker> {
  const res = await fetch(MODEL_URL);
  // The Vite dev server answers a missing file with the app's index.html and status 200.
  if (!res.ok || res.headers.get('content-type')?.startsWith('text/html')) {
    throw new Error(`The pose model ${MODEL_URL} is missing. Run npm run mediapipe.`);
  }
  const [fileset, model] = await Promise.all([
    FilesetResolver.forVisionTasks(WASM_DIR),
    res.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
  ]);
  const open = (delegate: Delegate) =>
    PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: model, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
  let delegate: Delegate = hardwareWebGl2() ? 'GPU' : 'CPU';
  let landmarker: PoseLandmarker;
  try {
    landmarker = await open(delegate);
  } catch (err) {
    if (delegate === 'CPU') throw err;
    console.warn('The GPU delegate failed; tracking on the CPU.', err);
    delegate = 'CPU';
    landmarker = await open(delegate);
  }
  return {
    delegate,
    detect(frame, timestampMs) {
      const isVideo = frame instanceof HTMLVideoElement;
      const width = isVideo ? frame.videoWidth : frame.width;
      const height = isVideo ? frame.videoHeight : frame.height;
      if (width === 0 || height === 0) return undefined;
      const points = landmarker.detectForVideo(frame, timestampMs).landmarks.at(0);
      return points && poseLandmarks(points, width, height);
    },
    close: () => landmarker.close(),
  };
}

/** Camera failures a user can act on. `unsupported`: no camera API here, as on a plain-http page. */
export type CameraFailure = 'denied' | 'noDevice' | 'busy' | 'unsupported';

const CAMERA_MESSAGES: { readonly [F in CameraFailure]: string } = {
  denied: 'Camera access is blocked. Allow the camera for this page and try again.',
  noDevice: 'No camera was found. Connect a webcam and try again.',
  busy: 'The camera is in use by another app, or it failed to start.',
  unsupported: 'This page cannot use a camera. Open it over https or on localhost in a current browser.',
};

/** getUserMedia error names (DOMException names) by the failure they mean. */
const CAMERA_FAILURES = {
  NotAllowedError: 'denied',
  SecurityError: 'denied',
  NotFoundError: 'noDevice',
  OverconstrainedError: 'noDevice',
  NotReadableError: 'busy',
  AbortError: 'busy',
} as const satisfies Record<string, CameraFailure>;

const isCameraErrorName = (name: string): name is keyof typeof CAMERA_FAILURES => Object.hasOwn(CAMERA_FAILURES, name);

export class CameraError extends Error {
  readonly reason: CameraFailure;

  constructor(reason: CameraFailure, options?: ErrorOptions) {
    super(CAMERA_MESSAGES[reason], options);
    this.name = 'CameraError';
    this.reason = reason;
  }
}

/** Opens the front camera, 1280x720 when it can. Throws `CameraError` for the failures in `CameraFailure`. */
export async function openCamera(): Promise<MediaStream> {
  if (!('mediaDevices' in navigator)) throw new CameraError('unsupported');
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch (err) {
    if (err instanceof Error && isCameraErrorName(err.name)) throw new CameraError(CAMERA_FAILURES[err.name], { cause: err });
    throw err;
  }
}
