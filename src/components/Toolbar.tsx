import type { FocusName, LightingMode, ViewName } from '../three/Viewer';
import { IconReset, IconSpot, IconSun } from './Icons';

const VIEWS: { id: ViewName; label: string; key: string }[] = [
  { id: 'front', label: 'Front', key: '1' },
  { id: 'threeQuarter', label: '¾', key: '2' },
  { id: 'left', label: 'Side', key: '3' },
  { id: 'back', label: 'Back', key: '4' },
];

export const FOCI: { id: FocusName; label: string }[] = [
  { id: 'full', label: 'Whole body' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'chest', label: 'Chest' },
  { id: 'arms', label: 'Arms' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'abs', label: 'Abs & waist' },
  { id: 'back', label: 'Upper back' },
  { id: 'lowerback', label: 'Lower back' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'calves', label: 'Calves' },
];

export interface ToolbarProps {
  view: ViewName;
  focus: FocusName;
  onCamera: (view: ViewName, focus: FocusName) => void;
  onReset: () => void;
  lighting: LightingMode;
  onLighting: (l: LightingMode) => void;
  lightingLocked: boolean;
  quality: 'high' | 'lite';
  onQuality: (q: 'high' | 'lite') => void;
}

export function Toolbar(p: ToolbarProps) {
  return (
    <div className="dock" role="toolbar" aria-label="Camera and lighting">
      <div className="seg" role="group" aria-label="View">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={p.view === v.id} title={`${v.label} view (key ${v.key})`}
            onClick={() => p.onCamera(v.id, p.focus)}>{v.label}</button>
        ))}
      </div>
      <label className="seg seg-select">
        <span className="sr-only">Inspect area</span>
        <select value={p.focus} onChange={(e) => p.onCamera(p.view, e.target.value as FocusName)} aria-label="Inspect area">
          {FOCI.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>
      <button type="button" className="seg seg-icon" onClick={p.onReset} title="Reset camera (key R)" aria-label="Reset camera">
        <IconReset size={16} />
      </button>
      <div className="seg" role="group" aria-label="Lighting">
        <button type="button" aria-pressed={p.lighting === 'neutral'} disabled={p.lightingLocked}
          onClick={() => p.onLighting('neutral')} title="Even light for fair comparisons"><IconSun size={15} /> Neutral</button>
        <button type="button" aria-pressed={p.lighting === 'stage'} disabled={p.lightingLocked}
          onClick={() => p.onLighting('stage')} title="Hard overhead stage light (key L)"><IconSpot size={15} /> Stage</button>
      </div>
      <div className="seg seg-small" role="group" aria-label="Mesh detail">
        <button type="button" aria-pressed={p.quality === 'high'} onClick={() => p.onQuality('high')} title="Detailed mesh">HD</button>
        <button type="button" aria-pressed={p.quality === 'lite'} onClick={() => p.onQuality('lite')} title="Lighter mesh, faster on slow devices">Lite</button>
      </div>
    </div>
  );
}
