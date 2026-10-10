// Render harness: /shot.html?model=model&a={json}&b={json}&view=front&focus=full&light=neutral
// Sets window.__ready = true once the model is loaded and transitions have settled.
import { Viewer, type FocusName, type ViewName, type LightingMode } from '../three/Viewer';
import { NEUTRAL, type Appearance } from '../three/appearance';
import { DEFAULT_PRESENTATION } from '../three/skin';

declare global { interface Window { __ready?: boolean; __viewer?: Viewer; __error?: string } }

const q = new URLSearchParams(location.search);
const parse = (s: string | null): Appearance => ({ ...NEUTRAL, ...(s ? (JSON.parse(s) as Partial<Appearance>) : {}) });
const el = document.getElementById('v')!;
const bg = q.get('bg');
if (bg) document.body.style.background = bg;
const viewer = new Viewer(el, { reducedMotion: true, modelBase: q.get('model') ?? 'model' });
window.__viewer = viewer;
viewer.load(q.get('pose') ?? 'relaxed').then(() => {
  viewer.setAppearance('A', parse(q.get('a')), true);
  if (q.get('b')) { viewer.setCompare(true); viewer.setAppearance('B', parse(q.get('b')), true); }
  viewer.setLighting((q.get('light') ?? 'neutral') as LightingMode);
  const skin = Number(q.get('skin') ?? DEFAULT_PRESENTATION.skin), tan = Number(q.get('tan') ?? 0), oil = Number(q.get('oil') ?? 0);
  viewer.setPresentation({ skin, tan, oil });
  if (q.get('hl')) viewer.setHighlight(q.get('hl')!.split(','));
  viewer.setView((q.get('view') ?? 'front') as ViewName, (q.get('focus') ?? 'full') as FocusName);
  const dist = q.get('dist');
  if (dist) {
    const c = viewer.camera, t = viewer.controls.target;
    c.position.sub(t).multiplyScalar(Number(dist)).add(t);
    viewer.controls.update();
  }
  let frames = 0;
  viewer.onFrame(() => { if (++frames === 4) window.__ready = true; });
}).catch((e: unknown) => { window.__error = String(e); });
