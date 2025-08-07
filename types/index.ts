import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootTabParamList = {
  Home: undefined;
  Privacy: undefined;
};

export type HomeScreenProps = BottomTabScreenProps<RootTabParamList, 'Home'>;
export type PrivacyScreenProps = BottomTabScreenProps<RootTabParamList, 'Privacy'>;

export interface AppState {
  isReady: boolean;
  showLogo: boolean;
}

export interface HomeScreenState {
  generatedNumber: number | null;
  isGenerating: boolean;
} 