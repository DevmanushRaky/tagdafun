// ─── GAME REWARDS ────────────────────────────────────────────────────────────
// Central config — change coin/XP values here, reflects everywhere in the app

export const GAME_CONFIG = {
  coin: {
    coinsPerPlay: 5,      // coins awarded per flip (win or lose)
    xpPerPlay: 10,
  },
  spin: {
    xpPerPlay: 15,        // legacy: Spin Roulette was removed; kept so old saved stats still load
  },
  memory: {
    coinsPerWin: 10,      // coins awarded on completing the board
    xpPerWin: 15,
    costToPlay: 0,        // free to play
  },
  water: {
    costToPlay: 0,        // free to play
    baseWinCoins: 100,    // base reward for completing a level
    overParPenalty: 2,    // coins lost per move above par
    minWinCoins: 10,      // reward floor when over par
    underParBonus: 5,     // bonus coins per move under par
    maxWinCoins: 150,     // reward cap when under par
    xpPerWin: 15,
  },
  dailyChallenge: {
    targetFlips: 5,       // flips needed to complete daily challenge
    coinsReward: 25,
    xpReward: 20,
  },
} as const;

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
