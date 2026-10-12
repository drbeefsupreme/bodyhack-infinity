import { use, useEffect, useState } from 'react';
import type { Calibration } from '../metrics';
import { parseSettings, SETTINGS_KEY, type TutorSettings } from '../modes/settings';
import { PlatformContext } from '../platform/context';
import type { PairLink } from '../platform/types';
import { ProgressView } from '../progress/ProgressView';
import { Speech } from '../speech';
import type { PoseId } from '../types';
import { PairDialog, useCoachLink } from './DesktopCoach';
import type { RunSpec, SessionCalibration } from './engine';
import { Home, type HomeChoice } from './Home';
import { TutorRun } from './TutorRun';
import './tutor.css';

type Screen =
  | { readonly kind: 'home' }
  | { readonly kind: 'run'; readonly spec: RunSpec; readonly attempt: number }
  | { readonly kind: 'progress' };

/** The Posing Tutor module: home (modes, pose, settings), a running drill, or the progress photos. */
export function TutorApp() {
  const platform = use(PlatformContext);
  const [speech] = useState(() => new Speech(platform.speechEngine(), platform.store));
  const [settings, setSettings] = useState<TutorSettings>(() => parseSettings(platform.store.getItem(SETTINGS_KEY)));
  const [calibration, setCalibration] = useState<SessionCalibration>(undefined);
  const [pose, setPose] = useState<PoseId>('frontDoubleBiceps');
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const coach = useCoachLink(platform);
  const [pairLink, setPairLink] = useState<PairLink | undefined>();
  const { bridge } = platform;

  useEffect(() => bridge?.onPairLink(setPairLink), [bridge]);

  useEffect(() => {
    platform.store.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [platform, settings]);

  const choose = (choice: HomeChoice) => {
    if (choice === 'progress') setScreen({ kind: 'progress' });
    else setScreen({ kind: 'run', spec: { mode: choice, pose, holdGoal: settings.holdGoal }, attempt: 0 });
  };
  const home = () => setScreen({ kind: 'home' });

  const view = (() => {
    switch (screen.kind) {
      case 'home':
        return <Home pose={pose} onPose={setPose} onChoose={choose} settings={settings} onSettings={setSettings} speech={speech} coach={coach} />;
      case 'progress':
        return (
          <div className="tutor-progress">
            <button type="button" className="pill tutor-back" onClick={home}>
              ← Back to the tutor
            </button>
            <ProgressView />
          </div>
        );
      case 'run':
        return (
          <TutorRun
            key={screen.attempt}
            spec={screen.spec}
            settings={settings}
            speech={speech}
            calibration={calibration}
            onCalibration={(c: Calibration | 'skipped') => setCalibration(c)}
            onAgain={() => setScreen({ ...screen, attempt: screen.attempt + 1 })}
            onHome={home}
          />
        );
    }
  })();

  return (
    <>
      {view}
      {pairLink && bridge && (
        <PairDialog key={pairLink.ok ? `${pairLink.url} ${pairLink.token}` : pairLink.error} link={pairLink} bridge={bridge} coach={coach} onClose={() => setPairLink(undefined)} />
      )}
    </>
  );
}
