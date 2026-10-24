import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, Easing, Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { playSound, useBackgroundMusic } from '../utils/sound';
import { showRewardedAd } from '../services/rewardedAd';
import StarRewardTiers from './StarRewardTiers';
import { useShop } from '../contexts/ShopContext';
import { bottleTheme, type BottleTheme } from '../constants/shop';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG, coinsForStars } from '../constants/gameConfig';
import { logGame } from '../utils/gameHistory';
import {
  WATER_COLORS, BOTTLE_CAPACITY, Bottles, PourMove, cloneBottles, colorsForLevel,
  pourAmount, applyPour, isSolved, isCompleteBottle, generateLevel, suggestHint, waterStars,
  difficultyForLevel,
} from '../utils/waterSort';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const LEVEL_KEY = '@tagdafun_water_level_v1';
const PROGRESS_KEY = '@tagdafun_water_progress_v1';
const MUSIC_KEY = '@tagdafun_water_music_v1';

const MUSIC_VOLUME = 0.32;
const MUSIC_DUCKED = 0.08;      // under the win jingle and result card
const POUR_VOLUME = 0.35;       // the pour recording is bright; keep it under the music
const HINT_SHOW_MS = 3000;
const DEAL_STAGGER_MS = 55;     // bottles drop in one after another at level start
const CELEBRATE_STAGGER_MS = 60;
const DOT_GAP = 5;
const TRAVEL_MS = 380;          // lift + tilt before the liquid starts to flow

const BOTTLE_H = 130;
const NECK_H = 17;          // straight neck, no liquid
const LIQ_TOP = 37;         // where the shoulder ends and the liquid column starts
const BOTTOM_PAD = 5;
const LAYER_H = (BOTTLE_H - LIQ_TOP - BOTTOM_PAD) / BOTTLE_CAPACITY;
const SIDE = 1.5;           // half the glass outline width
const BOTTLE_GAP = 12;
const ROW_GAP = 22;
const BOARD_PAD_TOP = 24;
const BOARD_PAD_BOTTOM = 12;
const TILT_DEG = 68;
const TILT_RAD = (TILT_DEG * Math.PI) / 180;
const STREAM_W = 6;

interface SavedProgress {
  level: number;
  bottles: Bottles;
  initial: Bottles;
  par: number;
  moves: number;
  addedBottle: boolean;
}

/** Everything the animation needs to know about one pour in flight. */
interface PourFx {
  from: number;
  to: number;
  color: number;
  count: number;
  dx: number;
  dy: number;
  dir: 1 | -1;
  streamX: number;
  streamTop: number;
  streamH: number;
}

interface Slot { x: number; y: number }

// ── Bottle glass (shaped neck + shoulders, drawn with SVG) ──────────────────
const neckWidth = (w: number) => Math.round(w * 0.6);

const bottlePath = (w: number, closed: boolean): string => {
  const nw = neckWidth(w);
  const x0 = (w - nw) / 2;
  const x1 = x0 + nw;
  const R = 20;
  const sh = LIQ_TOP - NECK_H;
  const d = [
    `M ${x0} ${SIDE}`,
    `L ${x0} ${NECK_H}`,
    `C ${x0} ${NECK_H + sh * 0.55} ${SIDE} ${NECK_H + sh * 0.3} ${SIDE} ${LIQ_TOP}`,
    `L ${SIDE} ${BOTTLE_H - R}`,
    `Q ${SIDE} ${BOTTLE_H - SIDE} ${SIDE + R} ${BOTTLE_H - SIDE}`,
    `L ${w - SIDE - R} ${BOTTLE_H - SIDE}`,
    `Q ${w - SIDE} ${BOTTLE_H - SIDE} ${w - SIDE} ${BOTTLE_H - R}`,
    `L ${w - SIDE} ${LIQ_TOP}`,
    `C ${w - SIDE} ${NECK_H + sh * 0.3} ${x1} ${NECK_H + sh * 0.55} ${x1} ${NECK_H}`,
    `L ${x1} ${SIDE}`,
  ].join(' ');
  return closed ? `${d} Z` : d;
};

/** Translucent glass body, sits behind the liquid. */
const GlassBack: React.FC<{ width: number; fill: string }> = ({ width, fill }) => (
  <Svg width={width} height={BOTTLE_H} style={StyleSheet.absoluteFill} pointerEvents="none">
    <Path d={bottlePath(width, true)} fill={fill} />
  </Svg>
);

/** Outline, lip and gloss streaks, sits in front of the liquid. */
const GlassFront: React.FC<{ width: number; stroke: string; strokeWidth: number; plain?: boolean; lip?: string }> = ({
  width, stroke, strokeWidth, plain, lip = 'rgba(110,130,150,0.6)',
}) => {
  const nw = neckWidth(width);
  const x0 = (width - nw) / 2;
  return (
    <Svg width={width} height={BOTTLE_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={bottlePath(width, false)} stroke={stroke} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
      {!plain && (
        <>
          <Rect x={x0 - 3} y={0} width={nw + 6} height={7} rx={3.5} fill={lip} />
          <Rect x={x0 + 2} y={1.5} width={nw - 4} height={2} rx={1} fill="rgba(255,255,255,0.75)" />
          <Path d={`M ${x0 + 4} 10 L ${x0 + 4} ${NECK_H - 2}`} stroke="rgba(255,255,255,0.7)" strokeWidth={2.5} strokeLinecap="round" />
          <Path d={`M 7 ${LIQ_TOP + 6} L 7 ${BOTTLE_H - 32}`} stroke="rgba(255,255,255,0.7)" strokeWidth={4} strokeLinecap="round" />
          <Path d={`M ${width - 7} ${LIQ_TOP + 16} L ${width - 7} ${BOTTLE_H - 44}`} stroke="rgba(255,255,255,0.28)" strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
};

// ── One bottle ─────────────────────────────────────────────────────────────
interface BottleViewProps {
  bottle: number[];
  theme: BottleTheme;
  width: number;
  selected: boolean;
  hinted: boolean;
  shakeToken: number;
  role: 'source' | 'target' | null;
  fx: PourFx | null;
  travel: Animated.Value;
  tilt: Animated.Value;
  flow: Animated.Value;
  disabled: boolean;
  enterDelay: number;
  celebrate: boolean;
  celebrateDelay: number;
  onPress: () => void;
}

// Little sparks that burst from the neck when a bottle is finished.
const SPARKS = Array.from({ length: 8 }, (_, i) => ({ angle: -Math.PI / 2 + ((i - 3.5) / 3.5) * 1.3, dist: 26 + (i % 2) * 10 }));

const LayerBlock: React.FC<{ colorIdx: number }> = ({ colorIdx }) => (
  <View style={[styles.layer, { backgroundColor: WATER_COLORS[colorIdx].hex, height: LAYER_H }]}>
    <View style={styles.layerSheen} />
    <Text style={styles.layerSymbol}>{WATER_COLORS[colorIdx].symbol}</Text>
  </View>
);

const BottleView: React.FC<BottleViewProps> = ({
  bottle, theme, width, selected, hinted, shakeToken, role, fx, travel, tilt, flow, disabled,
  enterDelay, celebrate, celebrateDelay, onPress,
}) => {
  const lift = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const cap = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;

  const complete = role === null && isCompleteBottle(bottle);
  const wasComplete = useRef(complete);

  // Drop in when the level is dealt.
  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay: enterDelay, tension: 120, friction: 9, useNativeDriver: true }).start();
  }, [enter]);

  // Sparks only when a bottle becomes finished during play, not when a saved board loads.
  useEffect(() => {
    if (complete && !wasComplete.current) {
      spark.setValue(0);
      Animated.timing(spark, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }
    wasComplete.current = complete;
  }, [complete, spark]);

  // Victory wave across the board.
  useEffect(() => {
    if (!celebrate) return;
    Animated.sequence([
      Animated.delay(celebrateDelay),
      Animated.timing(hop, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, tension: 160, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [celebrate, celebrateDelay, hop]);

  useEffect(() => {
    Animated.spring(lift, { toValue: selected ? 1 : 0, tension: 180, friction: 11, useNativeDriver: true }).start();
  }, [selected, lift]);

  useEffect(() => {
    Animated.spring(cap, { toValue: complete ? 1 : 0, tension: 120, friction: 7, useNativeDriver: true }).start();
  }, [complete, cap]);

  useEffect(() => {
    if (shakeToken === 0) return;
    Animated.sequence([
      Animated.timing(shake, { toValue: -7, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 7, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeToken, shake]);

  useEffect(() => {
    if (!hinted) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.2, duration: 420, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [hinted, glow]);

  const outCount = role === 'source' && fx ? fx.count : 0;
  const inCount = role === 'target' && fx ? fx.count : 0;
  const base = outCount > 0 ? bottle.slice(0, bottle.length - outCount) : bottle;
  const outgoing = outCount > 0 ? bottle.slice(bottle.length - outCount) : [];
  const incoming = inCount > 0 && fx ? Array.from({ length: inCount }, () => fx.color) : [];

  // Segments grow / shrink from their bottom edge: scaleY plus a half-height
  // translate keeps that edge pinned, and both run on the native driver.
  const segStyle = (n: number, from: number, to: number) => ({
    height: n * LAYER_H,
    transform: [
      { translateY: flow.interpolate({ inputRange: [0, 1], outputRange: [((1 - from) * n * LAYER_H) / 2, ((1 - to) * n * LAYER_H) / 2] }) },
      { scaleY: flow.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) },
    ],
  });

  const pourTransform = role === 'source' && fx
    ? [
        { translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [0, fx.dx] }) },
        { translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [0, fx.dy] }) },
        { rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${fx.dir * TILT_DEG}deg`] }) },
      ]
    : [];

  const capColor = complete ? WATER_COLORS[bottle[0]].hex : 'transparent';

  return (
    <Pressable onPress={onPress} disabled={disabled} style={{ width, height: BOTTLE_H }}>
      <Animated.View
        style={{
          width,
          height: BOTTLE_H,
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
            { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
            { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
            { translateX: shake },
            ...pourTransform,
          ],
        }}
      >
        <GlassBack width={width} fill={theme.glass} />

        {/* Liquid column, clipped to the rounded base */}
        <View style={styles.tube}>
          <View style={styles.liquidArea}>
            {base.map((c, i) => <LayerBlock key={`b${i}`} colorIdx={c} />)}
            {outgoing.length > 0 && (
              <Animated.View style={[styles.segment, segStyle(outgoing.length, 1, 0.001)]}>
                {outgoing.map((c, i) => <LayerBlock key={`o${i}`} colorIdx={c} />)}
              </Animated.View>
            )}
            {incoming.length > 0 && (
              <Animated.View style={[styles.segment, segStyle(incoming.length, 0.001, 1)]}>
                {incoming.map((c, i) => <LayerBlock key={`n${i}`} colorIdx={c} />)}
              </Animated.View>
            )}
          </View>
          {/* Cylinder shading */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(0,0,0,0.20)', 'rgba(255,255,255,0.0)', 'rgba(255,255,255,0.16)', 'rgba(0,0,0,0.18)']}
            locations={[0, 0.3, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <GlassFront
          width={width}
          stroke={selected ? '#1E90FF' : theme.stroke}
          lip={theme.lip}
          strokeWidth={selected ? 3.5 : 2.5}
        />

        {/* Finished-bottle lid */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lid,
            {
              left: (width - (neckWidth(width) + 10)) / 2,
              width: neckWidth(width) + 10,
              backgroundColor: capColor,
              opacity: cap,
              transform: [
                { translateY: cap.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { scale: cap.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              ],
            },
          ]}
        >
          <Ionicons name="checkmark" size={11} color="white" />
        </Animated.View>

        {hinted && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glow }]}>
            <GlassFront width={width} stroke="#FFC107" strokeWidth={6} plain />
          </Animated.View>
        )}

        {complete && (
          <View pointerEvents="none" style={[styles.sparkOrigin, { left: width / 2 }]}>
            {SPARKS.map((sp, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.spark,
                  {
                    backgroundColor: i % 2 ? '#FFD54F' : WATER_COLORS[bottle[0]].hex,
                    opacity: spark.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                    transform: [
                      { translateX: spark.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(sp.angle) * sp.dist] }) },
                      { translateY: spark.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(sp.angle) * sp.dist] }) },
                      { rotate: '45deg' },
                      { scale: spark.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.5] }) },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

// ── Splash where the stream hits the surface ────────────────────────────────
const DROPS = [
  { dx: -12, h: 14, delay: 0 }, { dx: 10, h: 18, delay: 90 }, { dx: -6, h: 22, delay: 170 },
  { dx: 14, h: 12, delay: 240 }, { dx: -15, h: 16, delay: 310 }, { dx: 5, h: 20, delay: 50 },
];

const Splash: React.FC<{ x: number; y: number; color: string; on: Animated.Value }> = ({ x, y, color, on }) => {
  const drops = useRef(DROPS.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = drops.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(DROPS[i].delay),
      Animated.timing(d, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ])));
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [drops]);

  return (
    <Animated.View pointerEvents="none" style={[styles.splash, { left: x, top: y, opacity: on }]}>
      {drops.map((d, i) => (
        <Animated.View
          key={i}
          style={[
            styles.drop,
            {
              backgroundColor: color,
              opacity: d.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 0.9, 0] }),
              transform: [
                { translateX: d.interpolate({ inputRange: [0, 1], outputRange: [0, DROPS[i].dx] }) },
                { translateY: d.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -DROPS[i].h, -DROPS[i].h * 0.25] }) },
                { scale: d.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) },
              ],
            },
          ]}
        />
      ))}
    </Animated.View>
  );
};

// ── Win confetti ─────────────────────────────────────────────────────────────
const Confetti: React.FC = () => {
  const pieces = useRef(
    Array.from({ length: 56 }, (_, i) => ({
      left: Math.random() * 100,
      color: WATER_COLORS[i % WATER_COLORS.length].hex,
      delay: Math.random() * 600,
      dur: 1800 + Math.random() * 1400,
      size: 6 + Math.random() * 7,
      drift: (Math.random() - 0.5) * 140,
      spin: 360 + Math.random() * 540,
      anim: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    Animated.parallel(
      pieces.map(p =>
        Animated.timing(p.anim, {
          toValue: 1, duration: p.dur, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true,
        })
      )
    ).start();
  }, [pieces]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 2,
            opacity: p.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-20, SCREEN_H * 0.75] }) },
              { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
};

// ── Win stars ────────────────────────────────────────────────────────────────
const Stars: React.FC<{ count: number }> = ({ count }) => {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      180,
      anims.map((a, i) =>
        Animated.spring(a, { toValue: i < count ? 1 : 0.35, tension: 90, friction: 6, useNativeDriver: true })
      )
    ).start();
  }, [anims, count]);

  return (
    <View style={styles.starsRow}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            opacity: a.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.35, 1] }),
            transform: [
              { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.2, i === 1 ? 1.25 : 1] }) },
              { translateY: i === 1 ? -8 : 0 },
            ],
          }}
        >
          <Ionicons name="star" size={i === 1 ? 46 : 36} color={i < count ? '#FFC107' : '#CBD2D9'} />
        </Animated.View>
      ))}
    </View>
  );
};

// ── Round control button ─────────────────────────────────────────────────────
interface ControlProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
  ad?: boolean;        // costs a rewarded ad
  owned?: number;      // power-ups bought in the Shop; used instead of an ad
  loading?: boolean;
}

// Press feedback is a gentle scale, not an opacity fade: fading a shadowed circle on iOS
// briefly draws its shadow as a polygon instead of a round shape.
const Control: React.FC<ControlProps> = ({ icon, label, onPress, disabled, accent, ad, owned = 0, loading }) => {
  const press = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(press, { toValue: v, tension: 300, friction: 12, useNativeDriver: true }).start();

  return (
    <Pressable
      style={styles.control}
      onPress={onPress}
      onPressIn={() => to(0.9)}
      onPressOut={() => to(1)}
      disabled={disabled}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <View style={[styles.controlCircle, accent && styles.controlCircleAccent, disabled && styles.controlCircleOff]}>
          {loading
            ? <ActivityIndicator size="small" color={accent ? 'white' : COLORS.text} />
            : <Ionicons name={icon} size={20} color={disabled ? '#B0B8C1' : accent ? 'white' : COLORS.text} />}
        </View>
        {ad && !disabled && (
          <View style={[styles.adTag, owned > 0 && styles.ownedTag]}>
            {owned > 0
              ? <Text style={styles.adTagText}>×{owned}</Text>
              : <><Ionicons name="play" size={7} color="white" /><Text style={styles.adTagText}>AD</Text></>}
          </View>
        )}
      </Animated.View>
      <Text style={[styles.controlLabel, disabled && styles.controlLabelOff]}>{label}</Text>
    </Pressable>
  );
};

// ── Game ─────────────────────────────────────────────────────────────────────
interface WaterSortingProps {
  onWin: () => void;
}

const WaterSorting: React.FC<WaterSortingProps> = ({ onWin }) => {
  const { stats, recordGame } = useGameStats();
  const { shop, consumePowerUp } = useShop();
  const theme = bottleTheme(shop.waterTheme);
  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState(1);
  const [bottles, setBottles] = useState<Bottles>([]);
  const [initial, setInitial] = useState<Bottles>([]);
  const [par, setPar] = useState(10);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [earned, setEarned] = useState(0);
  const [undoStack, setUndoStack] = useState<{ bottles: Bottles; moves: number }[]>([]);
  const [addedBottle, setAddedBottle] = useState(false);
  const [hint, setHint] = useState<PourMove | null>(null);
  const [shaking, setShaking] = useState({ idx: -1, token: 0 });
  const [pouring, setPouring] = useState<PourFx | null>(null);
  const [boardW, setBoardW] = useState(SCREEN_W - SPACING.lg * 2);
  const [round, setRound] = useState(0);              // bumped on every deal so bottles drop in again
  const [celebrate, setCelebrate] = useState(false);
  const [adBusy, setAdBusy] = useState<'hint' | 'bottle' | null>(null);
  const [toast, setToast] = useState('');
  const pouringRef = useRef(false);
  const mountedRef = useRef(true);
  const dealCountRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const pourSound = useAudioPlayer(require('../assets/sounds/water-pour.m4a'));
  useEffect(() => { pourSound.volume = POUR_VOLUME; }, [pourSound]);
  const doneSound = useAudioPlayer(require('../assets/sounds/water-bottle-done.m4a'));
  const winSound = useAudioPlayer(require('../assets/sounds/water-win.m4a'));
  const { musicOn, toggleMusic } = useBackgroundMusic(require('../assets/sounds/water-music.m4a'), MUSIC_KEY, {
    active: ready && adBusy === null,
    volume: won || celebrate ? MUSIC_DUCKED : MUSIC_VOLUME,
  });

  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter(t => t !== id);
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.push(id);
  };

  const showToast = (text: string) => {
    setToast(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const travel = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const flow = useRef(new Animated.Value(0)).current;
  const stream = useRef(new Animated.Value(0)).current;
  const movesPop = useRef(new Animated.Value(1)).current;
  const winCard = useRef(new Animated.Value(0)).current;
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (hintTimer.current) clearTimeout(hintTimer.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const startLevel = useCallback((lv: number, preset: { bottles: Bottles; par: number } | null) => {
    const gen = preset ?? generateLevel(lv);
    setLevel(lv);
    setBottles(cloneBottles(gen.bottles));
    setInitial(cloneBottles(gen.bottles));
    setPar(gen.par);
    setMoves(0);
    setSelected(null);
    setWon(false);
    setEarned(0);
    setUndoStack([]);
    setAddedBottle(false);
    setHint(null);
    setPouring(null);
    setCelebrate(false);
    dealCountRef.current = gen.bottles.length;
    setRound(r => r + 1);
    AsyncStorage.setItem(LEVEL_KEY, String(lv)).catch(() => {});
  }, []);

  // Load saved level + in-progress board, else start fresh.
  useEffect(() => {
    (async () => {
      try {
        const rawLevel = await AsyncStorage.getItem(LEVEL_KEY);
        const savedLevel = rawLevel ? Math.max(1, parseInt(rawLevel, 10) || 1) : 1;
        const rawProg = await AsyncStorage.getItem(PROGRESS_KEY);
        if (rawProg) {
          const p = JSON.parse(rawProg) as SavedProgress;
          if (
            p && p.level === savedLevel
            && Array.isArray(p.bottles) && Array.isArray(p.initial)
            && p.bottles.length >= 5 && typeof p.par === 'number' && typeof p.moves === 'number'
            && !isSolved(p.bottles)
          ) {
            setLevel(p.level);
            setBottles(p.bottles);
            setInitial(p.initial);
            setPar(p.par);
            setMoves(p.moves);
            setAddedBottle(!!p.addedBottle);
            dealCountRef.current = p.bottles.length;
            setRound(r => r + 1);
            setReady(true);
            return;
          }
        }
        startLevel(savedLevel, null);
      } catch {
        startLevel(1, null);
      } finally {
        setReady(true);
      }
    })();
  }, [startLevel]);

  // Persist in-progress board so reopening resumes mid-level.
  useEffect(() => {
    if (!ready || won || bottles.length === 0) return;
    const p: SavedProgress = { level, bottles, initial, par, moves, addedBottle };
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(p)).catch(() => {});
  }, [ready, won, level, bottles, initial, par, moves, addedBottle]);

  // Progress bar glides to the share of colours sorted.
  const sortedCount = bottles.filter(isCompleteBottle).length;
  const colorTotal = colorsForLevel(level);
  useEffect(() => {
    Animated.spring(progressAnim, { toValue: Math.min(1, sortedCount / colorTotal), tension: 60, friction: 10, useNativeDriver: true }).start();
  }, [sortedCount, colorTotal, progressAnim]);

  // Bounce the moves counter whenever it changes.
  useEffect(() => {
    if (moves === 0) return;
    movesPop.setValue(1.25);
    Animated.spring(movesPop, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  }, [moves, movesPop]);

  // Win card entrance.
  useEffect(() => {
    if (!won) {
      winCard.setValue(0);
      return;
    }
    Animated.spring(winCard, { toValue: 1, tension: 70, friction: 8, useNativeDriver: true }).start();
  }, [won, winCard]);

  const handleWin = useCallback(async (finalMoves: number) => {
    const finalStars = waterStars(finalMoves, par);
    const reward = coinsForStars(finalStars);
    // The only vibration in this game: clearing a level.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    playSound(winSound);
    setEarned(reward);
    setCelebrate(true);
    later(() => setWon(true), bottles.length * CELEBRATE_STAGGER_MS + 550);
    await recordGame('water', undefined, reward);
    await logGame({
      timestamp: Date.now(),
      gameType: 'water',
      costCoins: 0,
      earnedCoins: reward,
      netCoins: reward,
      moves: finalMoves,
      par,
      waterLevel: level,
      stars: finalStars,
    });
    await AsyncStorage.setItem(LEVEL_KEY, String(level + 1)).catch(() => {});
    await AsyncStorage.removeItem(PROGRESS_KEY).catch(() => {});
    onWin();
  }, [par, level, recordGame, onWin, bottles.length, winSound]);

  // ── Layout ──
  const count = bottles.length;
  const rows = count <= 5 ? 1 : count <= 12 ? 2 : 3;
  // Crowded boards (13+ bottles, only after +Bottle) are drawn at normal size and scaled down to fit.
  const scale = rows === 3 ? 0.88 : 1;
  const layoutW = boardW / scale;
  const perRow = Math.ceil(count / rows);
  const bottleW = Math.max(36, Math.min(56, (layoutW - 24 - BOTTLE_GAP * (perRow - 1)) / perRow));
  const boardH = BOARD_PAD_TOP + rows * BOTTLE_H + (rows - 1) * ROW_GAP + BOARD_PAD_BOTTOM;

  const slots: Slot[] = bottles.map((_, idx) => {
    const r = Math.floor(idx / perRow);
    const c = idx % perRow;
    const inRow = Math.min(perRow, count - r * perRow);
    const rowW = inRow * bottleW + (inRow - 1) * BOTTLE_GAP;
    return {
      x: (layoutW - rowW) / 2 + c * (bottleW + BOTTLE_GAP),
      y: BOARD_PAD_TOP + r * (BOTTLE_H + ROW_GAP),
    };
  });

  /** Where the source bottle must sit so its spout is over the target's mouth. */
  const planPour = (from: number, to: number, color: number, pourCount: number): PourFx => {
    const s = slots[from];
    const t = slots[to];
    const scx = s.x + bottleW / 2;
    const tcx = t.x + bottleW / 2;
    const spoutY = t.y - 12;

    const place = (dir: 1 | -1) => {
      const a = dir * TILT_RAD;
      const vx = dir * (neckWidth(bottleW) / 2);
      const vy = -BOTTLE_H / 2;
      const rx = vx * Math.cos(a) - vy * Math.sin(a);
      const ry = vx * Math.sin(a) + vy * Math.cos(a);
      return { cx: tcx - rx, cy: spoutY - ry };
    };

    let dir: 1 | -1 = tcx >= scx ? 1 : -1;
    const reach = (BOTTLE_H / 2) * Math.sin(TILT_RAD) + (bottleW / 2) * Math.cos(TILT_RAD);
    const fits = (d: 1 | -1) => {
      const { cx } = place(d);
      return cx - reach >= -8 && cx + reach <= layoutW + 8;
    };
    if (!fits(dir) && fits(dir === 1 ? -1 : 1)) dir = dir === 1 ? -1 : 1;

    const { cx, cy } = place(dir);
    const targetLen = bottles[to].length;
    const surfaceY = t.y + BOTTLE_H - BOTTOM_PAD - (targetLen + pourCount) * LAYER_H;
    return {
      from, to, color, count: pourCount,
      dx: cx - scx,
      dy: cy - (s.y + BOTTLE_H / 2),
      dir,
      streamX: tcx - STREAM_W / 2,
      streamTop: spoutY,
      streamH: Math.max(12, surfaceY - spoutY),
    };
  };

  const pressBottle = (idx: number) => {
    if (!ready || won || celebrate || adBusy !== null || pouringRef.current) return;
    setHint(null);
    if (selected === null) {
      if (bottles[idx].length === 0) return;
      setSelected(idx);
      return;
    }
    if (selected === idx) {
      setSelected(null);
      return;
    }
    const pourCount = pourAmount(bottles, selected, idx);
    if (pourCount === 0) {
      setShaking(s => ({ idx, token: s.token + 1 }));
      return;
    }

    const from = selected;
    const color = bottles[from][bottles[from].length - 1];
    const fx = planPour(from, idx, color, pourCount);
    const snapshot = bottles;
    const prevMoves = moves;

    setSelected(null);
    setUndoStack(prev => [...prev.slice(-199), { bottles: cloneBottles(snapshot), moves: prevMoves }]);
    pouringRef.current = true;
    setPouring(fx);

    travel.setValue(0);
    tilt.setValue(0);
    flow.setValue(0);
    stream.setValue(0);

    const flowMs = 220 + 110 * pourCount;
    later(() => playSound(pourSound), TRAVEL_MS - 40);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(travel, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 1, duration: TRAVEL_MS - 100, delay: 80, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(flow, { toValue: 1, duration: flowMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(stream, { toValue: 1, duration: 90, useNativeDriver: true }),
          Animated.delay(Math.max(0, flowMs - 190)),
          Animated.timing(stream, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]),
      ]),
      Animated.parallel([
        Animated.timing(tilt, { toValue: 0, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(travel, { toValue: 0, duration: 280, delay: 60, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => {
      if (!finished || !mountedRef.current) {
        pouringRef.current = false;
        return;
      }
      const next = applyPour(snapshot, { from, to: idx, count: pourCount });
      const newMoves = prevMoves + 1;
      setBottles(next);
      setMoves(newMoves);
      setPouring(null);
      pouringRef.current = false;
      if (isSolved(next)) handleWin(newMoves);
      else if (next.filter(isCompleteBottle).length > snapshot.filter(isCompleteBottle).length) playSound(doneSound);
    });
  };

  const undo = () => {
    if (pouringRef.current || won || celebrate || adBusy !== null || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(prevStack => prevStack.slice(0, -1));
    // The extra bottle was paid for with an ad, so it stays even when undoing past the moment it was added.
    const restored = cloneBottles(prev.bottles);
    while (restored.length < bottles.length) restored.push([]);
    setBottles(restored);
    // Moves are not refunded: the counter shows every pour actually made.
    setSelected(null);
    setHint(null);
  };

  const restart = () => {
    if (pouringRef.current || won || celebrate || adBusy !== null) return;
    // Keep an ad-bought bottle for this level.
    const fresh = addedBottle ? [...cloneBottles(initial), []] : cloneBottles(initial);
    dealCountRef.current = fresh.length;
    setRound(r => r + 1);
    setBottles(fresh);
    setMoves(0);
    setSelected(null);
    setUndoStack([]);
    setHint(null);
  };

  /** Runs a rewarded ad; true if the player earned the reward. */
  const earnWithAd = async (kind: 'hint' | 'bottle') => {
    setAdBusy(kind);
    setSelected(null);
    let result = await showRewardedAd();
    if (!mountedRef.current) return false;
    setAdBusy(null);
    // Expo Go and dev builds usually have no ad fill; let it through so the feature can be tested.
    if (result === 'unavailable' && __DEV__) result = 'rewarded';
    if (result === 'closed') showToast('Watch the whole ad to get it');
    if (result === 'unavailable') showToast('No ad available right now, try again soon');
    return result === 'rewarded';
  };

  const addBottle = async () => {
    if (pouringRef.current || won || celebrate || addedBottle || adBusy !== null) return;
    // A bottle bought in the Shop is used first; otherwise it costs a rewarded ad.
    if (!consumePowerUp('waterBottle') && !(await earnWithAd('bottle'))) return;
    setBottles(prev => [...prev, []]);
    setAddedBottle(true);
  };

  const showHint = async () => {
    if (pouringRef.current || won || celebrate || adBusy !== null) return;
    // Check first, so nobody watches an ad for a hint that doesn't exist.
    const move = suggestHint(bottles);
    if (!move) {
      showToast(addedBottle ? 'No good move left, try Undo or Restart' : 'No good move left, try Undo or + Bottle');
      return;
    }
    if (!consumePowerUp('waterHint') && !(await earnWithAd('hint'))) return;
    setHint(move);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), HINT_SHOW_MS);
  };

  const nextLevel = () => startLevel(level + 1, null);
  const replay = () => startLevel(level, { bottles: initial, par });

  if (!ready || bottles.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading level...</Text>
      </View>
    );
  }

  const totalColors = colorsForLevel(level);
  const difficulty = difficultyForLevel(level);
  const done = bottles.filter(isCompleteBottle).length;
  const progress = Math.min(1, done / totalColors);
  const underPar = par - moves;
  const stars = waterStars(moves, par);
  const movesColor = moves > Math.ceil(par * 1.5) ? '#FF6B6B' : moves > par ? '#FFC107' : 'white';
  const sortedColors = new Set(bottles.filter(isCompleteBottle).map(b => b[0]));
  // One row of dots, shrinking if needed: header padding, the count and the music button take ~110px.
  const dotSize = Math.max(10, Math.min(16, Math.floor((boardW - 110 - DOT_GAP * (totalColors - 1)) / totalColors)));

  return (
    <View style={styles.root}>
      {/* Header: kept to two short rows so the bottles get the space, even at 10 colours */}
      <LinearGradient colors={['#001A33', '#002A52', '#0B3F70']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.levelGroup}>
            <View>
              <Text style={styles.levelLabel}>LEVEL</Text>
              <Text style={styles.levelNumber}>{level}</Text>
            </View>
            <View style={[styles.diffChip, { backgroundColor: `${difficulty.color}26`, borderColor: `${difficulty.color}66` }]}>
              <Text style={[styles.diffChipText, { color: difficulty.color }]}>{difficulty.name}</Text>
            </View>
          </View>

          <View style={styles.statTiles}>
            <View style={styles.statTile}>
              <Text style={styles.statTileLabel}>MOVES</Text>
              <Animated.Text style={[styles.statTileValue, { color: movesColor, transform: [{ scale: movesPop }] }]}>
                {moves}
              </Animated.Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statTileLabel}>BEST</Text>
              <Text style={styles.statTileValue}>{par}</Text>
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statTileLabel}>STARS</Text>
              <View style={styles.statStars}>
                {[1, 2, 3].map(n => (
                  <Ionicons key={n} name="star" size={11} color={n <= stars ? '#FFC107' : 'rgba(255,255,255,0.2)'} />
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.colorDots}>
            {Array.from({ length: totalColors }, (_, c) => {
              const sorted = sortedColors.has(c);
              return (
                <View
                  key={c}
                  style={[
                    styles.colorDot,
                    { width: dotSize, height: dotSize, borderRadius: dotSize / 2, borderColor: WATER_COLORS[c].hex },
                    sorted && { backgroundColor: WATER_COLORS[c].hex },
                  ]}
                >
                  {sorted && <Ionicons name="checkmark" size={dotSize - 6} color="white" />}
                </View>
              );
            })}
          </View>
          <Text style={styles.progressText}>{done}/{totalColors}</Text>
          <TouchableOpacity onPress={toggleMusic} style={styles.musicBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
            <Ionicons name={musicOn ? 'musical-notes' : 'volume-mute'} size={14} color={musicOn ? 'white' : 'rgba(255,255,255,0.45)'} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { transform: [{ scaleX: progressAnim }] }]} />
        </View>
      </LinearGradient>

      {/* Board */}
      <LinearGradient colors={theme.panel} style={styles.panel}>
        <View
          style={{ height: boardH * scale }}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (Math.abs(w - boardW) > 1) setBoardW(w);
          }}
        >
         <View
           style={{
             position: 'absolute', left: 0, top: 0, width: layoutW, height: boardH,
             transformOrigin: 'top left', transform: [{ scale }],
           }}
         >
          {/* Soft floor shadows under each bottle */}
          {slots.map((s, i) => (
            <View
              key={`sh${i}`}
              pointerEvents="none"
              style={[styles.floorShadow, { backgroundColor: theme.floor, left: s.x + 2, top: s.y + BOTTLE_H - 4, width: bottleW - 4 }]}
            />
          ))}

          {bottles.map((b, idx) => {
            const role = pouring?.from === idx ? 'source' : pouring?.to === idx ? 'target' : null;
            return (
              <View
                key={`${round}-${idx}`}
                style={{
                  position: 'absolute',
                  left: slots[idx].x,
                  top: slots[idx].y,
                  zIndex: role === 'source' ? 30 : selected === idx ? 10 : 1,
                }}
              >
                <BottleView
                  theme={theme}
                  bottle={b}
                  width={bottleW}
                  selected={selected === idx}
                  hinted={hint !== null && (hint.from === idx || hint.to === idx)}
                  shakeToken={shaking.idx === idx ? shaking.token : 0}
                  role={role}
                  fx={pouring}
                  travel={travel}
                  tilt={tilt}
                  flow={flow}
                  disabled={!ready || won || celebrate || adBusy !== null || pouring !== null}
                  enterDelay={idx < dealCountRef.current ? idx * DEAL_STAGGER_MS : 0}
                  celebrate={celebrate}
                  celebrateDelay={idx * CELEBRATE_STAGGER_MS}
                  onPress={() => pressBottle(idx)}
                />
              </View>
            );
          })}

          {/* Pour stream */}
          {pouring !== null && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.stream,
                {
                  left: pouring.streamX,
                  top: pouring.streamTop,
                  height: pouring.streamH,
                  backgroundColor: WATER_COLORS[pouring.color].hex,
                  opacity: stream,
                  transform: [
                    { translateY: stream.interpolate({ inputRange: [0, 1], outputRange: [-pouring.streamH / 2, 0] }) },
                    { scaleY: stream.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }) },
                  ],
                },
              ]}
            >
              <View style={styles.streamShine} />
            </Animated.View>
          )}
          {pouring !== null && (
            <Splash
              key={`sp-${pouring.from}-${pouring.to}-${moves}`}
              x={pouring.streamX + STREAM_W / 2}
              y={pouring.streamTop + pouring.streamH}
              color={WATER_COLORS[pouring.color].hex}
              on={stream}
            />
          )}
         </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      </LinearGradient>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <Control icon="arrow-undo" label="Undo" onPress={undo} disabled={undoStack.length === 0} />
        <Control icon="refresh" label="Restart" onPress={restart} />
        <Control icon="add" label={addedBottle ? 'Added' : 'Bottle'} onPress={addBottle} disabled={addedBottle} ad owned={shop.powerUps.waterBottle} loading={adBusy === 'bottle'} />
        <Control icon="bulb" label="Hint" onPress={showHint} accent ad owned={shop.powerUps.waterHint} loading={adBusy === 'hint'} />
      </View>

      {/* Win Modal */}
      <Modal visible={won} transparent animationType="fade">
        <View style={styles.winOverlay}>
          <Confetti />
          <Animated.View
            style={[
              styles.winCard,
              {
                opacity: winCard,
                transform: [
                  { scale: winCard.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                  { translateY: winCard.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                ],
              },
            ]}
          >
            <Stars count={stars} />

            <Text style={styles.winTitle}>Level {level} Complete!</Text>
            <Text style={styles.winSub}>{moves} moves · best possible {par}</Text>

            <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.winRewardBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="wallet" size={20} color="white" />
              <Text style={styles.winRewardText}>+{earned} Coins Earned!</Text>
            </LinearGradient>
            <StarRewardTiers stars={stars} />

            <View style={styles.winBalanceRow}>
              <Text style={styles.winBalanceLabel}>New Balance</Text>
              <View style={styles.winBalancePill}>
                <Ionicons name="wallet" size={14} color="#F9A825" />
                <Text style={styles.winBalance}>{stats.totalCoins}</Text>
              </View>
            </View>

            <View style={styles.winStatsRow}>
              <View style={styles.winStatChip}>
                <Ionicons name="checkmark-circle" size={14} color="#2ED573" />
                <Text style={styles.winStatText}>
                  {underPar >= 0 ? 'Perfect!' : `${-underPar} extra moves`}
                </Text>
              </View>
              <View style={styles.winStatChip}>
                <Ionicons name="star" size={14} color="#A55EEA" />
                <Text style={styles.winStatText}>+{GAME_CONFIG.water.xpPerWin} XP</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.playAgainBtn} onPress={nextLevel} activeOpacity={0.85}>
              <LinearGradient colors={['#2ED573', '#17B85A']} style={styles.playAgainGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name="arrow-forward" size={18} color="white" />
                <Text style={styles.playAgainText}>Next Level</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.replayBtn} onPress={replay} activeOpacity={0.85}>
              <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              <Text style={styles.replayText}>Replay Level {level}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: SPACING.lg },

  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  loadingText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },

  // Header
  header: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, marginTop: SPACING.xs, marginBottom: SPACING.sm, overflow: 'hidden', ...SHADOWS.medium },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  levelLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  levelNumber: { fontSize: 22, fontWeight: '900', color: 'white', lineHeight: 25 },
  diffChip: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  diffChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  statTiles: { flexDirection: 'row', gap: 6 },
  statTile: { alignItems: 'center', minWidth: 50, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statTileLabel: { fontSize: 8, fontWeight: '800', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 },
  statTileValue: { fontSize: 17, fontWeight: '900', color: 'white', lineHeight: 21 },
  statStars: { flexDirection: 'row', height: 21, alignItems: 'center' },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
  colorDots: { flexDirection: 'row', gap: DOT_GAP, flex: 1 },
  colorDot: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  progressText: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.75)', marginHorizontal: 8 },
  musicBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', width: '100%', borderRadius: 3, backgroundColor: '#2ED573', transformOrigin: 'left' },

  // Board
  panel: { borderRadius: 26, paddingHorizontal: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', ...SHADOWS.card },
  floorShadow: { position: 'absolute', height: 10, borderRadius: 5, backgroundColor: 'rgba(40,80,120,0.16)' },

  // Bottle
  tube: {
    position: 'absolute', left: SIDE, right: SIDE, top: LIQ_TOP - 2, bottom: SIDE,
    overflow: 'hidden',
    borderBottomLeftRadius: 19, borderBottomRightRadius: 19,
  },
  liquidArea: {
    position: 'absolute', left: 0, right: 0, top: 2, bottom: BOTTOM_PAD - SIDE,
    flexDirection: 'column-reverse',
  },
  segment: { width: '100%', flexDirection: 'column-reverse' },
  layer: { width: '100%', justifyContent: 'center', alignItems: 'center' },
  layerSheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.28)' },
  layerSymbol: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '700' },
  lid: {
    position: 'absolute', top: -13, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)',
  },
  stream: { position: 'absolute', width: STREAM_W, borderRadius: STREAM_W / 2, zIndex: 40, overflow: 'hidden' },
  streamShine: { position: 'absolute', left: 1, top: 0, bottom: 0, width: 1.5, backgroundColor: 'rgba(255,255,255,0.5)' },
  splash: { position: 'absolute', width: 0, height: 0, zIndex: 41 },
  drop: { position: 'absolute', left: -2.5, top: -2.5, width: 5, height: 5, borderRadius: 2.5 },
  sparkOrigin: { position: 'absolute', top: 2, width: 0, height: 0 },
  spark: { position: 'absolute', left: -3, top: -3, width: 6, height: 6, borderRadius: 1.5 },
  toast: { position: 'absolute', top: 10, alignSelf: 'center', backgroundColor: 'rgba(0,26,51,0.9)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 7 },
  toastText: { fontSize: 13, fontWeight: '800', color: 'white' },

  // Controls
  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: SPACING.md, paddingHorizontal: SPACING.sm },
  control: { alignItems: 'center', gap: 4, minWidth: 64 },
  controlCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', ...SHADOWS.card },
  controlCircleAccent: { backgroundColor: '#F9A825' },
  adTag: { position: 'absolute', top: -5, right: -9, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#1E90FF', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1.5, borderColor: 'white' },
  ownedTag: { backgroundColor: '#2ED573' },
  adTagText: { fontSize: 8, fontWeight: '900', color: 'white', letterSpacing: 0.3 },
  controlCircleOff: { backgroundColor: '#EEF1F4', shadowOpacity: 0, elevation: 0 },
  controlLabelOff: { color: '#B0B8C1' },
  controlLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },

  // Win modal
  winOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  winCard: { backgroundColor: COLORS.surface, borderRadius: 28, padding: SPACING.xl, alignItems: 'center', gap: 14, width: '100%', ...SHADOWS.medium },
  starsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, height: 64 },
  winTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
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
  replayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceDark, paddingVertical: 12, width: '100%' },
  replayText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
});

export default WaterSorting;
