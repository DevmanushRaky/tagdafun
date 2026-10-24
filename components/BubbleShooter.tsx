import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions, Modal, GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Canvas, Picture, Skia, PaintStyle, StrokeCap, TileMode, type SkCanvas, type SkPicture, type SkPaint,
} from '@shopify/react-native-skia';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG, coinsForStars } from '../constants/gameConfig';
import { logGame } from '../utils/gameHistory';
import StarRewardTiers from './StarRewardTiers';
import { GameIcon } from './GameIcons';
import { useAudioPlayer } from 'expo-audio';
import { playSound } from '../utils/sound';
import {
  BubbleGame, Vec, newGame, step, shoot, swap, aimFrom, aimPath, cellCenter, bubbleStars,
  specForLevel, landingCenter, MAX_ROWS, BOMB, RAINBOW,
} from '../utils/bubble';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const BUBBLE_LEVEL_KEY = '@tagdafun_bubble_level_v1';

// Drawn and simulated at this rate; the simulation is time-based, so raising it only smooths motion.
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;

const BOARD_W = SCREEN_W - SPACING.md * 2;
const BOARD_H = Math.round(Math.min(SCREEN_H * 0.6, BOARD_W * 1.55));

export const BUBBLE_COLORS = ['#FF4757', '#1E90FF', '#2ED573', '#FFC312', '#A55EEA', '#FF7F50'];

// ── Drawing ─────────────────────────────────────────────────────────────────
const fill = (color: string, alpha = 1): SkPaint => {
  const p = Skia.Paint();
  p.setAntiAlias(true);
  p.setColor(Skia.Color(color));
  p.setAlphaf(alpha);
  return p;
};

const stroke = (color: string, width: number, alpha = 1): SkPaint => {
  const p = fill(color, alpha);
  p.setStyle(PaintStyle.Stroke);
  p.setStrokeWidth(width);
  p.setStrokeCap(StrokeCap.Round);
  return p;
};

function makeBackdrop(w: number, h: number): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
  const bg = Skia.Paint();
  bg.setShader(Skia.Shader.MakeLinearGradient(
    Skia.Point(0, 0), Skia.Point(0, h), [Skia.Color('#1B2A4A'), Skia.Color('#0B1426')], null, TileMode.Clamp,
  ));
  c.drawRect(Skia.XYWHRect(0, 0, w, h), bg);
  // A few faint stars.
  for (let i = 0; i < 40; i++) {
    const x = (i * 97.3) % w;
    const y = (i * 53.7) % (h * 0.85);
    c.drawCircle(x, y, (i % 3) * 0.5 + 0.6, fill('#FFFFFF', 0.12 + (i % 4) * 0.05));
  }
  return rec.finishRecordingAsPicture();
}

function drawBubble(c: SkCanvas, x: number, y: number, r: number, color: string, alpha = 1, scale = 1) {
  const rr = r * 0.94 * scale;
  c.drawCircle(x, y, rr, fill(color, alpha));
  c.drawCircle(x + rr * 0.12, y + rr * 0.16, rr * 0.78, fill('#000000', 0.12 * alpha));
  c.drawCircle(x, y, rr, stroke('#FFFFFF', 1.2, 0.25 * alpha));
  c.drawOval(Skia.XYWHRect(x - rr * 0.55, y - rr * 0.62, rr * 0.55, rr * 0.38), fill('#FFFFFF', 0.55 * alpha));
}

const RAINBOW_STOPS = ['#FF4757', '#FFC312', '#2ED573', '#1E90FF', '#A55EEA', '#FF4757'];

/** Any loaded or flying bubble: a colour, or one of the two specials. */
function drawAnyBubble(c: SkCanvas, x: number, y: number, r: number, color: number, time: number, alpha = 1) {
  if (color === BOMB) {
    const rr = r * 0.94;
    c.drawCircle(x, y, rr, fill('#2C2C34', alpha));
    c.drawCircle(x, y, rr, stroke('#FF6B00', 2, 0.9 * alpha));
    c.drawOval(Skia.XYWHRect(x - rr * 0.55, y - rr * 0.62, rr * 0.5, rr * 0.34), fill('#FFFFFF', 0.35 * alpha));
    c.drawLine(x + rr * 0.35, y - rr * 0.75, x + rr * 0.7, y - rr * 1.15, stroke('#C9A27E', 2.2, alpha));
    const flick = 2.5 + Math.abs(Math.sin(time * 22)) * 2.5;
    c.drawCircle(x + rr * 0.72, y - rr * 1.18, flick, fill('#FFD23F', alpha));
    return;
  }
  if (color === RAINBOW) {
    // A pearl bubble in a rainbow ring: it breathes gently and a sparkle twinkles on it.
    const rr = r * 0.94 * (1 + Math.sin(time * 4) * 0.04);
    const pearl = Skia.Paint();
    pearl.setAntiAlias(true);
    pearl.setAlphaf(alpha);
    pearl.setShader(Skia.Shader.MakeRadialGradient(
      Skia.Point(x - rr * 0.3, y - rr * 0.35), rr * 1.3,
      [Skia.Color('#FFFFFF'), Skia.Color('#EAF2FF'), Skia.Color('#C9D6F2')], [0, 0.55, 1], TileMode.Clamp,
    ));
    c.drawCircle(x, y, rr, pearl);
    const ring = Skia.Paint();
    ring.setAntiAlias(true);
    ring.setStyle(PaintStyle.Stroke);
    ring.setStrokeWidth(rr * 0.24);
    ring.setAlphaf(alpha);
    ring.setShader(Skia.Shader.MakeSweepGradient(x, y, RAINBOW_STOPS.map(h => Skia.Color(h)), null, TileMode.Clamp));
    c.drawCircle(x, y, rr * 0.86, ring);
    c.drawOval(Skia.XYWHRect(x - rr * 0.5, y - rr * 0.58, rr * 0.5, rr * 0.32), fill('#FFFFFF', 0.7 * alpha));
    // Four-point sparkle.
    const tw = 0.55 + 0.45 * Math.abs(Math.sin(time * 3));
    const sp = rr * 0.42 * tw;
    const star = Skia.PathBuilder.Make()
      .moveTo(x, y - sp).quadTo(x, y, x + sp, y).quadTo(x, y, x, y + sp).quadTo(x, y, x - sp, y).quadTo(x, y, x, y - sp)
      .close().detach();
    c.drawPath(star, fill('#FFFFFF', alpha));
    c.drawPath(star, stroke('#A55EEA', 1, 0.5 * alpha));
    return;
  }
  drawBubble(c, x, y, r, BUBBLE_COLORS[color], alpha);
}

/** Visual-only state that makes the board feel alive; the rules don't depend on it. */
export interface Juice {
  ceilingShown: number;              // eases toward g.ceiling so the board slides down
  jiggle: Map<string, number>;       // cell -> seconds since a neighbour landed
  trail: Vec[];                      // recent shot positions
}

function drawFrame(g: BubbleGame, backdrop: SkPicture, aim: Vec[] | null, time: number, juice: Juice): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, g.w, g.h));
  c.drawPicture(backdrop);

  // The ceiling that has come down (eased, so it slides).
  const slide = (juice.ceilingShown - g.ceiling) * g.rowH;
  if (juice.ceilingShown > 0.01) {
    const ch = juice.ceilingShown * g.rowH;
    c.drawRect(Skia.XYWHRect(0, 0, g.w, ch), fill('#3B4A6B'));
    for (let x = -ch; x < g.w; x += 18) c.drawLine(x, ch, x + ch, 0, stroke('#2C3A57', 6));
    c.drawLine(0, ch, g.w, ch, stroke('#8FA3C8', 2));
  }

  // Danger line: pulses red once bubbles get close.
  let lowest = 0;
  for (let row = 0; row < MAX_ROWS; row++) for (let col = 0; col < g.grid[row].length; col++) {
    if (g.grid[row][col] !== null) lowest = Math.max(lowest, cellCenter(g, row, col).y + g.r);
  }
  const danger = lowest > g.loseY - g.rowH * 2;
  const pulse = danger ? 0.5 + 0.5 * Math.abs(Math.sin(time * 6)) : 0.35;
  for (let x = 6; x < g.w; x += 16) c.drawLine(x, g.loseY, x + 8, g.loseY, stroke(danger ? '#FF4757' : '#FFFFFF', 2, pulse));

  // One miss left before the ceiling drops: the board trembles as a warning.
  const warn = g.misses === g.spec.missesPerDrop - 1 && !g.over ? Math.sin(time * 45) * 1.6 : 0;
  for (let row = 0; row < MAX_ROWS; row++) for (let col = 0; col < g.grid[row].length; col++) {
    const v = g.grid[row][col];
    if (v === null) continue;
    const p = cellCenter(g, row, col);
    const jt = juice.jiggle.get(`${row},${col}`);
    const jig = jt !== undefined ? Math.sin(jt * 34) * 3.2 * Math.exp(-jt * 7) : 0;
    drawBubble(c, p.x + warn, p.y + slide + jig, g.r, BUBBLE_COLORS[v]);
  }

  for (const b of g.leaving) {
    if (b.kind === 'pop') {
      const k = b.t / 0.3;
      drawBubble(c, b.pos.x, b.pos.y, g.r, BUBBLE_COLORS[b.color], 1 - k, 1 + k * 0.5);
      c.drawCircle(b.pos.x, b.pos.y, g.r * (1 + k * 1.2), stroke(BUBBLE_COLORS[b.color], 2, 1 - k));
    } else {
      drawBubble(c, b.pos.x, b.pos.y, g.r, BUBBLE_COLORS[b.color], 0.9);
    }
  }

  // Dotted aim line with its wall bounces.
  if (aim && !g.shot) {
    const dot = fill('#FFFFFF', 0.8);
    let carry = 0;
    for (let i = 0; i < aim.length - 1; i++) {
      const a = aim[i];
      const b = aim[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      for (let d = carry; d < len; d += 16) {
        const t = d / len;
        c.drawCircle(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.6, dot);
      }
      carry = (16 - ((len - carry) % 16)) % 16;
    }
  }

  // Ghost bubble where the shot would land.
  if (aim && !g.shot && !g.over) {
    const land = landingCenter(g, aim);
    if (land) {
      c.drawCircle(land.x, land.y, g.r * 0.92, fill(g.current >= 0 ? BUBBLE_COLORS[g.current] : '#FFFFFF', 0.28));
      c.drawCircle(land.x, land.y, g.r * 0.92, stroke('#FFFFFF', 1.6, 0.7));
    }
  }

  // Shot with a short fading trail.
  if (g.shot) {
    const trailColor = g.shot.color >= 0 ? BUBBLE_COLORS[g.shot.color] : '#FFFFFF';
    juice.trail.forEach((p, i) => {
      const k = (i + 1) / (juice.trail.length + 1);
      c.drawCircle(p.x, p.y, g.r * 0.7 * k, fill(trailColor, 0.25 * k));
    });
    drawAnyBubble(c, g.shot.pos.x, g.shot.pos.y, g.r, g.shot.color, time);
  }

  // Shooter: a cradle with the loaded bubble.
  const s = g.shooter;
  c.drawCircle(s.x, s.y + g.r * 0.4, g.r * 1.55, fill('#FFFFFF', 0.08));
  c.drawCircle(s.x, s.y + g.r * 0.4, g.r * 1.55, stroke('#8FA3C8', 2, 0.6));
  if (!g.over && !g.shot) drawAnyBubble(c, s.x, s.y, g.r, g.current, time);
  return rec.finishRecordingAsPicture();
}

const IntroLine: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <View style={styles.introRow}>
    <View style={styles.introIcon}>{icon}</View>
    <Text style={styles.introLine}>{text}</Text>
  </View>
);

interface BoardHandle { show: (p: SkPicture) => void }
const Board = forwardRef<BoardHandle>((_, ref) => {
  const [pic, setPic] = useState<SkPicture | null>(null);
  useImperativeHandle(ref, () => ({ show: setPic }), []);
  return (
    <Canvas style={{ width: BOARD_W, height: BOARD_H }}>
      {pic && <Picture picture={pic} />}
    </Canvas>
  );
});

// ── Game ────────────────────────────────────────────────────────────────────
interface Hud { score: number; misses: number; drops: number; next: number; current: number; popped: boolean }

interface BubbleShooterProps { onWin: () => void }

const BubbleShooter: React.FC<BubbleShooterProps> = ({ onWin }) => {
  const { stats, recordGame } = useGameStats();
  const [level, setLevel] = useState<number | null>(null);
  const [phase, setPhase] = useState<'intro' | 'play' | 'won' | 'lost'>('intro');
  const [hud, setHud] = useState<Hud>({ score: 0, misses: 0, drops: 0, next: 0, current: 0, popped: false });
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null);
  const [result, setResult] = useState({ stars: 0, coins: 0 });

  const gameRef = useRef<BubbleGame | null>(null);
  const aimRef = useRef<Vec | null>(null);
  const boardRef = useRef<BoardHandle>(null);
  const backdrop = useRef<SkPicture | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const timeRef = useRef(0);
  const poppedRef = useRef(false);
  const juiceRef = useRef<Juice>({ ceilingShown: 0, jiggle: new Map(), trail: [] });
  const shootSound = useAudioPlayer(require('../assets/sounds/bubble-shoot.m4a'));
  const popSound = useAudioPlayer(require('../assets/sounds/bubble-pop.m4a'));
  const bombSound = useAudioPlayer(require('../assets/sounds/bubble-bomb.m4a'));

  if (!backdrop.current) backdrop.current = makeBackdrop(BOARD_W, BOARD_H);

  const showToast = (text: string, color: string) => {
    setToast({ text, color });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, tension: 160, friction: 7, useNativeDriver: true }),
      Animated.delay(550),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const paint = () => {
    const g = gameRef.current;
    if (!g) return;
    const aim = aimRef.current ? aimPath(g, aimFrom(g, aimRef.current)) : null;
    boardRef.current?.show(drawFrame(g, backdrop.current!, aim, timeRef.current, juiceRef.current));
  };

  const syncHud = () => {
    const g = gameRef.current!;
    const next: Hud = { score: g.score, misses: g.misses, drops: g.drops, next: g.next, current: g.current, popped: poppedRef.current };
    setHud(h => (h.score === next.score && h.misses === next.misses && h.drops === next.drops && h.next === next.next && h.current === next.current && h.popped === next.popped ? h : next));
  };

  const prepare = (lvl: number) => {
    gameRef.current = newGame(lvl, BOARD_W, BOARD_H);
    aimRef.current = null;
    poppedRef.current = false;
    timeRef.current = 0;
    juiceRef.current = { ceilingShown: 0, jiggle: new Map(), trail: [] };
    setLevel(lvl);
    syncHud();
  };

  useEffect(() => {
    AsyncStorage.getItem(BUBBLE_LEVEL_KEY)
      .then(v => prepare(Math.max(1, parseInt(v ?? '1', 10) || 1)))
      .catch(() => prepare(1));
  }, []);

  // Paint the opening board behind the intro as soon as it exists.
  useEffect(() => { if (level !== null) paint(); }, [level]);

  const finish = async (won: boolean) => {
    const g = gameRef.current!;
    if (!won) { setPhase('lost'); return; }
    const stars = bubbleStars(g.drops);
    const coins = coinsForStars(stars);
    setResult({ stars, coins });
    setPhase('won');
    // The only vibration in this game: clearing a level.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AsyncStorage.setItem(BUBBLE_LEVEL_KEY, String(g.level + 1)).catch(() => {});
    await recordGame('bubble', undefined, coins);
    await logGame({ timestamp: Date.now(), gameType: 'bubble', costCoins: 0, earnedCoins: coins, netCoins: coins, bubbleLevel: g.level, stars });
    onWin();
  };

  // Game loop, capped at TARGET_FPS.
  useEffect(() => {
    if (phase !== 'play') return;
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (last === 0) { last = now; return; }
      const elapsed = now - last;
      if (elapsed < FRAME_MS - 1) return;
      last = now;
      const dt = Math.min(elapsed / 1000, 0.1);
      const g = gameRef.current;
      if (!g) return;
      timeRef.current += dt;
      const j = juiceRef.current;
      for (const ev of step(g, dt)) {
        if (ev.type === 'stick') {
          // Neighbours of the landing cell wobble.
          const at = cellCenter(g, ev.row, ev.col);
          for (let r = 0; r < MAX_ROWS; r++) for (let c = 0; c < g.grid[r].length; c++) {
            if (g.grid[r][c] === null) continue;
            const p = cellCenter(g, r, c);
            if (Math.hypot(p.x - at.x, p.y - at.y) < g.r * 4.2) j.jiggle.set(`${r},${c}`, 0);
          }
        } else if (ev.type === 'pop') {
          poppedRef.current = true;
          playSound(popSound);
          if (ev.combo >= 2) showToast(`COMBO ×${ev.combo}!`, '#FFC312');
          else if (ev.dropped > 0) showToast(`+${ev.dropped} dropped!`, '#2ED573');
        } else if (ev.type === 'bomb') {
          poppedRef.current = true;
          playSound(bombSound);
          showToast('BOOM!', '#FF6B00');
        } else if (ev.type === 'special') {
          showToast(ev.kind === 'bomb' ? 'Bomb ready!' : 'Rainbow ready!', ev.kind === 'bomb' ? '#FF6B00' : '#A55EEA');
        } else if (ev.type === 'ceiling') {
          showToast('Ceiling down!', '#FF4757');
        } else if (ev.type === 'won' || ev.type === 'lost') {
          finish(ev.type === 'won');
        }
      }
      j.ceilingShown += (g.ceiling - j.ceilingShown) * Math.min(1, dt * 8);
      for (const [k, t] of j.jiggle) { if (t > 0.6) j.jiggle.delete(k); else j.jiggle.set(k, t + dt); }
      if (g.shot) { j.trail.push({ ...g.shot.pos }); if (j.trail.length > 4) j.trail.shift(); } else j.trail = [];

      paint();
      syncHud();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const onAim = (e: GestureResponderEvent) => {
    aimRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
  };
  const onRelease = () => {
    const g = gameRef.current;
    const t = aimRef.current;
    aimRef.current = null;
    // Releasing below the shooter means the player changed their mind.
    if (g && t && t.y < g.shooter.y - g.r && shoot(g, aimFrom(g, t))) playSound(shootSound);
  };
  const onSwap = () => {
    const g = gameRef.current;
    if (!g || phase !== 'play') return;
    swap(g);
    syncHud();
  };

  const start = () => setPhase('play');
  const replay = () => { if (level) { prepare(level); setPhase('play'); } };
  const nextLevel = () => { if (level) { prepare(level + 1); setPhase('play'); } };

  if (level === null) return <View style={styles.root} />;

  const spec = specForLevel(level);
  const liveStars = bubbleStars(hud.drops);

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.levelPill}><Text style={styles.levelText}>Level {level}</Text></View>
        <View style={styles.pill}>
          <Ionicons name="flash" size={13} color="#FFC312" />
          <Text style={styles.pillText}>{hud.score}</Text>
        </View>
        <View style={styles.pill}>
          {[1, 2, 3].map(n => <Ionicons key={n} name="star" size={13} color={n <= liveStars ? '#F5B820' : '#DADDE1'} />)}
        </View>
        <View style={styles.pill}>
          <Ionicons name="arrow-down" size={13} color="#FF4757" />
          <View style={styles.missDots}>
            {Array.from({ length: spec.missesPerDrop }, (_, i) => (
              <View key={i} style={[styles.missDot, i < hud.misses && styles.missDotOn]} />
            ))}
          </View>
        </View>
      </View>

      {/* Board. Buttons (intro, swap) sit outside this touch area so it never steals their taps. */}
      <View style={styles.boardWrap}>
        <View
          style={styles.board}
          onStartShouldSetResponder={() => phase === 'play'}
          onResponderTerminationRequest={() => false}
          onResponderGrant={onAim}
          onResponderMove={onAim}
          onResponderRelease={onRelease}
          onResponderTerminate={() => { aimRef.current = null; }}
        >
          <Board ref={boardRef} />

          {phase === 'play' && level === 1 && !hud.popped && (
            <View pointerEvents="none" style={styles.coach}>
              <Text style={styles.coachText}>Drag to aim, let go to shoot. Match 3 to pop!</Text>
            </View>
          )}

          {toast && (
            <Animated.View
              pointerEvents="none"
              style={[styles.toast, { opacity: toastAnim, transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}
            >
              <Text style={[styles.toastText, { color: toast.color }]}>{toast.text}</Text>
            </Animated.View>
          )}
        </View>

        {/* Next bubble: tap to swap with the loaded one */}
        {phase === 'play' && (
          <TouchableOpacity style={styles.swap} onPress={onSwap} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {hud.next === BOMB
              ? <View style={[styles.nextBubble, styles.nextBomb]}><MaterialCommunityIcons name="bomb" size={14} color="#FFB347" /></View>
              : hud.next === RAINBOW
                ? <View style={[styles.nextBubble, styles.nextRainbow]}><MaterialCommunityIcons name="looks" size={14} color="#A55EEA" /></View>
                : <View style={[styles.nextBubble, { backgroundColor: BUBBLE_COLORS[hud.next] }]} />}
            <Ionicons name="swap-horizontal" size={14} color="white" />
          </TouchableOpacity>
        )}

        {phase === 'intro' && (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Bubble Shooter</Text>
            <IntroLine icon={<Ionicons name="hand-left" size={16} color="#48CAE4" />} text="Drag to aim, let go to shoot" />
            <IntroLine icon={<Ionicons name="radio-button-on" size={16} color="#48CAE4" />} text="3 or more of one colour pop; what hangs below drops" />
            <IntroLine icon={<Ionicons name="swap-horizontal" size={16} color="#48CAE4" />} text="Tap the small bubble to swap it in" />
            <IntroLine icon={<Ionicons name="arrow-down" size={16} color="#FF4757" />} text={`Every ${spec.missesPerDrop} misses the ceiling comes down`} />
            <IntroLine icon={<MaterialCommunityIcons name="bomb" size={16} color="#FFB347" />} text="Clear 6 with one shot to get a bomb" />
            <IntroLine icon={<MaterialCommunityIcons name="looks" size={16} color="#C39BFF" />} text="Pop 3 shots in a row to get a rainbow" />
            <Text style={styles.introGoal}>Clear the board before it reaches the line</Text>
            <TouchableOpacity style={styles.startBtn} onPress={start} activeOpacity={0.85}>
              <LinearGradient colors={['#48CAE4', '#0077B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGrad}>
                <Ionicons name="play" size={18} color="white" />
                <Text style={styles.startText}>Play</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Won */}
      <Modal visible={phase === 'won'} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.kicker}>LEVEL {level} CLEARED</Text>
            <View style={styles.stars}>
              {[0, 1, 2].map(i => (
                <Ionicons key={i} name="star" size={i === 1 ? 54 : 42} color={i < result.stars ? '#F5B820' : '#E2E5E9'} style={i === 1 ? { marginBottom: 10 } : undefined} />
              ))}
            </View>
            <Text style={styles.title}>{result.stars === 3 ? 'Perfect aim!' : result.stars === 2 ? 'Great shooting!' : 'Board cleared!'}</Text>
            <Text style={styles.sub}>Score {hud.score} · {gameRef.current?.shots ?? 0} shots · ceiling came down {hud.drops}×</Text>
            <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.reward} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="wallet" size={20} color="white" />
              <Text style={styles.rewardText}>+{result.coins} Coins Earned!</Text>
            </LinearGradient>
            <StarRewardTiers stars={result.stars} />
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>New Balance</Text>
              <Text style={styles.balance}>{stats.totalCoins}</Text>
            </View>
            <Text style={styles.xp}>+{GAME_CONFIG.bubble.xpPerWin} XP</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={nextLevel} activeOpacity={0.85}>
              <LinearGradient colors={['#48CAE4', '#0077B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                <Text style={styles.primaryText}>Next Level</Text>
                <Ionicons name="arrow-forward" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={replay} style={styles.secondaryBtn} activeOpacity={0.7}>
              <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
              <Text style={styles.secondaryText}>Replay level {level}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Lost */}
      <Modal visible={phase === 'lost'} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={[styles.kicker, { color: '#E74C3C' }]}>THE BUBBLES REACHED THE LINE</Text>
            <GameIcon id="bubble" size={64} />
            <Text style={styles.title}>So close!</Text>
            <Text style={styles.sub}>Score {hud.score}. Bank shots off the walls reach the tricky ones.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={replay} activeOpacity={0.85}>
              <LinearGradient colors={['#FF8C42', '#FF5E00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                <Ionicons name="refresh" size={18} color="white" />
                <Text style={styles.primaryText}>Try again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  levelPill: { backgroundColor: '#002A52', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  levelText: { ...TYPOGRAPHY.small, color: 'white', fontWeight: '800' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 6, ...SHADOWS.card },
  pillText: { ...TYPOGRAPHY.small, color: COLORS.text, fontWeight: '800' },
  missDots: { flexDirection: 'row', gap: 3 },
  missDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#DADDE1' },
  missDotOn: { backgroundColor: '#FF4757' },

  boardWrap: { width: BOARD_W, height: BOARD_H },
  board: { width: BOARD_W, height: BOARD_H, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },

  swap: { position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: BORDER_RADIUS.full, paddingLeft: 6, paddingRight: 8, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  nextBomb: { backgroundColor: '#2C2C34', alignItems: 'center', justifyContent: 'center' },
  nextRainbow: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  nextBubble: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },

  coach: { position: 'absolute', bottom: 70, alignSelf: 'center', backgroundColor: 'rgba(0,119,182,0.9)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  coachText: { fontSize: 13, fontWeight: '800', color: 'white' },

  toast: { position: 'absolute', top: '42%', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 18, paddingVertical: 8 },
  toastText: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },

  intro: { ...StyleSheet.absoluteFill, borderRadius: BORDER_RADIUS.lg, backgroundColor: 'rgba(0,26,51,0.78)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: 8 },
  introTitle: { fontSize: 30, fontWeight: '900', color: 'white', marginBottom: 6 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  introIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  introLine: { flex: 1, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  introGoal: { fontSize: 14, fontWeight: '800', color: '#48CAE4', marginTop: 8, textAlign: 'center' },
  startBtn: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  startGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 34, paddingVertical: 14 },
  startText: { fontSize: 18, fontWeight: '900', color: 'white' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: 28, padding: SPACING.xl, paddingTop: SPACING.lg, alignItems: 'center', gap: 10, width: '100%', ...SHADOWS.medium },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: '#0077B6', textAlign: 'center' },
  stars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  bigEmoji: { fontSize: 54 },
  title: { fontSize: 24, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  sub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  reward: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: BORDER_RADIUS.full, paddingVertical: 12, width: '100%' },
  rewardText: { fontSize: 17, fontWeight: '800', color: 'white' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 16, paddingVertical: 12 },
  balanceLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  balance: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  xp: { ...TYPOGRAPHY.small, fontWeight: '800', color: '#A55EEA' },
  primaryBtn: { width: '100%', borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginTop: 4 },
  primaryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  primaryText: { fontSize: 16, fontWeight: '800', color: 'white' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  secondaryText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
});

export default BubbleShooter;
