import { IconTrophy } from '../components/Icons';

export function TutorPlaceholder() {
  return (
    <section className="tutor-placeholder" aria-labelledby="tutor-soon">
      <div className="tutor-card">
        <span className="tutor-badge"><IconTrophy size={16} /> Coming soon</span>
        <h2 id="tutor-soon" className="display big">Posing Tutor</h2>
        <p>
          Step in front of your camera and learn the NPC / IFBB Pro mandatories: the quarter turns and eight
          poses, from front double biceps to most muscular. The figure shows each pose, the tutor scores yours
          live, calls out corrections, and a coach debriefs you after every hold.
        </p>
        <p className="hint">The tutor is being built. This module will open here.</p>
      </div>
    </section>
  );
}
