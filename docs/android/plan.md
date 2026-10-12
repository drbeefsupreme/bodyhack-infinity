# Posing Tutor for Android: plan

Status: approved at the checkpoint with one change: native tracking from the start (hybrid). Playbook: poteto-mode →
figure-it-out.
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

## Decision: Capacitor app that reuses the web tutor, with native tracking, speech, storage and keep-awake

- The tutor's domain, modes, scoring, gate and 3D figure stay in TypeScript and run unchanged in the WebView, so one
  implementation stays the truth. The WebView gate already passes.
- The operator chose native tracking from the start: a Kotlin Capacitor plugin owns the front camera (CameraX), shows
  the mirrored preview behind the transparent WebView and runs MediaPipe Tasks for Android (GPU, CPU fallback). It
  sends landmarks to the tutor as events. Contract: `src/posing/platform/posePlugin.ts`. On the emulator's CPU this
  path ran at 30 ms per frame against 53 ms in the WebView, and its metrics matched web to 0.02°.
- The gate on Android feeds the figure renders through the plugin's `detectImage`, so it checks the native tracker
  plus the TypeScript scoring together.

## Architecture

- **Platform seam** (`src/posing/platform/types.ts`): interfaces for the pose source (camera + detection + photo
  capture), speech output, voice input, photo store, coach and intent client, keep-awake. Web implementations wrap
  today's code; Android implementations use the pose plugin and Capacitor plugins. The engine and the views take the
  platform object, never `window` APIs directly.
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
3. Capacitor scaffold and the native pose plugin: `android/`, build and install scripts, CameraX preview behind the
   WebView, LIVE_STREAM landmarks, `detectImage`, `capturePhoto`; verified on the emulator with a video-file camera.
4. Android platform adapter and `tutor.html` entry: the tutor runs in the app on the native pose source.
5. Android verification harness: `android:gate` (renders through `detectImage`) and `android:e2e` (video-file camera),
   with the baseline captured before the remaining features.
6. Native adapters: TTS (local voice preferred), recognition (on-device preferred), keep-awake, photo store.
7. Phone layout and settings (bridge pairing, voice, mute, debrief).
8. Docs, README Android section, debug-signed APK, final verification.

Fan-out: units 1, 2 and 3 touch disjoint files and run in parallel. Units 4-7 follow, one owner at a time.

## Change 2: no desktop at all

Operator decision: the app must work with no desktop. Phone: Pixel 10. Choices: the coach debrief runs on the phone
with Gemini Nano; voice-command intent calls jev directly from the phone; the desktop bridge is removed.

Definition of done (adds to the list above; item 5 is replaced):

5. **No desktop.** With this computer off, every tutor feature works on the phone. The app's own network traffic is
   the jev intent call to `https://api.typesafe.ai` (transcript text only) and, if Android has no on-device recognizer
   for the language, Android's own speech service. Google's SDKs also send small usage-metric events (ML Kit GenAI to
   `firebaselogging.googleapis.com`, with no image or prompt). The terms require that the app tells the user, so
   Settings and the README name them. Photos and the coach's input never leave the phone.
8. **On-device coach.** `BodyhackCoach` (contract `src/posing/platform/coachPlugin.ts`) runs Gemini Nano through the
   ML Kit GenAI Prompt API with the hit photo and the score summary, and returns cues and a note. Settings shows the
   model status (available, download with progress, unavailable with the reason) and a self-test that runs a bundled
   figure render through the coach and shows the reply and its time. Where Nano is unavailable (the emulator, older
   phones), the debrief says so and nothing else breaks.
9. **Intent on the phone.** The TypeSafe key is pasted once in Settings and kept in `BodyhackSecrets` (Android Keystore,
   contract `src/posing/platform/secretsPlugin.ts`). Free phrases go to jev with the same request as the desktop
   (one shared module); without a key or offline, the keyword fallback decides.
10. **Bridge removed.** No bridge code, routes, pairing UI, deep link or cleartext permission remain; the web app keeps
    its loopback-only local API.

Verification limits: the emulator has no AICore, so Gemini Nano itself runs only on the Pixel. The emulator proves the
unavailable path, the plugin wiring, jev with a real key from the Keystore, and that no request goes anywhere else.

Units: (C1) shared prompt and jev modules, bridge removal, Android adapters for coach, intent and secrets, Settings,
docs, e2e; (C2) the Kotlin `BodyhackCoach` and `BodyhackSecrets` plugins. C1 and C2 run in parallel on disjoint files.
