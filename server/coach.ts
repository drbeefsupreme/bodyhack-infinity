import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ompCoachPrompt, parseCoachReply, type CoachReply } from '../src/posing/coach/prompt.ts';
import { envWithoutKey } from './secrets.ts';

export const DEFAULT_COACH_MODEL = 'anthropic/claude-sonnet-5';
const TIMEOUT_MS = 30_000;

export type ImageType = 'png' | 'jpeg' | 'webp';

export interface CoachRequest {
  pose: string;
  summary: object;
  image: { type: ImageType; bytes: Buffer } | null;
  model: string | null;
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
    const args = ['-p', '--no-session', `--model=${model}`, '--thinking=off', '--tools=read', ompCoachPrompt(req.pose, req.summary, imagePath)];
    const stdout = await runOmp(args, dir);
    const reply = parseCoachReply(stdout);
    if (!reply) throw new Error(`omp reply had no {"cues", "note"} JSON: ${stdout.trim().slice(-300)}`);
    return { ...reply, model, ms: Math.round(performance.now() - started) };
  } finally {
    if (imagePath) await rm(imagePath, { force: true });
  }
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
