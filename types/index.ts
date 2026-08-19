import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { GAME_CONFIG } from '../constants/gameConfig';


export type RootTabParamList = {
  Home: undefined;
  Coins: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

export type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;
export type CoinsScreenProps = BottomTabScreenProps<RootTabParamList, 'Coins'>;
export type LeaderboardScreenProps = BottomTabScreenProps<RootTabParamList, 'Leaderboard'>;
export type ProfileScreenProps = BottomTabScreenProps<RootTabParamList, 'Profile'>;

export type Language = 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export interface GameConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradient: readonly [string, string];
  coinsPerPlay: number;
}

export const GAMES: GameConfig[] = [
  {
    id: 'coin',
    title: 'Coin Toss',
    description: 'Heads or Tails? You decide!',
    icon: 'cash-outline',
    color: '#F9A825',
    gradient: ['#FFD54F', '#F9A825'],
    coinsPerPlay: GAME_CONFIG.coin.coinsPerPlay,
  },
  {
    id: 'spin',
    title: 'Spin Roulette',
    description: `Spin the wheel & win big! Costs ${GAME_CONFIG.spin.costPerSpin} coins per spin.`,
    icon: 'refresh-circle-outline',
    color: '#E91E8C',
    gradient: ['#F953C6', '#B91D73'],
    coinsPerPlay: GAME_CONFIG.spin.costPerSpin,
  },
  {
    id: 'memory',
    title: 'Memory Cards',
    description: `Match all pairs to win +${GAME_CONFIG.memory.coinsPerWin} coins. Free to play!`,
    icon: 'albums-outline',
    color: '#00B4D8',
    gradient: ['#48CAE4', '#0077B6'],
    coinsPerPlay: GAME_CONFIG.memory.costToPlay,
  },
];
