import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Stage, webglAvailable, MODEL_OVERRIDE } from './components/Stage';
import { Toolbar } from './components/Toolbar';
import { Deck, StackTray, TermDetail } from './components/TermPanel';
import { Advanced } from './components/Advanced';
import { ComparePanel, type CompareState } from './components/Compare';
import { Quiz, type QuizRoundInfo } from './components/Quiz';
import { Fallback } from './components/Fallback';
import { LookMeter, SkinPanel } from './components/Hud';
import { IconCompass, IconMotion, IconTarget, IconTrophy, IconVersus } from './components/Icons';
import { GROUPS, TERMS, SOURCES, COMPARISONS, QUIZ } from './content';
import { PRESETS, type PresetId } from './content/presets';
import type { Comparison, Cue } from './content/types';
import { combineTerms, MAX_STACK } from './lib/combine';
import type { Appearance } from './three/appearance';
import { DEFAULT_PRESENTATION, type Presentation } from './three/skin';
import type { FocusName, LightingMode, ViewName } from './three/Viewer';

type Mode = 'explore' | 'compare' | 'quiz';

const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.id, s]));
const COLLECTED_KEY = 'bae-collected';
const BACK_FOCI: Partial<Record<FocusName, true>> = { back: true, glutes: true, hamstrings: true, lowerback: true, calves: true };

function usePrefersReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)';
  const [v, setV] = useState(() => window.matchMedia?.(q).matches ?? false);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const on = () => setV(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return v;
}

function loadCollected(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(COLLECTED_KEY) ?? '[]') as string[]); } catch { return new Set(); }
}

export function App() {
  const params = new URLSearchParams(location.search);
  const startTerm = TERMS.some((t) => t.id === params.get('term')) ? params.get('term')! : 'full';
  const [mode, setMode] = useState<Mode>((params.get('mode') as Mode) || 'explore');
  const [selected, setSelected] = useState<string[]>([startTerm]);
  const [focusedId, setFocusedId] = useState(startTerm);
  const [stackMode, setStackMode] = useState(false);
  const [custom, setCustom] = useState<Appearance | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lighting, setLighting] = useState<LightingMode>('neutral');
  const [presentation, setPresentation] = useState<Presentation>(DEFAULT_PRESENTATION);
  const [camera, setCamera] = useState<{ view: ViewName; focus: FocusName; nonce: number }>({ view: 'front', focus: 'full', nonce: 0 });
  const [cue, setCue] = useState<Cue | null>(null);
  const [cmp, setCmp] = useState<CompareState>({ a: 'full', b: 'flat', comparisonId: COMPARISONS[0]?.id ?? null });
  const [quizRound, setQuizRound] = useState<QuizRoundInfo | null>(null);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const [collected, setCollected] = useState<Set<string>>(loadCollected);
  const [toast, setToast] = useState<{ text: string; n: number } | null>(null);
  const prefersReduced = usePrefersReducedMotion();
  const reducedMotion = motionOverride ?? prefersReduced;
  const [hasWebGL] = useState(webglAvailable);
  const advRef = useRef<HTMLDetailsElement>(null);

  // Detail level: the 3.5 mm mesh on desktop, the 5 mm mesh on small screens or after a slow first frame.
  const [quality, setQuality] = useState<'high' | 'lite'>(() =>
    window.matchMedia?.('(max-width: 900px)').matches || (navigator.hardwareConcurrency ?? 8) <= 4 ? 'lite' : 'high');
  const qualityChosen = useRef(false);
  const modelBase = MODEL_OVERRIDE ?? (quality === 'high' ? 'model' : 'model-lite');
  const showToast = useCallback((text: string) => setToast((t) => ({ text, n: (t?.n ?? 0) + 1 })), []);
  const onFrameMs = useCallback((ms: number) => {
    if (quality === 'high' && ms > 70 && !qualityChosen.current && !MODEL_OVERRIDE) {
      setQuality('lite');
      showToast(`Switched to the lighter mesh (${Math.round(ms)} ms per frame here). Use HD in the dock to switch back.`);
    }
  }, [quality, showToast]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const term = TERMS.find((t) => t.id === focusedId) ?? TERMS[0];
  const stackTerms = selected.map((id) => TERMS.find((t) => t.id === id)!).filter(Boolean);
  const stacked = stackTerms.length >= 2;
  // Recomputed only when the selection changes (stackTerms is derived from it).
  const combo = useMemo(() => combineTerms(selected.map((id) => TERMS.find((t) => t.id === id)!).filter(Boolean)), [selected]);
  const comparison = COMPARISONS.find((c) => c.id === cmp.comparisonId) ?? null;

  const moveCamera = useCallback((view: ViewName, focus: FocusName) => setCamera((c) => ({ view, focus, nonce: c.nonce + 1 })), []);

  // Mark a card as explored the first time it is focused.
  useEffect(() => {
    if (collected.has(focusedId)) return;
    const next = new Set(collected).add(focusedId);
    setCollected(next);
    localStorage.setItem(COLLECTED_KEY, JSON.stringify([...next]));
    if (next.size > 1) showToast(`New card explored: ${term.label} · ${next.size}/${TERMS.length}`);
  }, [focusedId, collected, showToast, term.label]);

  // ----- derived stage inputs -----
  let a: Appearance, b: Appearance | null = null, labels: [string, string] | null = null;
  let lightA = lighting, lightB = lighting;
  if (mode === 'explore') {
    a = custom ?? (stacked ? combo.appearance : PRESETS[term.preset ?? term.contrast]);
  } else if (mode === 'compare') {
    a = PRESETS[cmp.a]; b = PRESETS[cmp.b];
    labels = [comparison?.aLabel ?? labelFor(cmp.a), comparison?.bLabel ?? labelFor(cmp.b)];
    if (comparison?.lighting) { lightA = comparison.lighting.a; lightB = comparison.lighting.b; }
  } else {
    a = PRESETS[quizRound?.a ?? 'stage']; b = PRESETS[quizRound?.b ?? 'stage'];
    labels = ['', ''];
    // Quiz pairs use neutral light on both sides unless the question is about lighting.
    const ql = quizRound?.item.lighting;
    lightA = ql ? (quizRound.targetSide === 'A' ? ql.target : ql.other) : 'neutral';
    lightB = ql ? (quizRound.targetSide === 'B' ? ql.target : ql.other) : 'neutral';
  }
  const highlight = useMemo(() => {
    if (mode === 'quiz') return quizRound?.revealed ? { regions: quizRound.item.regions, sides: ['A', 'B'] as ('A' | 'B')[] } : { regions: [], sides: [] };
    if (mode === 'explore' && cue) return { regions: cue.regions, sides: ['A'] as ('A' | 'B')[] };
    return { regions: [] as string[], sides: [] as ('A' | 'B')[] };
  }, [mode, cue, quizRound]);

  // ----- actions -----
  const pick = (id: string, additive: boolean) => {
    setCustom(null); setCue(null);
    if (camera.focus !== 'full') moveCamera(camera.view, 'full');
    if (!additive) { setSelected([id]); setFocusedId(id); return; }
    if (selected.includes(id)) {
      if (selected.length === 1) { setFocusedId(id); return; }
      const rest = selected.filter((x) => x !== id);
      setSelected(rest);
      if (focusedId === id) setFocusedId(rest[rest.length - 1]);
      return;
    }
    if (selected.length >= MAX_STACK) { showToast(`Your stack is full (${MAX_STACK} cards). Remove one first.`); return; }
    setSelected([...selected, id]);
    setFocusedId(id);
  };
  const toggleStackMode = (on: boolean) => {
    setStackMode(on);
    if (!on) { setSelected([focusedId]); setCustom(null); }
  };
  const onCue = (c: Cue | null) => {
    setCue(c);
    if (c) moveCamera(c.view ?? (BACK_FOCI[c.focus] ? 'back' : 'front'), c.focus);
  };
  const pickComparison = (c: Comparison) => {
    setCmp({ a: c.a, b: c.b, comparisonId: c.id });
    moveCamera(c.view, c.focus);
  };
  const onQuizRound = useCallback((r: QuizRoundInfo) => {
    setQuizRound(r);
    if (!r.revealed) moveCamera(r.item.view, r.item.focus);
  }, [moveCamera]);
  const openSandbox = () => {
    setAdvancedOpen(true);
    requestAnimationFrame(() => advRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' }));
  };

  // ----- keyboard shortcuts -----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const views: Record<string, ViewName> = { '1': 'front', '2': 'threeQuarter', '3': 'left', '4': 'back' };
      if (views[e.key]) moveCamera(views[e.key], camera.focus);
      else if (e.key === 'r' || e.key === 'R') moveCamera('front', 'full');
      else if (e.key === 'l' || e.key === 'L') setLighting((l) => (l === 'neutral' ? 'stage' : 'neutral'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [camera.focus, moveCamera]);

  const lookName = custom ? 'custom sandbox settings' : stacked ? stackTerms.map((t) => t.label).join(' + ') : term.label;
  const statusText = mode === 'explore'
    ? `Showing ${lookName}, ${camera.view} view, ${lighting} light.`
    : mode === 'compare'
      ? `Face-off A: ${labels?.[0]} versus B: ${labels?.[1]}, ${camera.view} view.`
      : `Challenge, ${camera.view} view.`;
  const progress = collected.size / TERMS.length;

  const MODES: { id: Mode; label: string; Icon: typeof IconCompass }[] = [
    { id: 'explore', label: 'Explore', Icon: IconCompass },
    { id: 'compare', label: 'Versus', Icon: IconVersus },
    { id: 'quiz', label: 'Challenge', Icon: IconTarget },
  ];

  return (
    <div className="app" data-mode={mode} data-motion={reducedMotion ? 'reduced' : 'full'}>
      <a className="skip" href="#panel">Skip to explanations</a>
      <header className="topbar">
        <div className="brand">
          <span className="kicker">Bodybuilding</span>
          <h1 className="display">Appearance Explorer</h1>
        </div>
        <nav className="modes" aria-label="Mode">
          {MODES.map(({ id, label, Icon }) => (
            <button key={id} type="button" className="mode" aria-pressed={mode === id} onClick={() => setMode(id)}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="top-right">
          <div className="collection" title="Terms you have explored" aria-label={`Explored ${collected.size} of ${TERMS.length} terms`}>
            <span className="ring" style={{ '--p': progress } as CSSProperties}><IconTrophy size={16} /></span>
            <span><strong>{collected.size}</strong>/{TERMS.length}<small>explored</small></span>
          </div>
          <button type="button" className={`icon-toggle ${reducedMotion ? 'on' : ''}`} aria-pressed={reducedMotion}
            onClick={() => setMotionOverride(!reducedMotion)} title="Reduce motion">
            <IconMotion size={16} /> <span className="sr-only-sm">Reduce motion</span>
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="viewport" aria-label="3D model">
          {hasWebGL ? (
            <Stage key={modelBase} modelBase={modelBase} onFrameMs={onFrameMs} a={a} b={b} labels={labels} lighting={{ a: lightA, b: lightB }}
              presentation={presentation} highlight={highlight} camera={camera} reducedMotion={reducedMotion} />
          ) : <Fallback />}
          <div className="hud-left">
            <LookMeter a={a} b={b} hidden={mode === 'quiz' && !quizRound?.revealed} onOpen={mode === 'explore' ? openSandbox : undefined} />
          </div>
          <div className="hud-right">
            <SkinPanel value={presentation} onChange={setPresentation} />
          </div>
          {mode === 'explore' && (
            <div className={`now-showing ${stacked ? 'stacked' : ''}`} aria-hidden="true">
              <span>{custom ? 'Now showing' : stacked ? `${stackTerms.length}-card stack` : 'Now showing'}</span>
              <strong>{custom ? 'Sandbox look' : stacked ? stackTerms.map((t) => t.label).join(' + ') : term.label}</strong>
            </div>
          )}
          {toast && <div key={toast.n} className="toast" role="status">{toast.text}</div>}
          <Toolbar view={camera.view} focus={camera.focus} onCamera={moveCamera} onReset={() => moveCamera('front', 'full')}
            lighting={lighting} onLighting={setLighting} lightingLocked={mode === 'quiz' || (mode === 'compare' && !!comparison?.lighting)}
            quality={quality} onQuality={(q) => { qualityChosen.current = true; setQuality(q); }} />
          <p className="sr-only" aria-live="polite">{statusText}</p>
          <p className="disclaimer">Educational illustration, not a physiological simulation · drag to orbit · scroll to zoom</p>
        </section>

        <aside id="panel" className="panel" tabIndex={-1}>
          {mode === 'explore' && (
            <>
              <Deck groups={GROUPS} terms={TERMS} selected={selected} focused={focusedId} stackMode={stackMode}
                collected={collected} onPick={pick} onStackMode={toggleStackMode} />
              {(stackMode || stacked) && (
                <StackTray terms={stackTerms} clashes={combo.clashes} appearance={combo.appearance} focused={focusedId}
                  onFocus={setFocusedId} onRemove={(id) => pick(id, true)} onClear={() => { setSelected([focusedId]); setCustom(null); }} />
              )}
              <TermDetail term={term} terms={TERMS} sources={SOURCE_MAP} onCue={onCue} activeCue={cue} onSelect={(id) => pick(id, false)}
                showChanges={!stacked}
                onCompare={() => {
                  if (!term.preset) return;
                  const match = COMPARISONS.find((c) => (c.a === term.contrast && c.b === term.preset) || (c.b === term.contrast && c.a === term.preset));
                  setCmp(match ? { a: match.a, b: match.b, comparisonId: match.id } : { a: term.contrast, b: term.preset, comparisonId: null });
                  setMode('compare');
                }} />
              <details ref={advRef} className="adv-wrap" open={advancedOpen} onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}>
                <summary>Sandbox: tune the eight controls yourself</summary>
                <Advanced value={a} onChange={setCustom} onReset={() => setCustom(null)} />
              </details>
            </>
          )}
          {mode === 'compare' && (
            <ComparePanel comparisons={COMPARISONS} terms={TERMS} state={cmp}
              onChange={setCmp} onPick={pickComparison} onSwap={() => setCmp({ a: cmp.b, b: cmp.a, comparisonId: null })} />
          )}
          {mode === 'quiz' && <Quiz items={QUIZ} onRound={onQuizRound} />}
          <footer className="about">
            <details>
              <summary>About this tool</summary>
              <p>
                The model is a procedural anatomical figure. Each term moves a small set of illustrative controls (muscle size,
                belly fullness, soft tissue, smoothing, separation, striations, veins, grain). The same person, pose, camera and
                neutral light are used for every term. Stage light, skin tone, spray tan and oil are separate and apply to both
                sides of every comparison, so they cannot secretly explain a difference.
              </p>
              <p>
                The tool explains what people mean by these words. It does not tell anyone how to produce a look, and it does not
                rate bodies. Many terms describe impressions whose causes are uncertain; the badges and the deeper explanation say
                where the evidence stops.
              </p>
            </details>
          </footer>
        </aside>
      </main>
    </div>
  );
}

function labelFor(p: PresetId): string {
  return TERMS.find((t) => t.preset === p)?.label ?? p;
}
