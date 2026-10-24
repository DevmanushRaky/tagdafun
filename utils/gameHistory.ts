import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@tagdafun_history_v1';
const MAX_ENTRIES = 100;

export type GameLogType = 'coin' | 'memory' | 'water' | 'ad' | 'gift' | 'shop';

export interface GameLog {
  id: string;
  timestamp: number;
  gameType: GameLogType;
  // coin toss
  choice?: 'heads' | 'tails';
  outcome?: 'heads' | 'tails';
  coinWon?: boolean;
  // shop purchase: item title
  item?: string;
  // rewarded ad
  adNetwork?: string;
  // memory cards
  memoryLevel?: number;
  // memory cards + water sorting
  stars?: number;
  // water sorting
  moves?: number;
  par?: number;
  waterLevel?: number;
  // common
  costCoins: number;   // coins spent to play
  earnedCoins: number; // coins won from result
  netCoins: number;    // earnedCoins - costCoins
}

export async function logGame(entry: Omit<GameLog, 'id'>): Promise<void> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  const existing: GameLog[] = raw ? JSON.parse(raw) : [];
  const updated = [{ ...entry, id: `${Date.now()}-${Math.random()}` }, ...existing].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function getHistory(): Promise<GameLog[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  const all: GameLog[] = JSON.parse(raw);
  // Drop corrupt entries, and entries from the removed Spin Roulette game that older installs may still hold.
  return all.filter(e =>
    e && typeof e.timestamp === 'number' && !isNaN(e.timestamp) && e.timestamp > 0 && (e.gameType as string) !== 'spin');
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
