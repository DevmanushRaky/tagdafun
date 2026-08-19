import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';

const WEEKLY_KEY = '@tagdafun_weekly_v1';
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // UTC+5:30 in ms

interface WeeklyData {
  weekStart: string;
  coins: number;
  gamesPlayed: number;
}

// Sunday 12:00 AM IST ke liye current week start key
function getCurrentWeekStartIST(): string {
  const nowIST = Date.now() + IST_OFFSET;
  const d = new Date(nowIST);
  const daysBack = d.getUTCDay(); // 0=Sun → go back 0 days
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// Next Sunday 12:00 AM IST ka exact timestamp (UTC)
function getNextSundayMidnightIST(): number {
  const nowIST = Date.now() + IST_OFFSET;
  const d = new Date(nowIST);
  const dayOfWeek = d.getUTCDay();
  const daysToAdd = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - IST_OFFSET; // back to UTC
}

function calcCountdown(targetUTC: number) {
  const diff = Math.max(0, targetUTC - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

const LeaderboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats, levelInfo } = useGameStats();
  const [weeklyCoins, setWeeklyCoins] = useState(0);
  const [weeklyGames, setWeeklyGames] = useState(0);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Load + reset weekly data
  useEffect(() => {
    const load = async () => {
      const thisWeek = getCurrentWeekStartIST();
      const raw = await AsyncStorage.getItem(WEEKLY_KEY);
      if (raw) {
        const data: WeeklyData = JSON.parse(raw);
        if (data.weekStart === thisWeek) {
          setWeeklyCoins(data.coins);
          setWeeklyGames(data.gamesPlayed ?? 0);
          return;
        }
      }
      const fresh: WeeklyData = { weekStart: thisWeek, coins: 0, gamesPlayed: 0 };
      await AsyncStorage.setItem(WEEKLY_KEY, JSON.stringify(fresh));
      setWeeklyCoins(0);
      setWeeklyGames(0);
    };
    load();
  }, []);

  // Sync weekly data when stats change
  useEffect(() => {
    const update = async () => {
      const thisWeek = getCurrentWeekStartIST();
      const raw = await AsyncStorage.getItem(WEEKLY_KEY);
      if (!raw) return;
      const data: WeeklyData = JSON.parse(raw);
      if (data.weekStart !== thisWeek) return;
      const updated: WeeklyData = {
        ...data,
        coins: stats.totalCoins,
        gamesPlayed: stats.totalGamesPlayed,
      };
      await AsyncStorage.setItem(WEEKLY_KEY, JSON.stringify(updated));
      setWeeklyCoins(stats.totalCoins);
      setWeeklyGames(stats.totalGamesPlayed);
    };
    update();
  }, [stats.totalCoins, stats.totalGamesPlayed]);

  // Live countdown — ticks every second
  useEffect(() => {
    const target = getNextSundayMidnightIST();
    setCountdown(calcCountdown(target));
    const interval = setInterval(() => setCountdown(calcCountdown(target)), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#A55EEA', '#7B2FBE']}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <Ionicons name="trophy" size={40} color="white" />
        <Text style={styles.heroTitle}>Leaderboard</Text>

        {/* Live countdown */}
        <View style={styles.countdownBox}>
          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.countdownLabel}>Resets in</Text>
          <View style={styles.countdownTiles}>
            <CountTile value={pad(countdown.days)} unit="d" />
            <Text style={styles.countdownSep}>:</Text>
            <CountTile value={pad(countdown.hours)} unit="h" />
            <Text style={styles.countdownSep}>:</Text>
            <CountTile value={pad(countdown.minutes)} unit="m" />
            <Text style={styles.countdownSep}>:</Text>
            <CountTile value={pad(countdown.seconds)} unit="s" />
          </View>
          <Text style={styles.countdownIST}>Sun 12:00 AM IST</Text>
        </View>
      </LinearGradient>

      {/* Your rank card */}
      <View style={styles.rankCard}>
        <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.rankGrad}>
          <View style={styles.rankLeft}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeText}>#1</Text>
            </View>
            <View style={styles.avatar}>
              <Ionicons name="person" size={26} color="white" />
            </View>
            <View>
              <Text style={styles.rankName}>You</Text>
              <Text style={styles.rankLevel}>Level {levelInfo.level} · {levelInfo.title}</Text>
            </View>
          </View>
          <View style={styles.rankRight}>
            <Text style={styles.rankCoins}>{weeklyCoins}</Text>
            <View style={styles.rankCoinsRow}>
              <Ionicons name="wallet" size={13} color="rgba(255,255,255,0.85)" />
              <Text style={styles.rankCoinsLabel}>this week</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Weekly stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={22} color="#F9A825" />
          <Text style={styles.statNum}>{weeklyCoins}</Text>
          <Text style={styles.statLabel}>Coins This Week</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="game-controller" size={22} color={COLORS.primary} />
          <Text style={styles.statNum}>{weeklyGames}</Text>
          <Text style={styles.statLabel}>Games This Week</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const CountTile: React.FC<{ value: string; unit: string }> = ({ value, unit }) => (
  <View style={styles.tile}>
    <Text style={styles.tileValue}>{value}</Text>
    <Text style={styles.tileUnit}>{unit}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { padding: SPACING.lg, paddingBottom: SPACING.xl, alignItems: 'center', gap: 12 },
  heroTitle: { ...TYPOGRAPHY.h2, color: 'white' },

  countdownBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  countdownLabel: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.75)' },
  countdownTiles: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  countdownSep: { fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  countdownIST: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.55)' },

  tile: { alignItems: 'center', minWidth: 28 },
  tileValue: { fontSize: 14, fontWeight: '800', color: 'white' },
  tileUnit: { fontSize: 9, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },

  rankCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  rankGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  rankLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rankBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  rankBadgeText: { ...TYPOGRAPHY.smallBold, color: 'white' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  rankName: { ...TYPOGRAPHY.bodyBold, color: 'white' },
  rankLevel: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.85)' },
  rankRight: { alignItems: 'flex-end' },
  rankCoins: { fontSize: 30, fontWeight: 'bold', color: 'white' },
  rankCoinsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankCoinsLabel: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.85)' },

  statsGrid: { flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 6, ...SHADOWS.card },
  statNum: { ...TYPOGRAPHY.h2, color: COLORS.text },
  statLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, textAlign: 'center' },
});

export default LeaderboardScreen;
