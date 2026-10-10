const SHOTS: { file: string; label: string }[] = [
  { file: 'full-vs-flat.webp', label: 'Full (A) vs flat (B), same leanness' },
  { file: 'stage-vs-spilled.webp', label: 'Full and dry (A) vs spilled over (B)' },
  { file: 'separation-vs-striations.webp', label: 'Separation (A) vs striations (B)' },
  { file: 'mature-vs-smooth.webp', label: 'Mature / grainy (A) vs smooth (B)' },
];

/** Shown when the browser has no WebGL 2. Pre-rendered pictures keep the key comparisons available. */
export function Fallback() {
  return (
    <div className="fallback" role="region" aria-label="3D not available">
      <h2>3D is not available in this browser</h2>
      <p>WebGL 2 is off or unsupported, so the interactive model cannot run. The explanations work, and these pre-rendered
        comparisons use the same model, camera and neutral light.</p>
      <div className="fallback-grid">
        {SHOTS.map((s) => (
          <figure key={s.file}>
            <img src={`fallback/${s.file}`} alt={s.label} loading="lazy" />
            <figcaption>{s.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
