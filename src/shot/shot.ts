// Render harness: /shot.html?model=model&pose=frontDoubleBiceps&a={json}&b={json}&view=front&focus=full&light=neutral
// Sets window.__ready = true once the model is loaded and transitions have settled.
import { Vector3 } from 'three';
import { Viewer, type FocusName, type ViewName, type LightingMode } from '../three/Viewer';
import { NEUTRAL, type Appearance } from '../three/appearance';
import { DEFAULT_PRESENTATION } from '../three/skin';
import { FIGURE_POSES } from '../posing/figurePoses';
import type { FigurePose } from '../posing/types';

declare global { interface Window { __ready?: boolean; __viewer?: Viewer; __error?: string } }

const q = new URLSearchParams(location.search);
const parse = (s: string | null): Appearance => ({ ...NEUTRAL, ...(s ? (JSON.parse(s) as Partial<Appearance>) : {}) });
const el = document.getElementById('v')!;
const bg = q.get('bg');
if (bg) document.body.style.background = bg;
const viewer = new Viewer(el, { reducedMotion: true, modelBase: q.get('model') ?? 'model' });
window.__viewer = viewer;
viewer.load().then(() => {
  viewer.setAppearance('A', parse(q.get('a')), true);
  if (q.get('b')) { viewer.setCompare(true); viewer.setAppearance('B', parse(q.get('b')), true); }
  const poseId = q.get('pose');
  if (poseId) {
    const pose = (FIGURE_POSES as Partial<Record<string, FigurePose>>)[poseId];
    if (!pose) throw new Error(`Unknown pose ${poseId}`);
    viewer.setPose('A', pose, { instant: true });
    viewer.setPose('B', pose, { instant: true });
  }
  viewer.setLighting((q.get('light') ?? 'neutral') as LightingMode);
  const skin = Number(q.get('skin') ?? DEFAULT_PRESENTATION.skin), tan = Number(q.get('tan') ?? 0), oil = Number(q.get('oil') ?? 0);
  viewer.setPresentation({ skin, tan, oil });
  if (q.get('hl')) viewer.setHighlight(q.get('hl')!.split(','));
  viewer.setView((q.get('view') ?? 'front') as ViewName, (q.get('focus') ?? 'full') as FocusName);
  const dist = q.get('dist'), orbit = q.get('orbit');
  if (dist || orbit) {
    const c = viewer.camera, t = viewer.controls.target;
    c.position.sub(t).multiplyScalar(Number(dist ?? 1)).applyAxisAngle(new Vector3(0, 1, 0), (Number(orbit ?? 0) * Math.PI) / 180).add(t);
    viewer.controls.update();
  }
  let frames = 0;
  viewer.onFrame(() => { if (++frames === 4) window.__ready = true; });
}).catch((e: unknown) => { window.__error = String(e); });
