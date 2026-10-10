import { useCallback, useSyncExternalStore } from 'react';
import { MODEL_PATTERN, type TutorSettings } from '../modes/settings';
import type { Speech } from '../speech';
import type { Health } from './api';

interface Props {
  readonly settings: TutorSettings;
  readonly onSettings: (settings: TutorSettings) => void;
  readonly speech: Speech;
  readonly health: Health | undefined;
}

/** Re-renders when the voice list, the chosen voice or mute changes. */
function useSpeechVersion(speech: Speech): string {
  const subscribe = useCallback((listener: () => void) => speech.subscribe(listener), [speech]);
  return useSyncExternalStore(subscribe, () => `${speech.muted}|${speech.voice ?? ''}|${speech.voices().length}`);
}

export function Settings({ settings, onSettings, speech, health }: Props) {
  useSpeechVersion(speech);
  const set = (patch: Partial<TutorSettings>) => onSettings({ ...settings, ...patch });
  const voices = speech.voices();
  const chosen = voices.find((v) => v.voiceURI === speech.voice);
  const network = chosen !== undefined && 'localService' in chosen && chosen.localService === false;
  const modelValid = settings.coachModel === '' || MODEL_PATTERN.test(settings.coachModel);

  return (
    <section className="tutor-settings" aria-labelledby="tutor-settings-title">
      <h3 id="tutor-settings-title" className="display small">Settings</h3>

      <label className="tutor-field">
        <span>Voice</span>
        <select value={speech.voice ?? ''} onChange={(e) => speech.setVoice(e.target.value || undefined)} disabled={!speech.available}>
          <option value="">Browser default (English)</option>
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </label>
      <label className="tutor-check">
        <input type="checkbox" checked={speech.muted} onChange={(e) => speech.setMuted(e.target.checked)} />
        Mute the tutor's voice
      </label>
      <label className="tutor-check">
        <input type="checkbox" checked={settings.voiceCommands} onChange={(e) => set({ voiceCommands: e.target.checked })} />
        Voice commands ("next", "what's wrong", "pause")
      </label>
      <label className="tutor-check">
        <input type="checkbox" checked={settings.debrief} onChange={(e) => set({ debrief: e.target.checked })} />
        Coach debrief after every hit pose
      </label>
      <label className="tutor-field">
        <span>Coach model</span>
        <input
          type="text"
          value={settings.coachModel}
          placeholder={health?.coachModel ?? 'server default'}
          aria-invalid={!modelValid}
          spellCheck={false}
          onChange={(e) => set({ coachModel: e.target.value.trim() })}
        />
      </label>
      {!modelValid && <p className="tutor-field-error">Use a model id such as anthropic/claude-sonnet-5.</p>}
      {health && !health.omp && <p className="tutor-field-error">omp is not on the server's PATH: the coach debrief is off.</p>}
      {health && !health.jev && <p className="hint">Jev is not configured: voice commands use keywords only.</p>}

      <details className="tutor-privacy" open>
        <summary>Privacy: what leaves this computer</summary>
        <ul>
          <li>
            <b>Coach debrief:</b> the photo of each hit pose and its scores go to the coach model through omp.
          </li>
          <li>
            <b>Voice commands:</b> Chrome sends your speech to Google for recognition. The recognized text goes to jev to
            pick the command.
          </li>
          <li>
            <b>Spoken cues:</b> {network ? 'the chosen voice is a network voice, so' : 'with a network voice,'} the cue text
            goes to Google to be spoken.
          </li>
          <li>
            <b>Stays here:</b> the camera video, the tracked landmarks and your progress photos. The page cannot send data
            to any other server.
          </li>
        </ul>
      </details>
    </section>
  );
}
