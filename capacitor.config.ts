import type { CapacitorConfig } from '@capacitor/cli';

// webDir is the Vite build that scripts/android/build.sh makes for the app (dist without the assets the app never
// loads). The app opens the Posing Tutor page. Capacitor's own logging is off: in debug builds it writes the options of
// every plugin call to logcat, and those include the TypeSafe key (BodyhackSecrets.set, the jev Authorization header).
const config: CapacitorConfig = {
  appId: 'ai.bodyhack.infinity',
  appName: 'Bodyhack Posing',
  webDir: 'dist-android',
  loggingBehavior: 'none',
  server: { appStartPath: '/tutor.html' },
};

export default config;
