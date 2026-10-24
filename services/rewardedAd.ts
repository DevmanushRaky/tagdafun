import { LevelPlayRewardedAd } from 'unity-levelplay-mediation';
import { ADS } from './ads';

export type RewardedAdResult = 'rewarded' | 'closed' | 'unavailable';

// Some networks fire onAdRewarded just after onAdClosed, so wait briefly before deciding.
const LATE_REWARD_MS = 400;
// If an ad neither loads nor fails in this time, give up so the game never stays locked.
const LOAD_TIMEOUT_MS = 15000;

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
    let displayed = false;
    const ad = new LevelPlayRewardedAd(ADS.rewardedAdUnitId);
    const timeout = setTimeout(() => { if (!displayed) finish('unavailable'); }, LOAD_TIMEOUT_MS);
    const finish = (result: RewardedAdResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      // Release the native ad object; a fresh one is made for every view.
      Promise.resolve().then(() => ad.remove()).catch(() => {});
      resolve(result);
    };

    ad.setListener({
      onAdLoaded: () => {
        if (settled) return;   // loaded after we already gave up
        ad.showAd().catch(() => finish('unavailable'));
      },
      onAdLoadFailed: () => finish('unavailable'),
      onAdDisplayed: () => { displayed = true; },
      onAdDisplayFailed: () => finish('unavailable'),
      onAdClosed: () => {
        setTimeout(() => finish(rewarded ? 'rewarded' : 'closed'), LATE_REWARD_MS);
      },
      onAdRewarded: () => {
        rewarded = true;
      },
    });
    Promise.resolve().then(() => ad.loadAd()).catch(() => finish('unavailable'));
  });
}
