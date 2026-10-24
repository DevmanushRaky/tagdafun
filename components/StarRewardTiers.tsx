import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { STAR_REWARDS } from '../constants/gameConfig';

/** "3★ 150 · 2★ 100 · 1★ 80" on a level's result card, with the tier just earned highlighted. */
const StarRewardTiers: React.FC<{ stars: number }> = ({ stars }) => (
  <View style={styles.tiers}>
    {([3, 2, 1] as const).map(n => (
      <View key={n} style={[styles.tier, n === stars && styles.tierOn]}>
        <Text style={[styles.tierText, n === stars && styles.tierTextOn]}>{n}★ {STAR_REWARDS[n]}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  tiers: { flexDirection: 'row', gap: 6 },
  tier: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.surfaceDark },
  tierOn: { backgroundColor: 'rgba(255,107,0,0.15)' },
  tierText: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
  tierTextOn: { color: COLORS.primary, fontWeight: '900' },
});

export default StarRewardTiers;
