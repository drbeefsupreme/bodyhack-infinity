// Stacking several terms into one look. Each term "owns" the controls that differ between its
// preset and its contrast preset; owned values win over incidental ones, and opposite pulls on
// the same control are reported as a clash (and averaged) instead of silently overwritten.
import { APPEARANCE_KEYS, type Appearance } from '../three/appearance';
import { PRESETS } from '../content/presets';
import type { Term } from '../content/types';

export const MAX_STACK = 4;
const OWN_THRESHOLD = 0.08;

export interface Clash { key: keyof Appearance; up: string[]; down: string[] }
export interface Combined { appearance: Appearance; clashes: Clash[] }

export function combineTerms(terms: Term[]): Combined {
  const active = terms.filter((t) => t.preset);
  if (active.length === 0) return { appearance: { ...PRESETS.reference }, clashes: [] };
  const out = {} as Appearance;
  const clashes: Clash[] = [];
  for (const key of APPEARANCE_KEYS) {
    const up: { t: Term; v: number }[] = [];
    const down: { t: Term; v: number }[] = [];
    for (const t of active) {
      const v = PRESETS[t.preset!][key];
      const d = v - PRESETS[t.contrast][key];
      if (d > OWN_THRESHOLD) up.push({ t, v });
      else if (d < -OWN_THRESHOLD) down.push({ t, v });
    }
    if (up.length && down.length) {
      const all = [...up, ...down];
      out[key] = all.reduce((s, o) => s + o.v, 0) / all.length;
      clashes.push({ key, up: up.map((o) => o.t.label), down: down.map((o) => o.t.label) });
    } else if (up.length) out[key] = Math.max(...up.map((o) => o.v));
    else if (down.length) out[key] = Math.min(...down.map((o) => o.v));
    else out[key] = active.reduce((s, t) => s + PRESETS[t.preset!][key], 0) / active.length;
  }
  return { appearance: out, clashes };
}
