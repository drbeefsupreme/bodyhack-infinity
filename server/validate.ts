import type { CoachRequest, ImageType } from './coach.ts';

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
