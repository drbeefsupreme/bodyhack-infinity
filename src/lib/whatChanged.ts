import type { Appearance } from '../three/appearance';

export interface Change {
  key: keyof Appearance;
  direction: 'up' | 'down';
  amount: number;
  label: string;
  text: string;
  regions: string[];
}

const COPY: Record<keyof Appearance, { label: string; up: string; down: string; regions: string[] }> = {
  size: {
    label: 'Muscle size',
    up: 'Larger muscle cross-sections everywhere. The skeleton and height do not change.',
    down: 'Smaller muscle cross-sections everywhere. The skeleton and height do not change.',
    regions: ['shoulders', 'chest', 'arms', 'quads', 'back'],
  },
  fullness: {
    label: 'Fullness',
    up: 'Muscle bellies are rounder and more domed. Look at the delts, pecs, biceps and quads. Leanness is unchanged.',
    down: 'Muscle bellies are flatter and less domed. Leanness and size stay the same.',
    regions: ['shoulders', 'chest', 'arms', 'quads'],
  },
  bodyFat: {
    label: 'Subcutaneous softness (fat)',
    up: 'Grooves fill in and edges soften. The waist, lower abdomen and lower back thicken the most.',
    down: 'Grooves between muscles open up. The waist, lower abdomen and lower back get tighter.',
    regions: ['abs', 'obliques', 'lowerback', 'glutes'],
  },
  smoothness: {
    label: 'Even smoothing ("smooth" look)',
    up: 'Fine detail blurs evenly over the whole body. Borders lose their crisp edge, but no area gets thicker.',
    down: 'Edges and fine detail get crisper over the whole body.',
    regions: ['abs', 'quads', 'shoulders', 'back'],
  },
  separation: {
    label: 'Separation',
    up: 'Deeper valleys form where whole muscles and muscle heads meet, for example between delt and pec or between the quad heads.',
    down: 'The valleys between muscles are shallower.',
    regions: ['shoulders', 'chest', 'quads', 'abs', 'back'],
  },
  striations: {
    label: 'Striations',
    up: 'Fine lines appear across the muscle surface, along the fiber direction. Look at the pecs, delts, glutes and quads.',
    down: 'The fine fiber lines fade.',
    regions: ['chest', 'shoulders', 'glutes', 'quads'],
  },
  vascularity: {
    label: 'Vascularity',
    up: 'Superficial veins rise on the arms, lower abdomen and legs.',
    down: 'Superficial veins sink below the surface.',
    regions: ['arms', 'forearms', 'abs', 'quads', 'calves'],
  },
  detail: {
    label: 'Detail and grain ("mature" look)',
    up: 'More detail shows inside muscles (between heads), and the surface gets a fine grainy texture.',
    down: 'Muscles look more uniform inside, with a smoother surface.',
    regions: ['shoulders', 'back', 'chest', 'hamstrings'],
  },
};

export function controlLabel(k: keyof Appearance): string {
  return COPY[k].label;
}

/** Plain-language list of the controls that differ between two appearances, largest first. */
export function describeChanges(from: Appearance, to: Appearance, threshold = 0.08): Change[] {
  const out: Change[] = [];
  for (const key of Object.keys(COPY) as (keyof Appearance)[]) {
    const d = to[key] - from[key];
    if (Math.abs(d) < threshold) continue;
    const c = COPY[key];
    out.push({ key, direction: d > 0 ? 'up' : 'down', amount: Math.abs(d), label: c.label, text: d > 0 ? c.up : c.down, regions: c.regions });
  }
  return out.sort((a, b) => b.amount - a.amount);
}
