# Posing tutor: plan

Status: approved at the checkpoint (NPC / IFBB Pro poses, coach debrief after every held pose, Chrome speech
recognition plus jev). Progress photos added at the operator's request during the build. Playbook: poteto-mode → figure-it-out.

## Definition of done (falsifiable)

1. The app is named Bodyhack Infinity and has two modules: Appearance Explorer (existing) and Posing Tutor.
2. The figure shows every pose in the pose library and animates smoothly between them.
3. **Tracking gate (automated).** Renders of the figure in pose P, fed through the real tracking pipeline
   (canvas → MediaPipe → features → score), score at least 85 for P and below 60 for a clearly different pose,
   for every pose that the tutor scores from the front or back. A render with one known fault
   (for example elbows dropped 30°) produces that fault's cue as the top correction.
4. **Webcam path (automated).** A fake-camera Chrome session (y4m of posed renders) runs the full tutor loop
   to a "pose hit" without manual input.
5. Spoken corrections play in order of importance, at most one at a time, and stop when the pose is held.
6. Each practice mode completes a session end to end. Scores persist locally.
7. Coach review returns a spoken and written critique through `omp -p` within about 10 s.
8. Voice commands route through jev with confidence gating and a keyword fallback when jev is unsure or offline.
9. Typecheck, unit tests and the tracking gate pass. The README is updated, including the corrected GPU note.
10. **Progress photos.** Every hit pose saves its photo with the date, score, faults and landmarks. The user can
    open a timeline per pose, compare any two dates side by side (first against latest by default), and see the
    score trend. Photos stay on the local disk and the user can delete one photo or all of them.

The operator's own body on a real webcam is the final check only the operator can run.

## Evidence from the prototypes (throwaway, in `prototypes/`, git-ignored)

| Question | Result | Source |
|---|---|---|
| How to pose the figure | Rig the baked mesh (dual-quaternion skinning, weights from the nearest muscle bundle's bones). Pose update 6-10 µs. Rebaking the SDF per pose breaks at the shoulder (lat spikes, hole under the clavicle). | PoseRigProto, `prototypes/pose-rig/shots/sheets/` |
| Can MediaPipe track the user | Yes for front, back and 3/4 views: elbow angle error 1-7° on posed renders. Side views hide the far arm; 3D world angles are unreliable, so score 2D image-plane angles. | PoseTrackProto, `prototypes/pose-track/out/summary.md` |
| Automated camera test | Works: canvas → `detectForVideo`, and a fake-camera y4m in a Chrome launched with flags (101/102 frames detected). | PoseTrackProto |
| Pose targets | 11 poses with geometry targets, faults, cues and build-up steps; pass bands from 26 measured reference photos (estimates). | PoseSpecResearch, `prototypes/pose-spec/poses.md` |
| LLM coach | `omp -p` reads an image and answers correctly: Sonnet 5 in 5.0 s, Opus 5.5 in 6.5 s, through the operator's login. Too slow for live cues. | measured in this session |
| Jev | Text only, so it cannot judge images. Voice-intent choice ("repeat") returned in 173 ms, confidence 1.0. | measured in this session |
| GPU | The automated browser renders with SwiftShader (CPU). The machine has a Radeon RX 7900. The README's "Intel UHD 620, 280 ms" note is wrong. | `ps`, `lspci` |

## Architecture

- **Live loop (no LLM):** webcam → MediaPipe Pose Landmarker (self-hosted WASM and model) → smoothed
  2D landmarks → pose features → score and ranked faults → cue scheduler → speech synthesis.
- **One source of truth per pose:** a `PoseDef` holds bone rotations for both sides (the current pose format
  mirrors the left side and cannot show side poses). The 3D figure is driven by it, and the target features are
  derived from it by forward kinematics projected through the same camera view, plus hand-tuned tolerances and
  cue text from the research.
- **Cue scheduler:** a state machine (`framing → building → correcting → holding → hit`) owns timing, so cues
  are not scattered across components.
- **Slow layer:** a local server (Vite middleware in dev, the same handlers in `vite preview`) exposes
  `/api/coach` (spawns `omp -p --model <setting> --no-session` with a snapshot path) and `/api/intent`
  (calls jev). Secrets stay on the server: `TYPESAFE_API_KEY` from the environment or `.env.local`.

## Practice modes (proposed)

| Mode | Teaches | Scored on |
|---|---|---|
| Learn a pose | One pose, built up step by step (feet → legs → torso → arms → hands → flex), with corrections | time to hit, final accuracy |
| Hold drill | Holding a pose steadily for 10-30 s | accuracy over the hold, steadiness |
| Judge's calls | Quarter turns and the mandatory poses called in order, like prejudging | hit time and accuracy per pose |
| Mirror | The figure copies you live, next to the target | none (exploration) |
| Coach review | A snapshot critique by the LLM of what the camera cannot measure (lat flare, vacuum, chest up) | qualitative |
| Progress | A timeline of saved photos per pose; side-by-side compare of two dates with the skeleton overlay; score trend | none (review) |

## Units (riskiest first; each ends in a check)

1. Scaffold: shell rename and module nav; local API server skeleton with `/api/health`.
2. Rig: skin weights baked by the model pipeline, DQS skinning in the Viewer, two-sided `PoseDef` library.
3. Pose domain (pure, unit-tested): landmark features, target features via FK, scoring, fault ranking, cues.
4. Tracking gate harness: posed renders → real pipeline → scores and top cues. Baseline captured before tuning.
5. Tracking runtime: webcam, self-hosted MediaPipe, smoothing, visibility gating, framing guide.
6. Cue scheduler and speech.
7. Modes, one at a time, each verified with the fake camera.
8. Coach review via omp; voice commands via jev.
8b. Progress photos: local photo store in the API server, timeline and compare views.
9. Docs, README correction, final verification on the real GPU.

Fan-out: unit 2 (rig, model pipeline and Viewer) and unit 3 (pose domain, pure TS) touch disjoint files and
run in parallel after unit 1. The rest is code-coupled and goes to one owner at a time.
