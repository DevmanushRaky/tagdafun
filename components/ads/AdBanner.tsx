import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { LevelPlayBannerAdView, LevelPlayAdSize } from 'unity-levelplay-mediation';
import type { LevelPlayBannerAdViewMethods } from 'unity-levelplay-mediation';
import { ADS } from '../../services/ads';

const AdBanner: React.FC = () => {
  const bannerRef = useRef<LevelPlayBannerAdViewMethods>(null);

  useEffect(() => {
    bannerRef.current?.loadAd();
  }, []);

  if (!ADS.bannerAdUnitId) return null;

  return (
    <LevelPlayBannerAdView
      ref={bannerRef}
      style={styles.banner}
      adUnitId={ADS.bannerAdUnitId}
      adSize={LevelPlayAdSize.BANNER}
      placementName={null}
    />
  );
};

const styles = StyleSheet.create({
  banner: { width: '100%', height: 50, alignSelf: 'center' },
});

export default AdBanner;
