import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING, GRADIENTS } from '../constants/theme';
import { GAME_CONFIG } from '../constants/gameConfig';
import { GAMES, GameConfig } from '../types';
import CoinToss from '../components/CoinToss';
import SpinRoulette from '../components/SpinRoulette';
import MemoryCards from '../components/MemoryCards';
import WaterSorting from '../components/WaterSorting';
import AdBanner from '../components/ads/AdBanner';
import NativeAdCard from '../components/ads/NativeAdCard';
import PostGameRewardModal from '../components/ads/PostGameRewardModal';

const { width } = Dimensions.get('window');
const DAILY_KEY = '@tagdafun_daily_v1';

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
    target: 5,
    current: 0,
    reward: 25,
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
  const { stats, recordGame } = useGameStats();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showRewardPrompt, setShowRewardPrompt] = useState(false);
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
    setShowRewardPrompt(true);
  };

  const claimDaily = async () => {
    if (daily.current < daily.target || daily.claimed) return;
    const updated = { ...daily, claimed: true };
    setDaily(updated);
    await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(updated));
    // Give reward: add coins + XP directly to stats
    await recordGame('coin', {
      totalCoins: stats.totalCoins + daily.reward,
      totalXP: stats.totalXP + 20,
    });
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
              <Text style={styles.heroName}>Tagda Player</Text>
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
          <View style={styles.grid}>
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
            {activeGame === 'spin' && (
              <SpinRoulette
                onResult={() => {
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
const CARD_META: Record<string, { cost: string; reward: string }> = {
  coin: { cost: 'Free', reward: `+${GAME_CONFIG.coin.coinsPerPlay} coins` },
  spin: { cost: `${GAME_CONFIG.spin.costPerSpin} coins`, reward: `Win up to ${Math.max(...GAME_CONFIG.spin.segments)}` },
  memory: { cost: 'Free', reward: `+${GAME_CONFIG.memory.coinsPerWin} coins` },
  water: { cost: 'Free', reward: `Up to ${GAME_CONFIG.water.maxWinCoins} coins` },
};

const GameCard: React.FC<{ game: GameConfig; onPress: () => void }> = ({ game, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = CARD_META[game.id] ?? { cost: 'Free', reward: `+${game.coinsPerPlay} coins` };

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.cardWrapper]}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={1}>
        <LinearGradient colors={game.gradient as any} style={styles.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name={game.icon as any} size={110} color="rgba(255,255,255,0.14)" style={styles.cardWatermark} />

          <View style={styles.cardTopRow}>
            <View style={styles.cardIconTile}>
              <Ionicons name={game.icon as any} size={24} color="white" />
            </View>
            <View style={styles.costChip}>
              <Text style={styles.costChipText}>{meta.cost}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>{game.title}</Text>

          <View style={styles.cardBottomRow}>
            <View style={styles.rewardWrap}>
              <Ionicons name="wallet" size={12} color="#FFE27A" />
              <Text style={styles.rewardText} numberOfLines={1}>{meta.reward}</Text>
            </View>
            <View style={styles.playBtn}>
              <Ionicons name="play" size={14} color={game.color} style={{ marginLeft: 2 }} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const CARD_W = (width - SPACING.md * 2 - SPACING.sm) / 2;

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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cardWrapper: { width: CARD_W, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.card },
  cardGradient: { padding: 14, height: 168, justifyContent: 'space-between', overflow: 'hidden' },
  cardWatermark: { position: 'absolute', right: -22, bottom: -22 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardIconTile: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  costChip: { backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 9, paddingVertical: 4 },
  costChipText: { fontSize: 11, fontWeight: '800', color: 'white' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: 'white', letterSpacing: 0.2 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  rewardWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  rewardText: { flex: 1, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.95)' },
  playBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },

  // ── Game Modal ──
  gameModal: { flex: 1, backgroundColor: COLORS.background },
  gameHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, gap: SPACING.sm },
  backBtn: { padding: 4 },
  gameHeaderTitle: { ...TYPOGRAPHY.h4, color: 'white', flex: 1 },
  gameContent: { padding: SPACING.md, paddingBottom: 60 },
});

export default HomeScreen;
