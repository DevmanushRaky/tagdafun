import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Keyboard, Share, Linking, Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStats, Achievement, PlayerStats } from '../contexts/GameStatsContext';
import { useShop } from '../contexts/ShopContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { COIN_SKINS, CARD_BACKS, BOTTLE_THEMES, SHER_BOARDS, PIECE_SETS, MARK_SETS } from '../constants/shop';
import { GameIcon } from '../components/GameIcons';
import { MEMORY_LEVEL_KEY, MEMORY_STARS_KEY } from '../components/MemoryCards';
import { WATER_LEVEL_KEY } from '../components/WaterSorting';
import { KITE_LEVEL_KEY } from '../components/KiteFight';
import { BUBBLE_LEVEL_KEY } from '../components/BubbleShooter';
import { PLAY_STORE_URL, PLAY_STORE_APP_URL, PLAY_STORE_SHARE_URL, PRIVACY_POLICY_URL } from '../constants/links';

const TIER_COLOR = { bronze: '#CD7F32', silver: '#9AA3AD', gold: '#E0A800' };

/** How far along each achievement is: [current, target]. */
function achievementProgress(a: Achievement, s: PlayerStats, level: number): [number, number] {
  switch (a.id) {
    case 'first_game': return [s.totalGamesPlayed, 1];
    case 'first_coin': return [s.gamesPlayed.coin, 1];
    case 'games_10': return [s.totalGamesPlayed, 10];
    case 'games_50': return [s.totalGamesPlayed, 50];
    case 'games_100': return [s.totalGamesPlayed, 100];
    case 'coin_win_5': return [s.coinWins, 5];
    case 'coin_win_20': return [s.coinWins, 20];
    case 'streak_3': return [s.currentStreak, 3];
    case 'streak_7': return [s.currentStreak, 7];
    case 'level_5': return [level, 5];
    case 'level_10': return [level, 10];
    default: return [a.unlocked ? 1 : 0, 1];
  }
}

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats, levelInfo, achievements, setPlayerName } = useGameStats();
  const { shop } = useShop();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [memoryLevel, setMemoryLevel] = useState(1);
  const [memoryStars, setMemoryStars] = useState(0);
  const [waterLevel, setWaterLevel] = useState(1);
  const [kiteLevel, setKiteLevel] = useState(1);
  const [bubbleLevel, setBubbleLevel] = useState(1);

  // Game progress lives in each game's own storage; refresh it whenever the tab is opened.
  useFocusEffect(useCallback(() => {
    Promise.all([
      AsyncStorage.getItem(MEMORY_LEVEL_KEY),
      AsyncStorage.getItem(MEMORY_STARS_KEY),
      AsyncStorage.getItem(WATER_LEVEL_KEY),
      AsyncStorage.getItem(KITE_LEVEL_KEY),
      AsyncStorage.getItem(BUBBLE_LEVEL_KEY),
    ]).then(([ml, ms, wl, kl, bl]) => {
      setMemoryLevel(Math.max(1, parseInt(ml ?? '1', 10) || 1));
      try {
        const best: Record<string, number> = ms ? JSON.parse(ms) : {};
        setMemoryStars(Object.values(best).reduce((a, b) => a + b, 0));
      } catch { setMemoryStars(0); }
      setWaterLevel(Math.max(1, parseInt(wl ?? '1', 10) || 1));
      setKiteLevel(Math.max(1, parseInt(kl ?? '1', 10) || 1));
      setBubbleLevel(Math.max(1, parseInt(bl ?? '1', 10) || 1));
    }).catch(() => {});
  }, []));

  const startEdit = () => { setDraft(stats.playerName); setEditing(true); };
  const saveName = async () => {
    await setPlayerName(draft);
    setEditing(false);
    Keyboard.dismiss();
  };

  const shareGame = () => {
    const message =
      `I'm Level ${levelInfo.level} (${levelInfo.title}) on Tagda Fun 🎮\n` +
      `Memory Cards level ${memoryLevel} · Water Sorting level ${waterLevel}.\n` +
      `Think you can beat me? Play free: ${PLAY_STORE_SHARE_URL}`;
    Share.share({ message }).catch(() => {});
  };

  const rateApp = () => {
    const url = Platform.OS === 'android' ? PLAY_STORE_APP_URL : PLAY_STORE_URL;
    Linking.openURL(url).catch(() => Linking.openURL(PLAY_STORE_URL).catch(() => {}));
  };

  const openPrivacy = () => { Linking.openURL(PRIVACY_POLICY_URL).catch(() => {}); };

  const maxLevel = levelInfo.progress >= 1 && levelInfo.xpForNext === levelInfo.xpRequired;
  const xpToNext = Math.max(0, levelInfo.xpForNext - stats.totalXP);
  const unlocked = achievements.filter(a => a.unlocked).length;
  const winRate = stats.coinFlips > 0 ? Math.round((stats.coinWins / stats.coinFlips) * 100) : 0;
  const initial = stats.playerName.trim().charAt(0).toUpperCase() || 'T';

  // Locked first, closest to done on top, so the next goal is always visible.
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? 1 : -1;
    const [ac, at] = achievementProgress(a, stats, levelInfo.level);
    const [bc, bt] = achievementProgress(b, stats, levelInfo.level);
    return bc / bt - ac / at;
  });

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <LinearGradient colors={['#001A33', '#002A52', '#0B3F70']} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.glow} />
        <View style={styles.heroRow}>
          <View style={[styles.avatarRing, { borderColor: levelInfo.color }]}>
            <LinearGradient colors={['#FF8C42', '#FF5E00']} style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </LinearGradient>
            <View style={[styles.avatarLevel, { backgroundColor: levelInfo.color }]}>
              <Text style={styles.avatarLevelText}>{levelInfo.level}</Text>
            </View>
          </View>

          <View style={styles.heroInfo}>
            {editing ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  style={styles.nameInput}
                  maxLength={20}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
                <TouchableOpacity onPress={saveName} style={styles.nameBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="checkmark" size={18} color="white" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.nameRow} onPress={startEdit} activeOpacity={0.7}>
                <Text style={styles.playerName} numberOfLines={1}>{stats.playerName}</Text>
                <Ionicons name="pencil" size={14} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
            <Text style={styles.levelTitle}>Level {levelInfo.level} · {levelInfo.title}</Text>
          </View>
        </View>

        <View style={styles.xpBlock}>
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>{stats.totalXP} XP</Text>
            <Text style={styles.xpText}>{maxLevel ? 'Max level' : `${xpToNext} XP to Level ${levelInfo.level + 1}`}</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(levelInfo.progress * 100)}%`, backgroundColor: levelInfo.color }]} />
          </View>
        </View>

        <View style={styles.quickStats}>
          {[
            { value: stats.totalGamesPlayed, label: 'Games' },
            { value: stats.currentStreak, label: 'Day streak' },
            { value: stats.bestStreak, label: 'Best streak' },
            { value: `${unlocked}/${achievements.length}`, label: 'Badges' },
          ].map((q, i) => (
            <View key={q.label} style={[styles.quickStat, i > 0 && styles.quickDivider]}>
              <Text style={styles.quickValue}>{q.value}</Text>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Invite */}
      <TouchableOpacity style={styles.invite} onPress={shareGame} activeOpacity={0.88}>
        <LinearGradient colors={['#FF8C42', '#FF5E00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.inviteGrad}>
          <View style={styles.inviteIcon}>
            <Ionicons name="people" size={22} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inviteTitle}>Invite friends</Text>
            <Text style={styles.inviteSub}>Share your level and the game link</Text>
          </View>
          <Ionicons name="share-social" size={20} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Games */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your games</Text>
        <View style={styles.card}>
          <GameStatRow
            id="coin" title="Coin Toss"
            cells={[{ label: 'Flips', value: stats.coinFlips }, { label: 'Wins', value: stats.coinWins }, { label: 'Win rate', value: `${winRate}%` }]}
          />
          <GameStatRow
            id="memory" title="Memory Cards" border
            cells={[{ label: 'Cleared', value: stats.gamesPlayed.memory }, { label: 'Level', value: memoryLevel }, { label: 'Stars', value: `★ ${memoryStars}` }]}
          />
          <GameStatRow
            id="water" title="Water Sorting" border
            cells={[{ label: 'Cleared', value: stats.gamesPlayed.water }, { label: 'Level', value: waterLevel }, { label: 'Coins', value: stats.coinsEarned.water }]}
          />
          <GameStatRow
            id="kite" title="Patang Baazi" border
            cells={[{ label: 'Cleared', value: stats.gamesPlayed.kite }, { label: 'Level', value: kiteLevel }, { label: 'Coins', value: stats.coinsEarned.kite }]}
          />
          <GameStatRow
            id="bubble" title="Bubble Shooter" border
            cells={[{ label: 'Cleared', value: stats.gamesPlayed.bubble }, { label: 'Level', value: bubbleLevel }, { label: 'Coins', value: stats.coinsEarned.bubble }]}
          />
          <GameStatRow
            id="bagh" title="Sher aur Bakri" border
            cells={[{ label: 'Wins', value: stats.gamesPlayed.bagh }, { label: 'Coins', value: stats.coinsEarned.bagh }]}
          />
          <GameStatRow
            id="tictac" title="Tic-Tac-Toe" border
            cells={[{ label: 'Played', value: stats.gamesPlayed.tictac }, { label: 'Coins', value: stats.coinsEarned.tictac }]}
          />
        </View>
      </View>

      {/* Collection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collection</Text>
        {[
          [
            { icon: 'ellipse', color: '#E0A800', label: 'Coin skins', owned: shop.ownedSkins.length, total: COIN_SKINS.length },
            { icon: 'albums', color: '#0077B6', label: 'Card backs', owned: shop.ownedBacks.length, total: CARD_BACKS.length },
            { icon: 'water', color: '#17B85A', label: 'Bottle themes', owned: shop.ownedThemes.length, total: BOTTLE_THEMES.length },
          ],
          [
            { icon: 'grid', color: '#B07C45', label: 'Sher boards', owned: shop.ownedBoards.length, total: SHER_BOARDS.length },
            { icon: 'paw', color: '#E8590C', label: 'Sher pieces', owned: shop.ownedPieces.length, total: PIECE_SETS.length },
            { icon: 'close-circle', color: '#0077B6', label: 'Tic-Tac-Toe', owned: shop.ownedMarks.length, total: MARK_SETS.length },
          ],
        ].map((row, r) => (
          <View key={r} style={[styles.collection, r > 0 && { marginTop: 10 }]}>
            {row.map(c => (
              <View key={c.label} style={styles.collectTile}>
                <Ionicons name={c.icon as any} size={20} color={c.color} />
                <Text style={styles.collectValue}>{c.owned}/{c.total}</Text>
                <Text style={styles.collectLabel}>{c.label}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.sectionNote}>{unlocked} of {achievements.length} unlocked</Text>
        </View>
        <View style={styles.card}>
          {sortedAchievements.map((a, i) => {
            const [cur, target] = achievementProgress(a, stats, levelInfo.level);
            const pct = Math.min(1, cur / target);
            return (
              <View key={a.id} style={[styles.achRow, i > 0 && styles.rowBorder, a.unlocked && styles.achDone]}>
                <View style={[styles.achIcon, { backgroundColor: a.unlocked ? TIER_COLOR[a.tier] + '22' : COLORS.surfaceDark }]}>
                  <Text style={[styles.achEmoji, !a.unlocked && styles.achEmojiLocked]}>{a.icon}</Text>
                </View>
                <View style={styles.achBody}>
                  <View style={styles.achTitleRow}>
                    <Text style={styles.achTitle} numberOfLines={1}>{a.title}</Text>
                    <Text style={[styles.achTier, { color: TIER_COLOR[a.tier] }]}>{a.tier.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.achDesc}>{a.description}</Text>
                  {a.unlocked ? (
                    <Text style={styles.achEarned}>+{a.xpReward} XP earned</Text>
                  ) : (
                    <View style={styles.achProgressRow}>
                      <View style={styles.achTrack}>
                        <View style={[styles.achFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: TIER_COLOR[a.tier] }]} />
                      </View>
                      <Text style={styles.achCount}>{Math.min(cur, target)}/{target}</Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={a.unlocked ? 'checkmark-circle' : 'lock-closed'}
                  size={20}
                  color={a.unlocked ? '#2ED573' : COLORS.textLight}
                />
              </View>
            );
          })}
        </View>
      </View>
      {/* More */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.card}>
          <MoreRow icon="star" color="#E0A800" label="Rate Tagda Fun" onPress={rateApp} />
          <MoreRow icon="shield-checkmark" color="#17B85A" label="Privacy Policy" onPress={openPrivacy} border />
          <View style={[styles.moreRow, styles.rowBorder]}>
            <View style={[styles.moreIcon, { backgroundColor: COLORS.surfaceDark }]}>
              <Ionicons name="information-circle" size={18} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.moreLabel}>Version</Text>
            <Text style={styles.moreValue}>{Constants.expoConfig?.version ?? '-'}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const MoreRow: React.FC<{ icon: string; color: string; label: string; onPress: () => void; border?: boolean }> = ({
  icon, color, label, onPress, border,
}) => (
  <TouchableOpacity style={[styles.moreRow, border && styles.rowBorder]} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.moreIcon, { backgroundColor: color + '1A' }]}>
      <Ionicons name={icon as any} size={18} color={color} />
    </View>
    <Text style={styles.moreLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
  </TouchableOpacity>
);

const GameStatRow: React.FC<{
  id: string; title: string; border?: boolean; cells: { label: string; value: string | number }[];
}> = ({ id, title, border, cells }) => (
  <View style={[styles.gameRow, border && styles.rowBorder]}>
    <View style={styles.gameHead}>
      <View style={styles.gameIcon}><GameIcon id={id} size={28} /></View>
      <Text style={styles.gameTitle}>{title}</Text>
    </View>
    <View style={styles.gameCells}>
      {cells.map(c => (
        <View key={c.label} style={styles.gameCell}>
          <Text style={styles.gameValue}>{c.value}</Text>
          <Text style={styles.gameLabel}>{c.label}</Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,107,0,0.14)', top: -90, right: -70 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarRing: { padding: 3, borderRadius: 40, borderWidth: 3 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: 'white' },
  avatarLevel: { position: 'absolute', bottom: -4, right: -4, minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#002A52' },
  avatarLevelText: { fontSize: 11, fontWeight: '900', color: 'white' },
  heroInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerName: { fontSize: 22, fontWeight: '900', color: 'white', flexShrink: 1 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, fontSize: 18, fontWeight: '800', color: 'white', borderBottomWidth: 1.5, borderBottomColor: 'rgba(255,255,255,0.4)', paddingVertical: 4 },
  nameBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  levelTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  xpBlock: { marginTop: SPACING.md },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  xpTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4, minWidth: 6 },

  quickStats: { flexDirection: 'row', marginTop: SPACING.md, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.lg, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  quickStat: { flex: 1, alignItems: 'center' },
  quickDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' },
  quickValue: { fontSize: 17, fontWeight: '900', color: 'white' },
  quickLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  section: { marginHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { ...TYPOGRAPHY.h4, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  sectionNote: { ...TYPOGRAPHY.small, fontWeight: '700', color: COLORS.textSecondary },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, ...SHADOWS.card },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.surfaceDark },

  gameRow: { paddingVertical: 12 },
  gameHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  gameIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: COLORS.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  gameTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  gameCells: { flexDirection: 'row', gap: 8 },
  gameCell: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, paddingVertical: 8 },
  gameValue: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  gameLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginTop: 1 },

  collection: { flexDirection: 'row', gap: 10 },
  collectTile: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingVertical: 12, ...SHADOWS.card },
  collectValue: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  collectLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  invite: { marginHorizontal: SPACING.md, marginTop: SPACING.lg, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  inviteGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  inviteIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  inviteTitle: { fontSize: 16, fontWeight: '800', color: 'white' },
  inviteSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 1 },

  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  moreIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moreLabel: { flex: 1, ...TYPOGRAPHY.captionBold, color: COLORS.text },
  moreValue: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, fontWeight: '700' },

  achRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  achDone: { opacity: 0.85 },
  achIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  achEmoji: { fontSize: 22 },
  achEmojiLocked: { opacity: 0.45 },
  achBody: { flex: 1 },
  achTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  achTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text, flexShrink: 1 },
  achTier: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  achDesc: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 1 },
  achEarned: { fontSize: 11, fontWeight: '800', color: '#2ED573', marginTop: 4 },
  achProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  achTrack: { flex: 1, height: 5, backgroundColor: COLORS.surfaceDark, borderRadius: 3, overflow: 'hidden' },
  achFill: { height: 5, borderRadius: 3 },
  achCount: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, minWidth: 34, textAlign: 'right' },
});

export default ProfileScreen;
