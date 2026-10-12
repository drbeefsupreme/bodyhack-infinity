# Bodyhack Infinity

Two modules in one app: the **Appearance Explorer** (below) and the **Posing Tutor** (see
[Posing Tutor](#posing-tutor)). Open a module with the switch at the top, or with `?module=explorer` or
`?module=posing` in the URL.

An interactive 3D playground for the words bodybuilders use to describe how muscles look —
*full, flat, spilled over, dry, crispy, separated, striated, vascular, mature* — and what is and
is not known about why a body looks that way.

It is an **educational illustration, not a physiological simulation**. The same procedural
figure, pose, camera and neutral light are used for every term; stage light, tan and oil are
separate controls so they can never secretly explain a difference attributed to muscle.

![Full vs flat at the same leanness](docs/screenshots/full-vs-flat.webp)

## Run it

Requirements: Node 22.18+, which runs the TypeScript setup script directly (Bun only if you want to rebuild
the model).

```sh
npm install
npm run mediapipe      # once: pose tracker WASM and model into public/mediapipe
npm run dev            # http://localhost:5173
```

Production build:

```sh
npm run build
npm run preview        # http://localhost:4173
```

The baked model files are already in `public/model` and `public/model-lite`. To regenerate them
(requires [Bun](https://bun.sh), multi-core recommended, ~3 minutes):

```sh
npm run model && npm run model:lite
```

Other scripts: `npm test` (content integrity, mapping and local API tests), `npm run typecheck`,
`npm run sources` (re-extract the verified source lists from `research/*.md`).

### Local API

`npm run dev` and `npm run preview` also serve a small JSON API from `server/` (a Vite plugin).
The browser never sees the keys.

| Endpoint | Needs | Does |
|---|---|---|
| `GET /api/health` | nothing | `{ ok, omp, jev }`: whether `omp` is on `PATH` and a jev key is set |
| `POST /api/intent` | `TYPESAFE_API_KEY` | picks a voice command: `{ heard, options }` → `{ choice, confidence, probabilities }` |
| `POST /api/coach` | `omp` on `PATH`, logged in | coach debrief of a snapshot via `omp -p`: `{ pose, summary, imageDataUrl?, model? }` → `{ cues, note, model, ms }` |

The server reads `TYPESAFE_API_KEY` from the environment, else from `.env.local` in the project
root, else `~/git/crispy/.env.local`, else `~/.config/bodyhack-infinity/env`. Set
`BODYHACK_COACH_MODEL` to change the coach model (default `anthropic/claude-sonnet-5`).

The API serves body photos, runs `omp` on your login and uses the jev key, so only this computer can call it.
The app pages are still served to the network, so the explorer works over Tailscale, but every `/api/*` request
from another address, or with a `Host` other than `localhost`, `127.0.0.1` or `[::1]`, gets 403. Cross-origin
requests and `POST` requests without `Content-Type: application/json` also get 403. To use the tutor from another
machine, start the server with `BODYHACK_API_ALLOW_REMOTE=1`. This lifts the address and `Host` rules. The
cross-origin rules stay.

### Pose tracking assets and debug page

`npm run mediapipe` copies the MediaPipe WASM from the pinned `@mediapipe/tasks-vision` package and downloads
the pose model, checked by SHA-256, into `public/mediapipe/` (34 MB, git-ignored). Run it again after upgrading
the package. The tracker loads nothing from a CDN, but MediaPipe itself posts usage metrics to
`odml.pa.googleapis.com` about once a minute (see the privacy notice in the package README).

`/posing-debug.html` runs the live loop on the camera or on a dropped image or video file: landmarks over the
frame, the metrics, the called pose's score and faults, the cue scheduler's events and the spoken cues. Add
`?pose=<id>` to call another pose (default `frontDoubleBiceps`).

## What you can do

- **Explore** — a vocabulary deck of 25 term cards in five color-coded groups (volume,
  leanness, detail, structure, stage). Most cards move the model (four are explanation-only).
  Each card lists numbered "Look for" cues (click one to fly the camera there and make the
  region glow), a *What changed* readout with from/to bars, usage and evidence badges, a
  deeper explanation and its sources. Cards you open are counted in the "explored" tracker.
- **Stack terms** — switch on *Stack terms* (or Shift-click cards) to combine up to four cards,
  for example Peeled + Shredded or Full + Dry. Each card only overrides the controls it is
  actually about. When two cards pull the same control in opposite directions (e.g. Soft /
  off-season vs Shredded), the tray shows a *Clash!* note and the model splits the difference.
- **Look meter** — a HUD with the eight illustrative control values as bars (twin A/B bars in
  Versus; hidden in Challenge until you answer). *Tune it yourself* opens the sandbox sliders.
  These are artistic values, not measurements; soft tissue and smoothing deliberately hide the
  other detail.
- **Skin & tan** — a skin-tone slider (light to deep) and a spray-tan slider (None → Light →
  Medium → Show → Pro dark), plus oil/sheen and *Natural* / *Show day* quick settings. The tan
  darkens light skin more than deep skin, and a darker tan makes grooves read deeper. It never
  changes the body and always applies to both sides of a comparison.
- **Versus** — ten matched face-offs validated against the research (full vs flat at the same
  leanness; full & sharp vs "spilled"; small & lean vs bigger & softer; separation vs
  striations; mature/grainy vs smoother at the same size and fat; dry vs watery at the same
  volume; pumped vs unpumped; vascular vs not; same body under neutral vs stage light;
  off-season vs stage-ready), or a custom match. One camera drives both halves.
- **Challenge** — ten randomized pairs ("Which side looks flatter?") with points, a streak
  bonus, progress pips, a rank at the end and a saved best score. The reveal makes the relevant
  regions glow, explains the intended reading, and says when more than one description is fair
  (including a trick pair where only the light differs). The rank scores your eye for the
  vocabulary, not anyone's body.
- Orbit/zoom, front/¾/side/back views, region focus (shoulders, chest, arms, forearms, abs,
  upper back, lower back, glutes, quads, hamstrings, calves), reset, neutral vs stage light,
  HD/Lite mesh detail.
- Keyboard: `1`–`4` views, `R` reset, `L` light toggle; all controls are buttons/inputs with
  labels. Reduced motion follows the OS setting and can be toggled in the top bar (it also turns
  off the game animations). Without WebGL 2 the app shows pre-rendered comparisons and keeps all
  explanations.

## How the figure is rendered

The figure is a signed distance field built from 48 muscle definitions per side (116 swept-ellipse
fiber bundles from origin to insertion), bony landmarks, deep fill, 18 superficial vein paths per side
and regional fat deposits. A Bun pipeline meshes the lean base state and bakes nine morph
targets by re-finding each target surface along every vertex normal:

| Control | What it changes on the model |
|---|---|
| Fullness | Belly radius and depth along each bundle's profile; tendons and skeleton fixed |
| Size | Muscle cross-sections overall (more at bellies) |
| Soft tissue (fat) | Low-pass of the muscle relief + skin/fat layer + regional deposits |
| Smoothness | Even low-pass and thin layer, no regional thickening |
| Separation | Grooves cut along the real borders between modeled muscles |
| Detail | Grooves between heads of one muscle + shader grain |
| Vascularity | Vein tubes on authored anatomical paths, projected onto the skin |
| Striations | Shader ridges along each muscle's fiber direction, masked to bellies |

Per-target ambient occlusion comes from the SDF, so grooves read in neutral light. Full
details: [`docs/modeling.md`](docs/modeling.md).

## Research and sources

Four research reports in `research/` cover fullness/water/pump/peak week, conditioning terms
and judging criteria, separation/striations/vascularity (with an anatomy appendix for muscle
attachments, fiber directions and superficial veins), and maturity/density/shape/insertions/
symmetry. Each separates the visual impression, the community's claimed cause, and what
academic evidence supports. Physiology claims cite academic sources; usage claims cite
rulebooks, judges, coaches and publications; forums are used only to show usage. No
dehydration, diuretic, drug or contest-prep protocols are included.

The reports list 342 sources that the research agents fetched and checked; the app cites 172
of them (`src/content/sources.generated.json` is extracted from the reports, so every link in
the app is one of those entries). A final automated check returned content for 168 of the 172
cited URLs; the other four (two DOI redirects and two Merriam-Webster pages) block automated
requests and open normally in a browser.

Key findings that shaped the app:

- Separation and striations are different concepts (rulebooks treat striations as a level
  beyond separation); both need a thin fat layer; what the visible lines are is unproven.
- Carbohydrate loading changes muscle thickness by about 2–5%; the link to what judges see is
  unproven, so the model labels its fullness change as exaggerated for teaching.
- "Spilled over" and "dry/watery" describe surface sharpness; the water-under-the-skin
  explanation has no direct evidence, and softness from fat looks the same, so the model uses
  the same surface controls and never draws a water layer.
- "Vascular means dry" is not supported.
- "Maturity", "density", "hardness" and "grain" are overlapping slang without a demonstrated
  tissue change beyond more muscle and less fat; the model changes only surface detail at
  fixed size and fat, and has no age slider.
- The "Christmas tree" is erector and lat borders seen through thin fat.

## Asset attribution

- **3D model**: procedural, written for this project (`scripts/model/`). No third-party mesh,
  texture or image is used. Candidate assets that were evaluated and rejected (MakeHuman,
  Écorché, BodyParts3D, Z-Anatomy, NIH 3D, museum scans, Sketchfab) are documented with their
  licenses in `research/assets.md`.
- **Visual references**: the research reports link openly licensed Wikimedia Commons photos with
  author and license recorded; none is copied into the app.
- **Libraries**: three.js (MIT), React (MIT), Vite (MIT), Vitest (MIT), TypeScript (Apache-2.0).
- **Fonts** (bundled through Fontsource): Bebas Neue © The Bebas Neue Project Authors (Dharma
  Type) and Outfit © The Outfit Project Authors, both SIL Open Font License 1.1.

## Limitations (honest account)

- **Illustrative, not measured.** Controls are artistic. The figure's proportions are a plausible
  heavyweight physique, not a scan of a real person. Fat distribution is illustrative.
- **One pose.** Only a relaxed front stance. Real striations and peaks show mostly when flexed;
  the model shows them unflexed. "Pumped" is applied to the whole body for simplicity.
- **Head.** Deliberately simplified to a mannequin head after realistic faces looked uncanny.
- **Mirror symmetric.** The tool cannot show asymmetry; symmetry, insertions and V-taper are
  explanation-only terms because showing them honestly would need a different person.
- **Not modeled**: "diced" crossing patterns, flexing, individual vein maps. Skin tone and spray
  tan are a single albedo color (no subsurface scattering, freckles or uneven tan); oil is a
  clearcoat layer.
- **Artifacts**: at high softness, small slivers can appear in tight creases (armpit, crotch,
  gluteal fold, inside the elbow) where the soft-tissue morph fills a gap. Striations can show
  slight moiré where many lines converge near a tendon.
- **Performance**: frame time scales with triangle count. The ~280 ms (detailed mesh) and ~140 ms
  (lite mesh) per frame noted earlier came from the automated test browser, which renders on the CPU
  with SwiftShader; its WebGL renderer string was spoofed to read "Intel UHD 620". They are not GPU
  numbers. On the development machine's Radeon RX 7900 XTX, the tutor kept up with a 15 fps fake
  camera, with MediaPipe pose detection at about 7 ms per frame. The app still switches to the lite
  mesh when the first frame is slow.

## Project layout

```
src/                 React app, Three.js viewer, shader, content
  content/           terms, comparisons, quiz, presets, generated sources
  three/             Viewer (A/B scissor rendering), skin shader, model loader, control mapping
  posing/            pose domain, tracker, smoothing, facing hysteresis, cue scheduler, speech, debug page
    modes/           practice modes as pure reducers (Learn, Hold, Judge's calls, Mirror), voice commands, settings
    ui/              tutor screens: home, live drill engine, figure view, settings
    platform/        device seam: web (browser + local API) and Android (native plugins + bridge)
android/             Capacitor Android app; native pose (CameraX + MediaPipe) and voice plugins in Kotlin
scripts/android/     toolchain setup, build, install, emulator, Android gate, e2e and phone screenshot drivers
scripts/model/       SDF anatomy, field, mesher, morph baking (Bun)
scripts/content/     source extraction from research reports
research/            research reports, asset survey, region screenshots from the modeling agents
docs/                modeling notes and verification screenshots
public/model*        baked models; public/fallback: no-WebGL images
public/mediapipe/    MediaPipe WASM and pose model (npm run mediapipe, git-ignored)
shot.html            render harness used for verification
posing-debug.html    tracking and cue debug page
tutor.html           Android entry: the Posing Tutor alone
```

## Posing Tutor

Open `?module=posing`. Pick a pose (the 12 NPC / IFBB Pro prejudging poses), then a mode:

| Mode | What happens |
|---|---|
| Learn a pose | The build-up steps one at a time, spoken; say "next" or press Space. Then free correction until the pose is hit. |
| Hold drill | Hit the pose and hold it 10, 20 or 30 s. The hold restarts if the score stays under the line for more than 1 s. Result: mean score and steadiness (standard deviation in points). |
| Judge's calls | Prejudging order: the quarter turns, then the 8 mandatories, each called like a head judge, 25 s per call. Summary per call with score and time; personal bests in `localStorage`. |
| Mirror | The figure copies you live (2D retarget of arm and leg angles). No score. |
| Progress | Your saved photos per pose (below). |

Each session starts with a relaxed-front calibration (skippable). Keys: Space next, S skip, R repeat, W what's
wrong, P pause, Esc stop. At every hit the tutor saves a photo (`/api/photos`) and, with the coach debrief on,
asks the coach model through `omp` (`/api/coach`, about 7 s); the next pose never waits for it.

**Voice commands.** Chrome speech recognition hears a phrase (paused while the tutor speaks); jev picks next,
repeat, what's wrong, pause, resume, stop, skip or other. The tutor acts at confidence 0.7 or more, else a
keyword table decides; when `/api/intent` fails (503 without `TYPESAFE_API_KEY`), keywords only. Tests can inject
a phrase with `window.__tutorHeard('next one please')`.

**Privacy.** `index.html` sets `connect-src 'self'`, so the page talks only to its own server; this blocks
MediaPipe's usage metrics to `odml.pa.googleapis.com`. What leaves the computer: with the coach debrief on (the
default), the photo of each hit pose and its scores go to the coach model through omp; your speech goes to Google
through Chrome's recognition; the cue text goes to Google if the chosen voice is a network voice; the recognized
command text goes to jev. The video and the landmarks stay here. The saved photos are stored only here; turn off
the coach debrief in Settings if no photo should leave the computer.

Run it with `npm run dev`, then `npm run mediapipe` once for the pose model. Settings (voice, mute, voice
commands, coach debrief, coach model) are on the tutor home; the coach model defaults to the server's
(`BODYHACK_COACH_MODEL` or `anthropic/claude-sonnet-5`, reported by `/api/health`).

**Known limits.**
- Pass bands come from 26 competition photos (1 to 3 per pose), so they are estimates. They are not yet tuned
  on webcam video of real users.
- One camera sees only 2D. Depth (elbows forward), lat flare, vacuum and chest lift are left to the coach debrief.
  Side poses read worse than front and back poses, because the far arm is hidden.
- On back views, MediaPipe reads a false 9 to 18 degree twist on the figure. Real users may hear "Square your
  shoulders" when they are already square.
- Right after a continuous turn to the back, MediaPipe can read a side view for a few seconds. The tutor smooths
  facing (300 ms hysteresis), ignores 300 ms dropouts during a hold, and starts a fresh detection when a call
  changes the facing. On the fake-camera clip, the back pose then settles in 0 to 2.5 s.
- Automated tests used fake cameras and injected voice phrases. A real webcam and a real microphone are not yet
  tested.

`npm run gate` renders the figure in every pose, runs the frames through the real tracker and scoring, and fails
when a pose misses its own score or a known fault is not the top correction (`docs/posing-tutor/gate-report.md`).

## Progress photos

The Posing Tutor saves a photo every time you hit a pose, with the date, the score, the corrections and the
tracked landmarks. The progress view (`src/posing/progress/ProgressView.tsx`) shows a timeline per pose, a
side-by-side or onion-skin compare of two dates (first against latest by default) with an optional skeleton
overlay, and the score trend. The tutor's Progress card opens it; `/progress-dev.html` still shows it alone.

Photos stay on this computer. The local API stores them in `$BODYHACK_DATA_DIR/photos`, else in
`~/.local/share/bodyhack-infinity/photos` (directory mode 0700, files 0600): one JPEG or WebP and one JSON
sidecar per photo. The server makes the photo ids (UUIDs), so a request can never name a path.

| Endpoint | Does |
|---|---|
| `POST /api/photos` | saves `{ pose, imageDataUrl, score, faults: [{ metric, side?, cue }], landmarks?, mode?, note? }` (JPEG or WebP data URL, body at most 8 MB) → `{ photo }` |
| `GET /api/photos?pose=<id>` | metadata, newest first (every pose without `pose`) → `{ photos }` |
| `GET /api/photos/<id>/image` | the image, as `image/jpeg` or `image/webp` |
| `DELETE /api/photos/<id>` | deletes one photo |
| `DELETE /api/photos?pose=<id>` or `?all=1` | deletes every photo of one pose, or every photo → `{ deleted }` |

To check the views without a camera, seed a scratch directory with a fake history (3 poses on 6 dates,
rendered by `shot.html` in headless Chrome, landmarks from MediaPipe). The script refuses the real data
directory and needs the dev server and `npm run mediapipe`:

```sh
BODYHACK_DATA_DIR=/tmp/bodyhack-seed npm run dev -- --port 5351
BODYHACK_DATA_DIR=/tmp/bodyhack-seed bun scripts/seed-progress.ts --app http://localhost:5351
```

## Phone bridge

The Android app sends the coach debrief and voice-command intent requests to this computer over Tailscale. The
jev key and the omp login stay here. The bridge opens three routes to the paired phone: `GET /api/health`,
`POST /api/coach` and `POST /api/intent`. The photo routes and all other routes stay closed to other machines.

A request from another machine gets through the bridge only when all of these are true:

- Its source address is in the Tailscale range (`100.64.0.0/10` or `fd7a:115c:a1e0::/48`).
- It has `Authorization: Bearer <token>`, and the token is the stored token (constant-time compare).
- It has no `Origin`, or the origin of the app WebView: `https://localhost`, `capacitor://localhost` or
  `http://localhost`. The reply then has `Access-Control-Allow-Origin` for that origin.
- A `POST` has `Content-Type: application/json`.

The server answers a CORS preflight (`OPTIONS`) for the three routes only from a Tailscale address and an app
origin, for the method of the route, and for the `Authorization` and `Content-Type` headers. It refuses all other
preflights to `/api/*` with 403. Requests from this computer follow the rules in [Local API](#local-api). When no
token is stored, the server acts as if the bridge did not exist.

Make the token and pair the phone:

```sh
npm run bridge                    # for a server on port 5173 (npm run dev)
npm run bridge -- --port 5190     # for a server on another port
npm run bridge -- --rotate        # make a new token; the old token stops working
```

The command prints the server URL (the Tailscale IPv4 address from `tailscale ip -4` and the port), the token, the
pairing link `bodyhack://pair?url=...&token=...` and a QR code of that link. The QR code needs the `qrencode`
program (`apt install qrencode`). Without it, type the URL and the token in the app settings. The token is 32
random bytes (base64url) in `~/.config/bodyhack-infinity/bridge.json` (mode 0600), with the time it was made.
The server reads the token on each bridge request, so a new token applies without a restart.

Run the server for the phone with one of these commands:

```sh
npm run dev                                       # port 5173
npm run build && npm run preview -- --port 5190   # production build on port 5190
```

Both servers listen on all interfaces. Tailscale must run on this computer and on the phone. In the app, use the
Tailscale IP address that `npm run bridge` prints, not a MagicDNS name: Vite refuses Host names that are not
`localhost` or an IP address.

Check the bridge from this computer (the request then comes from its own Tailscale address):

```sh
curl -H "Authorization: Bearer $(node -p "require('$HOME/.config/bodyhack-infinity/bridge.json').token")" \
  http://$(tailscale ip -4):5173/api/health
```

## Android app

The Android app is the Posing Tutor alone, for a phone that stands upright with its screen facing you, 2 to 3 m
away. It has the same poses, modes, scoring, spoken corrections, voice commands, photos and coach debrief as the web
tutor. The tutor code is the same TypeScript. It runs in a Capacitor WebView behind the device seam in
`src/posing/platform/`. The phone does these parts natively:

- **Tracking.** A Kotlin plugin (`android/.../pose/`) opens the front camera with CameraX. It shows the mirrored
  preview behind the transparent page and runs MediaPipe Pose Landmarker for Android (GPU, with a fall back to the
  CPU). It sends the landmarks to the page.
- **Voice.** Android text-to-speech speaks the cues, with a local voice when one is installed. A Kotlin plugin
  (`android/.../voice/`) recognizes commands, on the device when Android can.
- **Photos.** Photos are stored in the app's private storage. Android backup and device transfer are turned off, so
  the photos stay on the phone. Uninstalling the app deletes them.
- **Screen.** The screen stays on during a session.

The coach debrief and the voice-command intent go to this computer through the [Phone bridge](#phone-bridge). Without
the bridge, voice commands use the keyword fallback and the debrief shows "coach offline".

### Build and install

```sh
scripts/android/setup-toolchain.sh   # once: JDK 21 and the Android SDK in user space, plus an emulator image
npm run mediapipe                    # once: the pose model
npm run android:build                # debug APKs in android/app/build/outputs/apk/debug/
```

For a Pixel, install `app-arm64-v8a-debug.apk`. You can install it over USB with
`adb install -r android/app/build/outputs/apk/debug/app-arm64-v8a-debug.apk`, or copy the file to the phone and
open it (allow "install unknown apps" for the file app). The APK is debug-signed, so it is for sideloading only.

### Pair the phone with the desktop coach

1. On this computer, start the server (`npm run dev`) and run `npm run bridge`.
2. On the phone, turn on Tailscale. Scan the QR code with the camera app; it opens the app's pairing dialog. Or, in
   the app, open Settings > Desktop coach and paste the URL and the token.
3. Settings shows "online" and the coach model. The pairing survives an app restart. Unpair it in Settings.

### Checks

| Command | What it checks |
|---|---|
| `npm run android:gate` | Renders every pose in the app's WebView, runs the frames through the native tracker and the TypeScript scoring, and compares with the desktop gate (pass: no failures, scores within 5 points) |
| `npm run android:e2e` | Emulator with one video of posed figure renders per mode as the front camera: Learn a pose to a hit (photo in app storage, a voice command acted), a 10 s Hold drill with no reset, the first 3 Judge's calls hit, Mirror follows the arms, native speech spoke. Then it starts `npm run dev` on a free port and pairs by the `bodyhack://pair` link: jev decides a free phrase, a coach note arrives, and after unpairing a hit shows "coach offline". It makes one real jev call and one real coach call |
| `node scripts/android/phone-shots.ts` | Phone screens in portrait and landscape, pairing by link, delete on the device, keep-awake |

The emulator runs the figure and the camera together only with `-gpu host` (llvmpipe on this machine). The scripts
start it without a window. Reports: `docs/android/android-gate-report.md`, `docs/android/e2e-report.md`,
`docs/android/phone-report.md`.

### Known limits

- Only the emulator was tested. On the emulator, tracking runs on the CPU (about 29 frames per second, 48 ms per
  still frame). The Pixel's GPU path, its speed, legibility at 2 to 3 m and real speech recognition need the real
  phone.
- The emulator has no audio input, so voice recognition was checked only through a test hook and its error handling.
- Android lets the app use plain HTTP, so it can reach the bridge. The app accepts only Tailscale addresses for the
  bridge, and the bridge needs the token.
