import { LevelPlayRewardedAd } from 'unity-levelplay-mediation';
import { ADS } from './ads';

export type RewardedAdResult = 'rewarded' | 'closed' | 'unavailable';

// Some networks fire onAdRewarded just after onAdClosed, so wait briefly before deciding.
const LATE_REWARD_MS = 400;

/**
 * Loads and shows one rewarded ad. Resolves after the ad is gone:
 * 'rewarded' if the viewer earned the reward, 'closed' if they left early,
 * 'unavailable' if no ad could be loaded or shown.
 */
export function showRewardedAd(): Promise<RewardedAdResult> {
  return new Promise(resolve => {
    if (!ADS.rewardedAdUnitId) {
      resolve('unavailable');
      return;
    }

    let rewarded = false;
    let settled = false;
    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const ad = new LevelPlayRewardedAd(ADS.rewardedAdUnitId);
    ad.setListener({
      onAdLoaded: () => {
        ad.showAd().catch(() => finish('unavailable'));
      },
      onAdLoadFailed: () => finish('unavailable'),
      onAdDisplayed: () => {},
      onAdDisplayFailed: () => finish('unavailable'),
      onAdClosed: () => {
        setTimeout(() => finish(rewarded ? 'rewarded' : 'closed'), LATE_REWARD_MS);
      },
      onAdRewarded: () => {
        rewarded = true;
      },
    });
    ad.loadAd();
  });
}
