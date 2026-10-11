import type { CapacitorConfig } from '@capacitor/cli';

// webDir is the Vite build that scripts/android/build.sh makes for the app (dist without the assets the app never
// loads). The start page becomes tutor.html when the tutor entry exists.
const config: CapacitorConfig = {
  appId: 'ai.bodyhack.infinity',
  appName: 'Bodyhack Posing',
  webDir: 'dist-android',
  server: { appStartPath: '/probe.html' },
};

export default config;
