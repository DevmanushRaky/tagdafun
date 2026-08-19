import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG } from '../constants/gameConfig';
import { logGame } from '../utils/gameHistory';

const { width } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(width - 64, 300);
const COST = GAME_CONFIG.spin.costPerSpin;

// Segments: label shown, coins you WIN (gross)
const SEGMENTS = [
  { label: '0',   value: 0,   bg: '#1a1a2e', accent: '#e74c3c' },
  { label: '10',  value: 10,  bg: '#c0392b', accent: '#FFD700' },
  { label: '2',   value: 2,   bg: '#1a1a2e', accent: '#74b9ff' },
  { label: '25',  value: 25,  bg: '#8e44ad', accent: '#FFD700' },
  { label: '5',   value: 5,   bg: '#1a1a2e', accent: '#55efc4' },
  { label: '50',  value: 50,  bg: '#e67e22', accent: '#FFD700' },
  { label: '3',   value: 3,   bg: '#1a1a2e', accent: '#74b9ff' },
  { label: '15',  value: 15,  bg: '#16a085', accent: '#FFD700' },
  { label: '1',   value: 1,   bg: '#1a1a2e', accent: '#dfe6e9' },
  { label: '100', value: 100, bg: '#c0392b', accent: '#FFD700' },
  { label: '5',   value: 5,   bg: '#1a1a2e', accent: '#55efc4' },
  { label: '20',  value: 20,  bg: '#2980b9', accent: '#FFD700' },
];

const N = SEGMENTS.length;
const SEG_ANGLE = 360 / N;

interface SpinRouletteProps {
  onResult: (coinsWon: number, coinsLost: number) => void;
}

const SpinRoulette: React.FC<SpinRouletteProps> = ({ onResult }) => {
  const { stats, recordGame } = useGameStats();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ segIdx: number; coinsWon: number; balanceBefore: number; balanceAfter: number } | null>(null);
  const [dots, setDots] = useState('');
  const spinAnim = useRef(new Animated.Value(0)).current;
  const currentAngleRef = useRef(0);
  const dotsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const canPlay = stats.totalCoins >= COST;

  // Spinning dots animation
  useEffect(() => {
    if (spinning) {
      let count = 0;
      dotsTimer.current = setInterval(() => {
        count = (count + 1) % 4;
        setDots('.'.repeat(count));
      }, 300);
    } else {
      if (dotsTimer.current) clearInterval(dotsTimer.current);
      setDots('');
    }
    return () => { if (dotsTimer.current) clearInterval(dotsTimer.current); };
  }, [spinning]);

  const spin = () => {
    if (spinning || !canPlay) return;
    setResult(null);
    setSpinning(true);

    const segIdx = Math.floor(Math.random() * N);
    // Pointer at top = 270deg in standard coords, each segment starts at segIdx * SEG_ANGLE
    // We want segment center at top: rotate so (segIdx * SEG_ANGLE + SEG_ANGLE/2) aligns to 0 (top)
    const segCenter = segIdx * SEG_ANGLE + SEG_ANGLE / 2;
    const landOffset = (360 - segCenter) % 360;
    const fullSpins = 10 * 360; // fast initial spin
    const target = currentAngleRef.current + fullSpins + landOffset - (currentAngleRef.current % 360);

    // Small overshoot then settle back
    const overshoot = target + SEG_ANGLE * 0.3;
    currentAngleRef.current = target;

    Animated.sequence([
      Animated.timing(spinAnim, {
        toValue: overshoot,
        duration: 4800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(spinAnim, {
        toValue: target,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(async ({ finished }) => {
      if (!finished) return;
      const seg = SEGMENTS[segIdx];
      const coinsWon = seg.value;
      // Step 1: deduct cost, Step 2: add winnings directly
      const newBalance = Math.max(0, stats.totalCoins - COST) + coinsWon;

      await recordGame('spin', {
        totalCoins: newBalance,
        spinPlays: (stats.spinPlays ?? 0) + 1,
        spinTotalWon: (stats.spinTotalWon ?? 0) + coinsWon,
      });

      await logGame({
        timestamp: Date.now(),
        gameType: 'spin',
        wheelValue: coinsWon,
        costCoins: COST,
        earnedCoins: coinsWon,
        netCoins: coinsWon - COST,
      });

      setResult({ segIdx, coinsWon, balanceBefore: stats.totalCoins, balanceAfter: newBalance });
      setSpinning(false);
      onResult(coinsWon, COST);
    });
  };

  const rotate = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'extend',
  });

  const resultSeg = result !== null ? SEGMENTS[result.segIdx] : null;

  return (
    <View style={styles.root}>
      {/* Cost info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Ionicons name="wallet" size={14} color="#F9A825" />
          <Text style={styles.infoText}>Your coins: <Text style={[styles.infoBold, !canPlay && { color: '#e74c3c' }]}>{stats.totalCoins}</Text></Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Ionicons name="flash" size={14} color="#e74c3c" />
          <Text style={styles.infoText}>Cost per spin: <Text style={styles.infoBold}>{COST}</Text></Text>
        </View>
      </View>

      {/* Not enough coins banner */}
      {!canPlay && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={18} color="#e74c3c" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedTitle}>Not enough coins!</Text>
            <Text style={styles.lockedSub}>Play Coin Toss to earn coins, then come back to spin.</Text>
          </View>
        </View>
      )}

      {/* Wheel */}
      <View style={styles.wheelOuter}>
        {/* Outer decorative rings */}
        <View style={styles.ringGold} />
        <View style={styles.ringDark} />

        {/* Pointer */}
        <View style={styles.pointerWrapper}>
          <View style={styles.pointerShadow} />
          <View style={styles.pointerTriangle} />
        </View>

        {/* Spinning wheel */}
        <Animated.View style={[styles.wheel, { transform: [{ rotate }] }]}>
          {/* Colored segments */}
          {SEGMENTS.map((seg, i) => (
            <View
              key={i}
              style={[
                styles.segTriangle,
                {
                  transform: [{ rotate: `${i * SEG_ANGLE - 90}deg` }],
                  borderTopColor: seg.bg,
                },
              ]}
            />
          ))}

          {/* Segment divider lines */}
          {SEGMENTS.map((_, i) => (
            <View
              key={`d-${i}`}
              style={[styles.divider, { transform: [{ rotate: `${i * SEG_ANGLE - 90}deg` }] }]}
            />
          ))}

          {/* Labels */}
          {SEGMENTS.map((seg, i) => {
            const midAngle = i * SEG_ANGLE + SEG_ANGLE / 2 - 90;
            const rad = (midAngle * Math.PI) / 180;
            const r = WHEEL_SIZE / 2 - 32;
            return (
              <View
                key={`l-${i}`}
                style={[
                  styles.labelWrap,
                  {
                    transform: [
                      { translateX: r * Math.cos(rad) },
                      { translateY: r * Math.sin(rad) },
                      { rotate: `${midAngle + 90}deg` },
                    ],
                  },
                ]}
              >
                <Text style={[styles.segLabel, { color: seg.accent }]}>{seg.label}</Text>
              </View>
            );
          })}

          {/* Center button */}
          <View style={styles.centerBg}>
            <LinearGradient colors={['#FFD700', '#F57F17']} style={styles.centerGrad}>
              <Ionicons name="refresh" size={20} color="#1a1a2e" />
            </LinearGradient>
          </View>
        </Animated.View>
      </View>

      {/* Status / Result */}
      {!spinning && result !== null && resultSeg ? (
        <View style={styles.resultCard}>
          <LinearGradient colors={['#1a1a2e', '#0f0f1a']} style={styles.resultGrad}>
            {/* Headline */}
            <View style={styles.resultTopRow}>
              <Ionicons
                name={result.coinsWon > 0 ? 'trophy' : 'refresh-circle'}
                size={26}
                color={result.coinsWon > 0 ? '#FFD700' : '#A55EEA'}
              />
              <Text style={styles.resultHeadline}>
                Wheel landed on <Text style={styles.resultWheelNum}>{result.coinsWon}</Text>
              </Text>
            </View>

            {/* 2-step clean calculation */}
            <View style={styles.calcRow}>
              {/* Before */}
              <View style={styles.calcItem}>
                <Text style={styles.calcLabel}>Before</Text>
                <Text style={styles.calcValue}>{result.balanceBefore}</Text>
              </View>
              {/* Cost */}
              <View style={styles.calcStep}>
                <Text style={styles.calcStepOp}>−{COST}</Text>
                <Text style={styles.calcStepLabel}>cost</Text>
              </View>
              {/* Won */}
              <View style={styles.calcStep}>
                <Text style={[styles.calcStepOp, { color: '#2ED573' }]}>+{result.coinsWon}</Text>
                <Text style={styles.calcStepLabel}>won</Text>
              </View>
              <Text style={styles.calcEquals}>=</Text>
              {/* After */}
              <View style={styles.calcItem}>
                <Text style={styles.calcLabel}>Balance</Text>
                <Text style={[styles.calcValue, { color: '#2ED573', fontSize: 20 }]}>{result.balanceAfter}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <Ionicons name="refresh-circle-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.statusText}>Spin to win big!</Text>
        </View>
      )}

      {/* Spin button */}
      <TouchableOpacity
        style={[styles.spinBtn, (!canPlay || spinning) && { opacity: 0.5 }]}
        onPress={spin}
        disabled={!canPlay || spinning}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={!canPlay ? ['#757575', '#616161'] : spinning ? ['#6c3483', '#4a235a'] : ['#E91E8C', '#B91D73']}
          style={styles.spinBtnGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Ionicons name={spinning ? 'refresh' : !canPlay ? 'lock-closed' : 'refresh-circle'} size={22} color="white" />
          <Text style={styles.spinBtnText}>
            {spinning ? `Spinning${dots}` : !canPlay ? `Need ${COST} coins` : `SPIN  (−${COST} coins)`}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', gap: SPACING.md },

  infoBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 10, width: '100%', ...SHADOWS.card },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoDivider: { width: 1, height: 18, backgroundColor: COLORS.border, marginHorizontal: 8 },
  infoText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  infoBold: { fontWeight: 'bold', color: COLORS.text },

  lockedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, width: '100%', borderWidth: 1, borderColor: 'rgba(231,76,60,0.3)' },
  lockedTitle: { ...TYPOGRAPHY.captionBold, color: '#e74c3c', marginBottom: 2 },
  lockedSub: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, lineHeight: 16 },

  // Wheel outer container
  wheelOuter: {
    width: WHEEL_SIZE + 20,
    height: WHEEL_SIZE + 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringGold: {
    position: 'absolute',
    width: WHEEL_SIZE + 20,
    height: WHEEL_SIZE + 20,
    borderRadius: (WHEEL_SIZE + 20) / 2,
    backgroundColor: '#D4AF37',
  },
  ringDark: {
    position: 'absolute',
    width: WHEEL_SIZE + 8,
    height: WHEEL_SIZE + 8,
    borderRadius: (WHEEL_SIZE + 8) / 2,
    backgroundColor: '#1a1a2e',
  },

  pointerWrapper: { position: 'absolute', top: 0, zIndex: 20, alignItems: 'center' },
  pointerShadow: { width: 0, height: 0, borderLeftWidth: 11, borderRightWidth: 11, borderTopWidth: 22, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 2 },
  pointerTriangle: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 20, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFD700' },

  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#0f0f1a',
  },

  segTriangle: {
    position: 'absolute',
    top: WHEEL_SIZE / 2,
    left: WHEEL_SIZE / 2,
    width: 0,
    height: 0,
    borderLeftWidth: WHEEL_SIZE / 2,
    borderRightWidth: WHEEL_SIZE / 2,
    borderTopWidth: WHEEL_SIZE / 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginLeft: -WHEEL_SIZE / 2,
    marginTop: -WHEEL_SIZE / 2,
  },

  divider: {
    position: 'absolute',
    width: 1.5,
    height: WHEEL_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: 0,
    left: WHEEL_SIZE / 2 - 0.75,
    transformOrigin: `0.75px ${WHEEL_SIZE / 2}px`,
  },

  labelWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  segLabel: { fontSize: 12, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },

  centerBg: { position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: '#1a1a2e', padding: 3 },
  centerGrad: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  // Status
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 16, paddingVertical: 10, ...SHADOWS.card },
  statusText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },

  // Result
  resultCard: { width: '100%', borderRadius: BORDER_RADIUS.lg, borderWidth: 1.5, borderColor: 'rgba(255,215,0,0.3)', overflow: 'hidden', ...SHADOWS.medium },
  resultGrad: { padding: SPACING.md, gap: SPACING.sm },
  resultTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultHeadline: { fontSize: 14, fontWeight: '600', color: '#ffffff', flex: 1 },
  resultWheelNum: { fontSize: 20, fontWeight: '900', color: '#FFD700' },

  calcRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  calcItem: { alignItems: 'center', minWidth: 52 },
  calcLabel: { fontSize: 11, fontWeight: '600', color: '#aaaaaa', marginBottom: 3 },
  calcValue: { fontSize: 17, fontWeight: 'bold', color: '#ffffff' },
  calcStep: { alignItems: 'center' },
  calcStepOp: { fontSize: 16, fontWeight: '800', color: '#ff6b6b' },
  calcStepLabel: { fontSize: 10, fontWeight: '600', color: '#aaaaaa', marginTop: 2 },
  calcEquals: { fontSize: 22, color: '#888888', fontWeight: '300' },

  // Spin button
  spinBtn: { width: '100%', borderRadius: BORDER_RADIUS.full, overflow: 'hidden', ...SHADOWS.medium },
  spinBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  spinBtnText: { fontSize: 16, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
});

export default SpinRoulette;
