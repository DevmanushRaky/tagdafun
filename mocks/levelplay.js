// No-op stand-in for unity-levelplay-mediation so the app runs in Expo Go,
// which has no native ad module. Enabled via EXPO_GO=1 (see metro.config.js).
const noop = () => {};

class LevelPlayRewardedAd {
  setListener(listener) {
    this.listener = listener;
  }
  loadAd() {
    this.listener?.onAdLoadFailed?.({ errorMessage: 'Ads unavailable in Expo Go' });
  }
  showAd() {
    return Promise.resolve();
  }
  destroyAd() {}
}

const nativeAdBuilder = {
  withListener() {
    return nativeAdBuilder;
  },
  build() {
    return { loadAd: noop, destroyAd: noop };
  },
};

module.exports = {
  LevelPlay: {
    init: (_req, listener) => listener?.onInitSuccess?.(),
  },
  LevelPlayInitRequest: { builder: () => ({ build: () => ({}) }) },
  LevelPlayAdSize: { BANNER: 'BANNER' },
  LevelPlayTemplateType: { Small: 'Small' },
  LevelPlayBannerAdView: () => null,
  LevelPlayNativeAdView: () => null,
  LevelPlayNativeAd: { builder: () => nativeAdBuilder },
  LevelPlayRewardedAd,
};
