import { APPEARANCE_KEYS, type Appearance } from '../three/appearance';
import { controlLabel } from '../lib/whatChanged';

const RANGE: Partial<Record<keyof Appearance, [number, number]>> = { size: [-1, 1], fullness: [-1, 1] };
const HELP: Record<keyof Appearance, string> = {
  size: 'Muscle cross-sections, skeleton fixed',
  fullness: 'Flat ↔ round muscle bellies',
  bodyFat: 'Fills grooves; most at waist and lower back',
  smoothness: 'Even blur of detail, no regional thickening',
  separation: 'Valleys between muscles',
  striations: 'Fine lines along fibers',
  vascularity: 'Raised superficial veins',
  detail: 'Detail inside muscles + grainy texture',
};

export function Advanced(p: { value: Appearance; onChange: (a: Appearance) => void; onReset: () => void }) {
  return (
    <section className="advanced" aria-labelledby="adv-h">
      <h3 id="adv-h" className="display small">Sandbox: tune the look</h3>
      <p className="hint">
        Artistic settings, not measurements. On a real body they are not independent: here, soft tissue and smoothing
        also hide separation, striations, grain and veins. Some combinations are unrealistic.
      </p>
      {APPEARANCE_KEYS.map((k) => {
        const [lo, hi] = RANGE[k] ?? [0, 1];
        const id = `adv-${k}`;
        return (
          <div className="slider" key={k}>
            <label htmlFor={id}>{controlLabel(k)}<small>{HELP[k]}</small></label>
            <input id={id} type="range" min={lo} max={hi} step={0.01} value={p.value[k]}
              aria-valuetext={`${Math.round(p.value[k] * 100)} percent`}
              onChange={(e) => p.onChange({ ...p.value, [k]: Number(e.target.value) })} />
            <output htmlFor={id}>{p.value[k].toFixed(2)}</output>
          </div>
        );
      })}
      <button type="button" className="pill" onClick={p.onReset}>Back to the selected cards</button>
    </section>
  );
}
