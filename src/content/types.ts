import type { FocusName, ViewName } from '../three/Viewer';
import type { PresetId } from './presets';

export type GroupId = 'volume' | 'conditioning' | 'detail' | 'development' | 'presentation';

export interface Group { id: GroupId; label: string; blurb: string }

/** How consistently people use the word. */
export type Usage = 'consistent' | 'mostly' | 'overlapping' | 'disputed';
/** How well the usual explanation of the look is supported. */
export type Evidence = 'supported' | 'partial' | 'contested' | 'not-a-cause';

export interface Cue { text: string; focus: FocusName; view?: ViewName; regions: string[] }

export interface Term {
  id: string;
  label: string;
  aka?: string[];
  group: GroupId;
  /** One or two sentences: what people generally mean. */
  summary: string;
  /** Extra note shown instead of the default when the term needs special handling. */
  note?: string;
  /** Concrete things to inspect on the model. */
  cues: Cue[];
  /** Preset applied when the term is selected; null = explanation only (e.g. symmetry). */
  preset: PresetId | null;
  /** Preset shown as the "before" when the term is selected (for the What changed readout). */
  contrast: PresetId;
  usage: Usage;
  evidence: Evidence;
  neighbors: string[];
  deeper: {
    visible: string;
    confusedWith: string;
    usageNote: string;
    supported: string;
    speculative: string;
    model: string;
  };
  sources: string[];
}

export interface Source {
  id: string;
  title: string;
  authors: string;
  year: string;
  url: string;
  kind: 'academic' | 'rulebook' | 'coach' | 'publication' | 'forum' | 'anatomy';
  supports: string;
}

export interface Comparison {
  id: string;
  title: string;
  a: PresetId;
  b: PresetId;
  aLabel: string;
  bLabel: string;
  focus: FocusName;
  view: ViewName;
  note: string;
  lighting?: { a: 'neutral' | 'stage'; b: 'neutral' | 'stage' };
}

export interface QuizItem {
  id: string;
  question: string;
  /** The preset that should be chosen. */
  target: PresetId;
  /** The other preset. */
  other: PresetId;
  focus: FocusName;
  view: ViewName;
  regions: string[];
  explain: string;
  ambiguity?: string;
  /** Lighting per answer side (for presentation questions). Default neutral on both. */
  lighting?: { target: 'neutral' | 'stage'; other: 'neutral' | 'stage' };
}
