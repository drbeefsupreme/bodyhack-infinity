import { use, useEffect, useRef, useState } from 'react';
import { Viewer } from '../../three/Viewer';
import { DEFAULT_PRESENTATION } from '../../three/skin';
import { FIGURE_POSES } from '../figurePoses';
import type { FigureTarget } from '../modes/mode';
import { PlatformContext } from '../platform/context';

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The 3D figure from the judges' view, in a library pose (animated) or a live pose (instant, for Mirror). */
export function FigureView({ figure }: { figure: FigureTarget }) {
  const { modelBase } = use(PlatformContext);
  const host = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | undefined>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    let v: Viewer;
    try {
      v = new Viewer(el, { reducedMotion: REDUCED_MOTION, modelBase });
    } catch {
      setStatus('error');
      return;
    }
    v.load()
      .then(() => {
        if (cancelled) return;
        v.setPresentation(DEFAULT_PRESENTATION);
        v.setLighting('stage');
        v.setView('front', 'full');
        setViewer(v);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
      setViewer(undefined);
      v.dispose();
    };
  }, [modelBase]);

  const pose = figure.kind === 'pose' ? figure.pose : undefined;
  const live = figure.kind === 'live' ? figure.figure : undefined;
  useEffect(() => {
    if (!viewer) return;
    if (pose) viewer.setPose('A', FIGURE_POSES[pose]);
    else if (live) viewer.setPose('A', live, { instant: true });
  }, [viewer, pose, live]);

  return (
    <div className="tutor-figure-host" ref={host}>
      {status !== 'ready' && <p className="tutor-figure-status">{status === 'loading' ? 'Loading the figure…' : 'The figure needs WebGL 2.'}</p>}
    </div>
  );
}
