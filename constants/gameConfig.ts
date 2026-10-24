// ─── GAME REWARDS ────────────────────────────────────────────────────────────
// Central config — change coin/XP values here, reflects everywhere in the app

export const GAME_CONFIG = {
  coin: {
    winCoins: 10,         // coins for calling the flip right
    loseCoins: 5,         // coins for a wrong call (every flip still pays)
    xpPerPlay: 10,
  },
  memory: {
    xpPerWin: 15,         // coins come from STAR_REWARDS
  },
  water: {
    xpPerWin: 15,         // coins come from STAR_REWARDS
  },
  kite: {
    xpPerWin: 20,         // coins come from STAR_REWARDS
  },
  bubble: {
    xpPerWin: 15,         // coins come from STAR_REWARDS
  },
  dailyChallenge: {
    targetFlips: 5,       // flips needed to complete daily challenge
    coinsReward: 25,
    xpReward: 20,
  },
} as const;

// ─── LEVEL REWARDS (Memory Cards + Water Sorting) ─────────────────────────────
// Coins for clearing a level, by the stars earned on it.
export const STAR_REWARDS: Record<1 | 2 | 3, number> = { 3: 150, 2: 100, 1: 80 };

export const coinsForStars = (stars: number): number =>
  STAR_REWARDS[Math.max(1, Math.min(3, Math.round(stars))) as 1 | 2 | 3];

/** "80–150", for labels that show the range a level can pay. */
export const starRewardRange = `${STAR_REWARDS[1]}–${STAR_REWARDS[3]}`;

// ─── LEVEL SYSTEM ─────────────────────────────────────────────────────────────
// XP required for each level and its title

export const LEVELS = [
  { xp: 0,    title: 'Newbie' },
  { xp: 100,  title: 'Starter' },
  { xp: 250,  title: 'Explorer' },
  { xp: 500,  title: 'Player' },
  { xp: 850,  title: 'Fun Seeker' },
  { xp: 1300, title: 'Challenger' },
  { xp: 1900, title: 'Pro Player' },
  { xp: 2700, title: 'Champion' },
  { xp: 3700, title: 'Legend' },
  { xp: 5000, title: 'Mastermind' },
  { xp: 6600, title: 'Grandmaster' },
];

// ─── ACHIEVEMENT XP REWARDS ───────────────────────────────────────────────────
// XP bonus awarded when each achievement is unlocked

export const ACHIEVEMENT_XP: Record<string, number> = {
  first_game:  50,
  first_coin:  30,
  games_10:    75,
  games_50:    200,
  games_100:   500,
  coin_win_5:  80,
  coin_win_20: 250,
  streak_3:    100,
  streak_7:    350,
  level_5:     200,
  level_10:    500,
};
