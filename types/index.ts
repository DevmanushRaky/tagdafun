import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { starRewardRange } from '../constants/gameConfig';


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
}

export const GAMES: GameConfig[] = [
  {
    id: 'coin',
    title: 'Coin Toss',
    description: 'Heads or Tails? You decide!',
    icon: 'cash-outline',
    color: '#F9A825',
    gradient: ['#FFD54F', '#F9A825'],
  },
  {
    id: 'memory',
    title: 'Memory Cards',
    description: `Match every pair. Win ${starRewardRange} coins by stars.`,
    icon: 'albums-outline',
    color: '#00B4D8',
    gradient: ['#48CAE4', '#0077B6'],
  },
  {
    id: 'water',
    title: 'Water Sorting',
    description: `Sort every colour. Win ${starRewardRange} coins by stars.`,
    icon: 'water-outline',
    color: '#2ED573',
    gradient: ['#2ED573', '#17B85A'],
  },
  {
    id: 'kite',
    title: 'Patang Baazi',
    description: `Cut the other kites' strings. Win ${starRewardRange} coins by stars.`,
    icon: 'paper-plane-outline',
    color: '#FF6B00',
    gradient: ['#FFB347', '#FF5E00'],
  },
  {
    id: 'bubble',
    title: 'Bubble Shooter',
    description: `Aim, bounce, pop three of a colour. Win ${starRewardRange} coins by stars.`,
    icon: 'ellipse-outline',
    color: '#5352ED',
    gradient: ['#7B6CFF', '#3D2FC4'],
  },
  {
    id: 'bagh',
    title: 'Sher aur Bakri',
    description: 'The village hunt game. Play as sher or bakri.',
    icon: 'paw-outline',
    color: '#8C5A2B',
    gradient: ['#B07C45', '#6B4423'],
  },
  {
    id: 'tictac',
    title: 'Tic-Tac-Toe',
    description: 'Three in a row wins. Play the computer or a friend.',
    icon: 'grid-outline',
    color: '#0077B6',
    gradient: ['#33A1E0', '#005B8F'],
  },
];
