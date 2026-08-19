import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';

// Simple unlock instructions for each achievement
const HOW_TO_UNLOCK: Record<string, string> = {
  first_game:   'Just play any game once',
  first_coin:   'Flip the coin 1 time',
  games_10:     'Play any game 10 times total',
  games_50:     'Play any game 50 times total',
  games_100:    'Play any game 100 times total',
  coin_win_5:   'Win coin toss 5 times',
  coin_win_20:  'Win coin toss 20 times',
  streak_3:     'Open the app and play for 3 days in a row',
  streak_7:     'Open the app and play for 7 days in a row',
  level_5:      'Earn enough XP to reach Level 5',
  level_10:     'Earn enough XP to reach Level 10',
};

const DetailRow: React.FC<{ icon: string; color: string; label: string; value: string }> = ({ icon, color, label, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13, gap: 12 }}>
    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: color + '18', justifyContent: 'center', alignItems: 'center' }}>
      <Ionicons name={icon as any} size={17} color={color} />
    </View>
    <Text style={{ flex: 1, fontSize: 13, color: COLORS.textSecondary }}>{label}</Text>
    <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{value}</Text>
  </View>
);

const TIER_COLOR = { bronze: '#CD7F32', silver: '#A8A8A8', gold: '#FFD700' };
const TIER_ICON: Record<string, any> = {
  gold: 'trophy',
  silver: 'medal',
  bronze: 'ribbon',
};

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats, levelInfo, achievements } = useGameStats();

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const tierGroups = ['gold', 'silver', 'bronze'] as const;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Hero ── */}
      <LinearGradient colors={['#1E90FF', '#0066CC']} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={44} color="white" />
        </View>
        <Text style={styles.playerName}>Tagda Player</Text>

        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: levelInfo.color }]}>
          <Text style={styles.levelBadgeText}>Level {levelInfo.level}  ·  {levelInfo.title}</Text>
        </View>

        {/* XP bar */}
        <View style={styles.xpBar}>
          <View style={styles.xpBarRow}>
            <Text style={styles.xpText}>{stats.totalXP} XP</Text>
            <Text style={styles.xpText}>Next level: {levelInfo.xpForNext} XP</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.round(levelInfo.progress * 100)}%` }]} />
          </View>
        </View>
      </LinearGradient>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={22} color="#F9A825" />
          <Text style={styles.statNum}>{stats.totalCoins}</Text>
          <Text style={styles.statLabel}>Coins</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="game-controller" size={22} color={COLORS.primary} />
          <Text style={styles.statNum}>{stats.totalGamesPlayed}</Text>
          <Text style={styles.statLabel}>Games</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={22} color="#FF4757" />
          <Text style={styles.statNum}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={22} color={levelInfo.color} />
          <Text style={styles.statNum}>{stats.totalXP}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
      </View>

      {/* ── Detailed Stats ── */}
      <View style={styles.detailCard}>
        <DetailRow icon="checkmark-circle-outline" color="#2ED573" label="Coin Toss Wins" value={String(stats.coinWins ?? 0)} />
        <View style={styles.detailDivider} />
        <DetailRow icon="cash-outline" color="#F9A825" label="Coin Toss Plays" value={String(stats.gamesPlayed?.coin ?? 0)} />
        <View style={styles.detailDivider} />
        <DetailRow icon="refresh-circle-outline" color="#E91E8C" label="Spin Roulette Plays" value={String(stats.gamesPlayed?.spin ?? 0)} />
        <View style={styles.detailDivider} />
        <DetailRow icon="trophy-outline" color="#A55EEA" label="Current Level" value={`${levelInfo.level} · ${levelInfo.title}`} />
      </View>

      {/* ── Achievements ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="medal" size={20} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementCount}>
            <Text style={styles.achievementCountText}>{unlockedCount} / {achievements.length} done</Text>
          </View>
        </View>

        {tierGroups.map(tier => {
          const list = achievements.filter(a => a.tier === tier);
          return (
            <View key={tier} style={styles.tierGroup}>
              {/* Tier label */}
              <View style={styles.tierLabelRow}>
                <Ionicons name={TIER_ICON[tier]} size={15} color={TIER_COLOR[tier]} />
                <Text style={[styles.tierLabel, { color: TIER_COLOR[tier] }]}>
                  {tier.toUpperCase()}
                </Text>
              </View>

              {list.map(a => (
                <View key={a.id} style={[styles.achievementCard, a.unlocked && styles.achievementDone]}>
                  {/* Icon */}
                  <View style={[styles.achievementIconBox, {
                    backgroundColor: a.unlocked ? TIER_COLOR[tier] + '22' : COLORS.surfaceDark,
                  }]}>
                    <Text style={styles.achievementEmoji}>{a.icon}</Text>
                  </View>

                  {/* Info */}
                  <View style={styles.achievementBody}>
                    <Text style={[styles.achievementTitle, !a.unlocked && { color: COLORS.textSecondary }]}>
                      {a.title}
                    </Text>
                    {a.unlocked ? (
                      <View style={styles.unlockedRow}>
                        <Ionicons name="checkmark-circle" size={13} color="#2ED573" />
                        <Text style={styles.achievementDoneText}>Unlocked!</Text>
                      </View>
                    ) : (
                      <Text style={styles.achievementHow}>
                        How: {HOW_TO_UNLOCK[a.id] ?? a.description}
                      </Text>
                    )}
                    <View style={styles.xpRewardRow}>
                      <Ionicons name="star" size={11} color={TIER_COLOR[tier]} />
                      <Text style={[styles.achievementXP, { color: TIER_COLOR[tier] }]}>
                        {a.unlocked ? 'Earned' : 'Reward'}: +{a.xpReward} XP
                      </Text>
                    </View>
                  </View>

                  {/* Status */}
                  <Ionicons
                    name={a.unlocked ? 'checkmark-circle' : 'lock-closed-outline'}
                    size={24}
                    color={a.unlocked ? '#2ED573' : COLORS.textLight}
                  />
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: { padding: SPACING.lg, alignItems: 'center', paddingBottom: SPACING.xl, gap: SPACING.sm },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  playerName: { ...TYPOGRAPHY.h2, color: 'white' },
  levelBadge: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 16, paddingVertical: 6 },
  levelBadgeText: { ...TYPOGRAPHY.captionBold, color: 'white' },
  xpBar: { width: '100%' },
  xpBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpText: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.85)' },
  xpBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4 },
  xpBarFill: { height: 8, backgroundColor: 'white', borderRadius: 4 },

  // Stats
  statsRow: { flexDirection: 'row', margin: SPACING.md, gap: SPACING.sm },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center', gap: 3, ...SHADOWS.card },
  statNum: { ...TYPOGRAPHY.h3, color: COLORS.text },
  statLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },

  // Achievements
  section: { marginHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, flex: 1 },
  achievementCount: { backgroundColor: COLORS.primaryGlow, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  achievementCountText: { ...TYPOGRAPHY.smallBold, color: COLORS.primary },

  tierGroup: { marginBottom: SPACING.md },
  tierLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tierLabel: { ...TYPOGRAPHY.smallBold, letterSpacing: 1.5 },

  achievementCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: 8, ...SHADOWS.card,
    borderLeftWidth: 3, borderLeftColor: COLORS.surfaceDark,
  },
  achievementDone: { borderLeftColor: '#2ED573' },
  achievementIconBox: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  achievementEmoji: { fontSize: 24 },
  achievementBody: { flex: 1 },
  achievementTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text, marginBottom: 2 },
  unlockedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  achievementDoneText: { ...TYPOGRAPHY.small, color: '#2ED573', fontWeight: '600' },
  achievementHow: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginBottom: 2, lineHeight: 16 },
  xpRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  achievementXP: { ...TYPOGRAPHY.small, fontWeight: '700' },

  detailCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.lg, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.card },
  detailDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
});

export default ProfileScreen;
