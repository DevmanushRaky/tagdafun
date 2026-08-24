import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LevelPlayRewardedAd } from 'unity-levelplay-mediation';
import type { LevelPlayRewardedAdListener } from 'unity-levelplay-mediation';
import { ADS } from '../../services/ads';
import { useGameStats } from '../../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { logGame } from '../../utils/gameHistory';

interface RewardedAdButtonProps {
  onRewarded?: () => void;
}

const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({ onRewarded }) => {
  const { addBonusCoins } = useGameStats();
  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    if (!ADS.rewardedAdUnitId || loading) return;
    setLoading(true);

    const rewarded = new LevelPlayRewardedAd(ADS.rewardedAdUnitId);
    const listener: LevelPlayRewardedAdListener = {
      onAdLoaded: () => {
        rewarded.showAd().catch(() => setLoading(false));
      },
      onAdLoadFailed: () => {
        setLoading(false);
        Alert.alert('Ad not available', 'Please try again in a bit.');
      },
      onAdDisplayed: () => {},
      onAdDisplayFailed: () => {
        setLoading(false);
        Alert.alert('Ad not available', 'Please try again in a bit.');
      },
      onAdClosed: () => {
        setLoading(false);
      },
      onAdRewarded: (_reward, adInfo) => {
        addBonusCoins(ADS.rewardedCoinsAmount);
        logGame({
          timestamp: Date.now(),
          gameType: 'ad',
          adNetwork: adInfo.adNetwork,
          costCoins: 0,
          earnedCoins: ADS.rewardedCoinsAmount,
          netCoins: ADS.rewardedCoinsAmount,
        }).then(() => onRewarded?.());
        Alert.alert('Reward earned!', `+${ADS.rewardedCoinsAmount} coins added.`);
      },
    };
    rewarded.setListener(listener);
    rewarded.loadAd();
  };

  if (!ADS.rewardedAdUnitId) return null;

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} disabled={loading} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color="white" size="small" />
      ) : (
        <>
          <Ionicons name="play-circle" size={20} color="white" />
          <Text style={styles.text}>Watch Ad for {ADS.rewardedCoinsAmount} Coins</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  text: { ...TYPOGRAPHY.captionBold, color: 'white' },
});

export default RewardedAdButton;
