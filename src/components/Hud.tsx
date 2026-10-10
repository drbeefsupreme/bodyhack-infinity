import { useState } from 'react';
import { APPEARANCE_KEYS, type Appearance } from '../three/appearance';
import { TAN_LEVELS, skinTrack, tanTrack, rgbToCss, skinAlbedo, type Presentation } from '../three/skin';
import { STAT } from './theme';
import { IconDrop, IconPalette, IconSliders, IconX } from './Icons';

/** One bar per illustrative control. With `b`, A and B are drawn as twin bars. */
export function LookMeter(p: { a: Appearance; b?: Appearance | null; hidden?: boolean; onOpen?: () => void }) {
  const [open, setOpen] = useState(() => !window.matchMedia?.('(max-width: 900px)').matches);
  if (p.hidden) {
    return (
      <div className="hud hud-meter is-hidden" aria-label="Look meter hidden until you answer">
        <div className="hud-title"><IconSliders size={14} /> Look meter</div>
        <p className="hud-hidden">Hidden until you answer, no peeking.</p>
      </div>
    );
  }
  return (
    <section className={`hud hud-meter ${open ? '' : 'is-collapsed'}`} aria-label="Look meter: illustrative control values">
      <button type="button" className="hud-title" aria-expanded={open} onClick={() => setOpen(!open)}>
        <IconSliders size={14} /> Look meter <span className="hud-sub">illustrative</span>
      </button>
      {open && (
        <ul className="meter">
          {APPEARANCE_KEYS.map((k) => (
            <li key={k}>
              <span className="meter-label">{STAT[k].short}</span>
              <span className="meter-bars">
                <Bar value={p.a[k]} signed={STAT[k].signed} side="a" />
                {p.b && <Bar value={p.b[k]} signed={STAT[k].signed} side="b" />}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && p.onOpen && <button type="button" className="hud-link" onClick={p.onOpen}>Tune it yourself</button>}
    </section>
  );
}

function Bar({ value, signed, side }: { value: number; signed: boolean; side: 'a' | 'b' }) {
  const v = Math.max(signed ? -1 : 0, Math.min(1, value));
  const style = signed
    ? { left: `${50 + Math.min(0, v) * 50}%`, width: `${Math.abs(v) * 50}%` }
    : { left: '0%', width: `${v * 100}%` };
  return (
    <span className={`bar bar-${side} ${signed ? 'signed' : ''}`}>
      <span className="bar-fill" style={style} />
    </span>
  );
}

/** Skin tone, spray tan and oil. Applies to both sides of any comparison. */
export function SkinPanel(p: { value: Presentation; onChange: (v: Presentation) => void }) {
  const [open, setOpen] = useState(false);
  const swatch = rgbToCss(skinAlbedo(p.value));
  const tanLabel = TAN_LEVELS.reduce((best, l) => (Math.abs(l.at - p.value.tan) < Math.abs(best.at - p.value.tan) ? l : best)).label;
  if (!open) {
    return (
      <button type="button" className="hud hud-skin-btn" onClick={() => setOpen(true)} aria-expanded={false}>
        <span className="swatch" style={{ background: swatch }} aria-hidden="true" />
        <span><strong>Skin & tan</strong><small>Tan: {tanLabel}</small></span>
      </button>
    );
  }
  return (
    <section className="hud hud-skin" aria-labelledby="skin-h">
      <div className="hud-row">
        <h3 id="skin-h" className="hud-title"><IconPalette size={14} /> Skin & tan</h3>
        <button type="button" className="icon-btn" aria-label="Close skin and tan panel" onClick={() => setOpen(false)}><IconX size={14} /></button>
      </div>
      <label className="tone">
        <span>Skin tone</span>
        <input type="range" min={0} max={1} step={0.01} value={p.value.skin} style={{ background: skinTrack() }}
          aria-valuetext={p.value.skin < 0.25 ? 'light' : p.value.skin < 0.6 ? 'medium' : 'deep'}
          onChange={(e) => p.onChange({ ...p.value, skin: Number(e.target.value) })} />
      </label>
      <label className="tone">
        <span>Spray tan <em>{tanLabel}</em></span>
        <input type="range" min={0} max={1} step={0.01} value={p.value.tan} style={{ background: tanTrack(p.value.skin) }}
          aria-valuetext={tanLabel} list="tan-stops"
          onChange={(e) => p.onChange({ ...p.value, tan: Number(e.target.value) })} />
        <datalist id="tan-stops">{TAN_LEVELS.map((l) => <option key={l.at} value={l.at} label={l.label} />)}</datalist>
        <span className="ticks" aria-hidden="true">{TAN_LEVELS.map((l) => <span key={l.at}>{l.label}</span>)}</span>
      </label>
      <label className="tone">
        <span><IconDrop size={12} /> Oil / sheen</span>
        <input type="range" min={0} max={1} step={0.01} value={p.value.oil} className="oil-track"
          onChange={(e) => p.onChange({ ...p.value, oil: Number(e.target.value) })} />
      </label>
      <div className="quick">
        <button type="button" className="pill" onClick={() => p.onChange({ ...p.value, tan: 0, oil: 0 })}>Natural</button>
        <button type="button" className="pill" onClick={() => p.onChange({ ...p.value, tan: 0.8, oil: 0.35 })}>Show day</button>
      </div>
      <p className="hint">A darker tan makes grooves read deeper. It changes the picture, not the muscle, and it is the same on both sides of a comparison.</p>
    </section>
  );
}
