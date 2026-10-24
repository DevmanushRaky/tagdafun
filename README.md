<div align="center">

<img src="./assets/tagdafun-main-logo.png" width="120" alt="Tagda Fun Logo"/>

# Tagda Fun

**Play. Challenge. Enjoy!**

[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-brightgreen)](https://github.com/DevmanushRaky/tagdafun)
[![Version](https://img.shields.io/badge/version-1.2.0-orange)](https://github.com/DevmanushRaky/tagdafun/releases)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-blue)](https://expo.dev)

</div>

---

## What is Tagda Fun?

Tagda Fun is a gamified mini-game app with three games — **Coin Toss**, **Memory Cards** and **Water Sorting** — wrapped in a full progression system with XP, levels, achievements, daily challenges, and weekly stats. All data is stored locally on your device.

---

## Games

### Coin Toss — Free to play
- Pick **Heads** or **Tails**
- 3D animated coin flip
- Always earn **+5 coins** and **+10 XP** per flip
- Track your win streak and total flips

### Memory Cards — Free to play
- Flip cards and match all the pairs
- Earn **+10 coins** and **+15 XP** for completing the board

### Water Sorting — Free to play
- Pour water between bottles until every bottle holds a single colour
- Level-based, with hints; progress is saved between sessions
- Reward depends on your moves vs. par: **100 coins** at par, up to **150** if under par, down to **10** if far over
- Earn **+15 XP** per win

---

## Screens

| Screen | What it shows |
|--------|--------------|
| **Home** | Player card (level, XP bar, streak), daily challenge, game cards |
| **Coins** | Coin balance, per-game breakdown, full game history log |
| **Weekly** | Your weekly coins + games played, live countdown to Sunday reset (IST) |
| **Profile** | Level progress, all-time stats, detailed game stats, achievements |

---

## Gamification System

### XP & Levels (11 levels)

| Level | Title | XP Needed |
|-------|-------|-----------|
| 1 | Newbie | 0 |
| 2 | Starter | 100 |
| 3 | Explorer | 250 |
| 4 | Player | 500 |
| 5 | Fun Seeker | 850 |
| 6 | Challenger | 1,300 |
| 7 | Pro Player | 1,900 |
| 8 | Champion | 2,700 |
| 9 | Legend | 3,700 |
| 10 | Mastermind | 5,000 |
| 11 | Grandmaster | 6,600 |

### Daily Challenge
- Flip the coin **5 times** every day
- On completion: **+25 coins + 20 XP**
- Resets at midnight

### Weekly Stats
- Tracks your coins and games played for the current week
- Resets every **Sunday at 12:00 AM IST**
- Live countdown timer shown on screen

### Achievements (11 total)

| Achievement | How to unlock | XP Reward |
|-------------|--------------|-----------|
| First Step | Play any game once | +50 XP |
| Coin Flipper | Flip coin 1 time | +30 XP |
| Getting Warmed Up | Play 10 games total | +75 XP |
| Addicted! | Play 50 games total | +200 XP |
| Centurion | Play 100 games total | +500 XP |
| Lucky Flipper | Win coin toss 5 times | +80 XP |
| Golden Touch | Win coin toss 20 times | +250 XP |
| On a Roll! | 3-day play streak | +100 XP |
| Week Warrior | 7-day play streak | +350 XP |
| Rising Star | Reach Level 5 | +200 XP |
| Legend Status | Reach Level 10 | +500 XP |

---

## Current Approach

The app runs fully offline using AsyncStorage — no backend, no login required.

**What works now:**
- All three games with full coin and XP logic
- Ads via Unity LevelPlay (banner, native, optional rewarded +50 coins) — see `ADS_INTEGRATION.md`
- Persistent stats, history, and achievements (AsyncStorage)
- Weekly stats tracking (local, resets Sunday IST)
- Daily challenge with auto-reset
- 11-level XP progression

**Not planned:** no backend, login, online leaderboard or cash-out. Coins are in-game currency only; revenue comes from ads.

---

## Getting Started

### Requirements
- Node.js 18+
- Expo CLI
- iOS Simulator / Android Emulator or physical device with Expo Go

### Run locally

```bash
git clone https://github.com/DevmanushRaky/tagdafun.git
cd tagdafun
npm ci
npm run start:go
```

Scan the QR code with **Expo Go** (phone and computer on the same WiFi).

> **Use `npm run start:go`, not plain `npx expo start`, for Expo Go.**
> The app uses the native LevelPlay ads SDK, which does not exist in Expo Go.
> `start:go` runs `EXPO_GO=1 expo start --go --lan --clear`, which makes `metro.config.js`
> swap in a no-op mock (`mocks/levelplay.js`). Without it, Expo Go crashes on launch with
> an `Uncaught Error: [runtime not ready]`. Ads therefore do not show in Expo Go.

For real ads, use a dev build instead: `npm run android` (or `npm run ios`, which needs a recent Xcode).
Expo Go only supports the latest Expo SDK, so keep the project's SDK in step with the Expo Go version on your phone.

---

## Build & Release

Uses [EAS Build](https://docs.expo.dev/build/introduction/) by Expo.

```bash
npm install -g eas-cli
eas login

# Android APK (testing)
eas build --platform android --profile preview

# Android AAB (Play Store)
eas build --platform android --profile production
```

---

## Project Structure

```
tagdafun/
├── App.tsx                     # Root: splash screen + 4-tab navigation
├── screens/
│   ├── HomeScreen.tsx          # Player card, daily challenge, game cards
│   ├── CoinsScreen.tsx         # Balance, game breakdown, history log
│   ├── LeaderboardScreen.tsx   # Weekly stats, live IST countdown
│   └── ProfileScreen.tsx       # Level, all-time stats, achievements
├── components/
│   ├── CoinToss.tsx            # Animated coin flip game
│   ├── MemoryCards.tsx         # Card matching game
│   └── WaterSorting.tsx        # Water sort puzzle
├── contexts/
│   └── GameStatsContext.tsx    # XP, coins, level, achievements (AsyncStorage)
├── constants/
│   └── theme.ts                # Colors, typography, shadows, spacing
├── utils/
│   └── gameHistory.ts          # Per-game history log (AsyncStorage)
└── types/
    └── index.ts                # Navigation types + GAMES config
```

---

## Tech Stack

| Tool | Details |
|------|---------|
| React Native | Expo SDK ~53 |
| TypeScript | ~5.3.3 |
| expo-linear-gradient | Gradients throughout |
| @expo/vector-icons | Ionicons — no emojis in UI |
| @react-navigation/bottom-tabs | 4-tab navigation |
| AsyncStorage | Persist all stats, history, weekly data |
| react-native-safe-area-context | Safe area insets |

---

## Android Info

- **Package:** `com.tagdafun.app`
- **Version:** `1.2.0`
- **Target SDK:** 36
- **Min SDK:** 24

---

## License

MIT © [DevmanushRaky](https://github.com/DevmanushRaky/tagdafun)
