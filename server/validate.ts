import type { Landmark, PoseLandmarks } from '../src/posing/landmarks.ts';
import type { PhotoFault, PhotoId, PhotoImageType, PhotoMeta } from '../src/posing/progress/types.ts';
import type { MetricId, MetricSide, PoseId } from '../src/posing/types.ts';
import type { CoachRequest, ImageType } from './coach.ts';
import type { PhotoInput } from './photos.ts';

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export interface IntentRequest {
  heard: string;
  options: Record<string, string>;
}

const MAX_HEARD = 500;
const MAX_OPTIONS = 255;
const MAX_OPTION_TEXT = 500;
const MAX_POSE = 100;
/** The summary travels in one argv string; Linux caps a single argument at 128 KiB. */
const MAX_SUMMARY_JSON = 16 * 1024;
const MODEL_PATTERN = /^[A-Za-z0-9][\w.:/@-]{0,99}$/;
const DATA_URL_HEAD = /^data:image\/(png|jpeg|webp);base64,/;

const fail = (error: string): Parsed<never> => ({ ok: false, error });

export function parseIntentRequest(raw: unknown): Parsed<IntentRequest> {
  const body = raw as { heard?: unknown; options?: unknown } | null;
  const heard = body?.heard;
  const options = body?.options;
  if (typeof heard !== 'string' || !heard.trim()) return fail('heard must be a non-empty string');
  if (heard.length > MAX_HEARD) return fail(`heard must be at most ${MAX_HEARD} characters`);
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    return fail('options must be an object of option → description');
  }
  const entries = Object.entries(options);
  if (entries.length < 2 || entries.length > MAX_OPTIONS) return fail(`options must have 2 to ${MAX_OPTIONS} entries`);
  for (const [option, description] of entries) {
    if (!option || option.length > MAX_OPTION_TEXT) return fail('option names must be 1 to 500 characters');
    if (typeof description !== 'string' || description.length > MAX_OPTION_TEXT) {
      return fail(`options.${option} must be a string of at most ${MAX_OPTION_TEXT} characters`);
    }
  }
  return { ok: true, value: { heard: heard.trim(), options: Object.fromEntries(entries) as Record<string, string> } };
}

export function parseCoachRequest(raw: unknown): Parsed<CoachRequest> {
  const body = raw as { pose?: unknown; summary?: unknown; imageDataUrl?: unknown; model?: unknown } | null;
  const pose = body?.pose;
  const summary = body?.summary;
  const imageDataUrl = body?.imageDataUrl;
  const model = body?.model;
  if (typeof pose !== 'string' || !pose.trim() || pose.length > MAX_POSE) {
    return fail(`pose must be a non-empty string of at most ${MAX_POSE} characters`);
  }
  if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) return fail('summary must be an object');
  if (JSON.stringify(summary).length > MAX_SUMMARY_JSON) return fail(`summary must be at most ${MAX_SUMMARY_JSON} bytes as JSON`);
  if (model !== undefined && (typeof model !== 'string' || !MODEL_PATTERN.test(model))) {
    return fail('model must be a model id such as anthropic/claude-sonnet-5');
  }
  const badImage = 'imageDataUrl must be a base64 data URL of a png, jpeg or webp image';
  let image: CoachRequest['image'] = null;
  if (typeof imageDataUrl === 'string') {
    const head = DATA_URL_HEAD.exec(imageDataUrl);
    if (!head) return fail(badImage);
    const bytes = Buffer.from(imageDataUrl.slice(head[0].length), 'base64');
    if (bytes.length === 0) return fail('imageDataUrl has no image data');
    image = { type: head[1] as ImageType, bytes };
  } else if (imageDataUrl !== undefined) {
    return fail(badImage);
  }
  return { ok: true, value: { pose: pose.trim(), summary, image, model: typeof model === 'string' ? model : null } };
}

const POSE_IDS: Record<PoseId, true> = {
  relaxedFront: true,
  quarterTurnLeftSide: true,
  relaxedBack: true,
  quarterTurnRightSide: true,
  frontDoubleBiceps: true,
  frontLatSpread: true,
  sideChest: true,
  backDoubleBiceps: true,
  backLatSpread: true,
  sideTriceps: true,
  absAndThighs: true,
  mostMuscular: true,
};
const METRIC_IDS: Record<MetricId, true> = {
  hipWidth: true,
  shoulderWidth: true,
  twist: true,
  stanceRatio: true,
  stagger: true,
  kneeFlex: true,
  heelLift: true,
  abduction: true,
  elbowFlex: true,
  elbowHeight: true,
  wristHeight: true,
  wristVsNose: true,
  forearmAngle: true,
  elbowSpan: true,
  wristGap: true,
  headYaw: true,
  shrug: true,
  wristVis: true,
};
const METRIC_SIDES: Record<MetricSide, true> = { left: true, right: true, near: true, far: true };
const PHOTO_IMAGE_TYPES: Record<PhotoImageType, true> = { jpeg: true, webp: true };
const PHOTO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PHOTO_DATA_URL_HEAD = /^data:image\/(jpeg|webp);base64,/;
/** BlazePose landmarks per person, as LANDMARK_COUNT in src/posing/landmarks.ts (a runtime import there would pull src into the Vite config). */
const LANDMARK_COUNT = 33;
const MAX_FAULTS = 32;
const MAX_CUE = 200;
const MAX_NOTE = 1000;
const MODE_PATTERN = /^[A-Za-z][\w-]{0,39}$/;

type PhotoFields = Pick<PhotoMeta, 'score' | 'faults' | 'landmarks' | 'mode' | 'note'>;
type RawPhotoFields = { [K in keyof PhotoFields]?: unknown };

const isKey = <K extends string>(table: Record<K, true>, v: unknown): v is K => typeof v === 'string' && Object.hasOwn(table, v);
const inRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

export const parsePoseId = (v: unknown): PoseId | null => (isKey(POSE_IDS, v) ? v : null);

/** Photo ids are UUIDs, so a valid id can never name a path outside the photo directory. */
export const parsePhotoId = (v: unknown): PhotoId | null =>
  typeof v === 'string' && PHOTO_ID_PATTERN.test(v) ? (v as PhotoId) : null;

function parseLandmarks(raw: unknown): PoseLandmarks | null {
  const lm = raw as { aspect?: unknown; points?: unknown } | null;
  const aspect = lm?.aspect;
  const rawPoints = lm?.points;
  if (!inRange(aspect, 0.05, 20) || !Array.isArray(rawPoints) || rawPoints.length !== LANDMARK_COUNT) return null;
  const points: Landmark[] = [];
  for (const p of rawPoints as ({ x?: unknown; y?: unknown; visibility?: unknown } | null)[]) {
    const x = p?.x, y = p?.y, visibility = p?.visibility;
    if (!inRange(x, -2, 3) || !inRange(y, -2, 3) || !inRange(visibility, 0, 1)) return null;
    points.push({ x, y, visibility });
  }
  return { aspect, points };
}

function parseFault(raw: unknown): PhotoFault | null {
  const f = raw as { metric?: unknown; side?: unknown; cue?: unknown } | null;
  const metric = f?.metric, side = f?.side, cue = f?.cue;
  if (!isKey(METRIC_IDS, metric) || typeof cue !== 'string' || !cue.trim() || cue.length > MAX_CUE) return null;
  if (side === undefined) return { metric, cue: cue.trim() };
  return isKey(METRIC_SIDES, side) ? { metric, side, cue: cue.trim() } : null;
}

function parsePhotoFields(body: RawPhotoFields): Parsed<PhotoFields> {
  const { score, faults, landmarks, mode, note } = body;
  if (!inRange(score, 0, 100)) return fail('score must be a number from 0 to 100');
  if (!Array.isArray(faults) || faults.length > MAX_FAULTS) return fail(`faults must be an array of at most ${MAX_FAULTS} entries`);
  const parsedFaults: PhotoFault[] = [];
  for (const f of faults as unknown[]) {
    const fault = parseFault(f);
    if (!fault) return fail(`each fault must be { metric, side?, cue } with a known metric and a cue of 1 to ${MAX_CUE} characters`);
    parsedFaults.push(fault);
  }
  const value: PhotoFields = { score, faults: parsedFaults };
  if (landmarks !== undefined) {
    const parsed = parseLandmarks(landmarks);
    if (!parsed) return fail(`landmarks must be { aspect, points } with ${LANDMARK_COUNT} points of { x, y, visibility }`);
    value.landmarks = parsed;
  }
  if (mode !== undefined) {
    if (typeof mode !== 'string' || !MODE_PATTERN.test(mode)) return fail('mode must be a short identifier such as learn');
    value.mode = mode;
  }
  if (note !== undefined) {
    if (typeof note !== 'string' || note.length > MAX_NOTE) return fail(`note must be a string of at most ${MAX_NOTE} characters`);
    value.note = note;
  }
  return { ok: true, value };
}

function imageMatches(type: PhotoImageType, bytes: Buffer): boolean {
  if (type === 'jpeg') return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length > 12 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP';
}

export function parsePhotoRequest(raw: unknown): Parsed<PhotoInput> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail('body must be a JSON object');
  const body = raw as RawPhotoFields & { pose?: unknown; imageDataUrl?: unknown };
  const pose = parsePoseId(body.pose);
  if (!pose) return fail('pose must be one of the pose ids');
  const dataUrl = body.imageDataUrl;
  const head = typeof dataUrl === 'string' ? PHOTO_DATA_URL_HEAD.exec(dataUrl) : null;
  if (typeof dataUrl !== 'string' || !head) return fail('imageDataUrl must be a base64 data URL of a jpeg or webp image');
  const type = head[1] as PhotoImageType;
  const bytes = Buffer.from(dataUrl.slice(head[0].length), 'base64');
  if (!imageMatches(type, bytes)) return fail(`imageDataUrl does not hold a ${type} image`);
  const fields = parsePhotoFields(body);
  if (!fields.ok) return fields;
  return { ok: true, value: { pose, image: { type, bytes }, ...fields.value } };
}

/** Reads a sidecar from the photo directory; null when it is not a photo record. */
export function parsePhotoMeta(raw: unknown): PhotoMeta | null {
  const body = raw as (RawPhotoFields & { id?: unknown; pose?: unknown; takenAt?: unknown; image?: unknown }) | null;
  const id = parsePhotoId(body?.id);
  const pose = parsePoseId(body?.pose);
  const takenAt = body?.takenAt, image = body?.image;
  if (!body || !id || !pose || typeof takenAt !== 'string' || Number.isNaN(Date.parse(takenAt))) return null;
  if (!isKey(PHOTO_IMAGE_TYPES, image)) return null;
  const fields = parsePhotoFields(body);
  return fields.ok ? { id, pose, takenAt, image, ...fields.value } : null;
}
