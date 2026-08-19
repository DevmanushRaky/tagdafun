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
import { GAMES, GameConfig } from '../types';
import CoinToss from '../components/CoinToss';
import SpinRoulette from '../components/SpinRoulette';
import MemoryCards from '../components/MemoryCards';

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
  const { stats, levelInfo, recordGame } = useGameStats();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyChallenge>(getTodayChallenge());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

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

  // Pulse animation for play button
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const activeGameConfig = GAMES.find(g => g.id === activeGame);
  const xpPercent = Math.round(levelInfo.progress * 100);

  // Update daily challenge when game is played
  const handleGamePlayed = () => {
    if (daily.claimed || daily.current >= daily.target) return;
    const updated = { ...daily, current: Math.min(daily.current + 1, daily.target) };
    setDaily(updated);
    AsyncStorage.setItem(DAILY_KEY, JSON.stringify(updated));
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

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════
            HERO SECTION
        ════════════════════════════════════════ */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          {/* Decorative circles */}
          <View style={styles.decCircle1} />
          <View style={styles.decCircle2} />

          {/* Top row: greeting + coins */}
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroGreet}>Welcome back!</Text>
              <Text style={styles.heroName}>Tagda Player</Text>
            </View>
            <View style={styles.coinPill}>
              <Ionicons name="wallet" size={16} color="#FFD700" />
              <AnimatedNumber value={stats.totalCoins} style={styles.coinPillText} />
            </View>
          </View>

          {/* Player card */}
          <View style={styles.playerCard}>
            {/* Avatar with level ring */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarRingOuter}>
                <View style={[styles.avatarRingInner, { borderColor: levelInfo.color }]}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={32} color="white" />
                  </View>
                </View>
              </View>
              <View style={[styles.levelTag, { backgroundColor: levelInfo.color }]}>
                <Text style={styles.levelTagText}>LV {levelInfo.level}</Text>
              </View>
            </View>

            {/* Player info */}
            <View style={styles.playerInfo}>
              <Text style={styles.playerTitle}>{levelInfo.title}</Text>

              {/* XP bar */}
              <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>XP</Text>
                <View style={styles.xpBarBg}>
                  <Animated.View style={[styles.xpBarFill, { width: `${xpPercent}%`, backgroundColor: levelInfo.color }]} />
                </View>
                <Text style={styles.xpPercent}>{xpPercent}%</Text>
              </View>

              {/* Stats row */}
              <View style={styles.miniStats}>
                <View style={styles.miniStat}>
                  <Ionicons name="flame" size={14} color="#FF6348" />
                  <Text style={styles.miniStatText}>{stats.currentStreak} streak</Text>
                </View>
                <View style={styles.miniStatDot} />
                <View style={styles.miniStat}>
                  <Ionicons name="game-controller" size={14} color="#A55EEA" />
                  <Text style={styles.miniStatText}>{stats.totalGamesPlayed} played</Text>
                </View>
                <View style={styles.miniStatDot} />
                <View style={styles.miniStat}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.miniStatText}>{stats.totalXP} XP</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Daily Challenge */}
          <View style={styles.dailyCard}>
            <LinearGradient colors={['#e94560', '#c0392b']} style={styles.dailyLeft}>
              <Ionicons name="flash" size={20} color="white" />
              <Text style={styles.dailyTag}>DAILY</Text>
            </LinearGradient>
            <View style={styles.dailyContent}>
              <Text style={styles.dailyTitle}>Flip coin {daily.target} times</Text>
              <View style={styles.dailyProgressRow}>
                <View style={styles.dailyBar}>
                  <View style={[styles.dailyBarFill, { width: `${dailyProgress * 100}%` }]} />
                </View>
                <Text style={styles.dailyCount}>{daily.current}/{daily.target}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.dailyRewardBtn, daily.claimed && styles.dailyRewardClaimed]}
              onPress={claimDaily}
              disabled={daily.current < daily.target || daily.claimed}
            >
              {daily.claimed ? (
                <Ionicons name="checkmark-circle" size={20} color="#2ED573" />
              ) : (
                <>
                  <Ionicons name="wallet" size={13} color={daily.current >= daily.target ? '#FFD700' : 'rgba(255,255,255,0.4)'} />
                  <Text style={[styles.dailyRewardText, daily.current < daily.target && { opacity: 0.4 }]}>
                    +{daily.reward}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ═══════════════════════════════════════
            GAMES SECTION
        ════════════════════════════════════════ */}
        <View style={styles.gamesSection}>
          <Text style={styles.gamesSectionTitle}>Games</Text>
          <View style={styles.grid}>
            {GAMES.map(game => (
              <GameCard key={game.id} game={game} onPress={() => setActiveGame(game.id)} />
            ))}
          </View>
        </View>
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// ── Game Card ──────────────────────────────────────────────────────────────
const GameCard: React.FC<{ game: GameConfig; onPress: () => void }> = ({ game, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, styles.cardWrapper]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <LinearGradient colors={game.gradient as any} style={styles.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {/* Game icon */}
          <Ionicons name={game.icon as any} size={34} color="white" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>{game.title}</Text>
          <Text style={styles.cardDesc}>{game.description}</Text>

          {/* Rewards row */}
          <View style={styles.cardRewardsRow}>
            <View style={styles.cardRewardChip}>
              <Ionicons name="wallet" size={11} color="#FFD700" />
              <Text style={styles.cardRewardText}>
                {game.id === 'spin' ? 'Varies' : `+${game.coinsPerPlay}`}
              </Text>
            </View>
            <View style={styles.cardRewardChip}>
              <Ionicons name="star" size={11} color="#A55EEA" />
              <Text style={styles.cardRewardText}>
                {game.id === 'spin' ? '+15 XP' : '+10 XP'}
              </Text>
            </View>
          </View>

          <View style={styles.cardPlayRow}>
            <Text style={styles.cardPlayText}>Tap to play</Text>
            <Ionicons name="play-circle" size={18} color="rgba(255,255,255,0.9)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const CARD_W = (width - SPACING.md * 2 - SPACING.sm) / 2;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },

  // ── Hero ──
  hero: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, overflow: 'hidden' },

  // Decorative bg circles
  decCircle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.03)', top: -60, right: -60 },
  decCircle2: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 20, left: -40 },

  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  heroGreet: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  heroName: { fontSize: 22, fontWeight: 'bold', color: 'white', marginTop: 2 },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  coinPillText: { fontSize: 18, fontWeight: 'bold', color: '#FFD700' },

  // Player card
  playerCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

  avatarSection: { alignItems: 'center', marginRight: SPACING.md },
  avatarRingOuter: { padding: 3, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  avatarRingInner: { padding: 3, borderRadius: 37, borderWidth: 2.5 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  levelTag: { marginTop: 6, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  levelTagText: { fontSize: 10, fontWeight: 'bold', color: 'white' },

  playerInfo: { flex: 1, justifyContent: 'center' },
  playerTitle: { fontSize: 15, fontWeight: '700', color: 'white', marginBottom: 8 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  xpLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', width: 18 },
  xpBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
  xpBarFill: { height: 6, borderRadius: 3, minWidth: 4 },
  xpPercent: { fontSize: 10, color: 'rgba(255,255,255,0.6)', width: 28, textAlign: 'right' },
  miniStats: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniStatText: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  miniStatDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Daily challenge
  dailyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(233,69,96,0.4)' },
  dailyLeft: { paddingHorizontal: 10, paddingVertical: 14, alignItems: 'center', gap: 3 },
  dailyTag: { fontSize: 9, fontWeight: 'bold', color: 'white', letterSpacing: 1 },
  dailyContent: { flex: 1, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm },
  dailyTitle: { fontSize: 13, fontWeight: '600', color: 'white', marginBottom: 6 },
  dailyProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyBar: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 },
  dailyBarFill: { height: 5, backgroundColor: '#e94560', borderRadius: 3, minWidth: 4 },
  dailyCount: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  dailyRewardBtn: { paddingHorizontal: 12, paddingVertical: 14, alignItems: 'center', gap: 2 },
  dailyRewardClaimed: { opacity: 0.7 },
  dailyRewardText: { fontSize: 12, fontWeight: 'bold', color: '#FFD700' },

  // ── Games ──
  gamesSection: { padding: SPACING.md, paddingTop: SPACING.lg },
  gamesSectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cardWrapper: { width: CARD_W, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  cardGradient: { padding: SPACING.md, minHeight: 175 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardCoinBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  cardCoinText: { ...TYPOGRAPHY.smallBold, color: 'white', fontSize: 11 },
  cardTitle: { ...TYPOGRAPHY.bodyBold, color: 'white', marginBottom: 4 },
  cardDesc: { ...TYPOGRAPHY.small, color: 'rgba(255,255,255,0.85)', lineHeight: 15, flex: 1 },
  cardRewardsRow: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 2 },
  cardRewardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  cardRewardText: { fontSize: 10, fontWeight: '700', color: 'white' },
  cardPlayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardPlayText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // ── Game Modal ──
  gameModal: { flex: 1, backgroundColor: COLORS.background },
  gameHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, gap: SPACING.sm },
  backBtn: { padding: 4 },
  gameHeaderTitle: { ...TYPOGRAPHY.h4, color: 'white', flex: 1 },
  gameCoinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  gameCoinText: { ...TYPOGRAPHY.smallBold, color: 'white' },
  gameContent: { padding: SPACING.md, paddingBottom: 60 },
});

export default HomeScreen;
