import { useEffect, useRef, useState } from 'react';
import { Viewer, type FocusName, type ViewName, type LightingMode } from '../three/Viewer';
import type { Appearance } from '../three/appearance';
import type { Presentation } from '../three/skin';

export interface StageProps {
  a: Appearance;
  b: Appearance | null;
  labels: [string, string] | null;
  lighting: { a: LightingMode; b: LightingMode };
  presentation: Presentation;
  highlight: { regions: string[]; sides: ('A' | 'B')[] };
  camera: { view: ViewName; focus: FocusName; nonce: number };
  reducedMotion: boolean;
  /** Folder under public/ with the baked model (high or lite detail). */
  modelBase: string;
  onViewer?: (v: Viewer | null) => void;
  /** Called once after load with the measured GPU frame time in ms. */
  onFrameMs?: (ms: number) => void;
}

/** Explicit ?model= override for development and the render harness. */
export const MODEL_OVERRIDE = new URLSearchParams(location.search).get('model');

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

export function Stage(p: StageProps) {
  const host = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const latest = useRef(p);
  latest.current = p;

  useEffect(() => {
    if (!host.current) return;
    let v: Viewer;
    try {
      v = new Viewer(host.current, { reducedMotion: p.reducedMotion, modelBase: p.modelBase });
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
      return;
    }
    viewer.current = v;
    let cancelled = false;
    v.load('relaxed', setProgress)
      .then(() => {
        if (cancelled) return;
        const c = latest.current;
        v.setAppearance('A', c.a, true);
        if (c.b) v.setAppearance('B', c.b, true);
        v.setCompare(!!c.b);
        v.setLighting(c.lighting.a, 'A');
        v.setLighting(c.lighting.b, 'B');
        v.setPresentation(c.presentation);
        v.setView(c.camera.view, c.camera.focus);
        setStatus('ready');
        c.onFrameMs?.(v.measureFrameMs());
        c.onViewer?.(v);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
      latest.current.onViewer?.(null);
      v.dispose();
      viewer.current = null;
    };
    // The viewer lives for the lifetime of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = status === 'ready';
  useEffect(() => { if (ready) viewer.current?.setAppearance('A', p.a); }, [ready, p.a]);
  useEffect(() => {
    if (!ready || !viewer.current) return;
    viewer.current.setCompare(!!p.b);
    if (p.b) viewer.current.setAppearance('B', p.b);
  }, [ready, p.b]);
  useEffect(() => {
    if (!ready || !viewer.current) return;
    viewer.current.setLighting(p.lighting.a, 'A');
    viewer.current.setLighting(p.lighting.b, 'B');
  }, [ready, p.lighting.a, p.lighting.b]);
  useEffect(() => { if (ready) viewer.current?.setPresentation(p.presentation); }, [ready, p.presentation]);
  useEffect(() => { if (ready) viewer.current?.setHighlight(p.highlight.regions, p.highlight.sides); }, [ready, p.highlight]);
  useEffect(() => { if (ready) viewer.current?.setView(p.camera.view, p.camera.focus); }, [ready, p.camera]);
  useEffect(() => { if (viewer.current) viewer.current.reducedMotion = p.reducedMotion; }, [p.reducedMotion]);

  return (
    <div className="stage" data-compare={p.b ? 'true' : 'false'}>
      <div ref={host} className="stage-canvas" />
      {p.b && p.labels && (
        <>
          <div className="ab-label ab-a" aria-hidden="true"><span>A</span>{p.labels[0] && <b>{p.labels[0]}</b>}</div>
          <div className="ab-label ab-b" aria-hidden="true">{p.labels[1] && <b>{p.labels[1]}</b>}<span>B</span></div>
          <div className="ab-divider" aria-hidden="true"><span className="vs">VS</span></div>
        </>
      )}
      {status === 'loading' && (
        <div className="stage-overlay" role="status" aria-live="polite">
          <div className="loader">
            <div className="loader-title display">Warming up the stage</div>
            <div className="barbell" aria-hidden="true">
              <span className="plate" /><span className="plate small" />
              <span className="bar-track"><span className="bar-load" style={{ width: `${Math.round(progress * 100)}%` }} /></span>
              <span className="plate small" /><span className="plate" />
            </div>
            <div className="loader-sub">{Math.round(progress * 100)}% of the mesh loaded</div>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="stage-overlay" role="alert">
          <div className="loader">
            <div className="loader-title">The 3D model could not load</div>
            <p className="loader-sub">{error}</p>
            <p className="loader-sub">The explanations and sources still work. Reload the page to try again.</p>
          </div>
        </div>
      )}
    </div>
  );
}
