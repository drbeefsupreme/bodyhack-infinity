import { useEffect, useState, type ComponentType } from 'react';
import { App } from './App';
import { IconCompass, IconMuscle } from './components/Icons';
import { TutorApp } from './posing/ui/TutorApp';

const MODULES = [
  { id: 'explorer', label: 'Appearance Explorer', short: 'Explorer', Icon: IconCompass, View: App },
  { id: 'posing', label: 'Posing Tutor', short: 'Posing', Icon: IconMuscle, View: TutorApp },
] as const satisfies readonly { id: string; label: string; short: string; Icon: ComponentType<{ size?: number }>; View: ComponentType }[];

type ModuleId = (typeof MODULES)[number]['id'];

function moduleFromUrl(): ModuleId {
  const wanted = new URLSearchParams(location.search).get('module');
  return MODULES.find((m) => m.id === wanted)?.id ?? 'explorer';
}

/** Top level: Bodyhack Infinity branding and the module switch. The module lives in `?module=`; other params belong to the module. */
export function Shell() {
  const [moduleId, setModuleId] = useState<ModuleId>(moduleFromUrl);
  const current = MODULES.find((m) => m.id === moduleId)!;

  useEffect(() => {
    const onPop = () => setModuleId(moduleFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.title = `${current.label} · Bodyhack Infinity`;
  }, [current]);

  const open = (id: ModuleId) => {
    if (id === moduleId) return;
    const url = new URL(location.href);
    url.searchParams.set('module', id);
    history.pushState(null, '', url);
    setModuleId(id);
  };

  return (
    <div className="shell" data-module={moduleId}>
      <header className="shell-bar">
        <div className="shell-brand">
          <span className="shell-mark" aria-hidden="true">∞</span>
          <h1 className="display">Bodyhack <span>Infinity</span></h1>
        </div>
        <nav className="shell-modules" aria-label="Module">
          {MODULES.map(({ id, label, short, Icon }) => (
            <button key={id} type="button" className="shell-module-tab" aria-current={id === moduleId ? 'page' : undefined} onClick={() => open(id)}>
              <Icon size={18} />
              <span className="shell-tab-long">{label}</span>
              <span className="shell-tab-short">{short}</span>
            </button>
          ))}
        </nav>
      </header>
      <div className="shell-module">
        <current.View key={moduleId} />
      </div>
    </div>
  );
}
