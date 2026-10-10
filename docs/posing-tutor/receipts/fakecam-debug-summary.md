# posing-debug fake-camera runs

Driver: `prototypes/track-cue/fakecam.mjs`. Clips: 1280x720 at 15 fps from `prototypes/pose-spec/sources/ifbb2019-img/p-001.png` (front double biceps) and `p-008.png` (relaxed front), via `prototypes/pose-track/make-y4m.sh`. Called pose: frontDoubleBiceps. Times are seconds since the call (session start); frames are frames processed by then.

## fdb

- Clip /tmp/trackcue/fdb.y4m; GPU delegate on ANGLE (AMD, Vulkan 1.4.335 (AMD Radeon RX 7900 XTX (RADV NAVI31) (0x0000744C)), radv); detect median 7.0 ms, p90 7.8 ms; pose in 74 of 74 frames.
- Page requests: 18, hosts localhost:5341.
- End: phase hit, score 100.0, hit {"score":100,"timeToHitMs":60.79999980926516,"meanScore":100,"scoreSd":0}.
- Events:
  - 0.06 s holding "Hold it." (spoken)
  - 3.13 s hit score 100.0, time to hit 0.1 s, mean 100.0, sd 0.00 "Pose hit. Relax." (spoken)
- Speech engine log (silent stub):
  - 0.25 s start "Hold it."
  - 3.14 s start "Pose hit. Relax."
- Screenshots:
  - fdb-holding.png: 0.28 s, frame 2, holding, score 100.0
  - fdb-hit.png: 3.21 s, frame 47, hit, score 100.0
  - fdb-end.png: 4.94 s, frame 73, hit, score 100.0

## relaxed

- Clip /tmp/trackcue/relaxed.y4m; GPU delegate on ANGLE (AMD, Vulkan 1.4.335 (AMD Radeon RX 7900 XTX (RADV NAVI31) (0x0000744C)), radv); detect median 6.8 ms, p90 7.6 ms; pose in 234 of 234 frames.
- Page requests: 18, hosts localhost:5341.
- End: phase correcting, score 35.2.
- Events:
  - 0.06 s correcting
  - 0.06 s cue "Raise your elbows to shoulder height." (spoken)
  - 4.99 s cue "Raise your elbows to shoulder height." (spoken)
  - 9.92 s cue "Raise your elbows to shoulder height." (spoken)
  - 14.85 s cue "Raise your elbows to shoulder height." (spoken)
- Speech engine log (silent stub):
  - 0.24 s start "Raise your elbows to shoulder height."
  - 5.01 s start "Raise your elbows to shoulder height."
  - 9.94 s start "Raise your elbows to shoulder height."
  - 14.87 s start "Raise your elbows to shoulder height."
- Screenshots:
  - relaxed-correcting.png: 0.27 s, frame 2, correcting, score 36.8
  - relaxed-t8.png: 7.65 s, frame 113, correcting, score 35.4
  - relaxed-end.png: 15.63 s, frame 233, correcting, score 35.3

## relaxed-then-fdb

- Clip /tmp/trackcue/relaxed-fdb.y4m; GPU delegate on ANGLE (AMD, Vulkan 1.4.335 (AMD Radeon RX 7900 XTX (RADV NAVI31) (0x0000744C)), radv); detect median 6.9 ms, p90 7.5 ms; pose in 162 of 162 frames.
- Page requests: 18, hosts localhost:5341.
- End: phase hit, score 100.0, hit {"score":100,"timeToHitMs":6007.3,"meanScore":99.97421412258134,"scoreSd":0.16103409517200074}.
- Events:
  - 0.06 s correcting
  - 0.06 s cue "Raise your elbows to shoulder height." (spoken)
  - 4.99 s cue "Raise your elbows to shoulder height." (spoken)
  - 6.01 s holding "Hold it." (spoken)
  - 9.06 s hit score 100.0, time to hit 6.0 s, mean 100.0, sd 0.16 "Pose hit. Relax." (spoken)
- Speech engine log (silent stub):
  - 0.25 s start "Raise your elbows to shoulder height."
  - 5.00 s start "Raise your elbows to shoulder height."
  - 6.01 s start "Hold it."
  - 9.07 s start "Pose hit. Relax."
- Screenshots:
  - relaxed-then-fdb-correcting.png: 0.28 s, frame 2, correcting, score 36.8
  - relaxed-then-fdb-holding.png: 6.04 s, frame 88, holding, score 98.9
  - relaxed-then-fdb-hit.png: 9.16 s, frame 135, hit, score 100.0
  - relaxed-then-fdb-end.png: 10.88 s, frame 161, hit, score 100.0

## cropped

- Clip /tmp/trackcue/fdb-cropped.y4m; GPU delegate on ANGLE (AMD, Vulkan 1.4.335 (AMD Radeon RX 7900 XTX (RADV NAVI31) (0x0000744C)), radv); detect median 7.0 ms, p90 7.7 ms; pose in 116 of 116 frames.
- Page requests: 18, hosts localhost:5341.
- End: phase framing (cropped), score 100.0.
- Events:
  - 0.05 s framing cropped
  - 0.05 s cue "Step back so your whole body is in view." (spoken)
  - 6.19 s cue "Step back so your whole body is in view." (spoken)
- Speech engine log (silent stub):
  - 0.25 s start "Step back so your whole body is in view."
  - 6.20 s start "Step back so your whole body is in view."
- Screenshots:
  - cropped-t4.png: 3.69 s, frame 53, framing, score 100.0
  - cropped-end.png: 7.81 s, frame 115, framing, score 100.0

## noisy

- Clip /tmp/trackcue/fdb-noisy.y4m; GPU delegate on ANGLE (AMD, Vulkan 1.4.335 (AMD Radeon RX 7900 XTX (RADV NAVI31) (0x0000744C)), radv); detect median 6.9 ms, p90 7.6 ms; pose in 175 of 175 frames.
- Page requests: 18, hosts localhost:5341.
- End: phase hit, score 100.0, hit {"score":100,"timeToHitMs":58.64599980926516,"meanScore":100,"scoreSd":0}.
- Events:
  - 0.06 s holding "Hold it." (spoken)
  - 3.13 s hit score 100.0, time to hit 0.1 s, mean 100.0, sd 0.00 "Pose hit. Relax." (spoken)
- Speech engine log (silent stub):
  - 0.25 s start "Hold it."
  - 3.14 s start "Pose hit. Relax."
- Screenshots:
  - noisy-holding.png: 0.28 s, frame 2, holding, score 100.0
  - noisy-hit.png: 3.34 s, frame 48, hit, score 100.0
  - noisy-t6.png: 5.57 s, frame 81, hit, score 100.0
  - noisy-end.png: 11.61 s, frame 172, hit, score 100.0

## cpu-fallback

- Clip /tmp/trackcue/fdb.y4m; CPU delegate on ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver); detect median 30.2 ms, p90 32.2 ms; pose in 75 of 75 frames.
- Page requests: 18, hosts localhost:5341.
- End: phase hit, score 100.0, hit {"score":100,"timeToHitMs":60.04799980926509,"meanScore":100,"scoreSd":0}.
- Events:
  - 0.06 s holding "Hold it." (spoken)
  - 3.08 s hit score 100.0, time to hit 0.1 s, mean 100.0, sd 0.00 "Pose hit. Relax." (spoken)
- Speech engine log (silent stub):
  - 0.22 s start "Hold it."
  - 3.11 s start "Pose hit. Relax."
- Screenshots:
  - cpu-fallback-holding.png: 0.29 s, frame 2, holding, score 100.0
  - cpu-fallback-hit.png: 3.26 s, frame 47, hit, score 100.0
  - cpu-fallback-end.png: 4.99 s, frame 73, hit, score 100.0

## speech-real

- Clip /tmp/trackcue/relaxed-fdb.y4m; GPU delegate on ANGLE (AMD, Vulkan 1.4.335 (AMD Radeon RX 7900 XTX (RADV NAVI31) (0x0000744C)), radv); detect median 6.8 ms, p90 7.6 ms; pose in 193 of 193 frames.
- Page requests: 18, hosts localhost:5341.
- End: phase hit, score 35.3, hit {"score":100,"timeToHitMs":5984.2000001430515,"meanScore":99.97324446896248,"scoreSd":0.1754115462505013}.
- Events:
  - 0.05 s correcting
  - 0.05 s cue "Raise your elbows to shoulder height." (spoken)
  - 4.98 s cue "Raise your elbows to shoulder height." (spoken)
  - 5.98 s holding "Hold it." (spoken)
  - 9.05 s hit score 100.0, time to hit 6.0 s, mean 100.0, sd 0.18 "Pose hit. Relax." (spoken)
- Speech engine log (real Chrome speech):
  - 0.25 s speak "Raise your elbows to shoulder height."
  - 0.47 s start "Raise your elbows to shoulder height."
  - 2.52 s end "Raise your elbows to shoulder height."
  - 5.00 s speak "Raise your elbows to shoulder height."
  - 5.06 s start "Raise your elbows to shoulder height."
  - 6.00 s speak "Hold it."
  - 6.01 s error (interrupted) "Raise your elbows to shoulder height."
  - 6.18 s start "Hold it."
  - 6.94 s end "Hold it."
  - 9.07 s speak "Pose hit. Relax."
  - 9.14 s start "Pose hit. Relax."
  - 10.74 s end "Pose hit. Relax."
- Screenshots:
  - speech-real-correcting.png: 0.28 s, frame 2, correcting, score 36.8
  - speech-real-holding.png: 6.08 s, frame 89, holding, score 100.0
  - speech-real-hit.png: 9.20 s, frame 135, hit, score 100.0
  - speech-real-end.png: 12.92 s, frame 191, hit, score 35.5

## telemetry-75s

- Clip /tmp/trackcue/relaxed.y4m; GPU delegate on ANGLE (AMD, Vulkan 1.4.335 (AMD Radeon RX 7900 XTX (RADV NAVI31) (0x0000744C)), radv); detect median 6.9 ms, p90 7.6 ms; pose in 1116 of 1116 frames.
- Page requests: 19, hosts localhost:5341, odml.pa.googleapis.com; blocked: OPTIONS https://odml.pa.googleapis.com/v1/log at 59.7 s.
- End: phase correcting, score 35.3.
- Events:
  - 0.07 s correcting
  - 0.07 s cue "Raise your elbows to shoulder height." (spoken)
  - 4.98 s cue "Raise your elbows to shoulder height." (spoken)
  - 9.91 s cue "Raise your elbows to shoulder height." (spoken)
  - 14.85 s cue "Raise your elbows to shoulder height." (spoken)
  - 19.78 s cue "Raise your elbows to shoulder height." (spoken)
  - 24.73 s cue "Raise your elbows to shoulder height." (spoken)
  - 29.66 s cue "Raise your elbows to shoulder height." (spoken)
  - 34.60 s cue "Raise your elbows to shoulder height." (spoken)
  - 39.53 s cue "Raise your elbows to shoulder height." (spoken)
  - 44.46 s cue "Raise your elbows to shoulder height." (spoken)
  - 49.40 s cue "Raise your elbows to shoulder height." (spoken)
  - 54.33 s cue "Raise your elbows to shoulder height." (spoken)
  - 59.26 s cue "Raise your elbows to shoulder height." (spoken)
  - 64.20 s cue "Raise your elbows to shoulder height." (spoken)
  - 69.15 s cue "Raise your elbows to shoulder height." (spoken)
  - 74.06 s cue "Raise your elbows to shoulder height." (spoken)
- Speech engine log (silent stub):
  - 0.33 s start "Raise your elbows to shoulder height."
  - 5.01 s start "Raise your elbows to shoulder height."
  - 9.94 s start "Raise your elbows to shoulder height."
  - 14.87 s start "Raise your elbows to shoulder height."
  - 19.80 s start "Raise your elbows to shoulder height."
  - 24.74 s start "Raise your elbows to shoulder height."
  - 29.67 s start "Raise your elbows to shoulder height."
  - 34.60 s start "Raise your elbows to shoulder height."
  - 39.54 s start "Raise your elbows to shoulder height."
  - 44.47 s start "Raise your elbows to shoulder height."
  - 49.40 s start "Raise your elbows to shoulder height."
  - 54.34 s start "Raise your elbows to shoulder height."
  - 59.27 s start "Raise your elbows to shoulder height."
  - 64.20 s start "Raise your elbows to shoulder height."
  - 69.15 s start "Raise your elbows to shoulder height."
  - 74.07 s start "Raise your elbows to shoulder height."
- Screenshots:
  - telemetry-75s-correcting.png: 0.35 s, frame 1, correcting, score 37.1
  - telemetry-75s-end.png: 74.57 s, frame 1114, correcting, score 35.4

## Speech capture

speech-real ran with real Chrome speech while the speaker sink was muted; `parecord` on the sink monitor captured it (`speech-real-capture.opus`). `speech-real-silence.txt` holds the silence boundaries: four sounds at 3.46, 8.04, 9.16 and 12.14 s of the recording, each 2.98 to 3.00 s after an engine `start` above (cue, interrupted cue, "Hold it.", "Pose hit. Relax."). Peak level -2.4 dB.

## MediaPipe smoothing

`jitter-image-vs-video.json`: on the noisy clip, elbows and wrists moved 1.49 px a frame in IMAGE mode, 0.16 px in VIDEO mode (MediaPipe smooths) and 0.06 px after `LandmarkSmoother`.
## Rebuild the clips and rerun

```sh
mkdir -p /tmp/trackcue && cd /tmp/trackcue
S=<worktree>/prototypes/pose-spec/sources/ifbb2019-img; M=<worktree>/prototypes/pose-track/make-y4m.sh
bash $M fdb.y4m 4 1280x720 $S/p-001.png
bash $M relaxed.y4m 4 1280x720 $S/p-008.png
bash $M relaxed-fdb.y4m 6 1280x720 $S/p-008.png $S/p-001.png
ffmpeg -i fdb.y4m -vf "noise=alls=14:allf=t+u" -f yuv4mpegpipe fdb-noisy.y4m
ffmpeg -i $S/p-001.png -vf "crop=iw:ih*0.72:0:0" fdb-cropped-src.png && bash $M fdb-cropped.y4m 4 1280x720 fdb-cropped-src.png
```

Then start `npx vite --port 5341` in the worktree and call `fakecam(browser, { name, clip, out, ... })` from an omp JS eval cell (options in the driver). `speech: 'real'` plays speech: use it only with the speakers muted.
