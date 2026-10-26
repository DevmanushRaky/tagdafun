import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GAME_CONFIG, LEVELS, ACHIEVEMENT_XP } from '../constants/gameConfig';

export type GameType = 'coin' | 'memory' | 'water' | 'kite' | 'bubble' | 'bagh' | 'tictac';
/** Where coins came from; kept as lifetime totals so the Coins screen never depends on the capped history. */
export type CoinSource = GameType | 'ad' | 'daily' | 'gift';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  tier: 'bronze' | 'silver' | 'gold';
  unlocked: boolean;
  unlockedAt?: number;
  target?: number;
}

export interface PlayerStats {
  totalXP: number;
  totalCoins: number;
  level: number;
  gamesPlayed: Record<GameType, number>;
  totalGamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: string;
  achievements: Record<string, boolean>;
  achievementUnlockTimes: Record<string, number>;
  coinWins: number;
  coinFlips: number;
  coinsEarned: Record<CoinSource, number>;
  coinsSpent: number;
  playerName: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
  xpForNext: number;
  progress: number;
  color: string;
}

interface GameStatsContextValue {
  stats: PlayerStats;
  levelInfo: LevelInfo;
  achievements: Achievement[];
  /** Records a finished game; `coins` is what that game paid out. */
  recordGame: (gameType: GameType, extra?: Partial<PlayerStats>, coins?: number) => Promise<Achievement[]>;
  newlyUnlocked: Achievement[];
  clearNewlyUnlocked: () => void;
  addBonusCoins: (amount: number, source?: 'ad' | 'daily' | 'gift', xp?: number) => Promise<void>;
  /** Takes coins for a shop purchase; false (and nothing changes) if the balance is too low. */
  spendCoins: (amount: number) => Promise<boolean>;
  setPlayerName: (name: string) => Promise<void>;
}

const STORAGE_KEY = '@tagdafun_stats_v3';
const HISTORY_KEY = '@tagdafun_history_v1';

const XP_PER_LEVEL = LEVELS.map(l => l.xp);
const LEVEL_TITLES = LEVELS.map(l => l.title);
const LEVEL_COLORS = ['#ADB5BD', '#CD7F32', '#CD7F32', '#C0C0C0', '#C0C0C0', '#FFD700', '#FFD700', '#FF6B00', '#FF6B00', '#A55EEA', '#A55EEA'];

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: 'first_game',  title: 'First Step!',       description: 'Play your first game',    icon: '🎮', xpReward: ACHIEVEMENT_XP.first_game,  tier: 'bronze', unlocked: false },
  { id: 'first_coin',  title: 'Coin Flipper',       description: 'Flip your first coin',    icon: '🪙', xpReward: ACHIEVEMENT_XP.first_coin,  tier: 'bronze', unlocked: false },
  { id: 'games_10',    title: 'Getting Warmed Up',  description: 'Play 10 games total',     icon: '🔥', xpReward: ACHIEVEMENT_XP.games_10,    tier: 'bronze', unlocked: false, target: 10 },
  { id: 'games_50',    title: 'Addicted!',          description: 'Play 50 games total',     icon: '⚡', xpReward: ACHIEVEMENT_XP.games_50,    tier: 'silver', unlocked: false, target: 50 },
  { id: 'games_100',   title: 'Centurion',          description: 'Play 100 games total',    icon: '💯', xpReward: ACHIEVEMENT_XP.games_100,   tier: 'gold',   unlocked: false, target: 100 },
  { id: 'coin_win_5',  title: 'Lucky Flipper',      description: 'Win 5 coin tosses',       icon: '🍀', xpReward: ACHIEVEMENT_XP.coin_win_5,  tier: 'bronze', unlocked: false, target: 5 },
  { id: 'coin_win_20', title: 'Golden Touch',       description: 'Win 20 coin tosses',      icon: '✨', xpReward: ACHIEVEMENT_XP.coin_win_20, tier: 'silver', unlocked: false, target: 20 },
  { id: 'streak_3',    title: 'On a Roll!',         description: '3-day play streak',       icon: '🔥', xpReward: ACHIEVEMENT_XP.streak_3,    tier: 'bronze', unlocked: false, target: 3 },
  { id: 'streak_7',    title: 'Week Warrior',       description: '7-day play streak',       icon: '⚔️', xpReward: ACHIEVEMENT_XP.streak_7,    tier: 'silver', unlocked: false, target: 7 },
  { id: 'level_5',     title: 'Rising Star',        description: 'Reach Level 5',           icon: '⭐', xpReward: ACHIEVEMENT_XP.level_5,     tier: 'silver', unlocked: false },
  { id: 'level_10',    title: 'Legend Status',      description: 'Reach Level 10',          icon: '👑', xpReward: ACHIEVEMENT_XP.level_10,    tier: 'gold',   unlocked: false },
];

const defaultStats = (): PlayerStats => ({
  totalXP: 0,
  totalCoins: 0,
  level: 1,
  gamesPlayed: { coin: 0, memory: 0, water: 0, kite: 0, bubble: 0, bagh: 0, tictac: 0 },
  totalGamesPlayed: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: '',
  achievements: {},
  achievementUnlockTimes: {},
  coinWins: 0,
  coinFlips: 0,
  coinsEarned: { coin: 0, memory: 0, water: 0, kite: 0, bubble: 0, bagh: 0, tictac: 0, ad: 0, daily: 0, gift: 0 },
  coinsSpent: 0,
  playerName: 'Tagda Player',
});

/**
 * One-time estimate for players saved before coinsEarned existed: games from their play counts,
 * water and ads from whatever history is still stored (the last 100 entries).
 */
function seedCoinsEarned(saved: Partial<PlayerStats>, historyRaw: string | null): Record<CoinSource, number> {
  const played = saved.gamesPlayed ?? {} as Partial<Record<GameType, number>>;
  let water = 0;
  let ad = 0;
  try {
    const logs: { gameType?: string; earnedCoins?: number }[] = historyRaw ? JSON.parse(historyRaw) : [];
    for (const l of logs) {
      if (l.gameType === 'water') water += l.earnedCoins ?? 0;
      if (l.gameType === 'ad') ad += l.earnedCoins ?? 0;
    }
  } catch {}
  // The rates these games paid before the star-based rewards.
  const LEGACY_COIN_PER_FLIP = 5;
  const LEGACY_MEMORY_PER_WIN = 10;
  return {
    coin: (played.coin ?? 0) * LEGACY_COIN_PER_FLIP,
    memory: (played.memory ?? 0) * LEGACY_MEMORY_PER_WIN,
    water,
    kite: 0,
    bubble: 0,
    bagh: 0,
    tictac: 0,
    ad,
    daily: 0,
    gift: 0,
  };
}

function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_PER_LEVEL.length; i++) {
    if (xp >= XP_PER_LEVEL[i]) level = i + 1; else break;
  }
  return Math.min(level, XP_PER_LEVEL.length);
}

function getLevelInfo(xp: number): LevelInfo {
  const level = calculateLevel(xp);
  const idx = Math.min(level - 1, XP_PER_LEVEL.length - 1);
  const nextIdx = Math.min(level, XP_PER_LEVEL.length - 1);
  const xpRequired = XP_PER_LEVEL[idx];
  const xpForNext = XP_PER_LEVEL[nextIdx];
  const progress = level >= XP_PER_LEVEL.length ? 1 : Math.min((xp - xpRequired) / (xpForNext - xpRequired), 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    xpRequired,
    xpForNext,
    progress,
    color: LEVEL_COLORS[Math.min(level - 1, LEVEL_COLORS.length - 1)],
  };
}

function updateStreak(stats: PlayerStats): PlayerStats {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (stats.lastPlayedDate === today) return stats;
  const newStreak = stats.lastPlayedDate === yesterday ? stats.currentStreak + 1 : 1;
  return { ...stats, currentStreak: newStreak, bestStreak: Math.max(stats.bestStreak, newStreak), lastPlayedDate: today };
}

function checkAchievements(stats: PlayerStats): Achievement[] {
  const unlocked: Achievement[] = [];
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (stats.achievements[def.id]) continue;
    let should = false;
    switch (def.id) {
      case 'first_game': should = stats.totalGamesPlayed >= 1; break;
      case 'first_coin': should = stats.gamesPlayed.coin >= 1; break;
      case 'games_10': should = stats.totalGamesPlayed >= 10; break;
      case 'games_50': should = stats.totalGamesPlayed >= 50; break;
      case 'games_100': should = stats.totalGamesPlayed >= 100; break;
      case 'coin_win_5': should = stats.coinWins >= 5; break;
      case 'coin_win_20': should = stats.coinWins >= 20; break;
      case 'streak_3': should = stats.currentStreak >= 3; break;
      case 'streak_7': should = stats.currentStreak >= 7; break;
      case 'level_5': should = stats.level >= 5; break;
      case 'level_10': should = stats.level >= 10; break;
    }
    if (should) {
      stats.achievements[def.id] = true;
      stats.achievementUnlockTimes[def.id] = Date.now();
      unlocked.push({ ...def, unlocked: true, unlockedAt: Date.now() });
    }
  }
  return unlocked;
}

const GameStatsContext = createContext<GameStatsContextValue | undefined>(undefined);

export const useGameStats = () => {
  const ctx = useContext(GameStatsContext);
  if (!ctx) throw new Error('useGameStats must be used within GameStatsProvider');
  return ctx;
};

export const GameStatsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<PlayerStats>(defaultStats());
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(HISTORY_KEY)]).then(([raw, historyRaw]) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          const def = defaultStats();
          setStats({
            ...def,
            ...saved,
            gamesPlayed: { ...def.gamesPlayed, ...(saved.gamesPlayed ?? {}) } as Record<GameType, number>,
            coinsEarned: { ...def.coinsEarned, ...(saved.coinsEarned ?? seedCoinsEarned(saved, historyRaw)) },
          });
        } catch {}
      }
    });
  }, []);

  const saveStats = useCallback(async (s: PlayerStats) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }, []);

  const levelInfo = getLevelInfo(stats.totalXP);

  const buildAchievements = useCallback((): Achievement[] =>
    ACHIEVEMENT_DEFINITIONS.map(def => ({
      ...def,
      unlocked: !!stats.achievements[def.id],
      unlockedAt: stats.achievementUnlockTimes[def.id],
    })), [stats]);

  const recordGame = useCallback(async (gameType: GameType, extra?: Partial<PlayerStats>, coins = 0): Promise<Achievement[]> => {
    let s = updateStreak({ ...stats });
    s.gamesPlayed = { ...s.gamesPlayed, [gameType]: s.gamesPlayed[gameType] + 1 };
    s.totalGamesPlayed += 1;
    if (extra) Object.assign(s, extra);

    const xpMap: Record<GameType, number> = { coin: GAME_CONFIG.coin.xpPerPlay, memory: GAME_CONFIG.memory.xpPerWin, water: GAME_CONFIG.water.xpPerWin, kite: GAME_CONFIG.kite.xpPerWin, bubble: GAME_CONFIG.bubble.xpPerWin, bagh: GAME_CONFIG.bagh.xpPerWin, tictac: GAME_CONFIG.tictac.xpPerPlay };
    s.totalXP += xpMap[gameType];
    s.totalCoins += coins;
    const gained = s.totalCoins - stats.totalCoins;
    if (gained > 0) s.coinsEarned = { ...s.coinsEarned, [gameType]: s.coinsEarned[gameType] + gained };
    s.level = calculateLevel(s.totalXP);

    const unlocked = checkAchievements(s);
    for (const a of unlocked) s.totalXP += a.xpReward;
    s.level = calculateLevel(s.totalXP);

    await saveStats(s);
    setStats(s);
    if (unlocked.length > 0) setNewlyUnlocked(prev => [...prev, ...unlocked]);
    return unlocked;
  }, [stats, saveStats]);

  const clearNewlyUnlocked = useCallback(() => setNewlyUnlocked([]), []);

  /** Coins that don't come from playing a game: rewarded ads and the daily challenge. Not counted as a game. */
  const addBonusCoins = useCallback(async (amount: number, source: 'ad' | 'daily' | 'gift' = 'ad', xp = 0): Promise<void> => {
    const s: PlayerStats = {
      ...stats,
      totalCoins: stats.totalCoins + amount,
      totalXP: stats.totalXP + xp,
      coinsEarned: { ...stats.coinsEarned, [source]: stats.coinsEarned[source] + amount },
    };
    s.level = calculateLevel(s.totalXP);
    const unlocked = checkAchievements(s);
    for (const a of unlocked) s.totalXP += a.xpReward;
    s.level = calculateLevel(s.totalXP);
    await saveStats(s);
    setStats(s);
    if (unlocked.length > 0) setNewlyUnlocked(prev => [...prev, ...unlocked]);
  }, [stats, saveStats]);

  const spendCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (amount <= 0 || stats.totalCoins < amount) return false;
    const s: PlayerStats = { ...stats, totalCoins: stats.totalCoins - amount, coinsSpent: stats.coinsSpent + amount };
    await saveStats(s);
    setStats(s);
    return true;
  }, [stats, saveStats]);

  const setPlayerName = useCallback(async (name: string): Promise<void> => {
    const clean = name.trim().slice(0, 20);
    if (!clean) return;
    const s: PlayerStats = { ...stats, playerName: clean };
    await saveStats(s);
    setStats(s);
  }, [stats, saveStats]);

  return (
    <GameStatsContext.Provider value={{ stats, levelInfo, achievements: buildAchievements(), recordGame, newlyUnlocked, clearNewlyUnlocked, addBonusCoins, spendCoins, setPlayerName }}>
      {children}
    </GameStatsContext.Provider>
  );
};
