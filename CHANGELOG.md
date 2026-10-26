# Changelog

All notable releases of Tagda Fun are documented here.

---

## [1.2.0] — Gamification, Ads & Water Sorting

**New Features**
- **Gamification System** — XP, 11 levels, achievements and daily challenge.
- **Coins Wallet** — Coins screen with balance, per-game breakdown and full game history.
- **Memory Cards** — Match the pairs to win coins and XP.
- **Water Sorting** — Level-based bottle sorting puzzle with hints. Coin reward depends on moves vs. par (10–150 coins) plus +15 XP per win. Progress is saved between sessions.
- **Ads (Unity LevelPlay)** — Banner and native ads, plus optional rewarded ads (+50 coins) after a game. See `ADS_INTEGRATION.md`.
- **Patang Baazi** — Kite-fighting game: fly your kite, cross strings and swipe fast to cut rivals. Levels, lives, a boss kite every 5th level, star-based coins. Built with React Native Skia.
- **Sher aur Bakri** — The village game against the computer or a friend. Easy (1 sher, 16 bakri) and Hard (2 sher, 20 bakri) levels on a 5×5 board, the bakri starting at home in four equal stacks.
- **Tic-Tac-Toe** — Classic 3×3 against the computer or a friend, no levels. Win +50 coins, loss or draw +30. An interstitial ad shows after every 3rd game once an ad unit is configured.
- **Bubble Shooter** — Aim with wall bounces, pop 3+ of a colour, drop what hangs below; the ceiling comes down after misses. Levels, star-based coins.
- **Shop** — Daily gift, power-ups (Memory hint, Water hint, extra bottle), coin skins, card backs, bottle themes, and Sher aur Bakri boards (5) and piece sets (4), and Tic-Tac-Toe symbol sets (6), all bought with in-game coins.
- **Tamper-resistant saves** — Coins, XP and shop ownership are now saved with a signature, so editing the stored numbers by hand no longer works.
- **Redesigned Navigation** — 4-tab layout: Home, Coins, Shop, Profile.

**Removed**
- **Spin Roulette** — coins have no real-world value, so a wheel that costs coins to win coins added nothing. Old saved spin data is ignored, so older installs still load fine.

**Improvements**
- Upgraded to the latest Expo SDK and refreshed dependencies
- Navbar safe-area and Android build fixes
- Privacy Policy updated for ads

---

## [1.1.0] — Mastermind & More

**New Features**
- **Mastermind Game** — Classic code-breaking puzzle with color pegs, guess tracking, and a built-in timer. Supports multiple difficulty levels and a review mode to analyse your game after finishing.
- **Game Statistics** — Track your Mastermind wins, losses, best times, and streaks across sessions. Stats persist between app sessions using local storage.
- **Achievements** — Unlock achievements based on your Mastermind performance.
- **Share Results** — Share your Mastermind game results as an image directly from the app.
- **Coin Toss** — Flip a coin with a Heads or Tails prediction. Tracks your correct call streak.
- **Truth & Dare** — Add players and spin to randomly assign Truth or Dare. Designed for group play.
- **Multilingual Support** — Language context added for future localisation support.
- **GameGuard Context** — Prevents accidental game exits mid-session.
- **Privacy Screen** — Dedicated in-app privacy policy screen accessible from the menu.

**Improvements**
- Refactored all screens for consistent SafeAreaView and layout handling
- Improved modal components with cleaner TypeScript types (`React.JSX.Element`)
- Bottom tab navigation updated to support all 5 game tabs
- Android build configuration updated — targets SDK 35

---

## [1.0.2] — Android Build Improvements

**Improvements**
- Updated Android build configuration in `eas.json` for more reliable production builds
- Added `android-deploy.sh` script for streamlined deployment workflow
- Minor performance and stability improvements

---

## [1.0.0] — Initial Release

**Features**
- **Number Generator** — Generate a random number within a user-defined range. Supports custom min/max, real-time validation, and a one-tap reset to the default 1–100 range.
- **Name Picker** — Enter a comma-separated list of names and randomly pick one. Supports clearing the list and viewing results in a modal.
- Animated result modals for both features
- Custom branded alert/warning modal system
- Orange + Navy Blue design system
- 100% offline — no internet required, no data collected
- Privacy policy included
- Google Play Store ready
