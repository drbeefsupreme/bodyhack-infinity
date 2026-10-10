import type { Comparison, Term } from '../content/types';
import { PRESETS, type PresetId } from '../content/presets';
import { describeChanges } from '../lib/whatChanged';
import { ChangeList } from './TermPanel';
import { IconSwap, IconSpot } from './Icons';

export interface CompareState { a: PresetId; b: PresetId; comparisonId: string | null }

export function ComparePanel(p: {
  comparisons: Comparison[];
  terms: Term[];
  state: CompareState;
  onChange: (s: CompareState) => void;
  onPick: (c: Comparison) => void;
  onSwap: () => void;
}) {
  const current = p.comparisons.find((c) => c.id === p.state.comparisonId) ?? null;
  const options = p.terms.filter((t) => t.preset).map((t) => ({ id: t.preset as PresetId, label: t.label }));
  const uniq = options.filter((o, i) => options.findIndex((x) => x.id === o.id) === i);
  const label = (id: PresetId) => uniq.find((o) => o.id === id)?.label ?? id;
  const changes = describeChanges(PRESETS[p.state.a], PRESETS[p.state.b]);
  const aLabel = current?.aLabel ?? label(p.state.a), bLabel = current?.bLabel ?? label(p.state.b);
  return (
    <div className="versus">
      <section aria-labelledby="cmp-h">
        <h2 id="cmp-h" className="display">Pick a face-off</h2>
        <p className="hint">Same person, pose, camera and light on both sides, unless the face-off is about light.</p>
        <ul className="matchups">
          {p.comparisons.map((c) => (
            <li key={c.id}>
              <button type="button" className="matchup" aria-pressed={p.state.comparisonId === c.id} onClick={() => p.onPick(c)}
                aria-label={`${c.aLabel} versus ${c.bLabel}: ${c.title}`}>
                <span className="m-a">{c.aLabel}</span>
                <span className="m-vs">{c.lighting ? <IconSpot size={14} /> : 'VS'}</span>
                <span className="m-b">{c.bLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {current && (
        <section className="callout" aria-live="polite">
          <h3>{current.title}</h3>
          <p>{current.note}</p>
        </section>
      )}
      <section aria-labelledby="cmp-custom" className="custom">
        <h3 id="cmp-custom" className="display small">Custom match</h3>
        <div className="ab-pickers">
          <label className="pick-a">A
            <select value={p.state.a} onChange={(e) => p.onChange({ ...p.state, a: e.target.value as PresetId, comparisonId: null })}>
              {uniq.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <button type="button" className="icon-btn big" onClick={p.onSwap} aria-label="Swap A and B"><IconSwap size={18} /></button>
          <label className="pick-b">B
            <select value={p.state.b} onChange={(e) => p.onChange({ ...p.state, b: e.target.value as PresetId, comparisonId: null })}>
              {uniq.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </section>
      <section aria-labelledby="cmp-diff" className="changed">
        <h3 id="cmp-diff" className="display small">Tale of the tape</h3>
        {current?.lighting && current.lighting.a !== current.lighting.b && (
          <p className="callout warn"><strong>Only the light differs.</strong> The bodies are identical, so every difference you see comes from the lighting.</p>
        )}
        <ChangeList from={PRESETS[p.state.a]} to={PRESETS[p.state.b]} changes={changes} fromLabel={`A ${aLabel}`} toLabel={`B ${bLabel}`} />
      </section>
    </div>
  );
}
