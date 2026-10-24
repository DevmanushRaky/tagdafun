import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING, GRADIENTS } from '../constants/theme';
import { GAME_CONFIG, starRewardRange } from '../constants/gameConfig';
import { GAMES, GameConfig } from '../types';
import CoinToss from '../components/CoinToss';
import MemoryCards from '../components/MemoryCards';
import WaterSorting from '../components/WaterSorting';
import { GameIcon } from '../components/GameIcons';
import AdBanner from '../components/ads/AdBanner';
import NativeAdCard from '../components/ads/NativeAdCard';
import PostGameRewardModal from '../components/ads/PostGameRewardModal';

const DAILY_KEY = '@tagdafun_daily_v1';

// The "watch an ad for coins" prompt after a game is capped so it doesn't interrupt every round.
const REWARD_PROMPT_EVERY = 4;                 // show after every Nth finished game...
const REWARD_PROMPT_COOLDOWN_MS = 3 * 60 * 1000; // ...and at most once per this window

interface DailyChallenge {
  date: string;
  target: number;
  current: number;
  reward: number;
  claimed: boolean;
}

function getTodayChallenge(): DailyChallenge {
  return {
    date: new Date().toDateString(),
    target: GAME_CONFIG.dailyChallenge.targetFlips,
    current: 0,
    reward: GAME_CONFIG.dailyChallenge.coinsReward,
    claimed: false,
  };
}

// ── Animated coin number ────────────────────────────────────────────────────
const AnimatedNumber: React.FC<{ value: number; style: any }> = ({ value, style }) => {
  const animVal = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    Animated.timing(animVal, { toValue: value, duration: 600, useNativeDriver: false }).start();
    const id = animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeListener(id);
  }, [value]);

  return <Text style={style}>{display}</Text>;
};

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats, addBonusCoins } = useGameStats();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showRewardPrompt, setShowRewardPrompt] = useState(false);
  const gamesSincePromptRef = useRef(0);
  const lastPromptAtRef = useRef(0);
  const [daily, setDaily] = useState<DailyChallenge>(getTodayChallenge());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Load daily challenge
  useEffect(() => {
    AsyncStorage.getItem(DAILY_KEY).then(raw => {
      if (raw) {
        const saved: DailyChallenge = JSON.parse(raw);
        if (saved.date === new Date().toDateString()) {
          setDaily(saved);
        } else {
          const fresh = getTodayChallenge();
          AsyncStorage.setItem(DAILY_KEY, JSON.stringify(fresh));
          setDaily(fresh);
        }
      } else {
        const fresh = getTodayChallenge();
        AsyncStorage.setItem(DAILY_KEY, JSON.stringify(fresh));
        setDaily(fresh);
      }
    });
  }, []);

  // Pulse animation for the claim button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const activeGameConfig = GAMES.find(g => g.id === activeGame);

  // Update daily challenge when game is played
  const handleGamePlayed = () => {
    if (!daily.claimed && daily.current < daily.target) {
      const updated = { ...daily, current: Math.min(daily.current + 1, daily.target) };
      setDaily(updated);
      AsyncStorage.setItem(DAILY_KEY, JSON.stringify(updated));
    }
    gamesSincePromptRef.current += 1;
    const now = Date.now();
    if (gamesSincePromptRef.current >= REWARD_PROMPT_EVERY && now - lastPromptAtRef.current >= REWARD_PROMPT_COOLDOWN_MS) {
      gamesSincePromptRef.current = 0;
      lastPromptAtRef.current = now;
      setShowRewardPrompt(true);
    }
  };

  const claimDaily = async () => {
    if (daily.current < daily.target || daily.claimed) return;
    const updated = { ...daily, claimed: true };
    setDaily(updated);
    await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(updated));
    // A bonus, not a game: it must not count as a coin flip or add the flip's own coins.
    await addBonusCoins(daily.reward, 'daily', GAME_CONFIG.dailyChallenge.xpReward);
  };

  const dailyProgress = daily.target > 0 ? daily.current / daily.target : 0;

  const canClaim = daily.current >= daily.target && !daily.claimed;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <LinearGradient
          colors={['#001A33', '#002A52', '#0B3F70']}
          style={[styles.hero, { paddingTop: insets.top + 14 }]}
        >
          <View style={styles.glowOrange} />
          <View style={styles.glowBlue} />

          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroGreet}>Welcome back</Text>
              <Text style={styles.heroName} numberOfLines={1}>{stats.playerName}</Text>
            </View>
            <View style={styles.coinPill}>
              <Ionicons name="wallet" size={16} color="#FFC83D" />
              <AnimatedNumber value={stats.totalCoins} style={styles.coinPillText} />
            </View>
          </View>
        </LinearGradient>

        {/* ── Daily challenge (overlaps hero) ── */}
        <View style={styles.dailyCard}>
          <View style={styles.dailyIcon}>
            <Ionicons name="flash" size={22} color="white" />
          </View>
          <View style={styles.dailyContent}>
            <Text style={styles.dailyLabel}>DAILY CHALLENGE</Text>
            <Text style={styles.dailyTitle}>Flip the coin {daily.target} times</Text>
            <View style={styles.dailyProgressRow}>
              <View style={styles.dailyBar}>
                <View style={[styles.dailyBarFill, { width: `${dailyProgress * 100}%` }]} />
              </View>
              <Text style={styles.dailyCount}>{daily.current}/{daily.target}</Text>
            </View>
          </View>
          {daily.claimed ? (
            <View style={styles.claimedPill}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.claimedText}>Done</Text>
            </View>
          ) : (
            <Animated.View style={canClaim ? { transform: [{ scale: pulseAnim }] } : undefined}>
              <TouchableOpacity
                style={[styles.claimBtn, !canClaim && styles.claimBtnOff]}
                onPress={claimDaily}
                disabled={!canClaim}
                activeOpacity={0.8}
              >
                <Text style={[styles.claimText, !canClaim && styles.claimTextOff]}>+{daily.reward}</Text>
                <Ionicons name="wallet" size={13} color={canClaim ? 'white' : COLORS.textLight} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <View style={styles.bannerWrap}>
          <AdBanner />
        </View>

        {/* ── Games ── */}
        <View style={styles.gamesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.gamesSectionTitle}>Play now</Text>
            <Text style={styles.sectionCount}>{GAMES.length} games</Text>
          </View>
          <View style={styles.list}>
            {GAMES.map(game => (
              <GameCard key={game.id} game={game} onPress={() => setActiveGame(game.id)} />
            ))}
          </View>
        </View>

        <NativeAdCard />
      </ScrollView>

      {/* ── Game Modal ── */}
      <Modal visible={!!activeGame} animationType="slide" onRequestClose={() => setActiveGame(null)}>
        <View style={[styles.gameModal, { paddingTop: insets.top }]}>
          <LinearGradient
            colors={(activeGameConfig?.gradient ?? GRADIENTS.primary) as any}
            style={styles.gameHeader}
          >
            <TouchableOpacity onPress={() => setActiveGame(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.gameHeaderTitle}>{activeGameConfig?.title}</Text>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={styles.gameContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeGame === 'coin' && (
              <CoinToss
                onShowResult={() => {
                  handleGamePlayed();
                }}
              />
            )}
            {activeGame === 'memory' && (
              <MemoryCards
                onWin={() => {
                  handleGamePlayed();
                }}
              />
            )}
            {activeGame === 'water' && (
              <WaterSorting
                onWin={() => {
                  handleGamePlayed();
                }}
              />
            )}
          </ScrollView>

          <View style={{ paddingBottom: insets.bottom }}>
            <NativeAdCard />
          </View>
        </View>
      </Modal>

      <PostGameRewardModal visible={showRewardPrompt} onClose={() => setShowRewardPrompt(false)} />
    </View>
  );
};

// ── Game Card ──────────────────────────────────────────────────────────────
// Full-width row: icon tile, title + tagline, rewards, play button.
const CARD_META: Record<string, { tagline: string; coins: string; xp: number }> = {
  coin: { tagline: 'Heads or tails? Call it.', coins: `+${GAME_CONFIG.coin.loseCoins}–${GAME_CONFIG.coin.winCoins}`, xp: GAME_CONFIG.coin.xpPerPlay },
  memory: { tagline: 'Flip the cards, match every pair.', coins: starRewardRange, xp: GAME_CONFIG.memory.xpPerWin },
  water: { tagline: 'Pour until every bottle is one colour.', coins: starRewardRange, xp: GAME_CONFIG.water.xpPerWin },
};

const GameCard: React.FC<{ game: GameConfig; onPress: () => void }> = ({ game, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = CARD_META[game.id] ?? { tagline: game.description, coins: '', xp: 10 };

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.cardWrapper]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <LinearGradient colors={game.gradient as any} style={styles.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.cardIconTile}>
            <GameIcon id={game.id} size={48} />
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{game.title}</Text>
            <Text style={styles.cardTagline} numberOfLines={1}>{meta.tagline}</Text>
            <View style={styles.cardChips}>
              <View style={styles.chip}>
                <Ionicons name="wallet" size={11} color="#FFE27A" />
                <Text style={styles.chipText}>{meta.coins}</Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="star" size={11} color="#FFE27A" />
                <Text style={styles.chipText}>+{meta.xp} XP</Text>
              </View>
            </View>
          </View>

          <View style={styles.playBtn}>
            <Ionicons name="play" size={18} color={game.color} style={{ marginLeft: 3 }} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // ── Hero ──
  hero: { paddingHorizontal: SPACING.md, paddingBottom: 56, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  glowOrange: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,107,0,0.16)', top: -90, right: -70 },
  glowBlue: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(30,144,255,0.12)', bottom: -60, left: -50 },

  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroGreet: { fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  heroName: { fontSize: 24, fontWeight: '800', color: 'white', marginTop: 1, letterSpacing: 0.3 },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,200,61,0.14)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,200,61,0.35)' },
  coinPillText: { fontSize: 18, fontWeight: '800', color: '#FFC83D' },


  // ── Daily challenge ──
  dailyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, marginHorizontal: SPACING.md, marginTop: -34, borderRadius: BORDER_RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.medium },
  dailyIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  dailyContent: { flex: 1 },
  dailyLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 1 },
  dailyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 2, marginBottom: 8 },
  dailyProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyBar: { flex: 1, height: 6, backgroundColor: COLORS.surfaceDark, borderRadius: 3, overflow: 'hidden' },
  dailyBarFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3, minWidth: 4 },
  dailyCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  claimBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 10 },
  claimBtnOff: { backgroundColor: COLORS.surfaceDark },
  claimText: { fontSize: 14, fontWeight: '800', color: 'white' },
  claimTextOff: { color: COLORS.textLight },
  claimedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  claimedText: { fontSize: 13, fontWeight: '700', color: COLORS.success },

  bannerWrap: { marginTop: SPACING.sm },

  // ── Games ──
  gamesSection: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: SPACING.md },
  gamesSectionTitle: { ...TYPOGRAPHY.h3, fontWeight: '800', color: COLORS.text },
  sectionCount: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  list: { gap: 12 },
  cardWrapper: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.card },
  cardGradient: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingLeft: 16, paddingRight: 14, overflow: 'hidden' },
  cardIconTile: { width: 62, height: 62, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: 'white', letterSpacing: 0.2 },
  cardTagline: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.88)', marginTop: 2 },
  cardChips: { flexDirection: 'row', gap: 6, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '800', color: 'white' },
  playBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },

  // ── Game Modal ──
  gameModal: { flex: 1, backgroundColor: COLORS.background },
  gameHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, gap: SPACING.sm },
  backBtn: { padding: 4 },
  gameHeaderTitle: { ...TYPOGRAPHY.h4, color: 'white', flex: 1 },
  gameContent: { padding: SPACING.md, paddingBottom: 60 },
});

export default HomeScreen;
