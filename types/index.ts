import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootTabParamList = {
  Number: undefined;
  Names: undefined;
  Coin: undefined;
  TruthDare: undefined;
  Privacy: undefined;
};

export type NumberScreenProps = BottomTabScreenProps<RootTabParamList, 'Number'>;
export type NamesScreenProps = BottomTabScreenProps<RootTabParamList, 'Names'>;
export type CoinScreenProps = BottomTabScreenProps<RootTabParamList, 'Coin'>;
export type TruthDareScreenProps = BottomTabScreenProps<RootTabParamList, 'TruthDare'>;
export type PrivacyScreenProps = BottomTabScreenProps<RootTabParamList, 'Privacy'>;

export interface AppState {
  isReady: boolean;
  showLogo: boolean;
}

export interface HomeScreenState {
  generatedNumber: number | null;
  isGenerating: boolean;
}

export type Language = 'en' | 'hi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export interface NameInput {
  id: string;
  value: string;
  isValid: boolean;
} 