import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { GAME_CONFIG } from '../constants/gameConfig';


export type RootTabParamList = {
  Home: undefined;
  Coins: undefined;
  Shop: undefined;
  Profile: undefined;
};

export type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;
export type CoinsScreenProps = BottomTabScreenProps<RootTabParamList, 'Coins'>;
export type ShopScreenProps = BottomTabScreenProps<RootTabParamList, 'Shop'>;
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
    id: 'memory',
    title: 'Memory Cards',
    description: `Match all pairs to win +${GAME_CONFIG.memory.coinsPerWin} coins. Free to play!`,
    icon: 'albums-outline',
    color: '#00B4D8',
    gradient: ['#48CAE4', '#0077B6'],
    coinsPerPlay: GAME_CONFIG.memory.costToPlay,
  },
  {
    id: 'water',
    title: 'Water Sorting',
    description: `Sort every color to win up to ${GAME_CONFIG.water.maxWinCoins} coins!`,
    icon: 'water-outline',
    color: '#2ED573',
    gradient: ['#2ED573', '#17B85A'],
    coinsPerPlay: GAME_CONFIG.water.costToPlay,
  },
];
