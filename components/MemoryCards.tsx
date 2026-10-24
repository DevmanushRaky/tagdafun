import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, Easing, Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useBackgroundMusic } from '../utils/sound';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG, coinsForStars } from '../constants/gameConfig';
import StarRewardTiers from './StarRewardTiers';
import { logGame } from '../utils/gameHistory';
import { showRewardedAd } from '../services/rewardedAd';
import { useShop } from '../contexts/ShopContext';
import { cardBackColors } from '../constants/shop';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const LEVEL_KEY = '@tagdafun_memory_level_v1';
const MUSIC_KEY = '@tagdafun_memory_music_v1';
const MUSIC_VOLUME = 0.35;     // background melody stays soft under the game
const STARS_KEY = '@tagdafun_memory_stars_v1';

const CARD_GAP = 8;
const MAX_CARD = 84;
const BOARD_SIDE = SPACING.md;     // matches the game screen's own padding

// Height used by everything around the board on the game screen, so the board fills the rest
// and the Hint button is visible without scrolling: game header, padding, stats bar, stars row,
// hint button, the native ad under the game (100px) and some breathing room.
const CHROME_H = 52 + 16 + 38 + 34 + 16 + 86 + 100 + 16;
const BOMB_HINT_H = 34;
const FLIP_MS = 260;
const MISMATCH_HOLD_MS = 450;   // both cards stay visible this long before flipping back
const BOMB_PENALTY_MOVES = 2;
const HINTS_PER_LEVEL = 2;     // each hint costs one rewarded ad
const HINT_REVEAL_MS = 3000;   // how long every card stays face up

// ── Levels ──────────────────────────────────────────────────────────────────
// Grids are always completely filled: pairs * 2 + bombs === cols * rows.
interface LevelSpec { cols: number; rows: number; pairs: number; bombs: number }

// Always 4 per row and at most 5 rows, so the Hint button stays on screen.
const LEVELS: LevelSpec[] = [
  { cols: 4, rows: 3, pairs: 6, bombs: 0 },
  { cols: 4, rows: 4, pairs: 8, bombs: 0 },
  { cols: 4, rows: 4, pairs: 7, bombs: 2 },
  { cols: 4, rows: 5, pairs: 9, bombs: 2 },
  { cols: 4, rows: 5, pairs: 8, bombs: 4 },    // and every level after this
];

const specFor = (level: number) => LEVELS[Math.min(level, LEVELS.length) - 1];

// 3★ / 2★ move limits; anything above the 2★ limit is 1★.
const starLimits = (pairs: number) => ({ three: Math.ceil(pairs * 1.6), two: Math.ceil(pairs * 2.4) });
const starsFor = (moves: number, pairs: number) => {
  const { three, two } = starLimits(pairs);
  return moves <= three ? 3 : moves <= two ? 2 : 1;
};

const CARD_ICONS: { icon: string; color: string }[] = [
  { icon: 'game-controller', color: '#A55EEA' },
  { icon: 'star',            color: '#F5B820' },
  { icon: 'flash',           color: '#FF6B00' },
  { icon: 'trophy',          color: '#C98A10' },
  { icon: 'flame',           color: '#E74C3C' },
  { icon: 'rocket',          color: '#00B4D8' },
  { icon: 'heart',           color: '#FF4778' },
  { icon: 'diamond',         color: '#1E90FF' },
  { icon: 'musical-notes',   color: '#8E44AD' },
  { icon: 'leaf',            color: '#2ED573' },
  { icon: 'planet',          color: '#5352ED' },
  { icon: 'football',        color: '#2F3542' },
];

interface Card {
  id: number;
  pairId: number;     // -1 for a bomb
  icon: string;
  color: string;
  bomb: boolean;
}

interface CardAnims {
  flip: Animated.Value;     // 0 face down → 1 face up
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  shake: Animated.Value;
  opacity: Animated.Value;
  glow: Animated.Value;     // matched highlight
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const buildDeck = (spec: LevelSpec): Card[] => {
  const icons = shuffle(CARD_ICONS).slice(0, spec.pairs);
  const cards: Card[] = [];
  icons.forEach((c, i) => {
    cards.push({ id: i * 2, pairId: i, icon: c.icon, color: c.color, bomb: false });
    cards.push({ id: i * 2 + 1, pairId: i, icon: c.icon, color: c.color, bomb: false });
  });
  for (let b = 0; b < spec.bombs; b++) {
    cards.push({ id: 1000 + b, pairId: -1, icon: 'bomb', color: '#FF4757', bomb: true });
  }
  return shuffle(cards);
};

const cardSizeFor = (spec: LevelSpec, safeH: number) => {
  const boardMaxH = SCREEN_H - safeH - CHROME_H - (spec.bombs > 0 ? BOMB_HINT_H : 0);
  const byWidth = (SCREEN_W - BOARD_SIDE * 2 - CARD_GAP * (spec.cols - 1)) / spec.cols;
  const byHeight = (boardMaxH - CARD_GAP * (spec.rows - 1)) / spec.rows;
  return Math.floor(Math.min(byWidth, byHeight, MAX_CARD));
};

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const run = (anim: Animated.CompositeAnimation) => new Promise<void>(r => anim.start(() => r()));

// ── Card ────────────────────────────────────────────────────────────────────
const CardView = memo(({ card, anims, size, hint, back, onPress }: {
  card: Card; anims: CardAnims; size: number; hint: Animated.Value; back: [string, string]; onPress: (id: number) => void;
}) => {
  const press = useRef(new Animated.Value(1)).current;
  const backRotate = anims.flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const frontRotate = anims.flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const backOpacity = anims.flip.interpolate({ inputRange: [0.49, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const frontOpacity = anims.flip.interpolate({ inputRange: [0.49, 0.5], outputRange: [0, 1], extrapolate: 'clamp' });
  const iconSize = Math.round(size * 0.42);

  return (
    <Animated.View
      style={[
        styles.cardSlot,
        {
          width: size,
          height: size,
          opacity: anims.opacity,
          transform: [
            { translateX: Animated.add(anims.x, anims.shake) },
            { translateY: anims.y },
            { scale: Animated.multiply(anims.scale, press) },
          ],
        },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => onPress(card.id)}
        onPressIn={() => Animated.spring(press, { toValue: 0.94, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()}
      >
        {/* Back */}
        <Animated.View style={[styles.face, { opacity: backOpacity, transform: [{ perspective: 700 }, { rotateY: backRotate }] }]}>
          <LinearGradient colors={back} style={styles.faceFill}>
            <View style={[styles.backInset, { borderRadius: BORDER_RADIUS.md - 4 }]}>
              <Text style={[styles.backMark, { fontSize: Math.round(size * 0.34) }]}>?</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Front */}
        <Animated.View style={[styles.face, { opacity: frontOpacity, transform: [{ perspective: 700 }, { rotateY: frontRotate }] }]}>
          {card.bomb ? (
            <LinearGradient colors={['#FF6B6B', '#C0392B']} style={styles.faceFill}>
              <MaterialCommunityIcons name="bomb" size={iconSize + 4} color="white" />
            </LinearGradient>
          ) : (
            <View style={[styles.faceFill, styles.frontBg]}>
              <View style={[styles.iconTile, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.18, backgroundColor: card.color + '1F' }]}>
                <Ionicons name={card.icon as any} size={iconSize} color={card.color} />
              </View>
              <Animated.View pointerEvents="none" style={[styles.matchGlow, { opacity: anims.glow }]}>
                <View style={styles.matchBadge}>
                  <Ionicons name="checkmark" size={11} color="white" />
                </View>
              </Animated.View>
            </View>
          )}
          {/* Blue ring while a hint is showing the card (not on pairs already found) */}
          <Animated.View pointerEvents="none" style={[styles.hintRing, { opacity: Animated.multiply(hint, Animated.subtract(1, anims.glow)) }]} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

// ── Explosion ───────────────────────────────────────────────────────────────
const SHARDS = Array.from({ length: 14 }, (_, i) => ({
  angle: (i / 14) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12),
  dist: 46 + (i % 3) * 16,
  color: ['#FFD23F', '#FF7A1A', '#FF4757', '#FFFFFF'][i % 4],
  spin: (i % 2 ? 1 : -1) * (180 + i * 25),
}));

const Explosion: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  const flashScale = p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1.3, 1.6] });
  const flashOpacity = p.interpolate({ inputRange: [0, 0.12, 0.45], outputRange: [0, 0.9, 0], extrapolate: 'clamp' });

  return (
    <View pointerEvents="none" style={[styles.explosion, { left: x, top: y }]}>
      <Animated.View style={[styles.flash, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]} />
      {SHARDS.map((s, i) => (
        <Animated.View
          key={i}
          style={[
            styles.shard,
            {
              backgroundColor: s.color,
              opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.8, 0] }),
              transform: [
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.angle) * s.dist] }) },
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(s.angle) * s.dist] }) },
                { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${s.spin}deg`] }) },
                { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1.1, 0.4] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

// ── Game ────────────────────────────────────────────────────────────────────
interface MemoryCardsProps {
  onWin: () => void;
}

const MemoryCards: React.FC<MemoryCardsProps> = ({ onWin }) => {
  const { stats, recordGame } = useGameStats();
  const { shop, consumePowerUp } = useShop();
  const back = cardBackColors(shop.cardBack);
  const ownedHints = shop.powerUps.memoryHint;
  const insets = useSafeAreaInsets();
  const safeH = insets.top + insets.bottom;
  const [level, setLevel] = useState<number | null>(null);
  const [deck, setDeck] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [bestStars, setBestStars] = useState<Record<number, number>>({});
  const [explosion, setExplosion] = useState<{ x: number; y: number; key: number } | null>(null);
  const [toast, setToast] = useState('');
  // Bumped for every new deal so the board remounts with fresh cards and animation values.
  const [round, setRound] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(HINTS_PER_LEVEL);
  const [hintLoading, setHintLoading] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const hintPulse = useRef(new Animated.Value(1)).current;
  const hintGlow = useRef(new Animated.Value(0)).current;
  const hintTimer = useRef(new Animated.Value(1)).current;

  const animsRef = useRef<Record<number, CardAnims>>({});
  const slotOfRef = useRef<Record<number, number>>({});   // card id → grid slot
  const firstRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const matchedRef = useRef<Set<number>>(new Set());
  const faceUpRef = useRef<Set<number>>(new Set());
  const movesRef = useRef(0);
  const gridShake = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const starAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  const spec = specFor(level ?? 1);
  const size = cardSizeFor(spec, safeH);
  const gridW = spec.cols * size + (spec.cols - 1) * CARD_GAP;
  const gridH = spec.rows * size + (spec.rows - 1) * CARD_GAP;
  const slotXY = (slot: number) => ({
    x: (slot % spec.cols) * (size + CARD_GAP),
    y: Math.floor(slot / spec.cols) * (size + CARD_GAP),
  });

  const startLevel = useCallback((lvl: number) => {
    const s = specFor(lvl);
    const cs = cardSizeFor(s, safeH);
    const newDeck = buildDeck(s);
    const anims: Record<number, CardAnims> = {};
    const slots: Record<number, number> = {};
    newDeck.forEach((c, slot) => {
      slots[c.id] = slot;
      anims[c.id] = {
        flip: new Animated.Value(0),
        x: new Animated.Value((slot % s.cols) * (cs + CARD_GAP)),
        y: new Animated.Value(Math.floor(slot / s.cols) * (cs + CARD_GAP)),
        scale: new Animated.Value(0),
        shake: new Animated.Value(0),
        opacity: new Animated.Value(1),
        glow: new Animated.Value(0),
      };
    });
    animsRef.current = anims;
    slotOfRef.current = slots;
    firstRef.current = null;
    busyRef.current = false;
    matchedRef.current = new Set();
    faceUpRef.current = new Set();
    movesRef.current = 0;
    starAnims.forEach(a => a.setValue(0));
    setDeck(newDeck);
    setMoves(0);
    setMatchedCount(0);
    setSeconds(0);
    setRunning(false);
    setWon(false);
    setExplosion(null);
    setLevel(lvl);
    setRound(r => r + 1);
    setHintsLeft(HINTS_PER_LEVEL);
    setHintLoading(false);
    setRevealing(false);
    hintGlow.setValue(0);

    // Deal the cards in with a light stagger.
    Animated.stagger(28, newDeck.map(c =>
      Animated.spring(anims[c.id].scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 7 }),
    )).start();
  }, [safeH]);

  // Load saved level and stars
  useEffect(() => {
    Promise.all([AsyncStorage.getItem(LEVEL_KEY), AsyncStorage.getItem(STARS_KEY)]).then(([lvl, st]) => {
      if (st) { try { setBestStars(JSON.parse(st)); } catch {} }
      startLevel(Math.max(1, parseInt(lvl ?? '1', 10) || 1));
    });
  }, []);

  // Soft looping melody; it pauses while an ad is playing and when switched off.
  const { musicOn, toggleMusic } = useBackgroundMusic(require('../assets/sounds/memory-music.m4a'), MUSIC_KEY, {
    active: level !== null && !hintLoading,
    volume: MUSIC_VOLUME,
  });

  // Timer starts on the first flip and stops on a win.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const flip = (id: number, toValue: 0 | 1) => {
    if (toValue) faceUpRef.current.add(id); else faceUpRef.current.delete(id);
    return run(Animated.timing(animsRef.current[id].flip, { toValue, duration: FLIP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
  };

  const addMoves = (n: number) => {
    movesRef.current += n;
    setMoves(movesRef.current);
  };

  const showToast = (text: string, holdMs = 1100) => {
    setToast(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(holdMs),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const popCards = (ids: number[]) => Promise.all(ids.map(id => {
    const a = animsRef.current[id];
    return run(Animated.parallel([
      Animated.sequence([
        Animated.timing(a.scale, { toValue: 1.12, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(a.scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 }),
      ]),
      Animated.timing(a.glow, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]));
  }));

  const shakeCards = (ids: number[]) => Promise.all(ids.map(id => {
    const s = animsRef.current[id].shake;
    return run(Animated.sequence([6, -6, 4, -3, 0].map(v =>
      Animated.timing(s, { toValue: v, duration: 45, useNativeDriver: true }),
    )));
  }));

  const finishLevel = async (lvl: number, pairs: number) => {
    setRunning(false);
    const stars = starsFor(movesRef.current, pairs);
    setEarnedStars(stars);
    // The only vibration in this game: clearing a level.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const nextBest = { ...bestStars, [lvl]: Math.max(bestStars[lvl] ?? 0, stars) };
    setBestStars(nextBest);
    AsyncStorage.setItem(STARS_KEY, JSON.stringify(nextBest)).catch(() => {});
    AsyncStorage.setItem(LEVEL_KEY, String(lvl + 1)).catch(() => {});

    // Celebration wave across the board, then the result card.
    const ids = Object.keys(slotOfRef.current).map(Number).sort((a, b) => slotOfRef.current[a] - slotOfRef.current[b]);
    await run(Animated.stagger(35, ids.map(id => Animated.sequence([
      Animated.timing(animsRef.current[id].scale, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(animsRef.current[id].scale, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]))));
    setWon(true);
    Animated.stagger(180, starAnims.map(a =>
      Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }),
    )).start();

    const coins = coinsForStars(stars);
    await recordGame('memory', undefined, coins);
    await logGame({
      gameType: 'memory',
      costCoins: 0,
      earnedCoins: coins,
      netCoins: coins,
      memoryLevel: lvl,
      stars,
      timestamp: Date.now(),
    });
    onWin();
  };

  const explode = async (bombId: number) => {
    const a = animsRef.current[bombId];
    // Let the player see the bomb before it goes off.
    await wait(450);

    const { x, y } = slotXY(slotOfRef.current[bombId]);
    setExplosion({ x: x + size / 2, y: y + size / 2, key: Date.now() });
    addMoves(BOMB_PENALTY_MOVES);
    showToast(`BOOM! Cards shuffled · +${BOMB_PENALTY_MOVES} moves`, 2600);

    await run(Animated.parallel([
      Animated.timing(a.scale, { toValue: 1.4, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(a.opacity, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.sequence([10, -9, 7, -5, 3, 0].map(v =>
        Animated.timing(gridShake, { toValue: v, duration: 70, useNativeDriver: true }),
      )),
    ]));

    // Turn back any card that was waiting for its pair; the bomb reforms face down.
    const first = firstRef.current;
    firstRef.current = null;
    if (first !== null) await flip(first, 0);
    faceUpRef.current.delete(bombId);
    a.flip.setValue(0);
    a.scale.setValue(0.6);
    await wait(300);

    // Gather the unmatched cards in the middle, then deal them out to new spots.
    const loose = Object.keys(slotOfRef.current).map(Number)
      .filter(id => !matchedRef.current.has(id));
    const centre = { x: gridW / 2 - size / 2, y: gridH / 2 - size / 2 };
    await run(Animated.parallel(loose.map(id => {
      const c = animsRef.current[id];
      return Animated.parallel([
        Animated.timing(c.x, { toValue: centre.x, duration: 560, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(c.y, { toValue: centre.y, duration: 560, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(c.scale, { toValue: 0.85, duration: 560, useNativeDriver: true }),
      ]);
    })));
    a.opacity.setValue(1);
    await wait(220);

    const slots = shuffle(loose.map(id => slotOfRef.current[id]));
    loose.forEach((id, i) => { slotOfRef.current[id] = slots[i]; });
    await run(Animated.stagger(55, loose.map(id => {
      const c = animsRef.current[id];
      const to = slotXY(slotOfRef.current[id]);
      return Animated.parallel([
        Animated.timing(c.x, { toValue: to.x, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(c.y, { toValue: to.y, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(c.scale, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 6 }),
      ]);
    })));

    setExplosion(null);
    busyRef.current = false;
  };

  const handlePress = useCallback(async (id: number) => {
    if (busyRef.current || won || level === null) return;
    const card = deck.find(c => c.id === id);
    if (!card || faceUpRef.current.has(id) || matchedRef.current.has(id)) return;
    if (!running) setRunning(true);

    if (card.bomb) {
      busyRef.current = true;
      await flip(id, 1);
      await explode(id);
      return;
    }

    const first = firstRef.current;
    if (first === null) {
      firstRef.current = id;
      flip(id, 1);
      return;
    }

    // Second card: lock the board until this pair is resolved.
    busyRef.current = true;
    firstRef.current = null;
    addMoves(1);
    await flip(id, 1);

    const firstCard = deck.find(c => c.id === first)!;
    if (firstCard.pairId === card.pairId) {
      matchedRef.current.add(first);
      matchedRef.current.add(id);
      await popCards([first, id]);
      const pairsDone = matchedRef.current.size / 2;
      setMatchedCount(pairsDone);
      if (pairsDone === spec.pairs) {
        await finishLevel(level, spec.pairs);
        return;
      }
      busyRef.current = false;
    } else {
      await wait(MISMATCH_HOLD_MS);
      await shakeCards([first, id]);
      await Promise.all([flip(first, 0), flip(id, 0)]);
      busyRef.current = false;
    }
  }, [deck, level, running, won, spec, bestStars]);

  // Hint: after a rewarded ad, every card still in play is shown for a moment.
  const showHint = async () => {
    if (busyRef.current || won || hintsLeft <= 0 || hintLoading) return;
    busyRef.current = true;
    const wasRunning = running;

    // A hint bought in the Shop is used first; otherwise it costs a rewarded ad.
    let result: 'rewarded' | 'closed' | 'unavailable' = 'rewarded';
    if (!consumePowerUp('memoryHint')) {
      setHintLoading(true);
      setRunning(false);   // the clock doesn't tick while the ad is on screen
      result = await showRewardedAd();
      setHintLoading(false);
      // Expo Go and dev builds usually have no ad fill; let the hint through so it can be tested.
      if (result === 'unavailable' && __DEV__) result = 'rewarded';
      if (wasRunning) setRunning(true);
    }

    if (result !== 'rewarded') {
      showToast(result === 'closed' ? 'Watch the whole ad to get the hint' : 'No ad available right now, try again soon');
      busyRef.current = false;
      return;
    }

    setHintsLeft(h => h - 1);
    if (!wasRunning) setRunning(true);
    // Reveal as a ripple from the middle of the board outward.
    const mid = { x: gridW / 2, y: gridH / 2 };
    const dist = (id: number) => {
      const p = slotXY(slotOfRef.current[id]);
      return Math.hypot(p.x + size / 2 - mid.x, p.y + size / 2 - mid.y);
    };
    const hidden = Object.keys(slotOfRef.current).map(Number)
      .filter(id => !matchedRef.current.has(id) && !faceUpRef.current.has(id))
      .sort((a, b) => dist(a) - dist(b));

    setRevealing(true);
    hintTimer.setValue(1);
    Animated.timing(hintGlow, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    await run(Animated.stagger(30, hidden.map(id => {
      const a = animsRef.current[id];
      return Animated.parallel([
        Animated.timing(a.flip, { toValue: 1, duration: FLIP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(a.scale, { toValue: 1.06, duration: FLIP_MS / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.spring(a.scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }),
        ]),
      ]);
    })));

    // Countdown (bar + seconds) while the cards are visible; the board frame breathes.
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(hintPulse, { toValue: 0.45, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(hintPulse, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    pulse.start();
    let left = Math.round(HINT_REVEAL_MS / 1000);
    setHintCount(left);
    const tick = setInterval(() => { left -= 1; if (left > 0) setHintCount(left); }, 1000);
    await run(Animated.timing(hintTimer, { toValue: 0, duration: HINT_REVEAL_MS, easing: Easing.linear, useNativeDriver: true }));
    clearInterval(tick);
    pulse.stop();
    hintPulse.setValue(1);

    Animated.timing(hintGlow, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    await run(Animated.stagger(20, [...hidden].reverse().map(id => Animated.timing(animsRef.current[id].flip, {
      toValue: 0, duration: FLIP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true,
    }))));
    setRevealing(false);
    busyRef.current = false;
  };

  // Close the result card first so the new deal-in animation is actually seen.
  const dealAfterModal = (lvl: number) => {
    setWon(false);
    setTimeout(() => startLevel(lvl), 250);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (level === null) return <View style={styles.root} />;

  const { three, two } = starLimits(spec.pairs);
  const liveStars = starsFor(moves, spec.pairs);
  const nextLimit = liveStars === 3 ? three : liveStars === 2 ? two : null;
  const toastY = toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });

  return (
    <View style={styles.root}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={[styles.statPill, styles.levelPill]}>
          <Text style={styles.levelPillText}>Level {level}</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="swap-horizontal" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statPillText}>{moves} moves</Text>
        </View>
        <View style={styles.statPill}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.statPillText}>{formatTime(seconds)}</Text>
        </View>
        <TouchableOpacity style={[styles.statPill, styles.musicPill]} onPress={toggleMusic} activeOpacity={0.7}>
          <Ionicons name={musicOn ? 'musical-notes' : 'volume-mute'} size={15} color={musicOn ? '#0077B6' : COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Live stars */}
      <View style={styles.starsRow}>
        {[1, 2, 3].map(n => (
          <Ionicons key={n} name="star" size={20} color={n <= liveStars ? '#F5B820' : '#DADDE1'} />
        ))}
        <Text style={styles.starsHint}>
          {nextLimit !== null ? `Keep ${liveStars}★ within ${nextLimit} moves` : 'Finish the board to win'}
          {'  ·  '}{matchedCount}/{spec.pairs} pairs
        </Text>
      </View>

      {spec.bombs > 0 && (
        <View style={styles.bombHint}>
          <MaterialCommunityIcons name="bomb" size={15} color="#E74C3C" />
          <Text style={styles.bombHintText}>
            {spec.bombs === 1 ? 'A bomb is hiding' : `${spec.bombs} bombs are hiding`} — it shuffles the cards
          </Text>
        </View>
      )}

      {/* Board */}
      <Animated.View key={round} style={[styles.board, { width: gridW, height: gridH, transform: [{ translateX: gridShake }] }]}>
        <Animated.View pointerEvents="none" style={[styles.boardGlow, { opacity: Animated.multiply(hintGlow, hintPulse) }]} />
        {deck.map(card => (
          <CardView key={card.id} card={card} anims={animsRef.current[card.id]} size={size} hint={hintGlow} back={back} onPress={handlePress} />
        ))}
        {explosion && <Explosion key={explosion.key} x={explosion.x} y={explosion.y} />}
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastY }] }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
        {revealing && (
          <Animated.View pointerEvents="none" style={[styles.revealPill, { opacity: hintGlow }]}>
            <Ionicons name="eye" size={14} color="white" />
            <Text style={styles.revealText}>Memorize!</Text>
            <Text style={styles.revealCount}>{hintCount}</Text>
            <View style={styles.revealTrack}>
              <Animated.View style={[styles.revealFill, { transform: [{ scaleX: hintTimer }] }]} />
            </View>
          </Animated.View>
        )}
      </Animated.View>

      {/* Hint */}
      <TouchableOpacity
        style={[styles.hintBtn, (hintsLeft <= 0 || won) && styles.hintBtnOff]}
        onPress={showHint}
        disabled={hintsLeft <= 0 || hintLoading || revealing || won}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={hintsLeft > 0 ? ['#48CAE4', '#0077B6'] : ['#C9CED6', '#AEB4BE']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.hintGrad}
        >
          <View style={styles.hintIcon}>
            {hintLoading
              ? <ActivityIndicator size="small" color="white" />
              : <Ionicons name="eye" size={18} color="white" />}
          </View>
          <View style={styles.hintBody}>
            <Text style={styles.hintTitle}>{hintsLeft > 0 ? 'Hint' : 'No hints left'}</Text>
            <Text style={styles.hintSub} numberOfLines={1}>
              {hintsLeft > 0 ? `See all cards · ${HINT_REVEAL_MS / 1000}s` : `${HINTS_PER_LEVEL} new hints next level`}
            </Text>
          </View>
          {hintsLeft > 0 && (
            <View style={styles.adBadge}>
              {ownedHints > 0
                ? <Text style={styles.adBadgeText}>×{ownedHints}</Text>
                : <><Ionicons name="play" size={10} color="#0077B6" /><Text style={styles.adBadgeText}>AD</Text></>}
              <View style={styles.hintDots}>
                {Array.from({ length: HINTS_PER_LEVEL }, (_, i) => (
                  <View key={i} style={[styles.hintDot, i < hintsLeft && styles.hintDotOn]} />
                ))}
              </View>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Win Modal */}
      <Modal visible={won} transparent animationType="fade">
        <View style={styles.winOverlay}>
          <View style={styles.winCard}>
            <Text style={styles.winKicker}>LEVEL {level} COMPLETE</Text>

            <View style={styles.winStars}>
              {starAnims.map((a, i) => (
                <Animated.View
                  key={i}
                  style={{
                    transform: [
                      { scale: a },
                      { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
                      { translateY: i === 1 ? -10 : 0 },
                    ],
                  }}
                >
                  <Ionicons name="star" size={i === 1 ? 58 : 46} color={i < earnedStars ? '#F5B820' : '#E2E5E9'} />
                </Animated.View>
              ))}
            </View>

            <Text style={styles.winTitle}>{earnedStars === 3 ? 'Perfect!' : earnedStars === 2 ? 'Great job!' : 'You did it!'}</Text>
            <Text style={styles.winSub}>
              {moves} moves · {formatTime(seconds)}
              {earnedStars < 3 ? `  ·  3★ needs ${three} moves` : ''}
            </Text>

            {/* Coins reward */}
            <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.winRewardBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="wallet" size={20} color="white" />
              <Text style={styles.winRewardText}>+{coinsForStars(earnedStars)} Coins Earned!</Text>
            </LinearGradient>
            <StarRewardTiers stars={earnedStars} />

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
                <Text style={styles.winStatText}>{spec.pairs} pairs matched</Text>
              </View>
              <View style={styles.winStatChip}>
                <Ionicons name="star" size={14} color="#A55EEA" />
                <Text style={styles.winStatText}>+{GAME_CONFIG.memory.xpPerWin} XP</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.playAgainBtn} onPress={() => dealAfterModal(level + 1)} activeOpacity={0.85}>
              <LinearGradient colors={['#48CAE4', '#0077B6']} style={styles.playAgainGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.playAgainText}>Next Level</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => dealAfterModal(level)} activeOpacity={0.7} style={styles.replayBtn}>
              <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              <Text style={styles.replayText}>Replay level {level}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const FILL = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },

  statsBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, ...SHADOWS.card },
  statPillText: { ...TYPOGRAPHY.small, color: COLORS.text, fontWeight: '600' },
  levelPill: { backgroundColor: '#0077B6' },
  levelPillText: { ...TYPOGRAPHY.small, color: 'white', fontWeight: '800' },
  musicPill: { paddingHorizontal: 9 },

  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10, height: 24 },
  starsHint: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '600', marginLeft: 6 },

  bombHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(231,76,60,0.08)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  bombHintText: { fontSize: 12, fontWeight: '600', color: '#C0392B' },

  board: { marginTop: SPACING.md },
  cardSlot: { position: 'absolute', left: 0, top: 0 },
  face: { ...FILL, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backfaceVisibility: 'hidden' },
  faceFill: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  backInset: { ...FILL, margin: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  backMark: { fontWeight: '900', color: 'rgba(255,255,255,0.22)' },
  frontBg: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  iconTile: { justifyContent: 'center', alignItems: 'center' },
  matchGlow: { ...FILL, borderRadius: BORDER_RADIUS.md, borderWidth: 2, borderColor: '#2ED573', backgroundColor: 'rgba(46,213,115,0.08)' },
  matchBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#2ED573', justifyContent: 'center', alignItems: 'center' },

  explosion: { position: 'absolute', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  flash: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFD23F' },
  shard: { position: 'absolute', width: 10, height: 5, borderRadius: 2 },

  toast: { position: 'absolute', top: -6, alignSelf: 'center', backgroundColor: 'rgba(0,26,51,0.92)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 7 },
  toastText: { fontSize: 13, fontWeight: '800', color: 'white' },

  boardGlow: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: BORDER_RADIUS.lg, borderWidth: 2, borderColor: '#48CAE4', backgroundColor: 'rgba(72,202,228,0.10)' },
  revealPill: { position: 'absolute', top: -20, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0077B6', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, ...SHADOWS.card },
  revealText: { fontSize: 13, fontWeight: '800', color: 'white' },
  revealCount: { fontSize: 13, fontWeight: '900', color: 'white', minWidth: 10, textAlign: 'center' },
  hintRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: BORDER_RADIUS.md, borderWidth: 2.5, borderColor: '#48CAE4' },
  revealTrack: { width: 70, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  revealFill: { width: 70, height: 5, borderRadius: 3, backgroundColor: 'white', transformOrigin: 'left' },

  hintBtn: { width: Math.round(SCREEN_W * 0.78), marginTop: SPACING.lg, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  hintBtnOff: { opacity: 0.75 },
  hintGrad: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  hintIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  hintBody: { flex: 1 },
  hintTitle: { fontSize: 16, fontWeight: '800', color: 'white' },
  hintSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.88)', marginTop: 1 },
  adBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'white', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  adBadgeText: { fontSize: 11, fontWeight: '900', color: '#0077B6', letterSpacing: 0.5 },
  hintDots: { flexDirection: 'row', gap: 3, marginLeft: 4 },
  hintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,119,182,0.25)' },
  hintDotOn: { backgroundColor: '#0077B6' },

  winOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  winCard: { backgroundColor: COLORS.surface, borderRadius: 28, padding: SPACING.xl, paddingTop: SPACING.lg, alignItems: 'center', gap: 12, width: '100%', ...SHADOWS.medium },
  winKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: '#0077B6' },
  winStars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 76 },
  winTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  winSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  winRewardBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 20, paddingVertical: 12, width: '100%', justifyContent: 'center' },
  winRewardText: { fontSize: 17, fontWeight: '800', color: 'white' },
  winBalanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, paddingVertical: 12 },
  winBalanceLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  winBalancePill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  winBalance: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  winStatsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  winStatChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, paddingVertical: 8 },
  winStatText: { ...TYPOGRAPHY.small, fontWeight: '700', color: COLORS.textSecondary },
  playAgainBtn: { borderRadius: BORDER_RADIUS.full, overflow: 'hidden', width: '100%', marginTop: 4 },
  playAgainGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  playAgainText: { fontSize: 16, fontWeight: '800', color: 'white' },
  replayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  replayText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
});

export default MemoryCards;
