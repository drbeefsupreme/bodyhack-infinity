// Parses the replies of /api/health, /api/intent and /api/coach (server/api.ts). The web platform gets them from its
// own server, the Android platform from the paired bridge; both parse here, at the network boundary.

import type { IntentReply } from '../modes/commands';
import { field } from '../modes/stored';
import type { CoachNote, Health } from '../ui/api';

export function parseHealth(body: unknown): Health {
  const coachModel = field(body, 'coachModel');
  return { omp: field(body, 'omp') === true, jev: field(body, 'jev') === true, coachModel: typeof coachModel === 'string' ? coachModel : undefined };
}

/** Any failure (503 when jev is not configured or down) is `unavailable`. */
export function parseIntent(ok: boolean, body: unknown): IntentReply {
  const choice = field(body, 'choice');
  const confidence = field(body, 'confidence');
  if (!ok || typeof choice !== 'string' || typeof confidence !== 'number') return { kind: 'unavailable' };
  return { kind: 'answer', choice, confidence };
}

/** Throws with the server's error message when the request failed. */
export function parseCoach(status: number, body: unknown): CoachNote {
  const error = field(body, 'error');
  if (status < 200 || status > 299) throw new Error(typeof error === 'string' ? error : `the coach request failed with ${status}`);
  const cues = field(body, 'cues');
  const note = field(body, 'note');
  const model = field(body, 'model');
  const ms = field(body, 'ms');
  if (!Array.isArray(cues) || !cues.every((c) => typeof c === 'string') || typeof note !== 'string') {
    throw new Error('the coach reply had no cues and note');
  }
  return { cues, note, model: typeof model === 'string' ? model : '', ms: typeof ms === 'number' ? ms : 0 };
}
