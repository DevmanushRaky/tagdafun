# Ads Integration — TagdaFun

## Ad Network

**Unity LevelPlay** (formerly ironSource) — ad mediation platform.
Dashboard: https://platform.ironsrc.com

- **Package (npm):** `unity-levelplay-mediation` (v9.1.0)
- **App name in dashboard:** TagdaFun
- **Platform:** Android
- **Bundle ID:** `com.tagdafun.app`
- **App Key:** `27c2ca195`

Unity LevelPlay is a mediation platform: it routes ad requests to whichever underlying network (ironSource, AdMob, Meta, Unity Ads, etc.) yields the best fill/revenue, rather than integrating a single ad network directly.

## Ad Units

| Ad unit name | Ad Unit ID         | Format   | Where it's shown |
|---|---|---|---|
| banner ads   | `suwmraw3whvjtbco` | Banner   | Home screen, between the profile card and the Games section (refresh rate: 10s) |
| rawarded ads | `jqvx5o80z4v2i70t` | Rewarded | Memory Cards "Hint" button (no coins, reveals the cards), Water Sorting "Hint" and "+ Bottle" (no coins), Coins screen "Watch Ad" button, and an automatic prompt after every 4th finished game (at most once every 3 minutes) |
| native ads   | `d1das3rlcdyyqouj` | Native   | Home screen (after Games section), inside the gameplay screen (Coin Toss / Memory Cards / Water Sorting), and at the bottom of the Leaderboard screen |

Interstitial and legacy ad formats were intentionally not added — a full-screen interruption ad was judged too disruptive for this app's flow.

**Note on Native ads:** the RN SDK does not take an ad unit ID directly in code. `LevelPlayNativeAd.builder()` only accepts a `placement` (left as the SDK default), and LevelPlay automatically serves whichever Native ad unit is configured for the app. The ad unit ID above is kept for reference only, not used in code.

## Reward Configuration

- **Reward item:** Coins
- **Amount:** 50 coins per rewarded ad watched. This must stay in sync in two places if ever changed: the LevelPlay dashboard ad unit's reward setting, and `services/ads.ts` → `ADS.rewardedCoinsAmount`.
- **Capping / Pacing:** left at default (off) since rewarded ads are always user-initiated (via a button), so abuse risk is low.

## Native/Build Requirements

- LevelPlay's SDK is native code, so it does **not** run inside plain Expo Go — a custom dev client is required for development, built once via:
  ```
  npx expo install expo-dev-client
  npx expo prebuild
  npx expo run:android
  ```
  See `ANDROID_DEV_SETUP.md` for the full local machine setup (Java, Android SDK, adb) and day-to-day dev workflow.
- A local Expo config plugin, `plugins/withLevelPlay.js`, runs on every `expo prebuild` and automatically adds:
  - **Android:** the Google Play Services Gradle dependencies LevelPlay needs, and the `AD_ID` manifest permission.
  - **iOS:** the SKAdNetwork identifier and attribution endpoint in `Info.plist`.
- Config values (App Key, ad unit IDs) live in `app.json` → `expo.extra`, read at runtime via `services/ads.ts`. Update them there if the dashboard values ever change — no native rebuild is needed for that, only a JS reload.

## Code Structure

- `services/ads.ts` — reads config from `app.json` extra, exposes `initAds()` (called once from `App.tsx`) and the `ADS` constants object.
- `components/ads/AdBanner.tsx` — banner ad, explicitly calls `loadAd()` on mount via a ref (the banner view does not auto-load).
- `components/ads/RewardedAdButton.tsx` — manual "Watch Ad" button (Coins screen), logs a `gameType: 'ad'` entry to game history on reward so it's visible and distinguishable in the History list.
- `components/ads/PostGameRewardModal.tsx` — automatic Skip/Watch-Ad prompt shown after a finished game; capped in `HomeScreen.tsx` (`REWARD_PROMPT_EVERY`, `REWARD_PROMPT_COOLDOWN_MS`) so it does not appear after every round. Also logs to history on reward.
- `components/ads/NativeAdCard.tsx` — native ad card. Loading has two quirks worked around here:
  1. `loadAd()` must be called ~300ms after the native ad object is created, since the underlying native view takes an extra render cycle to mount and register its load callback — calling too early silently no-ops.
  2. While the ad hasn't loaded yet (or fails to load), the view is kept mounted but positioned off-screen (`position: absolute`, moved out of view) so it takes no visible space and doesn't show an empty box. Once `onAdLoaded` fires, it switches into the normal, styled, in-flow layout.

## Testing

- Test devices are registered in the LevelPlay dashboard (Setup → Test devices) using the phone's Google Advertising ID, found on-device under Settings → Google/Privacy → Ads. **Make sure all three ad formats (Banner, Rewarded, Native) are selected for the test device** — a device only registered for some formats will get real (often "No Fill") auctions for the others.
- `platform.ironsrc.com` shows a "Your ironSource Ads account is pending approval" banner — this is an account-level notice from Unity, unrelated to the app's code; it does not block test ads and will clear once the account is approved.
