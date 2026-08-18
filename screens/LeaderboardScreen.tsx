import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';

const WEEKLY_KEY = '@tagdafun_weekly_v1';

interface WeeklyData {
  weekStart: string; // Sunday date string
  coins: number;
}

function getSundayDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day;
  const sunday = new Date(now.setDate(diff));
  return sunday.toDateString();
}

function daysUntilSunday(): number {
  const now = new Date();
  return now.getDay() === 0 ? 7 : 7 - now.getDay();
}

const LeaderboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats, levelInfo } = useGameStats();
  const [weeklyCoins, setWeeklyCoins] = useState(0);

  useEffect(() => {
    const loadWeekly = async () => {
      const thisSunday = getSundayDate();
      const raw = await AsyncStorage.getItem(WEEKLY_KEY);
      if (raw) {
        const data: WeeklyData = JSON.parse(raw);
        if (data.weekStart === thisSunday) {
          setWeeklyCoins(data.coins);
          return;
        }
      }
      // New week — reset
      const fresh: WeeklyData = { weekStart: thisSunday, coins: 0 };
      await AsyncStorage.setItem(WEEKLY_KEY, JSON.stringify(fresh));
      setWeeklyCoins(0);
    };
    loadWeekly();
  }, []);

  useEffect(() => {
    // Update weekly coins whenever total coins changes
    const updateWeekly = async () => {
      const thisSunday = getSundayDate();
      const raw = await AsyncStorage.getItem(WEEKLY_KEY);
      if (raw) {
        const data: WeeklyData = JSON.parse(raw);
        if (data.weekStart === thisSunday) {
          const updated = { ...data, coins: stats.totalCoins };
          await AsyncStorage.setItem(WEEKLY_KEY, JSON.stringify(updated));
          setWeeklyCoins(stats.totalCoins);
        }
      }
    };
    updateWeekly();
  }, [stats.totalCoins]);

  const resetDay = daysUntilSunday();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#A55EEA', '#7B2FBE']} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <Ionicons name="trophy" size={40} color="white" />
        <Text style={styles.heroTitle}>Leaderboard</Text>
        <View style={styles.resetBadge}>
          <Ionicons name="refresh" size={13} color="rgba(255,255,255,0.9)" />
          <Text style={styles.resetText}>Resets in {resetDay} day{resetDay !== 1 ? 's' : ''} (Sunday)</Text>
        </View>
      </LinearGradient>

      {/* Your weekly score */}
      <View style={styles.yourCard}>
        <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.yourGrad}>
          <View style={styles.yourLeft}>
            <View style={styles.rankCircle}>
              <Text style={styles.rankCircleText}>#1</Text>
            </View>
            <View style={styles.yourAvatar}>
              <Ionicons name="person" size={24} color="white" />
            </View>
            <View>
              <Text style={styles.yourName}>You</Text>
              <Text style={styles.yourLevel}>Level {levelInfo.level} · {levelInfo.title}</Text>
            </View>
          </View>
          <View style={styles.yourRight}>
            <Text style={styles.yourCoins}>{weeklyCoins}</Text>
            <View style={styles.yourCoinsRow}>
              <Ionicons name="wallet" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.yourCoinsLabel}>this week</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Total coins */}
      <View style={styles.totalCard}>
        <View style={styles.totalLeft}>
          <Ionicons name="wallet" size={22} color="#F9A825" />
          <Text style={styles.totalLabel}>Your Total Coins (All Time)</Text>
        </View>
        <Text style={styles.totalNum}>{stats.totalCoins}</Text>
      </View>

      {/* Top 50 placeholder */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="podium" size={18} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Top 50 This Week</Text>
        </View>

        {/* User row */}
        <View style={styles.rankRow}>
          <View style={[styles.rankNumBox, { backgroundColor: '#FFD70020' }]}>
            <Text style={[styles.rankNum, { color: '#FFD700' }]}>1</Text>
          </View>
          <View style={styles.rankAvatar}>
            <Ionicons name="person" size={18} color="white" />
          </View>
          <View style={styles.rankInfo}>
            <Text style={styles.rankName}>You</Text>
            <Text style={styles.rankSub}>Level {levelInfo.level}</Text>
          </View>
          <View style={styles.rankCoinRow}>
            <Text style={styles.rankCoins}>{weeklyCoins}</Text>
            <Ionicons name="wallet" size={14} color="#F9A825" />
          </View>
        </View>

        {/* Coming soon rows */}
        {[2, 3, 4, 5].map(n => (
          <View key={n} style={[styles.rankRow, styles.rankRowLocked]}>
            <View style={styles.rankNumBox}>
              <Text style={styles.rankNum}>{n}</Text>
            </View>
            <View style={[styles.rankAvatar, { backgroundColor: COLORS.surfaceDark }]}>
              <Ionicons name="person-outline" size={18} color={COLORS.textLight} />
            </View>
            <View style={styles.rankInfo}>
              <Text style={[styles.rankName, { color: COLORS.textLight }]}>Player {n}</Text>
              <Text style={styles.rankSub}>—</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={COLORS.textLight} />
          </View>
        ))}

        <View style={styles.comingSoonBox}>
          <Ionicons name="globe-outline" size={32} color={COLORS.textLight} />
          <Text style={styles.comingSoonText}>Online players coming soon!</Text>
          <Text style={styles.comingSoonSub}>Keep playing to hold your #1 spot</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { padding: SPACING.lg, paddingBottom: SPACING.xl, alignItems: 'center', gap: 8 },
  heroTitle: { ...TYPOGRAPHY.h2, color: 'white' },
  resetBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  resetText: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.9)' },

  yourCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  yourGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  yourLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rankCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  rankCircleText: { ...TYPOGRAPHY.smallBold, color: 'white' },
  yourAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  yourName: { ...TYPOGRAPHY.bodyBold, color: 'white' },
  yourLevel: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.85)' },
  yourRight: { alignItems: 'flex-end' },
  yourCoins: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  yourCoinsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yourCoinsLabel: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.85)' },

  totalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, ...SHADOWS.card },
  totalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  totalNum: { ...TYPOGRAPHY.h2, color: '#F9A825' },

  section: { marginHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },

  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: 8, ...SHADOWS.card },
  rankRowLocked: { opacity: 0.5 },
  rankNumBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surfaceDark, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  rankNum: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
  rankAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rankInfo: { flex: 1 },
  rankName: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  rankSub: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  rankCoinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankCoins: { ...TYPOGRAPHY.bodyBold, color: COLORS.text },

  comingSoonBox: { alignItems: 'center', padding: SPACING.lg, gap: 6 },
  comingSoonText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
  comingSoonSub: { ...TYPOGRAPHY.small, color: COLORS.textLight },
});

export default LeaderboardScreen;
