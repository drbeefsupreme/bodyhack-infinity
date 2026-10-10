import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { envWithoutKey } from './secrets.ts';

export const DEFAULT_COACH_MODEL = 'anthropic/claude-sonnet-5';
const TIMEOUT_MS = 30_000;
const MAX_CUES = 3;

export type ImageType = 'png' | 'jpeg' | 'webp';

export interface CoachRequest {
  pose: string;
  summary: object;
  image: { type: ImageType; bytes: Buffer } | null;
  model: string | null;
}

export interface CoachReply {
  cues: string[];
  note: string;
}

export interface CoachResult extends CoachReply {
  model: string;
  ms: number;
}

/** The coach model when a request names none: BODYHACK_COACH_MODEL, else DEFAULT_COACH_MODEL. */
export function coachModel(env: NodeJS.ProcessEnv = process.env): string {
  return env.BODYHACK_COACH_MODEL?.trim() || DEFAULT_COACH_MODEL;
}

/** Runs one `omp -p` coach review. The snapshot goes through a temp file that is always deleted. */
export async function runCoach(req: CoachRequest): Promise<CoachResult> {
  const model = req.model ?? coachModel();
  const dir = tmpdir();
  const imagePath = req.image ? join(dir, `bodyhack-coach-${randomUUID()}.${req.image.type}`) : null;
  const started = performance.now();
  try {
    if (req.image && imagePath) await writeFile(imagePath, req.image.bytes, { mode: 0o600 });
    const args = ['-p', '--no-session', `--model=${model}`, '--thinking=off', '--tools=read', coachPrompt(req.pose, req.summary, imagePath)];
    const stdout = await runOmp(args, dir);
    const reply = parseCoachReply(stdout);
    if (!reply) throw new Error(`omp reply had no {"cues", "note"} JSON: ${stdout.trim().slice(-300)}`);
    return { ...reply, model, ms: Math.round(performance.now() - started) };
  } finally {
    if (imagePath) await rm(imagePath, { force: true });
  }
}

export function coachPrompt(pose: string, summary: object, imagePath: string | null): string {
  const look = imagePath
    ? `Use the read tool to read the image file ${imagePath}. It is a snapshot of the athlete holding the pose.`
    : 'No snapshot is available. Base your cues on the tracking summary only.';
  return [
    'You are a bodybuilding posing coach giving a short debrief right after the athlete held a pose.',
    `Pose: ${JSON.stringify(pose)}.`,
    `Tracking summary from the camera's joint tracker (JSON): ${JSON.stringify(summary)}`,
    look,
    `Give at most ${MAX_CUES} short coaching cues the athlete will hear spoken aloud, most important first, each under 12 words.`,
    'Focus on what joint tracking cannot measure: lat flare, chest lift, waist vacuum, tension, facial expression, presentation.',
    'Also give a note: one or two plain sentences of written feedback.',
    'Reply with only this JSON and nothing else: {"cues": ["..."], "note": "..."}',
  ].join('\n');
}

/** Extracts the last `{"cues": string[], "note": string}` object from omp output, tolerating text and fences around it. */
export function parseCoachReply(stdout: string): CoachReply | null {
  let found: CoachReply | null = null;
  for (let start = stdout.indexOf('{'); start !== -1; start = stdout.indexOf('{', start + 1)) {
    const end = matchingBrace(stdout, start);
    if (end === -1) continue;
    let value: { cues?: unknown; note?: unknown } | null;
    try {
      value = JSON.parse(stdout.slice(start, end + 1)) as { cues?: unknown; note?: unknown } | null;
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

function runOmp(args: string[], cwd: string): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const child = spawn('omp', args, { cwd, env: envWithoutKey(), stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (s: string) => (stdout += s));
  child.stderr.setEncoding('utf8').on('data', (s: string) => (stderr += s));
  const timer = setTimeout(() => {
    child.kill('SIGKILL');
    reject(new Error(`omp timed out after ${TIMEOUT_MS / 1000} s`));
  }, TIMEOUT_MS);
  child.on('error', (err) => {
    clearTimeout(timer);
    reject(new Error(`omp failed to start: ${err.message}`));
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    if (code === 0) resolve(stdout);
    else reject(new Error(`omp exited with code ${code}: ${stderr.trim().slice(-300)}`));
  });
  return promise;
}
