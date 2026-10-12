import { use, useCallback, useSyncExternalStore, type ComponentType } from 'react';
import { MODEL_PATTERN, type TutorSettings } from '../modes/settings';
import { PlatformContext } from '../platform/context';
import type { Platform } from '../platform/types';
import type { Speech } from '../speech';
import { DesktopCoachSettings, type CoachLinkState } from './DesktopCoach';

interface Props {
  readonly settings: TutorSettings;
  readonly onSettings: (settings: TutorSettings) => void;
  readonly speech: Speech;
  readonly coach: CoachLinkState;
}

/** Re-renders when the voice list, the chosen voice or mute changes. */
function useSpeechVersion(speech: Speech): string {
  const subscribe = useCallback((listener: () => void) => speech.subscribe(listener), [speech]);
  return useSyncExternalStore(subscribe, () => `${speech.muted}|${speech.voice ?? ''}|${speech.voices().length}`);
}

const DEFAULT_VOICE: Record<Platform['kind'], string> = { web: 'Browser default (English)', android: 'System default (English)' };

function WebPrivacy({ network }: { network: boolean }) {
  return (
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
          <b>Stays here:</b> the camera video and the tracked landmarks. Your progress photos are stored only here, but
          with the coach debrief on, each hit photo is also sent to the coach. The page cannot send data to any other
          server.
        </li>
      </ul>
    </details>
  );
}

function AndroidPrivacy({ network }: { network: boolean }) {
  return (
    <details className="tutor-privacy" open>
      <summary>Privacy: what leaves this phone</summary>
      <ul>
        <li>
          <b>Coach debrief:</b> when the app is paired, the photo of each hit pose and its scores go to your computer
          over Tailscale (encrypted), then to the coach model through omp.
        </li>
        <li>
          <b>Voice commands:</b> the phone recognizes your speech on the device when it can (the on-device recognizer, or
          an installed offline language pack). If not, Android's speech service can send the audio to Google. When the
          app is paired, the recognized text goes to your computer over Tailscale, then to jev to pick the command.
        </li>
        <li>
          <b>Spoken cues:</b> {network ? 'the chosen voice is a network voice, so' : 'with a network voice,'} the cue text
          goes to Google to be spoken. A local voice speaks on the phone.
        </li>
        <li>
          <b>Stays on this phone:</b> the camera video and the tracked landmarks. Your progress photos are stored only in
          the app's private storage, with no cloud backup. With the coach debrief on, each hit photo is also sent to your
          computer. Uninstalling the app deletes the photos.
        </li>
      </ul>
    </details>
  );
}

const PRIVACY: Record<Platform['kind'], ComponentType<{ network: boolean }>> = { web: WebPrivacy, android: AndroidPrivacy };

export function Settings({ settings, onSettings, speech, coach }: Props) {
  useSpeechVersion(speech);
  const { kind, bridge } = use(PlatformContext);
  const set = (patch: Partial<TutorSettings>) => onSettings({ ...settings, ...patch });
  const voices = speech.voices();
  const chosen = voices.find((v) => v.voiceURI === speech.voice);
  const network = chosen !== undefined && 'localService' in chosen && chosen.localService === false;
  const modelValid = settings.coachModel === '' || MODEL_PATTERN.test(settings.coachModel);
  const { link } = coach;
  const health = link.kind === 'server' ? link.health : link.kind === 'bridge' && link.status.state === 'online' ? link.status.health : undefined;
  const Privacy = PRIVACY[kind];

  return (
    <section className="tutor-settings" aria-labelledby="tutor-settings-title">
      <h3 id="tutor-settings-title" className="display small">Settings</h3>

      <label className="tutor-field">
        <span>Voice</span>
        <select value={speech.voice ?? ''} onChange={(e) => speech.setVoice(e.target.value || undefined)} disabled={!speech.available}>
          <option value="">{DEFAULT_VOICE[kind]}</option>
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
          autoCapitalize="off"
          onChange={(e) => set({ coachModel: e.target.value.trim() })}
        />
      </label>
      {!modelValid && <p className="tutor-field-error">Use a model id such as anthropic/claude-sonnet-5.</p>}
      {bridge ? (
        <DesktopCoachSettings bridge={bridge} coach={coach} />
      ) : (
        <>
          {health && !health.omp && <p className="tutor-field-error">omp is not on the server's PATH: the coach debrief is off.</p>}
          {health && !health.jev && <p className="hint">Jev is not configured: voice commands use keywords only.</p>}
        </>
      )}

      <Privacy network={network} />
    </section>
  );
}
