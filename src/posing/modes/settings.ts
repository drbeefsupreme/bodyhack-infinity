import { HOLD_GOALS_S, type HoldGoal } from './hold';
import { field, storedObject } from './stored';

// Tutor settings kept in localStorage. The speech voice and mute live in the Speech wrapper (src/posing/speech.ts).

export const SETTINGS_KEY = 'posing-tutor-settings';

export interface TutorSettings {
  readonly voiceCommands: boolean;
  readonly debrief: boolean;
  /** Empty: the server's default coach model. */
  readonly coachModel: string;
  readonly holdGoal: HoldGoal;
}

export const DEFAULT_SETTINGS: TutorSettings = { voiceCommands: true, debrief: true, coachModel: '', holdGoal: 10 };

/** The same pattern the server accepts for a model id (server/validate.ts). */
export const MODEL_PATTERN = /^[A-Za-z0-9][\w.:/@-]{0,99}$/;

export function parseSettings(raw: string | null): TutorSettings {
  const stored = storedObject(raw);
  const voiceCommands = field(stored, 'voiceCommands');
  const debrief = field(stored, 'debrief');
  const coachModel = field(stored, 'coachModel');
  const holdGoal = field(stored, 'holdGoal');
  return {
    voiceCommands: typeof voiceCommands === 'boolean' ? voiceCommands : DEFAULT_SETTINGS.voiceCommands,
    debrief: typeof debrief === 'boolean' ? debrief : DEFAULT_SETTINGS.debrief,
    coachModel: typeof coachModel === 'string' && MODEL_PATTERN.test(coachModel) ? coachModel : '',
    holdGoal: HOLD_GOALS_S.find((g) => g === holdGoal) ?? DEFAULT_SETTINGS.holdGoal,
  };
}
