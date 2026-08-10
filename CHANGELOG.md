# Changelog

All notable releases of Tagda Fun are documented here.

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
