#!/usr/bin/env bash
# Installs a JDK and the Android SDK in user space (no sudo) and creates a test emulator.
# Safe to rerun: each step skips work that is already done.
set -euo pipefail

JDK_DIR="${JDK_DIR:-$HOME/.local/jdk-21}"
SDK_DIR="${ANDROID_HOME:-$HOME/Android/Sdk}"
API=35
AVD=bodyhack-api35

if [ ! -x "$JDK_DIR/bin/javac" ]; then
  mkdir -p "$JDK_DIR"
  curl -fsSL "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse" \
    | tar -xz -C "$JDK_DIR" --strip-components=1
fi
export JAVA_HOME="$JDK_DIR" PATH="$JDK_DIR/bin:$PATH"

if [ ! -x "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK_DIR/cmdline-tools"
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/tools.zip" https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
  unzip -q "$tmp/tools.zip" -d "$tmp"
  mv "$tmp/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
  rm -rf "$tmp"
fi
sdkmanager="$SDK_DIR/cmdline-tools/latest/bin/sdkmanager"

{ yes || true; } | "$sdkmanager" --sdk_root="$SDK_DIR" --licenses >/dev/null
"$sdkmanager" --sdk_root="$SDK_DIR" --install \
  "platform-tools" "platforms;android-$API" "build-tools;$API.0.0" "emulator" \
  "system-images;android-$API;google_apis;x86_64" >/dev/null

if ! "$SDK_DIR/cmdline-tools/latest/bin/avdmanager" list avd -c | grep -qx "$AVD"; then
  echo no | "$SDK_DIR/cmdline-tools/latest/bin/avdmanager" create avd -n "$AVD" \
    -k "system-images;android-$API;google_apis;x86_64" -d pixel_7 >/dev/null
fi

echo "JAVA_HOME=$JDK_DIR"
echo "ANDROID_HOME=$SDK_DIR"
"$JDK_DIR/bin/javac" -version
"$SDK_DIR/platform-tools/adb" version | head -1
"$SDK_DIR/emulator/emulator" -list-avds
