import { NEUTRAL, type Appearance } from '../three/appearance';

/** Lean, conditioned reference that most stage terms are expressed against. */
export const STAGE: Appearance = {
  size: 0, fullness: 0.3, bodyFat: 0.05, smoothness: 0, separation: 0.8, striations: 0.45, vascularity: 0.55, detail: 0.45,
};

const on = (base: Appearance, patch: Partial<Appearance>): Appearance => ({ ...base, ...patch });

/** Illustrative appearance settings per preset id. Values are artistic, not measurements. */
export const PRESETS = {
  reference: NEUTRAL,
  stage: STAGE,
  full: on(STAGE, { fullness: 0.95 }),
  // Flat keeps leanness, separation and striations: flat is not soft.
  flat: on(STAGE, { fullness: -0.95, vascularity: 0.35 }),
  pumped: on(STAGE, { fullness: 0.85, vascularity: 1 }),
  unpumped: on(STAGE, { fullness: 0.15, vascularity: 0.35 }),
  // Spilled over: full volume with the same softened surface as "smooth"; the cause is unproven.
  spilled: on(STAGE, { fullness: 0.95, smoothness: 0.7, separation: 0.6, striations: 0.1, vascularity: 0.3 }),
  // Dry vs watery: surface sharpness only; volume is held at the stage reference.
  dry: on(STAGE, { separation: 0.95, striations: 0.75, vascularity: 0.8, detail: 0.55 }),
  watery: on(STAGE, { smoothness: 0.75, separation: 0.7, striations: 0.1, vascularity: 0.25 }),
  offseason: { size: 0.15, fullness: 0.5, bodyFat: 0.85, smoothness: 0.1, separation: 0.3, striations: 0, vascularity: 0.15, detail: 0.2 },
  lean: { size: 0, fullness: 0.2, bodyFat: 0.3, smoothness: 0, separation: 0.5, striations: 0.05, vascularity: 0.3, detail: 0.3 },
  cut: { size: 0, fullness: 0.25, bodyFat: 0.12, smoothness: 0, separation: 0.85, striations: 0.15, vascularity: 0.45, detail: 0.35 },
  shredded: on(STAGE, { bodyFat: 0.03, separation: 0.95, striations: 0.75, vascularity: 0.75 }),
  peeled: on(STAGE, { bodyFat: 0, fullness: 0.4, separation: 1, striations: 1, vascularity: 0.9, detail: 0.65 }),
  crispy: on(STAGE, { bodyFat: 0, separation: 1, striations: 0.85, vascularity: 0.8, detail: 0.75 }),
  stageReady: on(STAGE, { bodyFat: 0.02, fullness: 0.7, separation: 0.92, striations: 0.6, vascularity: 0.7, detail: 0.5 }),
  separation: on(STAGE, { separation: 1, striations: 0.05 }),
  striations: on(STAGE, { separation: 0.6, striations: 1 }),
  vascular: on(STAGE, { vascularity: 1 }),
  lowVascular: on(STAGE, { vascularity: 0.1 }),
  mature: on(STAGE, { detail: 1, striations: 0.5 }),
  smoothDetail: on(STAGE, { detail: 0, striations: 0.5 }),
  dense: on(STAGE, { fullness: 0.55, separation: 0.95, detail: 0.7, striations: 0.5 }),
  sizeUp: on(NEUTRAL, { size: 0.9 }),
  big: on(NEUTRAL, { size: 0.9, bodyFat: 0.55, separation: 0.35, striations: 0, vascularity: 0.15 }),
  smallLean: on(STAGE, { size: -0.9, bodyFat: 0.03, separation: 0.9, striations: 0.6 }),
} satisfies Record<string, Appearance>;

export type PresetId = keyof typeof PRESETS;
