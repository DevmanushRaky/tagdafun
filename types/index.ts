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
];
