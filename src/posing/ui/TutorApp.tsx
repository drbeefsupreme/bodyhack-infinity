import { useEffect, useState } from 'react';
import type { Calibration } from '../metrics';
import { parseSettings, SETTINGS_KEY, type TutorSettings } from '../modes/settings';
import { ProgressView } from '../progress/ProgressView';
import { Speech } from '../speech';
import type { PoseId } from '../types';
import { health, type Health } from './api';
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
  const [speech] = useState(() => new Speech());
  const [settings, setSettings] = useState<TutorSettings>(() => parseSettings(localStorage.getItem(SETTINGS_KEY)));
  const [calibration, setCalibration] = useState<SessionCalibration>(undefined);
  const [pose, setPose] = useState<PoseId>('frontDoubleBiceps');
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });
  const [server, setServer] = useState<Health | undefined>();

  useEffect(() => {
    health()
      .then(setServer)
      .catch((err: unknown) => console.warn('The local API did not answer /api/health.', err));
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const choose = (choice: HomeChoice) => {
    if (choice === 'progress') setScreen({ kind: 'progress' });
    else setScreen({ kind: 'run', spec: { mode: choice, pose, holdGoal: settings.holdGoal }, attempt: 0 });
  };
  const home = () => setScreen({ kind: 'home' });

  switch (screen.kind) {
    case 'home':
      return <Home pose={pose} onPose={setPose} onChoose={choose} settings={settings} onSettings={setSettings} speech={speech} health={server} />;
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
}
