import { useEffect, useState, type CSSProperties } from 'react';
import type { Cue, Group, GroupId, Term, Source } from '../content/types';
import { PRESETS } from '../content/presets';
import { describeChanges, type Change } from '../lib/whatChanged';
import { MAX_STACK, type Clash } from '../lib/combine';
import type { Appearance } from '../three/appearance';
import { GROUP_STYLE, STAT } from './theme';
import { IconBolt, IconCheck, IconLayers, IconPlus, IconQuestion, IconTarget, IconVersus, IconX } from './Icons';

export const USAGE_LABEL: Record<Term['usage'], string> = {
  consistent: 'Usage: consistent',
  mostly: 'Usage: mostly consistent',
  overlapping: 'Usage: overlapping slang',
  disputed: 'Usage: disputed',
};
export const EVIDENCE_LABEL: Record<Term['evidence'], string> = {
  supported: 'Cause: well supported',
  partial: 'Cause: partly supported',
  contested: 'Cause: contested / unproven',
  'not-a-cause': 'Describes a look, not a cause',
};

const groupVar = (t: Term) => ({ '--c': GROUP_STYLE[t.group].color }) as CSSProperties;

// ------------------------------------------------------------------ deck
export interface DeckProps {
  groups: Group[];
  terms: Term[];
  selected: string[];
  focused: string;
  stackMode: boolean;
  collected: ReadonlySet<string>;
  onPick: (id: string, additive: boolean) => void;
  onStackMode: (on: boolean) => void;
}

export function Deck(p: DeckProps) {
  const focusedGroup = p.terms.find((t) => t.id === p.focused)?.group ?? p.groups[0].id;
  const [tab, setTab] = useState<GroupId>(focusedGroup);
  // Follow the focused card into its group (e.g. when a related term is opened).
  useEffect(() => setTab(focusedGroup), [focusedGroup]);
  const group = p.groups.find((g) => g.id === tab)!;
  const { color } = GROUP_STYLE[tab];
  return (
    <nav className="deck" aria-label="Vocabulary">
      <div className="deck-head">
        <h2 className="display">Vocabulary deck</h2>
        <button type="button" className={`switch ${p.stackMode ? 'on' : ''}`} role="switch" aria-checked={p.stackMode}
          onClick={() => p.onStackMode(!p.stackMode)} title="Combine up to four terms into one look (or Shift-click a card)">
          <IconLayers size={15} /> Stack terms <span className="knob" aria-hidden="true" />
        </button>
      </div>
      <div className="deck-tabs" role="tablist" aria-label="Term groups">
        {p.groups.map((g) => {
          const { color: c, short, Icon } = GROUP_STYLE[g.id];
          const inGroup = p.terms.filter((t) => t.group === g.id);
          const picked = inGroup.filter((t) => p.selected.includes(t.id)).length;
          return (
            <button key={g.id} type="button" role="tab" aria-selected={tab === g.id} aria-controls="deck-panel" id={`tab-${g.id}`}
              className="deck-tab" style={{ '--c': c } as CSSProperties} onClick={() => setTab(g.id)} title={g.blurb}>
              <Icon size={16} />
              <span>{short}</span>
              <small>{inGroup.filter((t) => p.collected.has(t.id)).length}/{inGroup.length}</small>
              {picked > 0 && <i className="tab-dot" aria-label={`${picked} selected`} />}
            </button>
          );
        })}
      </div>
      <section id="deck-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="deck-group" style={{ '--c': color } as CSSProperties}>
        <p className="grp-blurb"><strong>{group.label}.</strong> {group.blurb}</p>
        <div className="cards">
          {p.terms.filter((t) => t.group === tab).map((t) => {
            const on = p.selected.includes(t.id);
            const order = p.stackMode ? p.selected.indexOf(t.id) : -1;
            return (
              <button key={t.id} type="button" className={`card ${on ? 'on' : ''} ${p.focused === t.id ? 'focused' : ''}`}
                aria-pressed={on} onClick={(e) => p.onPick(t.id, p.stackMode || e.shiftKey)}>
                <span className="card-name">{t.label}</span>
                <span className="card-icons">
                  {t.evidence === 'contested' && <span className="ic warn" title="Explanation is contested"><IconQuestion size={13} label="contested explanation" /></span>}
                  {!t.preset && <span className="ic info" title="Explanation only, the model does not change">i</span>}
                  {p.collected.has(t.id) && !on && <span className="ic got" title="Explored"><IconCheck size={12} label="explored" /></span>}
                  {p.stackMode && (order >= 0 ? <span className="ic order">{order + 1}</span> : <span className="ic add"><IconPlus size={12} /></span>)}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <p className="hint">{p.stackMode
        ? `Tap cards to add or remove them from your stack (up to ${MAX_STACK}). Cards can come from different groups.`
        : 'Tap a card to show it on the model. Shift-click, or switch on Stack terms, to combine several.'}</p>
    </nav>
  );
}

// ------------------------------------------------------------------ change bars
export function ChangeList(p: { from: Appearance; to: Appearance; changes: Change[]; fromLabel: string; toLabel: string }) {
  if (p.changes.length === 0) return <p className="hint">The body settings are the same.</p>;
  return (
    <ul className="changes">
      {p.changes.map((c) => {
        const s = STAT[c.key];
        const pos = (v: number) => (s.signed ? (v + 1) / 2 : v) * 100;
        const a = pos(p.from[c.key]), b = pos(p.to[c.key]);
        return (
          <li key={c.key}>
            <div className="change-head">
              <strong>{c.label}</strong>
              <span className={`delta ${c.direction}`}>{c.direction === 'up' ? '▲ more' : '▼ less'}</span>
            </div>
            <div className="delta-track" role="img" aria-label={`${c.label}: ${p.fromLabel} ${Math.round(a)}%, ${p.toLabel} ${Math.round(b)}%`}>
              <span className="delta-span" style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(b - a)}%` }} />
              <span className="delta-from" style={{ left: `${a}%` }} />
              <span className="delta-to" style={{ left: `${b}%` }} />
            </div>
            <p>{c.text}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** Merges per-control clashes that involve the same two groups of cards. */
function groupClashes(clashes: Clash[]): { sides: [string, string]; stats: string[] }[] {
  const groups = new Map<string, { sides: [string, string]; stats: string[] }>();
  for (const c of clashes) {
    const sides = [c.up.join(' & '), c.down.join(' & ')].sort() as [string, string];
    const key = sides.join('|');
    const g = groups.get(key) ?? { sides, stats: [] };
    g.stats.push(STAT[c.key].short.toLowerCase());
    groups.set(key, g);
  }
  return [...groups.values()];
}

// ------------------------------------------------------------------ stack tray
export function StackTray(p: {
  terms: Term[]; clashes: Clash[]; appearance: Appearance; focused: string;
  onFocus: (id: string) => void; onRemove: (id: string) => void; onClear: () => void;
}) {
  const changes = describeChanges(PRESETS.stage, p.appearance);
  return (
    <section className="stack" aria-labelledby="stack-h">
      <div className="stack-head">
        <h2 id="stack-h" className="display"><IconLayers size={18} /> Your stack</h2>
        <button type="button" className="pill" onClick={p.onClear}>Clear</button>
      </div>
      <ul className="stack-cards">
        {p.terms.map((t, i) => (
          <li key={t.id} style={groupVar(t)} className={p.focused === t.id ? 'focused' : ''}>
            <button type="button" className="stack-name" onClick={() => p.onFocus(t.id)} aria-pressed={p.focused === t.id}>
              <span className="stack-n">{i + 1}</span>{t.label}{!t.preset && <em> (info only)</em>}
            </button>
            <button type="button" className="icon-btn" aria-label={`Remove ${t.label}`} onClick={() => p.onRemove(t.id)}><IconX size={13} /></button>
          </li>
        ))}
      </ul>
      {p.terms.length < 2 && <p className="hint">Add another card to combine them.</p>}
      {groupClashes(p.clashes).map((g) => (
        <div key={g.sides.join('|')} className="clash" role="note">
          <IconBolt size={16} />
          <p><strong>Clash!</strong> {g.sides[0]} vs {g.sides[1]} pull <strong>{g.stats.join(', ')}</strong> in opposite
            directions. One body cannot look both ways at once, so the model splits the difference.</p>
        </div>
      ))}
      {p.terms.length >= 2 && (
        <>
          <h4>Combined look vs the stage-lean reference</h4>
          <ChangeList from={PRESETS.stage} to={p.appearance} changes={changes} fromLabel="reference" toLabel="stack" />
        </>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ term card
export interface TermDetailProps {
  term: Term;
  terms: Term[];
  sources: Record<string, Source>;
  onCue: (c: Cue | null) => void;
  activeCue: Cue | null;
  onCompare: () => void;
  onSelect: (id: string) => void;
  showChanges: boolean;
}

export function TermDetail({ term, terms, sources, onCue, activeCue, onCompare, onSelect, showChanges }: TermDetailProps) {
  const from = PRESETS[term.contrast];
  const to = term.preset ? PRESETS[term.preset] : from;
  const changes = term.preset ? describeChanges(from, to) : [];
  const contrastTerm = terms.find((t) => t.preset === term.contrast);
  const { Icon } = GROUP_STYLE[term.group];
  return (
    <article className="term" aria-labelledby="term-title" style={groupVar(term)}>
      <header className="term-head">
        <span className="term-badge" aria-hidden="true"><Icon size={22} /></span>
        <div>
          <h2 id="term-title" className="display">{term.label}</h2>
          {term.aka && term.aka.length > 0 && <p className="aka">aka {term.aka.join(' · ')}</p>}
        </div>
      </header>
      <div className="badges">
        <span className={`badge usage-${term.usage}`}>{USAGE_LABEL[term.usage]}</span>
        <span className={`badge ev-${term.evidence}`}>{EVIDENCE_LABEL[term.evidence]}</span>
      </div>
      <p className="summary">{term.summary}</p>

      <section aria-labelledby="cues-h">
        <h4 id="cues-h"><IconTarget size={15} /> Look for</h4>
        <ol className="cues">
          {term.cues.map((c, i) => (
            <li key={i}>
              <button type="button" className="cue" aria-pressed={activeCue === c} onClick={() => onCue(activeCue === c ? null : c)}>
                <span className="cue-n" aria-hidden="true">{i + 1}</span>
                <span>{c.text}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {term.preset && showChanges && (
        <section aria-labelledby="changed-h" className="changed">
          <h4 id="changed-h">What changed</h4>
          <p className="hint">vs <strong>{contrastTerm?.label ?? 'the reference'}</strong>. Same person, pose, camera, light and skin.</p>
          <ChangeList from={from} to={to} changes={changes} fromLabel={contrastTerm?.label ?? 'reference'} toLabel={term.label} />
          <button type="button" className="btn" onClick={onCompare}><IconVersus size={16} /> Face-off: {term.label} vs {contrastTerm?.label ?? 'reference'}</button>
        </section>
      )}
      {!term.preset && <p className="hint info-only">{term.note ?? 'This term is about structure or judgment, so the model does not change. Read the details below.'}</p>}

      <details className="deeper">
        <summary>Deeper explanation</summary>
        <dl>
          <dt>Visible features</dt><dd>{term.deeper.visible}</dd>
          <dt>Often confused with</dt><dd>{term.deeper.confusedWith}</dd>
          <dt>How consistent is the usage?</dt><dd>{term.deeper.usageNote}</dd>
          <dt>What evidence supports</dt><dd>{term.deeper.supported}</dd>
          <dt>Plausible but unproven, or folklore</dt><dd>{term.deeper.speculative}</dd>
          <dt>How this model shows it</dt><dd>{term.deeper.model}</dd>
        </dl>
        {term.neighbors.length > 0 && (
          <p className="neighbors">Related:{' '}
            {term.neighbors.map((n) => {
              const t = terms.find((x) => x.id === n);
              return t ? <button key={n} type="button" className="pill small" style={groupVar(t)} onClick={() => onSelect(n)}>{t.label}</button> : null;
            })}
          </p>
        )}
      </details>
      <details className="deeper">
        <summary>Sources ({term.sources.length})</summary>
        <ol className="sources">
          {term.sources.map((id) => {
            const s = sources[id];
            if (!s) return null;
            return (
              <li key={id}>
                <a href={s.url} target="_blank" rel="noreferrer noopener">{s.title}</a>
                <span className="src-meta"> — {s.authors}, {s.year}. <em>{s.kind}</em>. {s.supports}</span>
              </li>
            );
          })}
        </ol>
      </details>
    </article>
  );
}
