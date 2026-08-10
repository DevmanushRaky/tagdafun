<div align="center">

<img src="./assets/tagdafun-main-logo.png" width="120" alt="Tagda Fun Logo"/>

# Tagda Fun

**Your Fun Random Generator**

A privacy-first, 100% offline mobile app for random decisions, games, and fun.

[![Version](https://img.shields.io/badge/version-1.1.0-FF6B00?style=for-the-badge)](https://github.com/DevmanushRaky/tagdafun/releases)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-002244?style=for-the-badge&logo=expo)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](./LICENSE)

[<img src="https://img.shields.io/badge/Get%20it%20on-Google%20Play-414141?style=for-the-badge&logo=google-play&logoColor=white" height="40"/>](https://play.google.com/store/apps/details?id=com.tagdafun.app)

</div>

---

## What is Tagda Fun?

**Tagda Fun** is a free mobile app for random decision-making and fun group games — no internet needed, ever.

Have you ever needed to:
- Pick a random number for a game?
- Decide who goes first by picking a name from a list?
- Flip a coin when you can't make up your mind?
- Play Truth or Dare with friends?
- Challenge yourself with a Mastermind puzzle?

Tagda Fun does all of this in one place, completely offline. No sign-up, no ads, no data collected — just open the app and play.

Built with React Native and TypeScript, it runs on both Android and iOS and is available on the Google Play Store.

---

## Features

### Number Generator
- Generate random numbers within any custom range
- Set your own minimum and maximum values
- Real-time input validation
- Reset to default range (1–100) with one tap
- Animated result display

### Name Picker
- Add names individually and manage your list
- Randomly select one name from any number of entries
- Remove individual names or clear the full list
- Perfect for picking teams, choosing order, or making group decisions

### Coin Toss
- Choose Heads or Tails before flipping
- Animated coin flip result
- Streak tracking — see how many times you called it right
- Clean win/lose outcome display

### Truth & Dare
- Add multiple players to the game
- Spin to randomly pick a player and assign Truth or Dare
- Great for group settings and parties
- Player management with add/remove support

### Mastermind
- Classic code-breaking puzzle game
- Multiple difficulty levels
- Built-in timer with pause/resume
- Achievement system
- Game statistics tracking
- Share your results
- Review mode to analyse your guesses

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 53) |
| Language | TypeScript 5.8 |
| Navigation | React Navigation v6 (Bottom Tabs) |
| Storage | AsyncStorage |
| Animations | React Native Animated API |
| Build | EAS Build |
| Distribution | Google Play Store |

---

## Project Structure

```
tagdafun/
├── App.tsx                     # Root app entry — navigation + providers
├── screens/
│   ├── NumberScreen.tsx        # Random number generator screen
│   ├── NamesScreen.tsx         # Name picker screen
│   ├── CoinScreen.tsx          # Coin toss screen
│   ├── TruthDareScreen.tsx     # Truth & Dare game screen
│   ├── MastermindScreen.tsx    # Mastermind puzzle screen
│   └── PrivacyScreen.tsx       # Privacy policy screen
├── components/
│   ├── NumberGenerator.tsx     # Number generator UI component
│   ├── NameGenerator.tsx       # Name list and picker component
│   ├── NameInput.tsx           # Name input field component
│   ├── CoinToss.tsx            # Coin flip UI component
│   ├── TruthDare.tsx           # Truth & Dare game component
│   ├── Mastermind.tsx          # Mastermind game component
│   ├── CustomModal.tsx         # Reusable alert/warning modal
│   └── ResultModal.tsx         # Reusable result display modal
├── contexts/
│   ├── LanguageContext.tsx     # Multilingual support (i18n)
│   └── GameGuardContext.tsx    # Game state guard context
├── constants/
│   └── theme.ts                # Design tokens — colors, typography
├── types/
│   ├── index.ts                # Shared TypeScript types
│   ├── images.d.ts             # Image module declarations
│   ├── expo-sharing.d.ts       # Expo sharing type overrides
│   └── view-shot.d.ts          # View shot type declarations
├── assets/
│   └── tagdafun-main-logo.png  # App logo and splash icon
├── app.json                    # Expo app configuration
├── eas.json                    # EAS Build profiles
├── babel.config.js             # Babel config with path aliases
├── metro.config.js             # Metro bundler config
├── tsconfig.json               # TypeScript configuration
└── PRIVACY_POLICY.md           # Privacy policy
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn
- Expo Go app on your device (for development)

### Setup

```bash
# Clone the repo
git clone https://github.com/DevmanushRaky/tagdafun.git
cd tagdafun

# Install dependencies
npm install

# Start the development server
npx expo start
```

Scan the QR code with Expo Go on Android, or Camera app on iOS.

### Available Scripts

```bash
npm start              # Start Expo dev server
npm run android        # Run on Android emulator
npm run ios            # Run on iOS simulator
npm run ts:check       # TypeScript type check
npm run build:android  # EAS production build (AAB)
npm run build:android-preview  # EAS preview build (APK)
```

---

## Design System

| Token | Value |
|-------|-------|
| Primary | `#FF6B00` (Orange) |
| Secondary | `#002244` (Navy Blue) |
| Background | `#FFFFFF` (White) |
| Surface | `#F8F9FA` (Light Gray) |
| Text | `#1A1A1A` (Dark) |

---

## Privacy

Tagda Fun is built privacy-first:

- No internet connection required
- No personal data collected
- No analytics or tracking
- All processing happens locally on your device
- No accounts, no sign-up, no permissions required

See [PRIVACY_POLICY.md](./PRIVACY_POLICY.md) for the full policy.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.

---

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

---

<div align="center">

Made with care by [Rakesh Yadav](https://github.com/DevmanushRaky)

[Google Play](https://play.google.com/store/apps/details?id=com.tagdafun.app) · [Privacy Policy](./PRIVACY_POLICY.md) · [Report an Issue](https://github.com/DevmanushRaky/tagdafun/issues)

</div>
