# Ads Integration — TagdaFun

## Ad Network / Company

**Unity LevelPlay** (formerly ironSource) — ad mediation platform.
Dashboard: https://platform.ironsrc.com

- **Package name (npm):** `unity-levelplay-mediation` (v9.1.0)
- **App name in dashboard:** TagdaFun
- **Platform:** Android
- **Bundle ID:** `com.tagdafun.app`
- **App Key:** `27c2ca195`

## Why LevelPlay was chosen

- User already had an existing LevelPlay/ironSource account with the app registered.
- LevelPlay is a mediation platform — it can route requests to multiple ad networks (AdMob, Meta, Unity Ads, etc.) to maximize fill rate and revenue, instead of integrating a single network directly.

## Ad Units Created

| Ad unit name  | Ad Unit ID          | Format   | Purpose                                                                 |
|---------------|----------------------|----------|--------------------------------------------------------------------------|
| banner ads    | `suwmraw3whvjtbco`   | Banner   | Persistent small ad shown on screen (refresh rate: 10 sec)              |
| rawarded ads  | `jqvx5o80z4v2i70t`   | Rewarded | User watches a video ad voluntarily and earns bonus coins in-app        |

**Interstitial ads were not created** — decided against a full-screen ad unit for now to avoid hurting user experience; can be added later if needed.

**Native ads were not created** — app has no feed/content list where a native ad would blend in, so not applicable.

## Reward Configuration

- **Reward item name:** Coins
- **Reward amount:** **50 coins** per rewarded ad watched (configured both in the LevelPlay dashboard ad unit and must match the amount granted in-app code via `GameStatsContext.addBonusCoins(50)`).
- **Capping / Pacing:** Left off/default for the rewarded ad unit (user-initiated, so frequency abuse risk is low). Can enable `capping` later (e.g. 5 per day) if coin-farming becomes an issue.

## Native Integration Notes

- Ads require a **custom dev client** build (`expo-dev-client` + `npx expo prebuild` + `npx expo run:android`) — they do **not** work inside the standard Expo Go app since it's a native SDK.
- A local Expo config plugin (`plugins/withLevelPlay.js`) automatically injects on every prebuild:
  - Android: Play Services Gradle dependencies + `AD_ID` manifest permission.
  - iOS: SKAdNetwork identifier + attribution endpoint in `Info.plist`.
- App Key and Ad Unit IDs live in `app.json` → `expo.extra` and in the ads service code — update these here if the dashboard values ever change.
