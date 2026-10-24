import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStats, CoinSource } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { GAME_CONFIG } from '../constants/gameConfig';
import { GAMES } from '../types';
import { getHistory, GameLog, GameLogType, formatTime, formatDate } from '../utils/gameHistory';
import { GameIcon } from '../components/GameIcons';

const PAGE_SIZE = 20;

type Filter = 'all' | GameLogType;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'coin', label: 'Coin Toss' },
  { id: 'memory', label: 'Memory' },
  { id: 'water', label: 'Water' },
  { id: 'ad', label: 'Ads' },
];

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

interface SourceRow {
  id: CoinSource;
  title: string;
  sub: string;
  color: string;
  earned: number;
  icon: React.ReactNode;
}

const CoinsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats } = useGameStats();
  const [history, setHistory] = useState<GameLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE_SIZE);

  const load = async () => { const h = await getHistory(); setHistory(h); };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // Lifetime totals live in stats, so they never shrink when old history entries drop off.
  const earned = stats.coinsEarned;
  const played = stats.gamesPlayed;
  const subFor: Record<string, string> = {
    coin: `${played.coin} flips · +${GAME_CONFIG.coin.coinsPerPlay} each`,
    memory: `${played.memory} levels · +${GAME_CONFIG.memory.coinsPerWin} per level`,
    water: `${played.water} levels · up to ${GAME_CONFIG.water.maxWinCoins} each`,
  };
  const rows: SourceRow[] = [
    ...GAMES.map(g => ({
      id: g.id as CoinSource,
      title: g.title,
      sub: subFor[g.id] ?? '',
      color: g.color,
      earned: earned[g.id as CoinSource] ?? 0,
      icon: <GameIcon id={g.id} size={30} />,
    })),
    {
      id: 'daily', title: 'Daily Challenge', sub: `+${GAME_CONFIG.dailyChallenge.coinsReward} per completed day`,
      color: COLORS.primary, earned: earned.daily, icon: <Ionicons name="flash" size={22} color={COLORS.primary} />,
    },
    {
      id: 'ad', title: 'Rewarded Ads', sub: 'Coins from watching ads',
      color: '#A55EEA', earned: earned.ad, icon: <Ionicons name="play-circle" size={24} color="#A55EEA" />,
    },
  ];
  const totalEarned = rows.reduce((sum, r) => sum + r.earned, 0);

  const filtered = filter === 'all' ? history : history.filter(h => h.gameType === filter);
  const dayGroups = groupByDay(filtered.slice(0, shown));
  const pickFilter = (f: Filter) => { setFilter(f); setShown(PAGE_SIZE); };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Balance */}
      <LinearGradient colors={['#001A33', '#002A52', '#0B3F70']} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.glow} />
        <Text style={styles.heroLabel}>COIN BALANCE</Text>
        <View style={styles.balanceRow}>
          <Ionicons name="wallet" size={30} color="#FFC83D" />
          <Text style={styles.heroBalance}>{stats.totalCoins}</Text>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalEarned}</Text>
            <Text style={styles.heroStatLabel}>Total earned</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{stats.totalGamesPlayed}</Text>
            <Text style={styles.heroStatLabel}>Games played</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Where the coins came from */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where your coins came from</Text>
        <View style={styles.card}>
          {rows.map((r, i) => (
            <View key={r.id} style={[styles.sourceRow, i > 0 && styles.sourceRowBorder]}>
              <View style={[styles.sourceIcon, { backgroundColor: r.color + '1A' }]}>{r.icon}</View>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceTitle}>{r.title}</Text>
                <Text style={styles.sourceSub}>{r.sub}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: totalEarned > 0 ? `${Math.round((r.earned / totalEarned) * 100)}%` : '0%',
                    backgroundColor: r.color,
                  }]} />
                </View>
              </View>
              <Text style={styles.sourceEarned}>{r.earned}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* History */}
      <View style={styles.section}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>History</Text>
          <Text style={styles.historyNote}>Last {history.length} plays</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map(f => {
            const active = filter === f.id;
            return (
              <TouchableOpacity key={f.id} onPress={() => pickFilter(f.id)} style={[styles.filterChip, active && styles.filterChipOn]} activeOpacity={0.8}>
                <Text style={[styles.filterText, active && styles.filterTextOn]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="game-controller-outline" size={44} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>{history.length === 0 ? 'No games yet' : 'Nothing here yet'}</Text>
            <Text style={styles.emptyText}>Your plays will show up here</Text>
          </View>
        ) : (
          <>
            {dayGroups.map(group => (
              <View key={group.label}>
                <Text style={styles.dayLabel}>{group.label}</Text>
                <View style={styles.card}>
                  {group.entries.map((log, i) => <LogRow key={log.id} log={log} first={i === 0} />)}
                </View>
              </View>
            ))}
            {filtered.length > shown && (
              <TouchableOpacity style={styles.moreBtn} onPress={() => setShown(n => n + PAGE_SIZE)} activeOpacity={0.8}>
                <Text style={styles.moreText}>Show more</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

// ── Log Row ──────────────────────────────────────────────────────────────────
const Stars: React.FC<{ count: number }> = ({ count }) => (
  <View style={styles.logStars}>
    {[1, 2, 3].map(n => <Ionicons key={n} name="star" size={11} color={n <= count ? '#F5B820' : '#DADDE1'} />)}
  </View>
);

const LogRow: React.FC<{ log: GameLog; first: boolean }> = ({ log, first }) => {
  const t = log.gameType;

  const title = t === 'ad' ? 'Rewarded Ad'
    : t === 'coin' ? 'Coin Toss'
    : t === 'memory' ? 'Memory Cards'
    : 'Water Sorting';

  const icon = t === 'ad'
    ? <Ionicons name="play-circle" size={22} color="#A55EEA" />
    : <GameIcon id={t} size={26} />;

  let detail: React.ReactNode = null;
  if (t === 'coin') {
    const side = log.outcome ? log.outcome.charAt(0).toUpperCase() + log.outcome.slice(1) : '';
    detail = (
      <Text style={[styles.logDetail, { color: log.coinWon ? '#2ED573' : '#E74C3C' }]}>
        {side} · {log.coinWon ? 'Won' : 'Lost'}
      </Text>
    );
  } else if (t === 'memory') {
    detail = log.memoryLevel
      ? <View style={styles.detailRow}><Text style={styles.logDetail}>Level {log.memoryLevel}</Text>{log.stars ? <Stars count={log.stars} /> : null}</View>
      : <Text style={styles.logDetail}>All pairs matched</Text>;
  } else if (t === 'water') {
    detail = (
      <View style={styles.detailRow}>
        <Text style={styles.logDetail}>Level {log.waterLevel ?? '?'} · {log.moves ?? '?'} moves</Text>
        {log.stars ? <Stars count={log.stars} /> : null}
      </View>
    );
  } else {
    detail = <Text style={styles.logDetail}>Ad reward</Text>;
  }

  const net = log.earnedCoins;

  return (
    <View style={[styles.logRow, !first && styles.sourceRowBorder]}>
      <View style={styles.logIcon}>{icon}</View>
      <View style={styles.logInfo}>
        <Text style={styles.logTitle}>{title}</Text>
        {detail}
      </View>
      <View style={styles.logRight}>
        <Text style={[styles.logNet, { color: net > 0 ? '#2ED573' : net < 0 ? '#E74C3C' : COLORS.textSecondary }]}>
          {net > 0 ? `+${net}` : net}
        </Text>
        <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, alignItems: 'center', overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,200,61,0.10)', top: -60, right: -60 },
  heroLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  heroBalance: { fontSize: 44, fontWeight: '900', color: 'white' },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.lg, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: 'white' },
  heroStatLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)' },


  section: { marginHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.h4, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, ...SHADOWS.card },

  sourceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  sourceRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.surfaceDark },
  sourceIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  sourceInfo: { flex: 1 },
  sourceTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  sourceSub: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 1, marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: COLORS.surfaceDark, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  sourceEarned: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginLeft: SPACING.sm, minWidth: 40, textAlign: 'right' },

  historyHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  historyNote: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '600' },
  filters: { gap: 8, paddingBottom: SPACING.sm },
  filterChip: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  filterChipOn: { backgroundColor: '#002A52', borderColor: '#002A52' },
  filterText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  filterTextOn: { color: 'white' },

  emptyBox: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  emptyText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  dayLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '700', marginTop: SPACING.sm, marginBottom: 6, marginLeft: 4 },
  logRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  logIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surfaceDark, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  logInfo: { flex: 1, gap: 2 },
  logTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logDetail: { ...TYPOGRAPHY.small, fontWeight: '600', color: COLORS.textSecondary },
  logStars: { flexDirection: 'row' },
  logRight: { alignItems: 'flex-end', minWidth: 52 },
  logNet: { fontSize: 16, fontWeight: '800' },
  logTime: { ...TYPOGRAPHY.small, color: COLORS.textLight },

  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: SPACING.md, paddingVertical: 12, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, ...SHADOWS.card },
  moreText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});

export default CoinsScreen;
