import Constants from 'expo-constants';
import { LevelPlay, LevelPlayInitRequest } from 'unity-levelplay-mediation';
import type { LevelPlayInitListener } from 'unity-levelplay-mediation';

const extra = Constants.expoConfig?.extra ?? {};

export const ADS = {
  appKey: extra.levelPlayAppKey as string,
  bannerAdUnitId: extra.levelPlayBannerAdUnitId as string,
  rewardedAdUnitId: extra.levelPlayRewardedAdUnitId as string,
  rewardedCoinsAmount: 50,
};

let initPromise: Promise<void> | null = null;

export function initAds(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    const initRequest = LevelPlayInitRequest.builder(ADS.appKey).build();
    const initListener: LevelPlayInitListener = {
      onInitSuccess: () => resolve(),
      onInitFailed: (error) => {
        console.warn('[Ads] LevelPlay init failed:', error);
        resolve();
      },
    };
    LevelPlay.init(initRequest, initListener);
  });

  return initPromise;
}
