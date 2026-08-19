import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG } from '../constants/gameConfig';
import { logGame } from '../utils/gameHistory';

const { width } = Dimensions.get('window');
const GRID_COLS = 4;
const CARD_GAP = 8;
const CARD_SIZE = (width - SPACING.lg * 2 - CARD_GAP * (GRID_COLS - 1)) / GRID_COLS;

// 6 pairs — 12 cards total (3 rows × 4 cols)
const CARD_ICONS: { icon: string; color: string }[] = [
  { icon: 'game-controller', color: '#A55EEA' },
  { icon: 'star',            color: '#FFD700' },
  { icon: 'flash',           color: '#FF6B00' },
  { icon: 'trophy',          color: '#F9A825' },
  { icon: 'flame',           color: '#e74c3c' },
  { icon: 'rocket',          color: '#00B4D8' },
];

interface Card {
  id: number;
  pairId: number;
  icon: string;
  color: string;
}

function buildDeck(): Card[] {
  const deck: Card[] = [];
  CARD_ICONS.forEach((c, i) => {
    deck.push({ id: i * 2,     pairId: i, icon: c.icon, color: c.color });
    deck.push({ id: i * 2 + 1, pairId: i, icon: c.icon, color: c.color });
  });
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface MemoryCardsProps {
  onWin: () => void;
}

const MemoryCards: React.FC<MemoryCardsProps> = ({ onWin }) => {
  const { stats, recordGame } = useGameStats();
  const [deck, setDeck] = useState<Card[]>(buildDeck);
  const [flipped, setFlipped] = useState<number[]>([]);   // card ids currently face-up
  const [matched, setMatched] = useState<number[]>([]);   // pairIds matched
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);
  const [canFlip, setCanFlip] = useState(true);
  const flipAnims = useRef<Animated.Value[]>(deck.map(() => new Animated.Value(0))).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (won) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [won]);

  const animateCard = (idx: number, toValue: number, duration = 250) =>
    new Promise<void>(resolve =>
      Animated.timing(flipAnims[idx], { toValue, duration, useNativeDriver: true }).start(() => resolve())
    );

  const flipUp = (idx: number) => animateCard(idx, 1);
  const flipDown = (idx: number) => animateCard(idx, 0);

  const handlePress = useCallback(async (card: Card, idx: number) => {
    if (!canFlip) return;
    if (flipped.includes(card.id)) return;
    if (matched.includes(card.pairId)) return;

    await flipUp(idx);
    const newFlipped = [...flipped, card.id];

    if (newFlipped.length === 1) {
      setFlipped(newFlipped);
      return;
    }

    // Second card flipped
    setCanFlip(false);
    setMoves(m => m + 1);
    const firstCardId = newFlipped[0];
    const firstCard = deck.find(c => c.id === firstCardId)!;

    if (firstCard.pairId === card.pairId) {
      // Match!
      const newMatched = [...matched, card.pairId];
      setMatched(newMatched);
      setFlipped([]);
      setCanFlip(true);

      if (newMatched.length === CARD_ICONS.length) {
        // All pairs matched — win
        setWon(true);
        await recordGame('memory');
        await logGame({
          gameType: 'memory',
          costCoins: GAME_CONFIG.memory.costToPlay,
          earnedCoins: GAME_CONFIG.memory.coinsPerWin,
          netCoins: GAME_CONFIG.memory.coinsPerWin,
          timestamp: Date.now(),
        });
        onWin();
      }
    } else {
      // No match — flip both back
      setFlipped([]);
      await new Promise(r => setTimeout(r, 600));
      const firstIdx = deck.findIndex(c => c.id === firstCardId);
      await Promise.all([flipDown(firstIdx), flipDown(idx)]);
      setCanFlip(true);
    }
  }, [canFlip, flipped, matched, deck]);

  const restart = () => {
    const newDeck = buildDeck();
    setDeck(newDeck);
    flipAnims.forEach(a => a.setValue(0));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setSeconds(0);
    setWon(false);
    setCanFlip(true);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.root}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statPill}>
          <Ionicons name="swap-horizontal" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statPillText}>{moves} moves</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statPillText}>{formatTime(seconds)}</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="checkmark-circle" size={14} color="#2ED573" />
          <Text style={styles.statPillText}>{matched.length}/{CARD_ICONS.length} pairs</Text>
        </View>
      </View>

      {/* Win reward info */}
      <View style={styles.rewardRow}>
        <Ionicons name="wallet" size={14} color="#F9A825" />
        <Text style={styles.rewardText}>Match all pairs to win</Text>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardBadgeText}>+{GAME_CONFIG.memory.coinsPerWin} coins</Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {deck.map((card, idx) => {
          const isMatched = matched.includes(card.pairId);

          const frontRotate = flipAnims[idx].interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
          const backRotate  = flipAnims[idx].interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
          const frontOpacity = flipAnims[idx].interpolate({ inputRange: [0.4, 0.5], outputRange: [0, 1], extrapolate: 'clamp' });
          const backOpacity  = flipAnims[idx].interpolate({ inputRange: [0.4, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });

          return (
            <TouchableOpacity
              key={card.id}
              onPress={() => handlePress(card, idx)}
              activeOpacity={0.9}
              disabled={isMatched}
              style={styles.cardWrapper}
            >
              {/* Back face */}
              <Animated.View style={[styles.card, styles.cardBack, { opacity: backOpacity, transform: [{ rotateY: backRotate }] }]}>
                <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.cardFill}>
                  <Ionicons name="help" size={22} color="rgba(255,255,255,0.2)" />
                </LinearGradient>
              </Animated.View>

              {/* Front face */}
              <Animated.View style={[styles.card, styles.cardFront, { opacity: frontOpacity, transform: [{ rotateY: frontRotate }] }]}>
                <View style={[styles.cardFill, styles.cardFrontBg, isMatched && styles.cardMatched]}>
                  <View style={[styles.iconCircle, { backgroundColor: card.color + '22' }]}>
                    <Ionicons name={card.icon as any} size={28} color={isMatched ? '#2ED573' : card.color} />
                  </View>
                  {isMatched && (
                    <View style={styles.matchedBadge}>
                      <Ionicons name="checkmark" size={10} color="white" />
                    </View>
                  )}
                </View>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Win Modal */}
      <Modal visible={won} transparent animationType="fade">
        <View style={styles.winOverlay}>
          <View style={styles.winCard}>
            {/* Trophy icon */}
            <View style={styles.winIconWrap}>
              <Ionicons name="trophy" size={52} color="#FFD700" />
            </View>

            <Text style={styles.winTitle}>You Won!</Text>
            <Text style={styles.winSub}>{moves} moves · {formatTime(seconds)}</Text>

            {/* Coins reward */}
            <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.winRewardBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="wallet" size={20} color="white" />
              <Text style={styles.winRewardText}>+{GAME_CONFIG.memory.coinsPerWin} Coins Earned!</Text>
            </LinearGradient>

            {/* New balance */}
            <View style={styles.winBalanceRow}>
              <Text style={styles.winBalanceLabel}>New Balance</Text>
              <View style={styles.winBalancePill}>
                <Ionicons name="wallet" size={14} color="#F9A825" />
                <Text style={styles.winBalance}>{stats.totalCoins}</Text>
              </View>
            </View>

            {/* Pairs + XP */}
            <View style={styles.winStatsRow}>
              <View style={styles.winStatChip}>
                <Ionicons name="checkmark-circle" size={14} color="#2ED573" />
                <Text style={styles.winStatText}>{CARD_ICONS.length} pairs matched</Text>
              </View>
              <View style={styles.winStatChip}>
                <Ionicons name="star" size={14} color="#A55EEA" />
                <Text style={styles.winStatText}>+{GAME_CONFIG.memory.xpPerWin} XP</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.playAgainBtn} onPress={restart} activeOpacity={0.85}>
              <LinearGradient colors={['#48CAE4', '#0077B6']} style={styles.playAgainGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="refresh" size={18} color="white" />
                <Text style={styles.playAgainText}>Play Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  statsBar: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, ...SHADOWS.card },
  statPillText: { ...TYPOGRAPHY.small, color: COLORS.text, fontWeight: '600' },

  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: SPACING.md },
  rewardText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  rewardBadge: { backgroundColor: 'rgba(249,168,37,0.15)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  rewardBadgeText: { fontSize: 12, fontWeight: '800', color: '#F9A825' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, paddingHorizontal: SPACING.lg, justifyContent: 'center' },

  cardWrapper: { width: CARD_SIZE, height: CARD_SIZE },
  card: { position: 'absolute', width: '100%', height: '100%', borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backfaceVisibility: 'hidden' },
  cardBack: {},
  cardFront: {},
  cardFill: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  cardFrontBg: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  cardMatched: { borderColor: '#2ED573', backgroundColor: 'rgba(46,213,115,0.06)' },
  iconCircle: { width: CARD_SIZE * 0.55, height: CARD_SIZE * 0.55, borderRadius: CARD_SIZE * 0.28, justifyContent: 'center', alignItems: 'center' },
  matchedBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#2ED573', justifyContent: 'center', alignItems: 'center' },

  winOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  winCard: { backgroundColor: COLORS.surface, borderRadius: 28, padding: SPACING.xl, alignItems: 'center', gap: 14, width: '100%', ...SHADOWS.medium },
  winIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,215,0,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,215,0,0.2)' },
  winTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  winSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  winRewardBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 20, paddingVertical: 12, width: '100%', justifyContent: 'center' },
  winRewardText: { fontSize: 17, fontWeight: '800', color: 'white' },
  winBalanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, paddingVertical: 12 },
  winBalanceLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  winBalancePill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  winBalance: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  winStatsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  winStatChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, paddingVertical: 8 },
  winStatText: { ...TYPOGRAPHY.small, fontWeight: '700', color: COLORS.textSecondary },
  playAgainBtn: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden', width: '100%' },
  playAgainGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  playAgainText: { fontSize: 16, fontWeight: '800', color: 'white' },
});

export default MemoryCards;
