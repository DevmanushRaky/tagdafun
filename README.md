<div align="center">

<img src="./assets/tagdafun-main-logo.png" width="120" alt="Tagda Fun Logo"/>

# Tagda Fun

**A gamified mini-game app with coins, XP, achievements & leaderboards**

[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-brightgreen)](https://github.com/DevmanushRaky/tagdafun)
[![Version](https://img.shields.io/badge/version-1.2.0-orange)](https://github.com/DevmanushRaky/tagdafun/releases)
[![Expo](https://img.shields.io/badge/Expo-SDK%2053-blue)](https://expo.dev)

</div>

---

## 📱 What is Tagda Fun?

Tagda Fun is a React Native mobile app with two coin-based mini-games — **Coin Toss** and **Spin Roulette** — wrapped in a full gamification system with XP levels, achievements, daily challenges, and a weekly leaderboard.

---

## 🎮 Games

### Coin Toss — Free to play
- Pick **Heads** or **Tails**
- 3D animated coin flip
- Win or lose — you always earn **+5 coins** and **+10 XP**
- Track your win streak and total flips

### Spin Roulette — Costs 5 coins per spin
- Requires minimum **5 coins** in balance to play
- Spin the wheel — land on 0, 1, 2, 3, 5, 10, 15, 20, 25, 50, or **100**
- Balance calculated as: `current coins − 5 (cost) + wheel value`
- Earn **+15 XP** per spin
- If balance is below 5, spinning is locked with a message to earn more coins first

---

## 🏠 Screens

| Screen | What it shows |
|--------|--------------|
| **Home** | Player card (level, XP bar, streak), daily challenge, game cards |
| **Coins** | Wallet balance, per-game coin breakdown, full game history log |
| **Leaderboard** | Weekly coin ranking — auto-resets every Sunday |
| **Profile** | Level progress, stats, achievements with XP rewards |

---

## ⚡ Gamification System

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
- Every day: flip the coin **5 times**
- On completion: **+25 coins + 20 XP**
- Resets automatically at midnight

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

## 🚀 Getting Started

### Requirements
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device with Expo Go)

### Run locally

```bash
git clone https://github.com/DevmanushRaky/tagdafun.git
cd tagdafun
npm install
npx expo start
```

Press `i` for iOS, `a` for Android in the terminal.

---

## 🏗️ Build & Release

Uses [EAS Build](https://docs.expo.dev/build/introduction/) by Expo.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Android APK (internal testing)
eas build --platform android --profile preview

# Android AAB (Play Store release)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

---

## 🗂️ Project Structure

```
tagdafun/
├── App.tsx                     # Root: providers + 4-tab navigation
├── screens/
│   ├── HomeScreen.tsx          # Hero, player card, daily challenge, games grid
│   ├── CoinsScreen.tsx         # Balance, breakdown, game history log
│   ├── LeaderboardScreen.tsx   # Weekly leaderboard (Sunday auto-reset)
│   └── ProfileScreen.tsx       # Achievements + stats + level bar
├── components/
│   ├── CoinToss.tsx            # 3D animated coin flip game
│   └── SpinRoulette.tsx        # Roulette wheel with spin animation
├── contexts/
│   ├── GameStatsContext.tsx    # XP, coins, level, achievements (AsyncStorage)
│   └── LanguageContext.tsx     # English only
├── constants/
│   └── theme.ts                # Colors, typography, shadows, spacing
├── utils/
│   └── gameHistory.ts          # Save/load/format per-game history log
└── types/
    └── index.ts                # Navigation types + GAMES config array
```

---

## 🛠️ Tech Stack

| Tool | Details |
|------|---------|
| React Native | via Expo SDK ~53 |
| TypeScript | ~5.3.3 |
| expo-linear-gradient | Gradients throughout UI |
| @expo/vector-icons | Ionicons — no emojis used |
| @react-navigation/bottom-tabs | 4-tab bottom navigation |
| AsyncStorage | Persist stats, history, daily challenge |
| react-native-safe-area-context | Safe area insets |

---

## 📦 Android Info

- **Package**: `com.tagdafun.app`
- **Version**: `1.2.0` (versionCode: 5)
- **Target SDK**: 36
- **Min SDK**: 24

---

## 💰 Coin Economy & Revenue Model

### Game Coin Rewards

| Game | Cost to Play | On Play (Always) | On Win | On Loss |
|------|-------------|-----------------|--------|---------|
| Coin Toss | Free | +5 coins | +5 coins | +5 coins |
| Spin Roulette | −5 coins | — | +Wheel value (0–100) | 0 coins added |
| Daily Challenge | Free | — | +25 coins (on claim) | — |
| Watch Ad (coming) | Free | +15 coins | — | — |

> **Spin Roulette net examples:**
> - Land on 50 → Balance: −5 cost +50 won = **+45 net**
> - Land on 2 → Balance: −5 cost +2 won = **−3 net**
> - Land on 0 → Balance: −5 cost +0 won = **−5 net**

---

### Coin to Rupee Conversion

| Coins | Rupee Value |
|-------|------------|
| 100 coins | ₹1 |
| 500 coins | ₹5 |
| 1,000 coins | ₹10 |
| 2,000 coins | ₹20 |
| 5,000 coins | ₹50 |
| 10,000 coins | ₹100 |

**Rate: 100 coins = ₹1**

---

### Redemption Rules

| Rule | Value |
|------|-------|
| Minimum redemption | ₹20 (2,000 coins) |
| Maximum per request | ₹500 (50,000 coins) |
| Options | Mobile recharge / Google Play gift card |
| Processing time | 24–48 hours (manual review) |
| Approval | Admin reviews and approves each request |

---

### Ad Revenue Model

| Ad Type | Coins Given to User | Estimated Revenue per Ad (India CPM) |
|---------|-------------------|--------------------------------------|
| Rewarded Video | +15 coins | ₹0.50 – ₹1.50 |
| Interstitial | +0 coins | ₹0.20 – ₹0.80 |
| Banner | +0 coins | ₹0.01 – ₹0.05 per impression |

**Best performing: Rewarded Video** — user voluntarily watches, highest CPM.

---

### Revenue vs Payout Calculation

**Example: 1,000 daily active users**

```
Ad Revenue (per day):
  1,000 users × 3 rewarded ads/day = 3,000 ad views
  3,000 × ₹1 avg                  = ₹3,000/day

Coin Payout (per day):
  Assume 5% users redeem daily
  50 users × ₹20 avg redemption   = ₹1,000/day

Net Revenue per day               = ₹3,000 − ₹1,000 = ₹2,000
Net Revenue per month             = ~₹60,000/month
```

**Example: 10,000 daily active users**

```
Ad Revenue:   10,000 × 3 ads × ₹1   = ₹30,000/day
Payout:       500 users × ₹20        = ₹10,000/day
Net per day                          = ₹20,000/day
Net per month                        = ~₹6,00,000/month
```

> ⚠️ CPM varies by ad network (Google AdMob recommended).
> India CPM range: ₹15–₹60 per 1,000 impressions.
> Adjust redemption rate and minimum limits to stay profitable.

---

### Revenue Flow

```
User plays game
      ↓
User earns coins
      ↓
User watches rewarded ad → +15 coins (YOU earn ₹0.50–₹1.50)
      ↓
User redeems coins for recharge/gift card (YOU pay ₹20 min)
      ↓
Admin reviews → Approves → Recharge sent
      ↓
Net profit = Ad revenue − Redemption payout
```

---

## 📄 License

MIT © [DevmanushRaky](https://github.com/DevmanushRaky)
