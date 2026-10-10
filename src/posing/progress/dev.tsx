// Dev page for the progress view (`/progress-dev.html` on the dev server) until the tutor UI mounts it.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bebas-neue/400.css';
import '@fontsource-variable/outfit/index.css';
import '../../styles.css';
import { ProgressView } from './ProgressView';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="shell">
      <div className="shell-module">
        <ProgressView />
      </div>
    </div>
  </StrictMode>,
);
