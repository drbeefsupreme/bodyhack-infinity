// Skin tone and spray tan. Both change only how the skin reflects light, never the body.

export interface Presentation {
  /** Natural skin tone, 0 = very light .. 1 = deep. */
  skin: number;
  /** Spray tan level, 0 = none .. 1 = competition-dark. */
  tan: number;
  /** Oil / sheen, 0 = matte .. 1 = heavy gloss. */
  oil: number;
}

export const DEFAULT_PRESENTATION: Presentation = { skin: 0.35, tan: 0, oil: 0 };

type RGB = [number, number, number];

/** Approximate skin albedo stops in sRGB 0..1, light to deep. */
const SKIN_STOPS: RGB[] = [
  [0.92, 0.8, 0.72],
  [0.87, 0.71, 0.6],
  [0.78, 0.59, 0.47],
  [0.64, 0.46, 0.34],
  [0.46, 0.31, 0.22],
  [0.28, 0.18, 0.13],
];

/** Multiplicative tint of a dark competition tan (mahogany brown), in sRGB. */
const TAN_TINT: RGB = [0.52, 0.39, 0.33];
export const TAN_LEVELS: { at: number; label: string }[] = [
  { at: 0, label: 'None' },
  { at: 0.25, label: 'Light' },
  { at: 0.5, label: 'Medium' },
  { at: 0.75, label: 'Show' },
  { at: 1, label: 'Pro dark' },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function skinToneRGB(skin: number): RGB {
  const x = clamp01(skin) * (SKIN_STOPS.length - 1);
  const i = Math.min(SKIN_STOPS.length - 2, Math.floor(x));
  const t = x - i;
  const a = SKIN_STOPS[i], b = SKIN_STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Final skin albedo in sRGB. The tan multiplies the natural tone, so it darkens light skin a lot
 * and deep skin a little, the way a bronzer layer does. Tan is eased so the first steps are mild.
 */
export function skinAlbedo(p: Pick<Presentation, 'skin' | 'tan'>): RGB {
  const base = skinToneRGB(p.skin);
  const k = Math.pow(clamp01(p.tan), 0.85);
  return [0, 1, 2].map((c) => base[c] * (1 + (TAN_TINT[c] - 1) * k)) as RGB;
}

export function rgbToCss([r, g, b]: RGB): string {
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
}

/** CSS gradient of the skin-tone slider track. */
export function skinTrack(): string {
  return `linear-gradient(90deg, ${SKIN_STOPS.map((s) => rgbToCss(s)).join(', ')})`;
}

/** CSS gradient of the tan slider track for the current natural tone. */
export function tanTrack(skin: number): string {
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => rgbToCss(skinAlbedo({ skin, tan: t })));
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
