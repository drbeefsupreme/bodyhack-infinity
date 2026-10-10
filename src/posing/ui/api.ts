import { COMMAND_OPTIONS, type IntentReply } from '../modes/commands';
import { field } from '../modes/stored';

// Client for the local API (server/api.ts): health, voice intent through jev, and the coach debrief through omp.
// Replies are parsed here, at the network boundary.

export interface Health {
  readonly omp: boolean;
  readonly jev: boolean;
  readonly coachModel: string | undefined;
}

export async function health(): Promise<Health> {
  const body: unknown = await fetch('/api/health').then((res) => res.json());
  const coachModel = field(body, 'coachModel');
  return { omp: field(body, 'omp') === true, jev: field(body, 'jev') === true, coachModel: typeof coachModel === 'string' ? coachModel : undefined };
}

/** Asks jev which command `heard` means. Any failure (503 when jev is not configured or down) is `unavailable`. */
export async function askIntent(heard: string, signal?: AbortSignal): Promise<IntentReply> {
  try {
    const res = await fetch('/api/intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ heard, options: COMMAND_OPTIONS }),
      signal,
    });
    if (!res.ok) return { kind: 'unavailable' };
    const body: unknown = await res.json();
    const choice = field(body, 'choice');
    const confidence = field(body, 'confidence');
    if (typeof choice !== 'string' || typeof confidence !== 'number') return { kind: 'unavailable' };
    return { kind: 'answer', choice, confidence };
  } catch {
    return { kind: 'unavailable' };
  }
}

export interface CoachNote {
  readonly cues: readonly string[];
  readonly note: string;
  readonly model: string;
  readonly ms: number;
}

export interface CoachAsk {
  readonly pose: string;
  readonly summary: object;
  readonly imageDataUrl: string;
  /** Undefined: the server's default model. */
  readonly model: string | undefined;
}

/** One coach debrief. Throws with the server's error message when it fails. */
export async function askCoach(ask: CoachAsk): Promise<CoachNote> {
  const res = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ask),
  });
  const body: unknown = await res.json().catch(() => undefined);
  const error = field(body, 'error');
  if (!res.ok) throw new Error(typeof error === 'string' ? error : `the coach request failed with ${res.status}`);
  const cues = field(body, 'cues');
  const note = field(body, 'note');
  const model = field(body, 'model');
  const ms = field(body, 'ms');
  if (!Array.isArray(cues) || !cues.every((c) => typeof c === 'string') || typeof note !== 'string') {
    throw new Error('the coach reply had no cues and note');
  }
  return { cues, note, model: typeof model === 'string' ? model : '', ms: typeof ms === 'number' ? ms : 0 };
}
