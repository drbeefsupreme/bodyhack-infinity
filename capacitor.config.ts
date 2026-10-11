import type { CapacitorConfig } from '@capacitor/cli';

// webDir is the Vite build that scripts/android/build.sh makes for the app (dist without the assets the app never
// loads). The app opens the Posing Tutor page.
const config: CapacitorConfig = {
  appId: 'ai.bodyhack.infinity',
  appName: 'Bodyhack Posing',
  webDir: 'dist-android',
  server: { appStartPath: '/tutor.html' },
};

export default config;
