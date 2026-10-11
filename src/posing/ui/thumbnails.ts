import { Viewer } from '../../three/Viewer';
import { DEFAULT_PRESENTATION } from '../../three/skin';
import { FIGURE_POSES } from '../figurePoses';
import type { PoseId } from '../types';

// Pose picker thumbnails: one hidden Viewer renders the figure in every pose from the judges' view, once per page.

const SIZE = { width: 180, height: 270 } as const;

export type Thumbnails = Readonly<Record<PoseId, string>>;

let rendering: Promise<Thumbnails> | undefined;

async function render(modelBase: string): Promise<Thumbnails> {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${SIZE.width}px;height:${SIZE.height}px;pointer-events:none`;
  document.body.append(host);
  const viewer = new Viewer(host, { reducedMotion: true, modelBase });
  try {
    await viewer.load();
    viewer.setPresentation(DEFAULT_PRESENTATION);
    viewer.setLighting('stage');
    viewer.setView('front', 'full');
    const out: Partial<Record<PoseId, string>> = {};
    for (const [pose, figure] of Object.entries(FIGURE_POSES) as [PoseId, (typeof FIGURE_POSES)[PoseId]][]) {
      viewer.setPose('A', figure, { instant: true });
      viewer.render();
      out[pose] = viewer.renderer.domElement.toDataURL('image/webp', 0.85);
    }
    // Every PoseId has a figure pose, so every key is set.
    return out as Thumbnails;
  } finally {
    viewer.dispose();
    host.remove();
  }
}

/** The thumbnails from the model in `modelBase`, rendered on the first call. A failed render is retried on the next
 * call. A page has one platform, so one model base. */
export function poseThumbnails(modelBase: string): Promise<Thumbnails> {
  rendering ??= render(modelBase).catch((err: unknown) => {
    rendering = undefined;
    throw err;
  });
  return rendering;
}
