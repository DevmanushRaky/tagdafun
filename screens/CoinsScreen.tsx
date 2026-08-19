import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { GAMES } from '../types';
import { getHistory, GameLog, formatTime, formatDate } from '../utils/gameHistory';

interface DayGroup { label: string; entries: GameLog[]; }

function groupByDay(logs: GameLog[]): DayGroup[] {
  const map = new Map<string, GameLog[]>();
  for (const log of logs) {
    const key = formatDate(log.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries()).map(([label, entries]) => ({ label, entries }));
}

const CoinsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats } = useGameStats();
  const [history, setHistory] = useState<GameLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => { const h = await getHistory(); setHistory(h); };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const spinActualEarned = history
    .filter(h => h.gameType === 'spin')
    .reduce((sum, h) => sum + (h.earnedCoins ?? 0), 0);

  const gameBreakdown = GAMES.map(g => {
    const plays = stats.gamesPlayed[g.id as keyof typeof stats.gamesPlayed] ?? 0;
    const earned = g.id === 'spin' ? spinActualEarned : plays * g.coinsPerPlay;
    return { ...g, plays, earned };
  });

  const totalEarned = gameBreakdown.reduce((sum, g) => sum + g.earned, 0);
  const dayGroups = groupByDay(history);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Balance Hero */}
      <LinearGradient colors={['#F9A825', '#FF6B00']} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Ionicons name="wallet" size={44} color="white" />
        <Text style={styles.heroBalance}>{stats.totalCoins}</Text>
        <Text style={styles.heroLabel}>Your Coin Balance</Text>
      </LinearGradient>

      {/* Quick stats */}
      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Ionicons name="game-controller" size={20} color={COLORS.primary} />
          <Text style={styles.infoNum}>{stats.totalGamesPlayed}</Text>
          <Text style={styles.infoLabel}>Games Played</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="cash" size={20} color="#F9A825" />
          <Text style={styles.infoNum}>{totalEarned}</Text>
          <Text style={styles.infoLabel}>Total Earned</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="trending-up" size={20} color="#2ED573" />
          <Text style={styles.infoNum}>
            {stats.totalGamesPlayed > 0 ? Math.round(totalEarned / stats.totalGamesPlayed) : 0}
          </Text>
          <Text style={styles.infoLabel}>Per Game</Text>
        </View>
      </View>

      {/* Coming Soon Banner */}
      <View style={styles.comingSoonBanner}>
        <Ionicons name="gift-outline" size={20} color="#A55EEA" />
        <View style={{ flex: 1 }}>
          <Text style={styles.comingSoonTitle}>Coin Redemption</Text>
          <Text style={styles.comingSoonSub}>Coming soon — stay tuned!</Text>
        </View>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonBadgeText}>Soon</Text>
        </View>
      </View>

      {/* Game breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="bar-chart" size={18} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Coins by Game</Text>
        </View>
        {gameBreakdown.map(g => (
          <View key={g.id} style={styles.breakdownRow}>
            <View style={[styles.breakdownIconBox, { backgroundColor: g.color + '20' }]}>
              <Ionicons name={g.icon as any} size={24} color={g.color} />
            </View>
            <View style={styles.breakdownInfo}>
              <Text style={styles.breakdownName}>{g.title}</Text>
              <Text style={styles.breakdownPlays}>
                {g.id === 'spin'
                  ? `${g.plays} spins · wheel varies`
                  : `${g.plays} plays × ${g.coinsPerPlay} coins each`}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: totalEarned > 0 ? `${Math.round((g.earned / totalEarned) * 100)}%` : '0%',
                  backgroundColor: g.color,
                }]} />
              </View>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownEarned}>{g.earned}</Text>
              <Ionicons name="wallet" size={13} color="#F9A825" />
            </View>
          </View>
        ))}
      </View>

      {/* Game History */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="receipt" size={18} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Game History</Text>
          {history.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{history.length}</Text>
            </View>
          )}
        </View>
        {history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="game-controller-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No games yet</Text>
            <Text style={styles.emptyText}>Your game history will appear here</Text>
          </View>
        ) : (
          dayGroups.map(group => (
            <View key={group.label}>
              <View style={styles.dayRow}>
                <View style={styles.dayLine} />
                <Text style={styles.dayLabel}>{group.label}</Text>
                <View style={styles.dayLine} />
              </View>
              {group.entries.map(log => <LogRow key={log.id} log={log} />)}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

// ── Log Row ──────────────────────────────────────────────────────────────────
const LogRow: React.FC<{ log: GameLog }> = ({ log }) => {
  const isCoin = log.gameType === 'coin';
  const coinWon = log.coinWon;
  const headsOrTails = log.outcome
    ? log.outcome.charAt(0).toUpperCase() + log.outcome.slice(1)
    : '';
  const wheelVal = log.wheelValue ?? 0;

  const displayRight = isCoin
    ? { label: '+5', color: '#2ED573', sub: 'earned' }
    : wheelVal > 0
      ? { label: `+${wheelVal}`, color: '#2ED573', sub: `−${log.costCoins} cost` }
      : { label: '0', color: '#F9A825', sub: `−${log.costCoins} cost` };

  return (
    <View style={styles.logRow}>
      <View style={[styles.logIcon, {
        backgroundColor: isCoin ? 'rgba(249,168,37,0.15)' : 'rgba(233,30,140,0.15)',
      }]}>
        <Ionicons
          name={isCoin ? 'cash-outline' : 'refresh-circle-outline'}
          size={22}
          color={isCoin ? '#F9A825' : '#E91E8C'}
        />
      </View>
      <View style={styles.logInfo}>
        <Text style={styles.logTitle}>{isCoin ? 'Coin Toss' : 'Spin Roulette'}</Text>
        <View style={styles.logDetailRow}>
          {isCoin ? (
            <View style={[styles.outcomePill, {
              backgroundColor: coinWon ? 'rgba(46,213,115,0.15)' : 'rgba(231,76,60,0.15)',
            }]}>
              <Ionicons
                name={coinWon ? 'checkmark-circle' : 'close-circle'}
                size={12}
                color={coinWon ? '#2ED573' : '#e74c3c'}
              />
              <Text style={[styles.outcomePillText, { color: coinWon ? '#2ED573' : '#e74c3c' }]}>
                {headsOrTails} · {coinWon ? 'Won' : 'Lost'}
              </Text>
            </View>
          ) : (
            <View style={styles.outcomePill}>
              <Text style={styles.outcomePillText}>Wheel: {wheelVal}</Text>
            </View>
          )}
          <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.logRight}>
        <Text style={[styles.logNet, { color: displayRight.color }]}>{displayRight.label}</Text>
        <Text style={styles.logNetLabel}>{displayRight.sub}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, alignItems: 'center', gap: 6 },
  heroBalance: { fontSize: 64, fontWeight: 'bold', color: 'white' },
  heroLabel: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.85)' },

  infoRow: { flexDirection: 'row', margin: SPACING.md, gap: SPACING.sm },
  infoCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 4, ...SHADOWS.card },
  infoNum: { ...TYPOGRAPHY.h3, color: COLORS.text },
  infoLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, textAlign: 'center' },

  section: { marginHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, flex: 1 },
  countBadge: { backgroundColor: COLORS.primaryGlow, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { ...TYPOGRAPHY.small, color: COLORS.primary, fontWeight: '700' },

  breakdownRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: 10, ...SHADOWS.card },
  breakdownIconBox: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  breakdownInfo: { flex: 1 },
  breakdownName: { ...TYPOGRAPHY.captionBold, color: COLORS.text, marginBottom: 2 },
  breakdownPlays: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: COLORS.surfaceDark, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2, minWidth: 4 },
  breakdownRight: { alignItems: 'center', gap: 2, marginLeft: SPACING.sm },
  breakdownEarned: { ...TYPOGRAPHY.h4, color: COLORS.text },

  emptyBox: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  emptyText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  dayLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dayLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '600' },

  logRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: 8, ...SHADOWS.card },
  logIcon: { width: 42, height: 42, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  logInfo: { flex: 1, gap: 4 },
  logTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  logDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outcomePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  outcomePillText: { ...TYPOGRAPHY.small, fontWeight: '600', color: COLORS.textSecondary },
  logTime: { ...TYPOGRAPHY.small, color: COLORS.textLight },
  logRight: { alignItems: 'flex-end', minWidth: 44 },
  logNet: { fontSize: 16, fontWeight: '800' },
  logNetLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },

  comingSoonBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SPACING.md, marginBottom: SPACING.md, backgroundColor: 'rgba(165,94,234,0.08)', borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: 'rgba(165,94,234,0.2)', padding: SPACING.md },
  comingSoonTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  comingSoonSub: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 2 },
  comingSoonBadge: { backgroundColor: 'rgba(165,94,234,0.15)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  comingSoonBadgeText: { fontSize: 11, fontWeight: '700', color: '#A55EEA' },
});

export default CoinsScreen;
