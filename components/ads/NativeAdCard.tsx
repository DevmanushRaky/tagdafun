import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  LevelPlayNativeAd,
  LevelPlayNativeAdView,
  LevelPlayTemplateType,
} from 'unity-levelplay-mediation';
import type { LevelPlayNativeAdListener } from 'unity-levelplay-mediation';
import { ADS } from '../../services/ads';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/theme';

const NativeAdCard: React.FC = () => {
  const [nativeAd, setNativeAd] = useState<LevelPlayNativeAd | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const listener: LevelPlayNativeAdListener = {
      onAdLoaded: () => setLoaded(true),
      onAdLoadFailed: () => setLoaded(false),
      onAdClicked: () => {},
      onAdImpression: () => {},
    };
    const ad = LevelPlayNativeAd.builder().withListener(listener).build();
    setNativeAd(ad);

    return () => {
      ad.destroyAd();
    };
  }, []);

  useEffect(() => {
    if (!nativeAd) return;
    const timer = setTimeout(() => nativeAd.loadAd(), 300);
    return () => clearTimeout(timer);
  }, [nativeAd]);

  if (!ADS.nativeAdUnitId || !nativeAd) return null;

  return (
    <View style={loaded ? styles.wrapperVisible : styles.wrapperHidden}>
      <LevelPlayNativeAdView
        style={styles.card}
        nativeAd={nativeAd}
        templateType={LevelPlayTemplateType.Small}
        templateStyle={{
          mainBackgroundColor: COLORS.surface,
          titleStyle: { textColor: COLORS.text, textSize: 13 },
          bodyStyle: { textColor: COLORS.textSecondary, textSize: 11 },
          advertiserStyle: { textColor: COLORS.textLight, textSize: 10 },
          callToActionStyle: {
            backgroundColor: COLORS.primary,
            textColor: '#FFFFFF',
            cornerRadius: BORDER_RADIUS.sm,
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapperVisible: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  // Kept mounted off-screen (not in layout flow) so the ad can still load in the background
  wrapperHidden: {
    position: 'absolute',
    width: 300,
    height: 100,
    top: -9999,
    left: -9999,
    opacity: 0,
  },
  card: { width: '100%', height: 100 },
});

export default NativeAdCard;
