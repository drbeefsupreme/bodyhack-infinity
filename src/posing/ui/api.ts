// What the coach and the health check return. The platform's CoachClient (src/posing/platform/types.ts) produces them.

import type { NanoStatusResult } from '../platform/coachPlugin';

/**
 * `server` (web): the local server runs the coach through omp and asks jev with the key in .env.local.
 * `device` (Android): Gemini Nano runs the coach on the phone, and jev gets the TypeSafe key kept in the Keystore.
 */
export type Health =
  | { readonly kind: 'server'; readonly omp: boolean; readonly jev: boolean; readonly coachModel: string | undefined }
  | { readonly kind: 'device'; readonly coach: NanoStatusResult; readonly keyStored: boolean };

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
