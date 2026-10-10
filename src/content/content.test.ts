import { describe, expect, it } from 'vitest';
import raw from './sources.generated.json';
import { TERMS, COMPARISONS, QUIZ, SOURCES } from '.';
import { PRESETS } from './presets';
import { describeChanges } from '../lib/whatChanged';
import { toRenderParams, NEUTRAL } from '../three/appearance';

const ids = new Set((raw as { id: string }[]).map((s) => s.id));

describe('content integrity', () => {
  it('every cited source exists in the verified research lists and has an https URL', () => {
    const missing = TERMS.flatMap((t) => t.sources.filter((s) => !ids.has(s)).map((s) => `${t.id}:${s}`));
    expect(missing).toEqual([]);
    for (const s of SOURCES) expect(s.url).toMatch(/^https?:\/\//);
  });

  it('term presets, contrasts and neighbors resolve', () => {
    const termIds = new Set(TERMS.map((t) => t.id));
    for (const t of TERMS) {
      if (t.preset) expect(PRESETS[t.preset], t.id).toBeDefined();
      expect(PRESETS[t.contrast], t.id).toBeDefined();
      for (const n of t.neighbors) expect(termIds.has(n), `${t.id} -> ${n}`).toBe(true);
      expect(t.cues.length).toBeGreaterThan(0);
    }
  });

  it('comparisons and quiz items use real presets', () => {
    for (const c of COMPARISONS) { expect(PRESETS[c.a]).toBeDefined(); expect(PRESETS[c.b]).toBeDefined(); }
    for (const q of QUIZ) { expect(PRESETS[q.target]).toBeDefined(); expect(PRESETS[q.other]).toBeDefined(); }
  });

  it('quiz pairs differ in body settings or in lighting', () => {
    for (const q of QUIZ) {
      const differs = describeChanges(PRESETS[q.target], PRESETS[q.other]).length > 0;
      expect(differs || (q.lighting && q.lighting.target !== q.lighting.other), q.id).toBeTruthy();
    }
  });
});

describe('matched comparisons hold the right things constant (validated against research)', () => {
  const keys = (a: keyof typeof PRESETS, b: keyof typeof PRESETS) => describeChanges(PRESETS[a], PRESETS[b], 0.01).map((c) => c.key);

  it('full vs flat changes fullness and veins only, not leanness or separation', () => {
    const k = keys('full', 'flat');
    expect(k).toContain('fullness');
    expect(k).not.toContain('bodyFat');
    expect(k).not.toContain('separation');
    expect(k).not.toContain('smoothness');
  });

  it('dry vs watery keeps volume and leanness fixed', () => {
    const k = keys('dry', 'watery');
    expect(k).not.toContain('fullness');
    expect(k).not.toContain('size');
    expect(k).not.toContain('bodyFat');
  });

  it('mature vs smooth changes only the detail control', () => {
    expect(keys('mature', 'smoothDetail')).toEqual(['detail']);
  });

  it('spilled keeps the fullness of the sharp, full reference', () => {
    expect(Math.abs(PRESETS.spilled.fullness - PRESETS.stageReady.fullness)).toBeLessThan(0.3);
    expect(PRESETS.spilled.smoothness).toBeGreaterThan(0.5);
  });

  it('the lighting comparison uses identical bodies', () => {
    const c = COMPARISONS.find((x) => x.id === 'light')!;
    expect(c.a).toBe(c.b);
    expect(c.lighting?.a).not.toBe(c.lighting?.b);
  });
});

describe('appearance coupling', () => {
  it('fat hides striations, grain and veins', () => {
    const lean = toRenderParams({ ...NEUTRAL, bodyFat: 0, striations: 1, detail: 1, vascularity: 1 });
    const soft = toRenderParams({ ...NEUTRAL, bodyFat: 1, striations: 1, detail: 1, vascularity: 1 });
    expect(lean.stri).toBeGreaterThan(0.9);
    expect(soft.stri).toBe(0);
    expect(soft.grain).toBe(0);
    expect(soft.influences[8]).toBe(0);
  });

  it('fullness maps to full/flat targets without touching size', () => {
    const r = toRenderParams({ ...NEUTRAL, fullness: -0.5 });
    expect(r.influences[0]).toBe(0);
    expect(r.influences[1]).toBeCloseTo(0.5);
    expect(r.influences[2]).toBe(0);
    expect(r.influences[3]).toBe(0);
  });
});
