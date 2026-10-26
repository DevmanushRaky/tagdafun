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

Tagda Fun is a gamified mini-game app with seven games — **Coin Toss**, **Memory Cards**, **Water Sorting**, **Patang Baazi**, **Bubble Shooter**, **Sher aur Bakri** and **Tic-Tac-Toe** — wrapped in a full progression system with XP, levels, achievements, daily challenges, and a Shop where coins buy power-ups and skins. All data is stored locally on your device.

---

## Games

### Coin rewards
All values live in `constants/gameConfig.ts`.

| Game | Coins |
|------|-------|
| Coin Toss | **+10** for a right call, **+5** for a wrong one |
| Memory Cards, Water Sorting, Patang Baazi and Bubble Shooter | per cleared level by stars: **3★ = 150**, **2★ = 100**, **1★ = 80** (`STAR_REWARDS`) |
| Tic-Tac-Toe vs the computer | **+50** for a win, **+30** for a loss or a draw; 2-player games give no coins |
| Daily challenge | +25 |
| Daily gift (Shop) | 10 → 60 over a 7-day run |

### Coin Toss — Free to play
- Pick **Heads** or **Tails**
- 3D animated coin flip
- **+10 coins** for a right call, **+5** for a wrong one, and **+10 XP** per flip
- Track your win streak and total flips

### Memory Cards — Free to play
- Flip cards and match all the pairs; earn **80 / 100 / 150 coins** for 1★ / 2★ / 3★ and **+15 XP** per cleared level
- **Levels** (saved between sessions): 4 cards per row, sized so the Hint button stays on screen: 4×3 (6 pairs) → 4×4 (8) → 4×4 (7 + 2 bombs) → 4×5 (9 + 2 bombs) → 4×5 (8 + 4 bombs) for every level after
- **Stars** by moves: 3★ within `ceil(pairs × 1.6)` moves, 2★ within `ceil(pairs × 2.4)`, else 1★. Best stars per level are saved
- **Bombs** (from Level 3): flipping one explodes it, adds +2 moves and reshuffles every unmatched card; matched pairs stay put
- **Hint** (2 per level): watch a rewarded ad and every card still in play is shown for 3 seconds. The clock pauses during the ad. In dev builds / Expo Go, where no ad loads, the hint is given for free so it can be tested
- **Music**: a soft looping melody (toggle 🎵 in the top bar, choice is saved); it pauses while an ad plays
- **Vibration** only when a level is cleared
- Tuning lives at the top of `components/MemoryCards.tsx` (`LEVELS`, `starLimits`, `BOMB_PENALTY_MOVES`, `HINTS_PER_LEVEL`, `HINT_REVEAL_MS`, `MUSIC_VOLUME`)

### Water Sorting — Free to play
- Pour water between bottles until every bottle holds a single colour
- Level-based, with hints; progress is saved between sessions
- Stars by moves vs. the best possible (par): 3★ within 20% over par, 2★ within 60%, else 1★ (`waterStars` in `utils/waterSort.ts`). Coins: **80 / 100 / 150** for 1★ / 2★ / 3★
- Earn **+15 XP** per win
- **Hint** and **+ Bottle** each cost a rewarded ad. The hint is checked first, so no ad is shown when there is no useful move. The extra bottle (one per level) stays through Undo and Restart, since it was paid for
- Sounds: pour, a glass "ting" when a bottle is finished, a steel-drum jingle on a win, and a calm looping melody (toggle 🎵 in the header, saved). Music pauses during ads and dips under the win jingle
- Animations: bottles drop in at the start of a level (and on Restart), splash droplets where the stream lands, sparks when a bottle is finished, and a hop wave across the board before the result card
- **Vibration** only when a level is cleared

---

### Patang Baazi — Free to play
- Drag on the sky to fly your kite; it follows your finger and drifts with the wind (wind shown in the top bar)
- When your string crosses another kite's, a **pench** starts: swipe fast to pull and fill the meter to cut theirs ("Bo kaata!"). Hold still and the rival cuts yours
- 3 kites (lives) per level. Cut the level's target (3 at Level 1, up to 10) to clear it; every 5th level adds a **boss kite**
- Stars by kites left: 3 = 3★, 2 = 2★, 1 = 1★; coins by stars like the other level games, **+20 XP** per clear
- Drawn with `@shopify/react-native-skia` (one picture per frame; the sky and rooftops are pre-drawn once). Rules and simulation live in `utils/kite.ts`, separate from drawing
- Runs at **30 FPS** (`TARGET_FPS` in `components/KiteFight.tsx`); the simulation is time-based, so raising it to 60 only makes motion smoother
- Sounds: strings rubbing during a pench, a swoosh when a kite is cut, a buzz when yours is, and a pizzicato jingle on a win (Kenney, CC0). Vibration only when a level is cleared

### Bubble Shooter — Free to play
- Drag on the board to aim (dotted line shows wall bounces), let go to shoot; release below the shooter to cancel
- 3 or more of one colour pop; anything no longer hanging from the ceiling drops. Tap the small bubble to swap it with the loaded one; only colours still on the board are loaded
- Every few shots without a pop (7 at Level 1, down to 4) the ceiling comes down a row; bubbles past the dashed line lose the level
- Levels add rows (4 → 8) and colours (3 → 6); the start board never has a same-colour clump bigger than 4
- Stars by how often the ceiling came down: 0–1 = 3★, 2–3 = 2★, more = 1★; coins by stars, **+15 XP** per clear
- Rules in `utils/bubble.ts` (hex grid, snapping, pops, drops), drawing in `components/BubbleShooter.tsx` with Skia at 30 FPS
- **Ghost bubble** shows where the shot will stick; the ceiling slides down (the board trembles one miss before it does); neighbours wobble when a bubble lands
- **Score**: 10 per popped bubble, 20 per dropped one, times a combo of up to ×5 for popping shots in a row
- **Specials**: clear 6+ with one shot to load a 💣 **bomb** (blasts everything around where it lands); pop 3 shots in a row for a 🌈 **rainbow** (joins the biggest neighbouring colour group)
- Sounds: shot, pop, bomb (Kenney, CC0). Vibration only when a level is cleared

### Tic-Tac-Toe — Free to play
- Classic 3×3: three in a row wins. Play the computer (as X, moving first, or as O) or 2 players on one phone; there are no levels
- The computer plays perfectly most of the time but slips to a random square 1 time in 4 (`SLIP_CHANCE` in `utils/ticTacToe.ts`), so it can be beaten
- Every finished game against the computer pays: win **+50** coins, loss or draw **+30**, plus 15 XP
- An interstitial ad comes up by itself after every 3rd finished game, once an Interstitial ad unit ID is set in `app.json` (`levelPlayInterstitialAdUnitId`); with none set, or none loaded, no ad shows

### Sher aur Bakri — Free to play
- The village game on a lattice board (diagonals from every other point). Pieces step one point along a line; a sher jumps over a bakri to an empty point to hunt it
- Every level starts with all its bakri on the board, an equal number to a "ghar" (as in Ludo) on each corner of the middle four squares; the sher wait at the ends of the centre row (1 sher: left end; 2 sher: left and right ends). A sher can jump a stack too but takes only one bakri from it, and bakri cannot step back onto a stack
- **Sher win** once so many bakri are hunted that too few are left to block them; **bakri win** when no sher can move
- Play as bakri or sher against the computer, or 2 players on one phone

| Difficulty | Board | Sher | Bakri | Hunts to win | Computer |
|---|---|---|---|---|---|
| Easy | 5×5 | 1 | 16 (4 homes of 4) | hunt 10 | looks 1 move ahead, often random |
| Hard | 5×5 | 2 | 20 (4 homes of 5) | hunt 12 | 3 moves ahead |

- Tuned by simulating a decent player (3 moves ahead) against the computer on both sides: roughly 60–100% wins on Easy and ~30–40% on Hard (`SETUPS` in `utils/sherBakri.ts`)
- Stars: as bakri by bakri lost (0 = 3★, 1 = 2★); as sher by how quickly you won. Coins by stars × 0.5 (Easy) / 1.5 (Hard); +20 XP. 2-player games give no coins
- Hand-drawn SVG tokens (a maned sher and a bakri) (`components/SherBakriIcons.tsx`), green dots for moves, red rings for hunts and for bakri in danger, a pounce animation for jumps

## Screens

| Screen | What it shows |
|--------|--------------|
| **Home** | Player card (level, XP bar, streak), daily challenge, game cards |
| **Coins** | Coin balance, per-game breakdown, full game history log |
| **Shop** | Daily gift, power-ups, coin skins, card backs, bottle themes, Sher aur Bakri boards and pieces, and Tic-Tac-Toe symbols bought with coins |
| **Profile** | Editable nickname, level + XP, streaks, per-game stats, Shop collection, achievements with progress |

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

### Shop
Coins have no cash value; this is where they are spent. Catalog and prices live in `constants/shop.ts`, ownership in `contexts/ShopContext.tsx` (saved locally).

- **Daily gift**: free coins once a day, climbing 10 → 15 → 20 → 25 → 30 → 40 → 60 on consecutive days; a missed day starts over at day 1
- **Power-ups** (stack, used one at a time): Memory Hint 100, Water Hint 80, Extra Bottle 150. A game uses an owned power-up first and only falls back to a rewarded ad when you have none. The hint and bottle buttons show `×N` instead of `AD` while you own some
- **Coin skins** for Coin Toss (also shown on the Home card): Gold (free), Silver 1,000, Rose Gold 2,500, Emerald 4,000, Diamond 7,500
- **Card backs** for Memory Cards: Navy (free), Galaxy 1,500, Sunset 1,500, Ocean 3,000
- **Bottle themes** for Water Sorting (board background, glass, outline, lid): Classic (free), Night 1,200, Sunset 1,500, Forest 1,500, Royal Gold 3,000
- **Sher aur Bakri boards** (board colours, lines and points): Wooden (free), Meadow 1,200, Ice 2,000, Night 2,500, Royal 4,000
- **Sher and Bakri pieces** (colours of both tokens): Classic (free), Royal 1,500, Midnight 2,000, Crimson 3,000
- **Tic-Tac-Toe symbols** (the X and O marks): Classic (free), Neon 1,000, Royal 1,500, Sun & Moon 2,000, Star & Heart 2,500, Sher & Bakri 3,500
- Unlocking everything costs **54,900 coins**, about 460 levels at a 2–3★ average
- Every purchase asks for confirmation and is logged in the Coins history
- No random "mystery box": paid random rewards count as loot boxes on Google Play

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
- Shop with daily gift, power-ups, coin skins, card backs, bottle themes, Sher aur Bakri boards and pieces, and Tic-Tac-Toe symbols
- Daily challenge with auto-reset
- 11-level XP progression

**Not planned:** no backend, login, online leaderboard or cash-out. Coins are in-game currency only; revenue comes from ads.

---

## Ads

Unity LevelPlay, all set up in code. Ad unit IDs, SDK quirks and build notes are in `ADS_INTEGRATION.md`.

| Format | Where | When |
|--------|-------|------|
| Banner | Home, below the daily challenge | Always |
| Native | Home (after games), inside each game screen except Patang Baazi, bottom of the Shop | Always (hidden until an ad loads) |
| Banner | Under the Patang Baazi board | Always |
| Rewarded (+50 coins) | "Watch ad / Skip" popup after a game | **Capped**, see below |
| Rewarded (no coins) | Memory Cards "Hint" button | Player taps it; 2 per level |
| Rewarded (no coins) | Water Sorting "Hint" and "+ Bottle" | Player taps it; Hint any time, + Bottle once per level |

### After-game popup cap

Showing the popup after every round annoyed players and they just hit Skip, so it is capped:

- It shows after every **4th** finished game (any game, Coin Toss flips included)
- At most **once every 3 minutes**
- The counter lives in memory, so it resets when the app restarts

Change the numbers in `screens/HomeScreen.tsx`:

```ts
const REWARD_PROMPT_EVERY = 4;                   // show after every Nth finished game
const REWARD_PROMPT_COOLDOWN_MS = 3 * 60 * 1000; // at most once per this window
```

For Coin Toss the popup waits 1.5 s after the coin lands (`RESULT_HOLD_MS` in `components/CoinToss.tsx`) so the result is seen first.

Rewarded ads for in-game help go through `services/rewardedAd.ts` (`showRewardedAd()` → `'rewarded' | 'closed' | 'unavailable'`).

**Idea for later (not built):** an optional "2x coins" button on a win. With those in place the after-game popup could be removed completely.

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
│   ├── ShopScreen.tsx          # Daily gift, power-ups, coin skins, card backs
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
| AsyncStorage | Persist all stats, history, shop items |
| react-native-safe-area-context | Safe area insets |

---

## Android Info

- **Package:** `com.tagdafun.app`
- **Version:** `1.2.0`
- **Target SDK:** 36
- **Min SDK:** 24

---

## Credits

All sounds and music are **CC0 (public domain)**: free for commercial use, no attribution required. Sources, authors and what was changed are listed in [`assets/sounds/CREDITS.md`](assets/sounds/CREDITS.md):

- Coin sounds: Enci23 and Vinrax (OpenGameArt), Kenney
- Memory Cards music: "Happy Lullaby" by cynicmusic (OpenGameArt). The author asks to be told when the track is used
- Water Sorting sounds and music: ezwa (pdsounds), Kenney, Juhani Junkala

Keep `CREDITS.md` up to date whenever a sound is added or swapped, and only add CC0 files.

---

## License

MIT © [DevmanushRaky](https://github.com/DevmanushRaky/tagdafun)
