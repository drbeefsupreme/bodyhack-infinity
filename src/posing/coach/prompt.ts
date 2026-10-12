// The coach debrief prompt and its reply. Two models read it: a large model through omp on the desktop server
// (server/coach.ts), which opens the snapshot with its read tool, and Gemini Nano on the phone
// (src/posing/platform/androidCoach.ts), which gets the snapshot attached to the request. Both reply with the same JSON,
// and parseCoachReply reads both.

export const MAX_CUES = 3;
const FOCUS = 'lat flare, chest lift, waist vacuum, tension, facial expression, presentation';

export interface CoachReply {
  readonly cues: readonly string[];
  readonly note: string;
}

/** The prompt for a large model behind omp. It reads the snapshot at `imagePath` with its read tool. */
export function ompCoachPrompt(pose: string, summary: object, imagePath: string | null): string {
  const look = imagePath
    ? `Use the read tool to read the image file ${imagePath}. It is a snapshot of the athlete holding the pose.`
    : 'No snapshot is available. Base your cues on the tracking summary only.';
  return [
    'You are a bodybuilding posing coach giving a short debrief right after the athlete held a pose.',
    `Pose: ${JSON.stringify(pose)}.`,
    `Tracking summary from the camera's joint tracker (JSON): ${JSON.stringify(summary)}`,
    look,
    `Give at most ${MAX_CUES} short coaching cues the athlete will hear spoken aloud, most important first, each under 12 words.`,
    `Focus on what joint tracking cannot measure: ${FOCUS}.`,
    'Also give a note: one or two plain sentences of written feedback.',
    'Reply with only this JSON and nothing else: {"cues": ["..."], "note": "..."}',
  ].join('\n');
}

/**
 * The prompt for Gemini Nano, with the snapshot attached. It differs from the omp prompt where a small model needs it:
 * no tool step (the image is in the request), fewer and shorter lines, and JSON placeholders that say what goes in each
 * field in place of `"..."`. The inputs and the reply shape are the same.
 */
export function nanoCoachPrompt(pose: string, summary: object): string {
  return [
    `You are a bodybuilding posing coach. The image shows an athlete holding the pose ${JSON.stringify(pose)}.`,
    `Joint tracker summary (JSON): ${JSON.stringify(summary)}`,
    `Judge what the tracker cannot measure: ${FOCUS}.`,
    `Give at most ${MAX_CUES} cues, most important first, each under 12 words, and a note of one or two sentences.`,
    'Reply with JSON only, no other text, in this form: {"cues": ["first cue", "second cue"], "note": "one or two sentences"}',
  ].join('\n');
}

/** Extracts the last `{"cues": string[], "note": string}` object from a model's reply, tolerating text and fences around it. */
export function parseCoachReply(text: string): CoachReply | null {
  let found: CoachReply | null = null;
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    const end = matchingBrace(text, start);
    if (end === -1) continue;
    let value: { cues?: unknown; note?: unknown } | null;
    try {
      value = JSON.parse(text.slice(start, end + 1)) as { cues?: unknown; note?: unknown } | null;
    } catch {
      continue;
    }
    const cues = value?.cues;
    if (!Array.isArray(cues) || !cues.every((c) => typeof c === 'string')) continue;
    found = { cues: cues.slice(0, MAX_CUES), note: typeof value?.note === 'string' ? value.note : '' };
  }
  return found;
}

/** Index of the `}` that closes the `{` at `start`, skipping braces inside JSON strings; -1 if unclosed. */
function matchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}
