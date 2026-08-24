import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LevelPlayRewardedAd } from 'unity-levelplay-mediation';
import type { LevelPlayRewardedAdListener } from 'unity-levelplay-mediation';
import { ADS } from '../../services/ads';
import { useGameStats } from '../../contexts/GameStatsContext';
import { logGame } from '../../utils/gameHistory';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/theme';

interface PostGameRewardModalProps {
  visible: boolean;
  onClose: () => void;
}

const PostGameRewardModal: React.FC<PostGameRewardModalProps> = ({ visible, onClose }) => {
  const { addBonusCoins } = useGameStats();
  const [loading, setLoading] = useState(false);

  if (!ADS.rewardedAdUnitId) return null;

  const handleWatchAd = () => {
    setLoading(true);
    const rewarded = new LevelPlayRewardedAd(ADS.rewardedAdUnitId);
    const listener: LevelPlayRewardedAdListener = {
      onAdLoaded: () => {
        rewarded.showAd().catch(() => {
          setLoading(false);
          onClose();
        });
      },
      onAdLoadFailed: () => {
        setLoading(false);
        Alert.alert('Ad not available', 'Please try again in a bit.');
        onClose();
      },
      onAdDisplayed: () => {},
      onAdDisplayFailed: () => {
        setLoading(false);
        Alert.alert('Ad not available', 'Please try again in a bit.');
        onClose();
      },
      onAdClosed: () => {
        setLoading(false);
        onClose();
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
        });
      },
    };
    rewarded.setListener(listener);
    rewarded.loadAd();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="gift" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Want more coins?</Text>
          <Text style={styles.subtitle}>
            Watch a short video ad to get {ADS.rewardedCoinsAmount} bonus coins on top of what you just earned.
          </Text>

          <TouchableOpacity style={styles.watchBtn} onPress={handleWatchAd} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name="play-circle" size={20} color="white" />
                <Text style={styles.watchBtnText}>Watch Ad for +{ADS.rewardedCoinsAmount} Coins</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  card: { width: '100%', maxWidth: 360, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, alignItems: 'center', ...SHADOWS.card },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primaryGlow, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: 6, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  watchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: SPACING.md,
    width: '100%', marginBottom: SPACING.sm,
  },
  watchBtnText: { ...TYPOGRAPHY.captionBold, color: 'white' },
  skipBtn: { paddingVertical: SPACING.sm },
  skipBtnText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontWeight: '600' },
});

export default PostGameRewardModal;
