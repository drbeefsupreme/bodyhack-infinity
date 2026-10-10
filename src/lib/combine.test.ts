import { describe, expect, it } from 'vitest';
import { combineTerms } from './combine';
import { TERMS } from '../content';
import { PRESETS } from '../content/presets';
import { skinAlbedo } from '../three/skin';

const t = (...ids: string[]) => ids.map((id) => TERMS.find((x) => x.id === id)!);

describe('combineTerms', () => {
  it('peeled + shredded stack without a clash and keep the stronger lines', () => {
    const r = combineTerms(t('peeled', 'shredded'));
    expect(r.clashes).toEqual([]);
    expect(r.appearance.striations).toBeCloseTo(Math.max(PRESETS.peeled.striations, PRESETS.shredded.striations));
  });

  it('full + dry gives full volume with a sharp surface', () => {
    const r = combineTerms(t('full', 'dry'));
    expect(r.clashes).toEqual([]);
    expect(r.appearance.fullness).toBeCloseTo(PRESETS.full.fullness);
    expect(r.appearance.striations).toBeCloseTo(PRESETS.dry.striations);
    expect(r.appearance.smoothness).toBe(0);
  });

  it('a term does not override controls it does not own (full keeps off-season fat)', () => {
    const r = combineTerms(t('full', 'offseason'));
    expect(r.clashes).toEqual([]);
    expect(r.appearance.bodyFat).toBeCloseTo(PRESETS.offseason.bodyFat);
    expect(r.appearance.fullness).toBeCloseTo(PRESETS.full.fullness);
  });

  it('opposite pulls are reported as clashes and averaged', () => {
    const r = combineTerms(t('offseason', 'shredded'));
    const keys = r.clashes.map((c) => c.key);
    expect(keys).toContain('bodyFat');
    expect(r.appearance.bodyFat).toBeGreaterThan(PRESETS.shredded.bodyFat);
    expect(r.appearance.bodyFat).toBeLessThan(PRESETS.offseason.bodyFat);
    expect(combineTerms(t('full', 'flat')).clashes.map((c) => c.key)).toContain('fullness');
  });

  it('a single term reproduces its preset', () => {
    expect(combineTerms(t('spilled')).appearance).toEqual(PRESETS.spilled);
  });

  it('explanation-only terms are ignored', () => {
    expect(combineTerms(t('symmetry', 'full')).appearance).toEqual(PRESETS.full);
  });
});

describe('skin and spray tan', () => {
  it('tan darkens every tone, light skin more than deep skin', () => {
    const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    for (const skin of [0, 0.5, 1]) expect(lum(skinAlbedo({ skin, tan: 1 }))).toBeLessThan(lum(skinAlbedo({ skin, tan: 0 })));
    const drop = (skin: number) => lum(skinAlbedo({ skin, tan: 0 })) - lum(skinAlbedo({ skin, tan: 1 }));
    expect(drop(0)).toBeGreaterThan(drop(1));
  });
});
