import React, { useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { logGame } from '../utils/gameHistory';

const COIN_SIZE = 140;

interface CoinTossProps {
  onShowResult: (type: 'coin', result: string, subtitle: string, badgeText: string, win: boolean) => void;
}

const CoinToss: React.FC<CoinTossProps> = ({ onShowResult }) => {
  const { stats, recordGame } = useGameStats();
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<{ outcome: 'heads' | 'tails'; win: boolean } | null>(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const targetDegRef = useRef<number>(0);
  const outcomeRef = useRef<'heads' | 'tails'>('heads');

  const startFlip = () => {
    setLastResult(null);
    outcomeRef.current = Math.random() < 0.5 ? 'heads' : 'tails';

    const baseSpins = 6;
    const endOffset = outcomeRef.current === 'heads' ? 0 : 180;
    targetDegRef.current = baseSpins * 360 + endOffset;

    flipAnim.setValue(0);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async ({ finished }) => {
      if (!finished) return;
      const raw = outcomeRef.current;
      const win = raw === choice;
      setLastResult({ outcome: raw, win });
      setIsFlipping(false);

      await recordGame('coin', win ? { coinWins: stats.coinWins + 1, coinFlips: stats.coinFlips + 1 } : { coinFlips: stats.coinFlips + 1 });
      await logGame({ timestamp: Date.now(), gameType: 'coin', choice, outcome: raw, coinWon: win, costCoins: 0, earnedCoins: 5, netCoins: 5 });
      onShowResult('coin', raw, win ? 'You won!' : 'Try again!', raw, win);
    });
  };

  const flipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    startFlip();
  };

  const rotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${targetDegRef.current}deg`],
  });
  const scale = flipAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [1, 1.15, 1.15, 1],
  });
  const translateY = flipAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, -30, -30, 0],
  });

  const { frontOpacity, backOpacity } = useMemo(() => {
    const totalHalfTurns = Math.max(1, Math.round(targetDegRef.current / 180));
    const inputRange: number[] = [];
    const frontRange: number[] = [];
    const backRange: number[] = [];
    for (let i = 0; i <= totalHalfTurns; i++) {
      inputRange.push(i / totalHalfTurns);
      frontRange.push(i % 2 === 0 ? 1 : 0);
      backRange.push(i % 2 === 1 ? 1 : 0);
    }
    return {
      frontOpacity: flipAnim.interpolate({ inputRange, outputRange: frontRange as any }),
      backOpacity: flipAnim.interpolate({ inputRange, outputRange: backRange as any }),
    };
  }, [flipAnim, targetDegRef.current]);

  return (
    <View style={styles.root}>
      {/* Coin stage */}
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.stage}>
        {/* Shadow glow under coin */}
        <View style={[styles.coinGlow, lastResult && { backgroundColor: lastResult.win ? 'rgba(46,213,115,0.2)' : 'rgba(231,76,60,0.2)' }]} />

        <Animated.View style={[
          styles.coinWrapper,
          { transform: [{ perspective: 800 }, { rotateY }, { scale }, { translateY }] },
        ]}>
          {/* HEADS face */}
          <Animated.View style={[styles.face, styles.headFace, { opacity: frontOpacity }]}>
            <LinearGradient colors={['#FFD700', '#FFA000']} style={styles.faceGrad}>
              <View style={styles.faceInner}>
                <Text style={styles.faceEmoji}>H</Text>
                <Text style={styles.faceName}>HEADS</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* TAILS face */}
          <Animated.View style={[styles.face, styles.tailFace, { opacity: backOpacity }]}>
            <LinearGradient colors={['#B8C6DB', '#868F96']} style={styles.faceGrad}>
              <View style={styles.faceInner}>
                <Text style={styles.faceEmoji}>T</Text>
                <Text style={styles.faceName}>TAILS</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Outer ring */}
          <View style={styles.coinRing} />
        </Animated.View>

        {/* Status text inside stage */}
        {isFlipping ? (
          <Text style={styles.stageStatus}>Flipping...</Text>
        ) : lastResult ? (
          <View style={styles.resultBadge}>
            <Ionicons
              name={lastResult.win ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={lastResult.win ? '#2ED573' : '#E74C3C'}
            />
            <Text style={[styles.resultBadgeText, { color: lastResult.win ? '#2ED573' : '#E74C3C' }]}>
              {lastResult.outcome.toUpperCase()} — {lastResult.win ? 'You Won! +5 coins' : 'You Lost!'}
            </Text>
          </View>
        ) : (
          <Text style={styles.stageStatus}>Pick your side</Text>
        )}
      </LinearGradient>

      {/* Choice selector */}
      <View style={styles.choiceSection}>
        <Text style={styles.choiceLabel}>YOUR BET</Text>
        <View style={styles.choiceRow}>
          <TouchableOpacity
            style={[styles.choiceBtn, choice === 'heads' && styles.choiceBtnActive]}
            onPress={() => !isFlipping && setChoice('heads')}
            disabled={isFlipping}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={choice === 'heads' ? ['#FFD700', '#FFA000'] : ['#f5f5f5', '#ebebeb']}
              style={styles.choiceBtnGrad}
            >
              <View style={[styles.choiceCoin, { backgroundColor: choice === 'heads' ? '#FFF8DC' : '#e0e0e0' }]}>
                <Text style={[styles.choiceCoinLetter, { color: choice === 'heads' ? '#B8860B' : '#9e9e9e' }]}>H</Text>
              </View>
              <Text style={[styles.choiceName, { color: choice === 'heads' ? '#7B5800' : '#757575' }]}>HEADS</Text>
              {choice === 'heads' && (
                <View style={styles.selectedDot} />
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.vsCircle}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <TouchableOpacity
            style={[styles.choiceBtn, choice === 'tails' && styles.choiceBtnActiveSilver]}
            onPress={() => !isFlipping && setChoice('tails')}
            disabled={isFlipping}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={choice === 'tails' ? ['#B8C6DB', '#868F96'] : ['#f5f5f5', '#ebebeb']}
              style={styles.choiceBtnGrad}
            >
              <View style={[styles.choiceCoin, { backgroundColor: choice === 'tails' ? '#ecf0f1' : '#e0e0e0' }]}>
                <Text style={[styles.choiceCoinLetter, { color: choice === 'tails' ? '#607d8b' : '#9e9e9e' }]}>T</Text>
              </View>
              <Text style={[styles.choiceName, { color: choice === 'tails' ? '#455A64' : '#757575' }]}>TAILS</Text>
              {choice === 'tails' && (
                <View style={[styles.selectedDot, { backgroundColor: '#607d8b' }]} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Earn info */}
      <View style={styles.earnRow}>
        <Ionicons name="wallet" size={14} color="#F9A825" />
        <Text style={styles.earnText}>Win or lose — earn <Text style={styles.earnBold}>+5 coins</Text> per flip</Text>
      </View>

      {/* Flip button */}
      <TouchableOpacity
        style={[styles.flipBtn, isFlipping && styles.flipBtnDisabled]}
        onPress={flipCoin}
        disabled={isFlipping}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={isFlipping ? ['#9e9e9e', '#757575'] : ['#FF6B6B', '#EE0979']}
          style={styles.flipBtnGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Ionicons name={isFlipping ? 'refresh' : 'play-circle'} size={22} color="white" />
          <Text style={styles.flipBtnText}>{isFlipping ? 'Flipping...' : 'FLIP IT!'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="sync" size={13} color={COLORS.textSecondary} />
          <Text style={styles.statChipText}>{stats.coinFlips} flips</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="trophy" size={13} color="#F9A825" />
          <Text style={styles.statChipText}>{stats.coinWins} wins</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="wallet" size={13} color="#2ED573" />
          <Text style={styles.statChipText}>{stats.totalCoins} coins</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%', gap: SPACING.md },

  // Stage
  stage: {
    borderRadius: BORDER_RADIUS.xl,
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 20,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  coinGlow: {
    position: 'absolute',
    top: 36 + COIN_SIZE - 10,
    width: COIN_SIZE + 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,215,0,0.15)',
  },
  coinWrapper: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    overflow: 'hidden',
  },
  headFace: {},
  tailFace: { transform: [{ rotateY: '180deg' }] },
  faceGrad: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceInner: { alignItems: 'center', gap: 2 },
  faceEmoji: { fontSize: 36, fontWeight: '900', color: 'rgba(0,0,0,0.25)' },
  faceName: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: 'rgba(0,0,0,0.35)' },
  coinRing: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  stageStatus: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textAlign: 'center' },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, maxWidth: '100%' },
  resultBadgeText: { ...TYPOGRAPHY.captionBold, letterSpacing: 0.5, flexShrink: 1 },

  // Choice
  choiceSection: { gap: 10 },
  choiceLabel: { ...TYPOGRAPHY.smallBold, color: COLORS.textSecondary, textAlign: 'center', letterSpacing: 2 },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceBtn: { flex: 1, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.card, borderWidth: 2, borderColor: 'transparent' },
  choiceBtnActive: { borderColor: '#FFD700' },
  choiceBtnActiveSilver: { borderColor: '#B8C6DB' },
  choiceBtnGrad: { paddingVertical: 14, alignItems: 'center', gap: 6 },
  choiceCoin: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  choiceCoinLetter: { fontSize: 20, fontWeight: '900' },
  choiceName: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  selectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700' },

  vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  vsText: { fontSize: 10, fontWeight: '900', color: COLORS.textSecondary },

  // Earn info
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  earnText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  earnBold: { color: '#F9A825', fontWeight: 'bold' },

  // Flip button
  flipBtn: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden', ...SHADOWS.medium },
  flipBtnDisabled: { opacity: 0.6 },
  flipBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 32 },
  flipBtnText: { fontSize: 18, fontWeight: '900', color: 'white', letterSpacing: 1 },

  // Stats row
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, ...SHADOWS.card },
  statChipText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '600' },
});

export default CoinToss;
