// The Android app's page: only the Posing Tutor, on the Android platform. No Explorer, no module shell.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { androidPlatform } from '../platform/android';
import { PlatformContext } from '../platform/context';
import { TutorApp } from './TutorApp';
import '@fontsource/bebas-neue/400.css';
import '@fontsource-variable/outfit/index.css';
import '../../styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('tutor.html has no #root');

createRoot(root).render(
  <StrictMode>
    <PlatformContext value={androidPlatform}>
      <TutorApp />
    </PlatformContext>
  </StrictMode>,
);
