<div align="center">

<img src="./assets/tagdafun-main-logo.png" width="120" alt="Tagda Fun Logo"/>

# Tagda Fun

**Play. Challenge. Enjoy!**

[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-brightgreen)](https://github.com/DevmanushRaky/tagdafun)
[![Version](https://img.shields.io/badge/version-1.2.0-orange)](https://github.com/DevmanushRaky/tagdafun/releases)
[![Expo](https://img.shields.io/badge/Expo-SDK%2053-blue)](https://expo.dev)

</div>

---

## What is Tagda Fun?

Tagda Fun is a gamified mini-game app with two games — **Coin Toss** and **Spin Roulette** — wrapped in a full progression system with XP, levels, achievements, daily challenges, and a weekly leaderboard. All data is stored locally on your device.

---

## Games

### Coin Toss — Free to play
- Pick **Heads** or **Tails**
- 3D animated coin flip
- Always earn **+5 coins** and **+10 XP** per flip
- Track your win streak and total flips

### Spin Roulette — Costs 5 coins per spin
- Requires minimum **5 coins** to play
- Spin the wheel — land on 0, 1, 2, 3, 5, 10, 15, 20, 25, 50, or 100
- Net result: coins spent − 5 + wheel value
- Earn **+15 XP** per spin
- Spinning locked if balance is below 5

---

## Screens

| Screen | What it shows |
|--------|--------------|
| **Home** | Player card (level, XP bar, streak), daily challenge, game cards |
| **Coins** | Coin balance, per-game breakdown, full game history log |
| **Leaderboard** | Your weekly coins + games played, live countdown to Sunday reset (IST) |
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

### Weekly Leaderboard
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
- Both games with full coin and XP logic
- Persistent stats, history, and achievements (AsyncStorage)
- Weekly leaderboard tracking (local, resets Sunday IST)
- Daily challenge with auto-reset
- 11-level XP progression

**Planned later:**
- AdMob rewarded video ads
- Supabase backend + Google login
- Online leaderboard with real players
- Coin redemption via separate website (outside the app)

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
npm install
npx expo start
```

Press `a` for Android, `i` for iOS in the terminal.

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
│   └── SpinRoulette.tsx        # Roulette wheel with spin animation
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
