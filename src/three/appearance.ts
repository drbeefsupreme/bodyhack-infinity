// Illustrative appearance controls and their mapping onto morph targets and shader detail.
// These are artistic control values, not physiological measurements.

export interface Appearance {
  /** Overall muscle mass (-1 smaller .. +1 larger). Changes cross-sections, not the skeleton. */
  size: number;
  /** Belly roundness (-1 flat .. +1 full). */
  fullness: number;
  /** Subcutaneous softness from body fat (0 stage-lean .. 1 off-season). */
  bodyFat: number;
  /** Uniform smoothing of detail (the "smooth / watery" impression), separate from fat distribution. */
  smoothness: number;
  /** Depth of grooves at muscle borders (0..1). */
  separation: number;
  /** Visibility of fine fiber lines on lean muscle bellies (0..1). */
  striations: number;
  /** Prominence of superficial veins (0..1). */
  vascularity: number;
  /** Intramuscular detail plus grainy micro-texture: the "mature / dense" impression (0..1). */
  detail: number;
}

export const APPEARANCE_KEYS: (keyof Appearance)[] = [
  'size', 'fullness', 'bodyFat', 'smoothness', 'separation', 'striations', 'vascularity', 'detail',
];

export const NEUTRAL: Appearance = {
  size: 0, fullness: 0, bodyFat: 0.35, smoothness: 0, separation: 0.4, striations: 0, vascularity: 0.15, detail: 0.2,
};

/** Morph target order baked by scripts/model/build.ts. */
export const TARGET_ORDER = ['full', 'flat', 'sizeUp', 'sizeDown', 'fat', 'smooth', 'sep', 'detail', 'vein'] as const;

// Base mesh state baked in the build (BASE_STATE in scripts/model/types.ts).
const BASE_SEP = 0.35;
const BASE_DETAIL = 0.15;

export interface RenderParams {
  influences: number[]; // in TARGET_ORDER
  stri: number;
  grain: number;
  veinTint: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Couples the controls the way appearance works on a real body: fat and smoothing hide grooves,
 * fiber lines, grain and veins. This coupling is a modeling choice, stated in the UI.
 */
export function toRenderParams(a: Appearance): RenderParams {
  const fat = clamp(a.bodyFat, 0, 1);
  const smooth = clamp(a.smoothness, 0, 1);
  const lean = 1 - fat;
  const mask = (1 - 0.85 * fat) * (1 - 0.6 * smooth);
  const sep = ((clamp(a.separation, 0, 1) - BASE_SEP) / (1 - BASE_SEP)) * mask;
  const detail = ((clamp(a.detail, 0, 1) - BASE_DETAIL) / (1 - BASE_DETAIL)) * mask;
  const vein = clamp(a.vascularity, 0, 1) * Math.pow(lean, 1.5) * (1 - 0.5 * smooth);
  return {
    influences: [
      Math.max(0, a.fullness), Math.max(0, -a.fullness),
      Math.max(0, a.size), Math.max(0, -a.size),
      fat, smooth, sep, detail, vein,
    ],
    stri: clamp(a.striations, 0, 1) * lean * lean * (1 - 0.8 * smooth),
    grain: clamp(a.detail, 0, 1) * Math.pow(lean, 1.5) * (1 - 0.7 * smooth),
    veinTint: vein * 0.6,
  };
}

export function lerpAppearance(a: Appearance, b: Appearance, t: number): Appearance {
  const out = { ...a };
  for (const k of APPEARANCE_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}
