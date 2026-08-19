import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GAME_CONFIG, LEVELS, ACHIEVEMENT_XP } from '../constants/gameConfig';

export type GameType = 'coin' | 'spin';

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
  spinPlays: number;
  spinTotalWon: number;
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
  recordGame: (gameType: GameType, extra?: Partial<PlayerStats>) => Promise<Achievement[]>;
  newlyUnlocked: Achievement[];
  clearNewlyUnlocked: () => void;
}

const STORAGE_KEY = '@tagdafun_stats_v3';

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
  gamesPlayed: { coin: 0, spin: 0 },
  totalGamesPlayed: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPlayedDate: '',
  achievements: {},
  achievementUnlockTimes: {},
  coinWins: 0,
  coinFlips: 0,
  spinPlays: 0,
  spinTotalWon: 0,
});

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
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          const def = defaultStats();
          setStats({
            ...def,
            ...saved,
            gamesPlayed: { ...def.gamesPlayed, ...(saved.gamesPlayed ?? {}) },
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

  const recordGame = useCallback(async (gameType: GameType, extra?: Partial<PlayerStats>): Promise<Achievement[]> => {
    let s = updateStreak({ ...stats });
    s.gamesPlayed = { ...s.gamesPlayed, [gameType]: s.gamesPlayed[gameType] + 1 };
    s.totalGamesPlayed += 1;
    if (extra) Object.assign(s, extra);

    const xpMap: Record<GameType, number> = { coin: GAME_CONFIG.coin.xpPerPlay, spin: GAME_CONFIG.spin.xpPerPlay };
    s.totalXP += xpMap[gameType];
    if (gameType === 'coin') s.totalCoins += GAME_CONFIG.coin.coinsPerPlay;
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

  return (
    <GameStatsContext.Provider value={{ stats, levelInfo, achievements: buildAchievements(), recordGame, newlyUnlocked, clearNewlyUnlocked }}>
      {children}
    </GameStatsContext.Provider>
  );
};
