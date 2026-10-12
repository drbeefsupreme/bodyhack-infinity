# BodyhackCoach and BodyhackSecrets on the emulator

- When: 2026-10-12T17:11:04.087Z
- Device: emulator-5564 (AVD bodyhack-harness, Android 15, x86_64), AICore: (not installed)
- APK: /home/drbeefsupreme/git/bp-wt/bodyhack-infinity-android/android/app/build/outputs/apk/debug/app-x86_64-debug.apk
- Usage-metrics queue (com.google.android.datatransport, used by MediaPipe and ML Kit; see telemetry.txt): app databases: com.google.android.datatransport.events, com.google.android.datatransport.events-journal; scheduled jobs of the app: 5 (JOB #u0a209/1373840700: e5525e1 ai.bodyhack.infinity/com.google.android.datatransport.runtime.scheduling.jobscheduling.JobInfoSchedulerService; u0a209 tag=*job*/ai.bodyhack.infinity/com.google.android.datatransport.runtime.scheduling.jobscheduling.JobInfoSchedulerService; Service: ai.bodyhack.infinity/com.google.android.datatransport.runtime.scheduling.jobscheduling.JobInfoSchedulerService; JobStatus{e5525e1 #u0a209/1373840700 ai.bodyhack.infinity/com.google.android.datatransport.runtime.scheduling.jobscheduling.JobInfoSchedulerService u=0 s=10209 TIME=+23h59m56s351ms:none NET IDLE satisfied:0x13600000 unsatisfied:0x80000004}: 108021176; 0-ComponentInfo{ai.bodyhack.infinity/com.google.android.datatransport.runtime.scheduling.jobscheduling.JobInfoSchedulerService}: ai.bodyhack.infinity)
- Result: 20/20 checks pass

| Check | Result | Detail |
|---|---|---|
| coach status is unavailable with a reason | PASS | resolved {"status":"unavailable","reason":"This is an emulator. It has no AICore, so Gemini Nano cannot run here."} |
| coach download rejects with unavailable | PASS | rejected code=unavailable message="This is an emulator. It has no AICore, so Gemini Nano cannot run here."; listener added: true; progress events: 0 |
| coach generate (4032x3024 JPEG) rejects with unavailable | PASS | rejected code=unavailable message="This is an emulator. It has no AICore, so Gemini Nano cannot run here." |
| coach generate (600x800 PNG) rejects with unavailable | PASS | rejected code=unavailable message="This is an emulator. It has no AICore, so Gemini Nano cannot run here." |
| coach generate (text only) rejects with unavailable | PASS | rejected code=unavailable message="This is an emulator. It has no AICore, so Gemini Nano cannot run here." |
| coach generate (not an image) rejects with badImage | PASS | rejected code=badImage message="imageDataUrl does not hold a JPEG or PNG image" |
| coach generate (not a data URL) rejects with badImage | PASS | rejected code=badImage message="imageDataUrl must be a JPEG or PNG data URL" |
| coach generate x3 at once (a big image first): the first runs, a later one gets busy | PASS | codes in call order ["unavailable","busy","busy"] |
| images are downsized to a 768 px short side (larger ones only) | PASS | decoded sizes in call order: ["1024x768","600x800","1024x768"] |
| secrets get before set is null | PASS | resolved {"value":null} |
| secrets set resolves | PASS | resolved null |
| secrets get returns the value | PASS | resolved the dummy value |
| the prefs file holds no plaintext | PASS | shared_prefs/bodyhack_secrets.xml: 189 bytes, dummy absent (see prefs-after-set.xml) |
| secrets survive force-stop and relaunch | PASS | process gone after force-stop: true; get resolved the dummy value |
| secrets get with an unknown key rejects with badKey | PASS | rejected code=badKey message="Unknown secret key \"other-key\". Allowed: typesafe-api-key." |
| secrets set with an unknown key rejects with badKey | PASS | rejected code=badKey message="Unknown secret key \"other-key\". Allowed: typesafe-api-key." |
| secrets remove without a key rejects with badKey | PASS | rejected code=badKey message="Unknown secret key \"null\". Allowed: typesafe-api-key." |
| secrets remove clears the value | PASS | resolved null; then get resolved {"value":null} |
| no crash, no exception from the app code | PASS | app pids 2523, 3934; crash buffer empty; stack lines in app code: 0; other exception lines in the app processes: 0 (tags: none; see logcat-app.txt) |
| logcat does not contain the secret value | PASS | 0 lines with the dummy value |
