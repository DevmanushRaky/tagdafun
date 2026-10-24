import React, { useEffect, useId, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle, Defs, G, Line, LinearGradient as SvgLinearGradient, Path, RadialGradient,
  Stop, Text as SvgText, TextPath,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { playSound } from '../utils/sound';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG } from '../constants/gameConfig';
import { logGame } from '../utils/gameHistory';
import { useShop } from '../contexts/ShopContext';
import { coinPalette, type CoinPalette } from '../constants/shop';

const COIN_SIZE = 104;
const TOSS_MS = 1900;
const AIR = 0.8;          // fraction of the toss spent in the air; the rest is the landing bounce
const TOSS_HEIGHT = 70;   // px the coin rises at its peak
const SPINS = 7;          // full turns while in the air
const RESULT_HOLD_MS = 1500; // time the result stays visible before the post-game popup

type Side = 'heads' | 'tails';

const haptic = (style: Haptics.ImpactFeedbackStyle) => {
  Haptics.impactAsync(style).catch(() => {});
};

// ── Coin face (SVG) ─────────────────────────────────────────────────────────
// Drawn in a 200×200 box: reeded rim, curved legend and an embossed centre.
const REEDS = Array.from({ length: 72 }, (_, i) => (i / 72) * Math.PI * 2);

const CROWN = 'M62 128 L54 78 L80 100 L100 64 L120 100 L146 78 L138 128 Z';

const Emboss: React.FC<{ p: CoinPalette; metal: string; children: (fill: string) => React.ReactNode }> = ({ p, metal, children }) => (
  <>
    <G transform="translate(1.6,1.8)" opacity={0.55}>{children(p.shadow)}</G>
    <G transform="translate(-1,-1)" opacity={0.7}>{children(p.highlight)}</G>
    {children(metal)}
  </>
);

export const CoinFace: React.FC<{ side: Side; size: number; skin?: CoinPalette }> = ({ side, size, skin }) => {
  const p = skin ?? coinPalette('gold');
  // Unique gradient ids, so several coins with different skins can share a screen.
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Defs>
      <SvgLinearGradient id={`rim${u}`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={p.rim[0]} />
        <Stop offset="0.35" stopColor={p.rim[1]} />
        <Stop offset="0.7" stopColor={p.rim[2]} />
        <Stop offset="1" stopColor={p.rim[3]} />
      </SvgLinearGradient>
      <RadialGradient id={`field${u}`} cx="38%" cy="32%" r="75%">
        <Stop offset="0" stopColor={p.field[0]} />
        <Stop offset="0.45" stopColor={p.field[1]} />
        <Stop offset="1" stopColor={p.field[2]} />
      </RadialGradient>
      <SvgLinearGradient id={`metal${u}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={p.metal[0]} />
        <Stop offset="1" stopColor={p.metal[1]} />
      </SvgLinearGradient>
      <Path id={`legend${u}`} d="M 34 100 A 66 66 0 0 1 166 100" />
    </Defs>

    {/* Rim with reeded edge */}
    <Circle cx="100" cy="100" r="99" fill={`url(#rim${u})`} />
    {REEDS.map((a, i) => (
      <Line
        key={i}
        x1={100 + Math.cos(a) * 92} y1={100 + Math.sin(a) * 92}
        x2={100 + Math.cos(a) * 98.5} y2={100 + Math.sin(a) * 98.5}
        stroke={p.ink} strokeOpacity={0.35} strokeWidth={1.4}
      />
    ))}

    {/* Field */}
    <Circle cx="100" cy="100" r="88" fill={`url(#field${u})`} />
    <Circle cx="100" cy="100" r="88" fill="none" stroke={p.ink} strokeOpacity={0.5} strokeWidth={2} />


    {/* Curved legend */}
    <SvgText fill={p.ink} fillOpacity={0.75} fontSize="15" fontWeight="bold" letterSpacing="3">
      <TextPath href={`#legend${u}`} startOffset="50%" textAnchor="middle">TAGDA FUN</TextPath>
    </SvgText>

    {side === 'heads' ? (
      <>
        <Emboss p={p} metal={`url(#metal${u})`}>
          {fill => (
            <>
              <Path d={CROWN} fill={fill} />
              <Path d="M60 134 H140 V146 H60 Z" fill={fill} />
              <Circle cx="54" cy="74" r="6" fill={fill} />
              <Circle cx="100" cy="58" r="7" fill={fill} />
              <Circle cx="146" cy="74" r="6" fill={fill} />
            </>
          )}
        </Emboss>
        <SvgText x="100" y="172" fill={p.ink} fillOpacity={0.8} fontSize="14" fontWeight="bold" letterSpacing="4" textAnchor="middle">HEADS</SvgText>
      </>
    ) : (
      <>
        <Emboss p={p} metal={`url(#metal${u})`}>
          {fill => (
            <SvgText x="100" y="136" fill={fill} fontSize="78" fontWeight="900" textAnchor="middle">
              {GAME_CONFIG.coin.winCoins}
            </SvgText>
          )}
        </Emboss>
        <SvgText x="100" y="172" fill={p.ink} fillOpacity={0.8} fontSize="14" fontWeight="bold" letterSpacing="4" textAnchor="middle">TAILS</SvgText>
      </>
    )}
  </Svg>
  );
};

// ── Toss curves ─────────────────────────────────────────────────────────────
// Parabolic arc while in the air, then a small double bounce on landing.
const ARC_STEPS = 10;
const arcIn: number[] = [];
const arcY: number[] = [];
const arcScale: number[] = [];
for (let i = 0; i <= ARC_STEPS; i++) {
  const p = i / ARC_STEPS;
  const h = 4 * p * (1 - p); // 0 → 1 → 0
  arcIn.push(p * AIR);
  arcY.push(-TOSS_HEIGHT * h);
  arcScale.push(1 + 0.12 * h);
}
const LAND_IN = [AIR + 0.07, AIR + 0.14, AIR + 0.17, 1];
const tossIn = [...arcIn, ...LAND_IN];
const tossY = [...arcY, -14, 0, -3, 0];
const tossScale = [...arcScale, 1.02, 1, 1, 1];

interface CoinTossProps {
  onShowResult: (type: 'coin', result: string, subtitle: string, badgeText: string, win: boolean) => void;
}

const CoinToss: React.FC<CoinTossProps> = ({ onShowResult }) => {
  const { stats, recordGame } = useGameStats();
  const skin = coinPalette(useShop().shop.coinSkin);
  const [choice, setChoice] = useState<Side>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<{ outcome: Side; win: boolean } | null>(null);
  const tossAnim = useRef(new Animated.Value(0)).current;
  const rotAnim = useRef(new Animated.Value(0)).current; // degrees, accumulates across flips
  const degRef = useRef(0);
  const flipSound = useAudioPlayer(require('../assets/sounds/coin-flip.m4a'));
  const landSound = useAudioPlayer(require('../assets/sounds/coin-land.m4a'));
  const winSound = useAudioPlayer(require('../assets/sounds/coin-win.m4a'));
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Closing the game mid-flip must not record a result afterwards.
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const flipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setLastResult(null);
    haptic(Haptics.ImpactFeedbackStyle.Light);
    playSound(flipSound);

    const outcome: Side = Math.random() < 0.5 ? 'heads' : 'tails';
    const win = outcome === choice;
    // Continue from the current angle so the coin never jumps, and land on the right face.
    const from = degRef.current;
    const base = from - (from % 360) + SPINS * 360;
    const to = base + (outcome === 'heads' ? 0 : 180);
    degRef.current = to;

    tossAnim.setValue(0);
    Animated.parallel([
      Animated.timing(tossAnim, { toValue: 1, duration: TOSS_MS, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotAnim, { toValue: to, duration: TOSS_MS * AIR, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [
      setTimeout(() => {
        haptic(Haptics.ImpactFeedbackStyle.Heavy);
        playSound(landSound);
      }, TOSS_MS * AIR),
      setTimeout(async () => {
        setLastResult({ outcome, win });
        setIsFlipping(false);
        Haptics.notificationAsync(win ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
        if (win) playSound(winSound);

        const coins = win ? GAME_CONFIG.coin.winCoins : GAME_CONFIG.coin.loseCoins;
        await recordGame('coin', win ? { coinWins: stats.coinWins + 1, coinFlips: stats.coinFlips + 1 } : { coinFlips: stats.coinFlips + 1 }, coins);
        await logGame({ timestamp: Date.now(), gameType: 'coin', choice, outcome, coinWon: win, costCoins: 0, earnedCoins: coins, netCoins: coins });
      }, TOSS_MS),
      setTimeout(() => {
        onShowResult('coin', outcome, win ? 'You won!' : 'Try again!', outcome, win);
      }, TOSS_MS + RESULT_HOLD_MS),
    ];
  };

  const status = isFlipping
    ? { icon: 'sync', color: 'rgba(255,255,255,0.75)', tint: null, text: 'Flipping...' }
    : lastResult
      ? {
          icon: lastResult.win ? 'checkmark-circle' : 'close-circle',
          color: lastResult.win ? '#2ED573' : '#FF6B6B',
          tint: lastResult.win ? 'rgba(46,213,115,0.14)' : 'rgba(255,107,107,0.14)',
          text: `${lastResult.outcome.toUpperCase()} · ${lastResult.win ? 'You won' : 'You lost'} · +${lastResult.win ? GAME_CONFIG.coin.winCoins : GAME_CONFIG.coin.loseCoins} coins`,
        }
      : { icon: 'hand-left-outline', color: 'rgba(255,255,255,0.75)', tint: null, text: 'Pick your side and flip' };

  const turn = Animated.modulo(rotAnim, 360);
  const headsOpacity = turn.interpolate({ inputRange: [0, 89.9, 90, 269.9, 270, 360], outputRange: [1, 1, 0, 0, 1, 1] });
  const tailsOpacity = turn.interpolate({ inputRange: [0, 89.9, 90, 269.9, 270, 360], outputRange: [0, 0, 1, 1, 0, 0] });
  const rotateX = rotAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const tilt = Animated.modulo(rotAnim, 180);
  // Light catches the face as it tilts toward the viewer.
  const shine = tilt.interpolate({ inputRange: [0, 30, 60, 90, 120, 150, 180], outputRange: [0, 0.35, 0.1, 0, 0.1, 0.35, 0] });
  const translateY = tossAnim.interpolate({ inputRange: tossIn, outputRange: tossY });
  const scale = tossAnim.interpolate({ inputRange: tossIn, outputRange: tossScale });

  return (
    <View style={styles.root}>
      {/* Coin stage */}
      <LinearGradient colors={['#001A33', '#002A52', '#0B3F70']} style={styles.stage}>
        <View style={styles.coinArea}>
          <Animated.View style={[styles.coinWrapper, { transform: [{ translateY }, { scale }] }]}>
            <Animated.View style={[styles.coinSpin, { transform: [{ perspective: 900 }, { rotateX }] }]}>
              <Animated.View style={[styles.face, { opacity: headsOpacity }]}>
                <CoinFace side="heads" size={COIN_SIZE} skin={skin} />
              </Animated.View>
              <Animated.View style={[styles.face, styles.tailFace, { opacity: tailsOpacity }]}>
                <CoinFace side="tails" size={COIN_SIZE} skin={skin} />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.shine, { opacity: shine }]} />
            </Animated.View>
          </Animated.View>
        </View>

        {/* Status pill: same size in every state so the layout never jumps */}
        <View style={[styles.statusPill, status.tint && { backgroundColor: status.tint }]}>
          <Ionicons name={status.icon as any} size={16} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>{status.text}</Text>
        </View>
      </LinearGradient>

      {/* Choice selector */}
      <View style={styles.choiceSection}>
        <Text style={styles.choiceLabel}>YOUR BET</Text>
        <View style={styles.segment}>
          {(['heads', 'tails'] as Side[]).map(side => {
            const active = choice === side;
            return (
              <TouchableOpacity
                key={side}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setChoice(side)}
                disabled={isFlipping}
                activeOpacity={0.8}
              >
                {active && <Ionicons name="checkmark" size={16} color="white" />}
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{side.toUpperCase()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Earn info */}
      <View style={styles.earnRow}>
        <Ionicons name="wallet" size={14} color="#F9A825" />
        <Text style={styles.earnText}>Win <Text style={styles.earnBold}>+{GAME_CONFIG.coin.winCoins}</Text> · Lose <Text style={styles.earnBold}>+{GAME_CONFIG.coin.loseCoins}</Text> coins per flip</Text>
      </View>

      {/* Flip button */}
      <TouchableOpacity
        style={[styles.flipBtn, isFlipping && styles.flipBtnDisabled]}
        onPress={flipCoin}
        disabled={isFlipping}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={isFlipping ? ['#9e9e9e', '#757575'] : ['#FF8C42', '#FF5E00']}
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
  root: { width: '100%', gap: 12 },

  // Stage
  stage: {
    borderRadius: BORDER_RADIUS.xl,
    paddingTop: TOSS_HEIGHT + 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  coinArea: { width: COIN_SIZE, height: COIN_SIZE, alignItems: 'center' },
  coinWrapper: { width: COIN_SIZE, height: COIN_SIZE },
  coinSpin: { width: COIN_SIZE, height: COIN_SIZE },
  face: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
  },
  tailFace: { transform: [{ rotateX: '180deg' }] },
  shine: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    backgroundColor: '#FFFFFF',
  },

  statusPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 32, minWidth: 220, maxWidth: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14 },
  statusText: { ...TYPOGRAPHY.captionBold, letterSpacing: 0.5, flexShrink: 1 },

  // Choice
  choiceSection: { gap: 6 },
  choiceLabel: { ...TYPOGRAPHY.smallBold, color: COLORS.textSecondary, textAlign: 'center', letterSpacing: 2 },
  segment: { flexDirection: 'row', backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: BORDER_RADIUS.sm + 2 },
  segmentBtnActive: { backgroundColor: COLORS.primary, ...SHADOWS.small },
  segmentText: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5, color: COLORS.textSecondary },
  segmentTextActive: { color: 'white' },

  // Earn info
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  earnText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },
  earnBold: { color: '#F9A825', fontWeight: 'bold' },

  // Flip button
  flipBtn: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden', ...SHADOWS.medium },
  flipBtnDisabled: { opacity: 0.6 },
  flipBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 32 },
  flipBtnText: { fontSize: 18, fontWeight: '900', color: 'white', letterSpacing: 1 },

  // Stats row
  statsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, ...SHADOWS.card },
  statChipText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '600' },
});

export default CoinToss;
