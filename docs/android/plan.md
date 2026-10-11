# Posing Tutor for Android: plan

Status: proposed, waiting for the operator's checkpoint. Playbook: poteto-mode → figure-it-out.
Operator facts: recent Pixel (Android 14+); emulator-only testing for now; the coach reaches this computer over Tailscale.

## Definition of done (falsifiable)

1. A sideloadable APK installs on the API 35 emulator and opens straight into the Posing Tutor (no Explorer).
2. Every web tutor feature works in the app: the 12 poses on the 3D figure, live tracking with the front camera,
   scoring, spoken corrections, all five modes (Learn, Hold drill, Judge's calls, Mirror, Progress), a photo at every
   hit with the timeline / compare / trend views, the coach debrief, voice commands, calibration and settings.
3. **Gate on Android (automated).** `npm run android:gate` boots the emulator, installs the APK and runs the tracking
   gate inside the app's WebView: 0 failures, own-pose scores within 5 points of the desktop gate.
4. **Camera loop on Android (automated).** With a video of posed figure renders as the emulator's front camera,
   `npm run android:e2e` drives Learn a pose to a hit and checks: a photo is saved in app storage, the spoken lines
   were logged by the native speech engine, an injected voice command is acted on.
5. Coach debrief and voice-command intent reach this computer over Tailscale through a paired bridge
   (token required; other remote requests stay refused). Without the bridge, voice commands still work through the
   keyword fallback and the debrief shows "coach offline".
6. A phone layout that reads from 2-3 m: big score, cue text and phase; it works in portrait and landscape; the screen
   stays on during a session.
7. The web app still passes its tests and `npm run gate` (no regression).

Only the operator can check speed and the GPU path on the real Pixel. The emulator has no usable GPU.

## Evidence from the prototypes (throwaway, `prototypes/android-*`, git-ignored)

| Question | Capacitor (WebView) | Native Kotlin |
|---|---|---|
| MediaPipe runs | Yes, CPU 53 ms per frame; GPU delegate crashes the emulator | Yes, CPU 30 ms per frame; GPU fails on the emulator |
| Same results as desktop | Full gate in the WebView: 0 failures, scores within 4.8 points | Metrics match web CPU to 0.02°; GPU vs CPU differ up to 4.2° on both platforms |
| 3D figure | three.js lite model renders (127 ms per frame on software GL) | Not built; DQS + morphs need a custom Filament material, about 1,100-1,400 lines |
| Camera | getUserMedia front camera works, permission dialog shown | CameraX 30 fps; a video file can be the emulator camera |
| Speech | No `speechSynthesis` in WebView; native TTS and recognition plugins work | TextToSpeech and the on-device recognizer work |
| Code to write | Native plugins + phone layout + platform seam | About 2,400 lines of domain port + 1,000 test lines + 3D port + all UI |

## Decision: Capacitor app that reuses the web tutor, with native speech, storage and keep-awake

- The tutor's domain, modes, scoring, gate and 3D figure run unchanged, so one implementation stays the truth.
  The WebView gate already passes.
- Speed risk: on the Pixel the WebView may run MediaPipe on the CPU. The tutor needs about 15 fps; the desktop CPU
  delegate ran at 23-36 ms per frame. If the phone is too slow, a native tracking plugin can replace `tracker.ts`
  behind the same interface without touching the rest (the native prototype proved that path and its agreement).

## Architecture

- **Platform seam** (`src/posing/platform/`): interfaces for speech output, voice input, photo store, coach and intent
  client, keep-awake. Web implementations wrap today's code; Android implementations use Capacitor plugins. The
  engine and the views take the platform object, never `window` APIs directly.
- **Photos on the phone:** app-private storage (Capacitor Filesystem), same metadata as the desktop store; the Progress
  views read through the photo-store interface. An "export to gallery" action is a later option.
- **Bridge:** the desktop server gets a paired remote mode for `/api/coach` and `/api/intent` only: requests from the
  Tailscale range with `Authorization: Bearer <token>`; `npm run bridge` creates the token and prints the URL and token
  (and a QR code). The app stores the URL and token in Settings.
- **App shell:** `android/` (Capacitor), a `tutor.html` entry that mounts only the tutor, the lite model, MediaPipe
  assets bundled.

## Units (each ends in a check)

1. Platform seam in the web app; web behavior unchanged (tests, gate, fake-camera e2e). In parallel:
2. Desktop bridge (server only): token pairing, Tailscale-range rule, CORS for the app origin, tests.
3. Capacitor scaffold: `android/`, `tutor.html`, build and install scripts, APK launches on the emulator.
4. Android verification harness: `android:gate` (gate in the WebView) and `android:e2e` (video-file camera), with the
   baseline captured before features.
5. Native adapters: TTS (local voice preferred), recognition (on-device preferred), keep-awake, photo store, permissions.
6. Phone layout and settings (bridge pairing, voice, mute, debrief).
7. Docs, README Android section, debug-signed APK, final verification.

Fan-out: units 1, 2 and 3 touch disjoint files and run in parallel. Units 4-6 follow, one owner at a time.
