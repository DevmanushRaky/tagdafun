# Android Dev Build Setup (TagdaFun)

Notes on what was installed and the exact commands used to get native Android
builds (needed for the LevelPlay ads SDK) running on a physical phone over USB.
Follow this top-to-bottom on a fresh Mac to get back to a working state.

## One-time machine setup (already done on this Mac)

```bash
# Android platform-tools (adb, fastboot)
brew install android-platform-tools

# Java 17 (Gradle/Android builds need a JDK — NOT the cask, no sudo needed)
brew install openjdk@17

# Android SDK command-line tools
brew install --cask android-commandlinetools

# Accept SDK licenses + install required SDK packages
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
yes | sdkmanager --licenses
sdkmanager --install "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

These env vars were added permanently to `~/.zshrc`:
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```
(Only takes effect in **new** terminal windows/tabs, or after running `source ~/.zshrc`.)

`android/local.properties` (not committed to git, machine-specific) points Gradle at the SDK:
```
sdk.dir=/opt/homebrew/share/android-commandlinetools
```

## Every time you plug the phone in via USB

1. Enable **Developer Options → USB debugging** on the phone (one-time on the phone itself).
2. Plug in via USB cable.
3. Unlock the phone — an "Allow USB debugging?" popup appears. Tap **Allow** (tick "Always allow from this computer" so it doesn't ask again).
   - If `adb devices` shows `unauthorized`, the popup either didn't appear or wasn't accepted yet — unlock the phone and check again.
4. Confirm the phone is visible:
   ```bash
   adb devices
   # should show: <device-id>    device   (not "unauthorized" or empty)
   ```
5. Forward the Metro port over USB (needed so the app can reach the bundler without wifi):
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
   Note: this mapping is lost whenever the adb daemon restarts (e.g. after `adb kill-server`, a cable unplug/replug, or a Mac sleep/wake) — just re-run this command if the app says "failed to connect".

## Building & installing the app on the phone

```bash
cd ~/Desktop/rakesh/tagdafun
npx expo run:android
```

- First run takes ~5 minutes (native Gradle build). Installs a **custom dev-client app** called "TagdaFun" on the phone (separate from Expo Go).
- Only need to re-run this when a **native module** changes (e.g. installing a new native package like `unity-levelplay-mediation`, or editing `plugins/withLevelPlay.js` / `app.json` native config).

## Day-to-day development (after the dev-client is installed once)

```bash
cd ~/Desktop/rakesh/tagdafun
npx expo start --dev-client
```

- Open the **"TagdaFun"** app icon on the phone (not Expo Go).
- It auto-connects to Metro over USB via the `adb reverse` mapping above.
- JS/React changes hot-reload instantly — no rebuild needed.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `adb devices` shows `unauthorized` | Unlock phone, tap Allow on the USB debugging popup |
| App says "failed to connect" / socket timeout | Run `adb reverse tcp:8081 tcp:8081` again (gets cleared on daemon restart) |
| `Failed to resolve the Android SDK path` | Open a **new** terminal tab/window (env vars only load in new shells), or run `source ~/.zshrc` |
| `Unable to locate a Java Runtime` | Same as above — new terminal or `source ~/.zshrc` |
| `TurboModuleRegistry...'LevelPlayMediation' could not be found` | You're running the app inside **Expo Go**, not the custom "TagdaFun" dev-client app — open the correct app icon |
