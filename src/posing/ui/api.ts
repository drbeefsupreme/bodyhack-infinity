// What the coach and the health check return. The platform's CoachClient (src/posing/platform/types.ts) produces them.

export interface Health {
  readonly omp: boolean;
  readonly jev: boolean;
  readonly coachModel: string | undefined;
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
