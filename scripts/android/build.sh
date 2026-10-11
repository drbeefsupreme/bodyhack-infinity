#!/usr/bin/env bash
# Builds the Android app: the web part (scripts/android/vite.config.ts plus the lite figure model), Capacitor sync,
# then one debug APK per ABI in android/app/build/outputs/apk/debug/.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/android/env.sh

if [ ! -f public/mediapipe/pose_landmarker_full.task ]; then
  echo "public/mediapipe/pose_landmarker_full.task is missing. Run npm run mediapipe." >&2
  exit 1
fi
npx vite build --config scripts/android/vite.config.ts --logLevel warn
cp -r public/model-lite dist-android/
npx cap sync android
(cd android && ./gradlew --quiet assembleDebug)
du -h android/app/build/outputs/apk/debug/*.apk
