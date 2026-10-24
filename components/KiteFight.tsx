import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions, Modal, GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
import AdBanner from './ads/AdBanner';
import { GameIcon } from './GameIcons';
import { useAudioPlayer } from 'expo-audio';
import { playSound } from '../utils/sound';
import {
  KiteGame, Kite, Vec, newGame, step, stringControl, kiteStars, specForLevel, START_LIVES,
} from '../utils/kite';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const KITE_LEVEL_KEY = '@tagdafun_kite_level_v1';

// The game is drawn and simulated at this rate; the simulation is time-based, so raising it
// only makes motion smoother, it never changes speeds.
const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;
const RUB_EVERY_S = 0.35;   // how often the string-rubbing sound repeats during a pench

const BOARD_W = SCREEN_W - SPACING.md * 2;
// Leaves room for the banner ad under the board; this screen doesn't scroll (dragging flies the kite).
const BOARD_H = Math.round(Math.min(SCREEN_H * 0.55, BOARD_W * 1.45));

// ── Drawing ─────────────────────────────────────────────────────────────────
interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string }

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

/** Sky, sun and the rooftop skyline: drawn once per board size and reused every frame. */
function makeBackdrop(w: number, h: number): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
  const sky = Skia.Paint();
  sky.setShader(Skia.Shader.MakeLinearGradient(
    Skia.Point(0, 0), Skia.Point(0, h),
    [Skia.Color('#4FA3E0'), Skia.Color('#8FCBF2'), Skia.Color('#FFD9A8')], [0, 0.6, 1], TileMode.Clamp,
  ));
  c.drawRect(Skia.XYWHRect(0, 0, w, h), sky);

  c.drawCircle(w * 0.8, h * 0.16, 46, fill('#FFF3C4', 0.35));
  c.drawCircle(w * 0.8, h * 0.16, 30, fill('#FFE9A0'));

  // Two layers of rooftops with water tanks, darker in front.
  const roofs = (base: number, color: string, seed: number) => {
    const b = Skia.PathBuilder.Make().moveTo(0, h);
    let x = 0;
    let i = 0;
    while (x < w + 40) {
      const bw = 34 + ((seed * (i + 3) * 37) % 40);
      const top = base - ((seed * (i + 7) * 53) % 46);
      b.lineTo(x, top).lineTo(x + bw, top);
      if (i % 3 === 1) {   // a water tank on the roof
        b.lineTo(x + bw * 0.3, top).lineTo(x + bw * 0.3, top - 12).lineTo(x + bw * 0.62, top - 12).lineTo(x + bw * 0.62, top);
      }
      x += bw;
      i++;
    }
    b.lineTo(w + 40, h).close();
    c.drawPath(b.detach(), fill(color));
  };
  roofs(h - 36, '#C9A27E', 3);
  roofs(h - 10, '#8A6448', 5);
  return rec.finishRecordingAsPicture();
}

function drawCloud(c: SkCanvas, x: number, y: number, s: number) {
  const p = fill('#FFFFFF', 0.85);
  c.drawOval(Skia.XYWHRect(x - 30 * s, y - 10 * s, 60 * s, 22 * s), p);
  c.drawOval(Skia.XYWHRect(x - 18 * s, y - 22 * s, 34 * s, 28 * s), p);
  c.drawOval(Skia.XYWHRect(x + 2 * s, y - 16 * s, 28 * s, 22 * s), p);
}

function drawString(c: SkCanvas, k: Kite, wind: number, color: string, alpha: number) {
  const ctrl = stringControl(k, wind);
  const path = Skia.PathBuilder.Make().moveTo(k.anchor.x, k.anchor.y).quadTo(ctrl.x, ctrl.y, k.pos.x, k.pos.y).detach();
  c.drawPath(path, stroke(color, k.boss ? 2.2 : 1.5, alpha));
}

function drawKite(c: SkCanvas, k: Kite, alpha: number) {
  const s = k.size;
  const tilt = k.falling > 0 ? k.spin : Math.max(-28, Math.min(28, k.vel.x * 0.07));
  c.save();
  c.translate(k.pos.x, k.pos.y);
  c.rotate(tilt, 0, 0);

  const top = -s * 0.62;
  const bottom = s * 0.58;
  const side = s * 0.46;
  const mid = -s * 0.08;

  // Tail (puchhal) first, so it sits behind the sail.
  const tail = Skia.PathBuilder.Make().moveTo(0, bottom - 4).lineTo(-s * 0.16, bottom + s * 0.22).lineTo(s * 0.16, bottom + s * 0.22).close().detach();
  c.drawPath(tail, fill(k.colors[0], alpha));

  // Sail in two colours, split down the middle.
  const left = Skia.PathBuilder.Make().moveTo(0, top).lineTo(-side, mid).lineTo(0, bottom).close().detach();
  const right = Skia.PathBuilder.Make().moveTo(0, top).lineTo(side, mid).lineTo(0, bottom).close().detach();
  c.drawPath(left, fill(k.colors[0], alpha));
  c.drawPath(right, fill(k.colors[1], alpha));

  // Spine and the bent cross stick.
  c.drawLine(0, top, 0, bottom, stroke('#5D4037', 1.4, alpha * 0.9));
  const bow = Skia.PathBuilder.Make().moveTo(-side, mid).quadTo(0, mid - s * 0.22, side, mid).detach();
  c.drawPath(bow, stroke('#5D4037', 1.4, alpha * 0.9));

  if (k.boss) {
    c.drawCircle(0, mid + s * 0.12, s * 0.11, fill('#F1C40F', alpha));
    c.drawCircle(0, mid + s * 0.12, s * 0.05, fill('#1C2833', alpha));
  }
  c.restore();
}

function drawFrame(g: KiteGame, backdrop: SkPicture, sparks: Spark[]): SkPicture {
  const rec = Skia.PictureRecorder();
  const c = rec.beginRecording(Skia.XYWHRect(0, 0, g.w, g.h));
  c.drawPicture(backdrop);

  // Clouds drift with the wind and wrap around.
  const span = g.w + 140;
  for (let i = 0; i < 4; i++) {
    const base = (i * 0.29 + 0.1) * span + g.time * (10 + g.wind * 0.35) * (0.6 + i * 0.15);
    const x = ((base % span) + span) % span - 70;
    drawCloud(c, x, g.h * (0.12 + i * 0.13), 0.8 + (i % 2) * 0.35);
  }

  for (const e of g.enemies) {
    const a = e.falling > 0 ? Math.max(0, 1 - e.falling / 2.4) : 1;
    if (e.falling === 0) drawString(c, e, g.wind, '#2C3E50', 0.6);
    drawKite(c, e, a);
  }

  const p = g.player;
  const blink = g.respawn > 0 && p.falling === 0 ? (Math.floor(g.time * 8) % 2 ? 0.45 : 1) : 1;
  if (p.falling === 0) drawString(c, p, g.wind, '#FFFFFF', 0.95);
  drawKite(c, p, p.falling > 0 ? Math.max(0, 1 - p.falling / 2.4) : blink);

  // Where the strings rub: a flickering spark.
  if (g.penchAt) {
    const r = 5 + Math.abs(Math.sin(g.time * 30)) * 6;
    c.drawCircle(g.penchAt.x, g.penchAt.y, r + 5, fill('#FFB347', 0.35));
    c.drawCircle(g.penchAt.x, g.penchAt.y, r, fill('#FFF3C4', 0.95));
  }

  for (const s of sparks) {
    c.drawLine(s.x, s.y, s.x - s.vx * 0.03, s.y - s.vy * 0.03, stroke(s.color, 2.2, Math.max(0, s.life / 0.7)));
  }
  return rec.finishRecordingAsPicture();
}

const IntroLine: React.FC<{ icon: keyof typeof Ionicons.glyphMap; color: string; text: string }> = ({ icon, color, text }) => (
  <View style={styles.introRow}>
    <View style={styles.introIcon}><Ionicons name={icon} size={15} color={color} /></View>
    <Text style={styles.introLine}>{text}</Text>
  </View>
);

// Only this view re-renders every frame; the HUD and modals around it stay still.
interface BoardHandle { show: (p: SkPicture) => void }
const Board = forwardRef<BoardHandle, { picture: SkPicture | null }>(({ picture }, ref) => {
  const [pic, setPic] = useState<SkPicture | null>(picture);
  useImperativeHandle(ref, () => ({ show: setPic }), []);
  return (
    <Canvas style={{ width: BOARD_W, height: BOARD_H }}>
      {pic && <Picture picture={pic} />}
    </Canvas>
  );
});

// ── Game ────────────────────────────────────────────────────────────────────
interface Hud { cut: number; lives: number; wind: number; pench: number; crossing: boolean }

interface KiteFightProps { onWin: () => void }

const KiteFight: React.FC<KiteFightProps> = ({ onWin }) => {
  const { stats, recordGame } = useGameStats();
  const [level, setLevel] = useState<number | null>(null);
  const [phase, setPhase] = useState<'intro' | 'play' | 'won' | 'lost'>('intro');
  const [hud, setHud] = useState<Hud>({ cut: 0, lives: START_LIVES, wind: 0, pench: 0, crossing: false });
  const [toast, setToast] = useState<{ text: string; color: string } | null>(null);
  const [result, setResult] = useState({ stars: 0, coins: 0 });

  const gameRef = useRef<KiteGame | null>(null);
  const touchRef = useRef<Vec | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const boardRef = useRef<BoardHandle>(null);
  const backdrop = useRef<SkPicture | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const bossSeen = useRef(false);
  const rubTimer = useRef(0);
  const rubSound = useAudioPlayer(require('../assets/sounds/kite-rub.m4a'));
  const cutSound = useAudioPlayer(require('../assets/sounds/kite-cut.m4a'));
  const lostSound = useAudioPlayer(require('../assets/sounds/kite-lost.m4a'));
  const winSound = useAudioPlayer(require('../assets/sounds/kite-win.m4a'));

  if (!backdrop.current) backdrop.current = makeBackdrop(BOARD_W, BOARD_H);

  const showToast = (text: string, color: string) => {
    setToast({ text, color });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, tension: 160, friction: 7, useNativeDriver: true }),
      Animated.delay(650),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const prepare = (lvl: number) => {
    gameRef.current = newGame(lvl, BOARD_W, BOARD_H);
    sparksRef.current = [];
    bossSeen.current = false;
    touchRef.current = null;
    setLevel(lvl);
    setHud({ cut: 0, lives: START_LIVES, wind: gameRef.current.wind, pench: 0, crossing: false });
    boardRef.current?.show(drawFrame(gameRef.current, backdrop.current!, []));
  };

  useEffect(() => {
    AsyncStorage.getItem(KITE_LEVEL_KEY)
      .then(v => prepare(Math.max(1, parseInt(v ?? '1', 10) || 1)))
      .catch(() => prepare(1));
  }, []);

  // Paint the opening scene behind the intro as soon as the board exists.
  useEffect(() => {
    if (level !== null && gameRef.current) boardRef.current?.show(drawFrame(gameRef.current, backdrop.current!, []));
  }, [level]);

  const finish = async (won: boolean) => {
    const g = gameRef.current!;
    if (!won) { setPhase('lost'); return; }
    const stars = kiteStars(g.lives);
    const coins = coinsForStars(stars);
    setResult({ stars, coins });
    setPhase('won');
    // The only vibration in this game: clearing a level.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    playSound(winSound);
    AsyncStorage.setItem(KITE_LEVEL_KEY, String(g.level + 1)).catch(() => {});
    await recordGame('kite', undefined, coins);
    await logGame({ timestamp: Date.now(), gameType: 'kite', costCoins: 0, earnedCoins: coins, netCoins: coins, kiteLevel: g.level, stars });
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
      for (const ev of step(g, dt, touchRef.current)) {
        if (ev.type === 'cut') {
          playSound(cutSound);
          showToast(ev.boss ? 'BOSS KAATA!' : 'BO KAATA!', '#FF6B00');
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const v = 120 + Math.random() * 140;
            sparksRef.current.push({ x: ev.at.x, y: ev.at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, color: i % 2 ? '#FFD23F' : '#FF6B00' });
          }
        } else if (ev.type === 'lost') {
          playSound(lostSound);
          showToast('Patang kat gayi!', '#E74C3C');
        } else if (ev.type === 'won' || ev.type === 'gameOver') {
          finish(ev.type === 'won');
        }
      }
      // The strings rub audibly for as long as a pench lasts.
      if (g.penchAt) {
        rubTimer.current -= dt;
        if (rubTimer.current <= 0) { playSound(rubSound); rubTimer.current = RUB_EVERY_S; }
      } else {
        rubTimer.current = 0;
      }

      if (g.bossSpawned && !bossSeen.current) {
        bossSeen.current = true;
        showToast('BOSS PATANG!', '#1C2833');
      }

      sparksRef.current = sparksRef.current
        .map(s => ({ ...s, x: s.x + s.vx * dt, y: s.y + s.vy * dt, vy: s.vy + 260 * dt, life: s.life - dt }))
        .filter(s => s.life > 0);

      boardRef.current?.show(drawFrame(g, backdrop.current!, sparksRef.current));

      const next: Hud = {
        cut: g.cut, lives: g.lives, wind: Math.round(g.wind / 10) * 10,
        pench: Math.round(g.pench * 20) / 20, crossing: g.penchAt !== null,
      };
      setHud(h => (h.cut === next.cut && h.lives === next.lives && h.wind === next.wind && h.pench === next.pench && h.crossing === next.crossing ? h : next));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const onTouch = (e: GestureResponderEvent) => {
    touchRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
  };
  const onRelease = () => { touchRef.current = null; };

  const start = () => setPhase('play');
  const replay = () => { if (level) { prepare(level); setPhase('play'); } };
  const nextLevel = () => { if (level) { prepare(level + 1); setPhase('play'); } };

  if (level === null) return <View style={styles.root} />;

  const spec = specForLevel(level);
  const windLeft = hud.wind < 0;
  const windStrength = Math.min(3, Math.round(Math.abs(hud.wind) / 25));

  return (
    <View style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.levelPill}>
          <Text style={styles.levelText}>Level {level}</Text>
          {spec.boss && <Text style={styles.bossTag}>BOSS</Text>}
        </View>
        <View style={styles.pill}>
          <Ionicons name="cut" size={14} color={COLORS.primary} />
          <Text style={styles.pillText}>{hud.cut}/{spec.goal}</Text>
        </View>
        <View style={styles.pill}>
          {Array.from({ length: START_LIVES }, (_, i) => (
            <Ionicons key={i} name="heart" size={14} color={i < hud.lives ? '#E74C3C' : '#DADDE1'} />
          ))}
        </View>
        <View style={styles.pill}>
          <Ionicons name={windLeft ? 'arrow-back' : 'arrow-forward'} size={14} color="#2E86C1" />
          <Text style={styles.pillText}>{windStrength === 0 ? 'Calm' : '≋'.repeat(windStrength)}</Text>
        </View>
      </View>

      {/* Sky. The intro sits outside this touch area: if it were inside, the board would
          take over the touch on the slightest finger movement and cancel the Fly! button. */}
      <View style={styles.boardWrap}>
      <View
        style={styles.board}
        onStartShouldSetResponder={() => phase === 'play'}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onTouch}
        onResponderMove={onTouch}
        onResponderRelease={onRelease}
        onResponderTerminate={onRelease}
      >
        <Board ref={boardRef} picture={null} />
        {/* First-level coaching until the first cut */}
        {phase === 'play' && level === 1 && hud.cut === 0 && !hud.crossing && (
          <View pointerEvents="none" style={styles.coach}>
            <Text style={styles.coachText}>Drag your kite across another kite's string</Text>
          </View>
        )}
        {phase === 'play' && level === 1 && hud.cut === 0 && hud.crossing && (
          <View pointerEvents="none" style={[styles.coach, styles.coachHot]}>
            <Text style={styles.coachText}>Now swipe fast, back and forth!</Text>
          </View>
        )}

        {/* Pench meter while strings cross */}
        {hud.crossing && phase === 'play' && (
          <View pointerEvents="none" style={styles.pench}>
            <Text style={styles.penchLabel}>PENCH! Swipe fast to pull</Text>
            <View style={styles.penchTrack}>
              <View style={styles.penchMid} />
              <View
                style={[
                  styles.penchFill,
                  hud.pench >= 0
                    ? { left: '50%', width: `${hud.pench * 50}%`, backgroundColor: '#2ED573' }
                    : { right: '50%', width: `${-hud.pench * 50}%`, backgroundColor: '#E74C3C' },
                ]}
              />
            </View>
          </View>
        )}

        {toast && (
          <Animated.View
            pointerEvents="none"
            style={[styles.toast, {
              opacity: toastAnim,
              transform: [{ scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
            }]}
          >
            <Text style={[styles.toastText, { color: toast.color }]}>{toast.text}</Text>
          </Animated.View>
        )}

      </View>
        {phase === 'intro' && (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Patang Baazi</Text>
            <IntroLine icon="hand-left" color="#FFC83D" text="Drag on the sky to fly your kite" />
            <IntroLine icon="cut" color="#FFC83D" text="When strings cross, swipe fast to cut theirs" />
            <IntroLine icon="heart" color="#FF6B6B" text="Stay still in a pench and yours gets cut" />
            <Text style={styles.introGoal}>Cut {spec.goal} kites{spec.boss ? ' and the boss' : ''} to clear Level {level}</Text>
            <TouchableOpacity style={styles.startBtn} onPress={start} activeOpacity={0.85}>
              <LinearGradient colors={['#FF8C42', '#FF5E00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGrad}>
                <Ionicons name="play" size={18} color="white" />
                <Text style={styles.startText}>Fly!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.banner}>
        <AdBanner />
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
            <Text style={styles.title}>{result.stars === 3 ? 'Ustaad!' : result.stars === 2 ? 'Bahut badhiya!' : 'Jeet gaye!'}</Text>
            <Text style={styles.sub}>{spec.goal} kites cut · {hud.lives} of {START_LIVES} kites left</Text>
            <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.reward} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="wallet" size={20} color="white" />
              <Text style={styles.rewardText}>+{result.coins} Coins Earned!</Text>
            </LinearGradient>
            <StarRewardTiers stars={result.stars} />
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>New Balance</Text>
              <Text style={styles.balance}>{stats.totalCoins}</Text>
            </View>
            <Text style={styles.xp}>+{GAME_CONFIG.kite.xpPerWin} XP</Text>
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
            <Text style={[styles.kicker, { color: '#E74C3C' }]}>ALL KITES CUT</Text>
            <GameIcon id="kite" size={64} />
            <Text style={styles.title}>Bo kaata... tumhara!</Text>
            <Text style={styles.sub}>You cut {hud.cut} of {spec.goal}. Pull harder in a pench next time.</Text>
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
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#002A52', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  levelText: { ...TYPOGRAPHY.small, color: 'white', fontWeight: '800' },
  bossTag: { fontSize: 10, fontWeight: '900', color: '#F1C40F', letterSpacing: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 6, ...SHADOWS.card },
  pillText: { ...TYPOGRAPHY.small, color: COLORS.text, fontWeight: '800' },

  boardWrap: { width: BOARD_W, height: BOARD_H },
  banner: { width: BOARD_W, marginTop: SPACING.sm, alignItems: 'center' },
  board: { width: BOARD_W, height: BOARD_H, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },

  pench: { position: 'absolute', top: 10, left: 20, right: 20, alignItems: 'center' },
  penchLabel: { fontSize: 12, fontWeight: '900', color: 'white', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, marginBottom: 4 },
  penchTrack: { width: '100%', height: 10, borderRadius: 5, backgroundColor: 'rgba(0,26,51,0.55)', overflow: 'hidden' },
  penchMid: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: 'white' },
  penchFill: { position: 'absolute', top: 0, bottom: 0 },

  coach: { position: 'absolute', bottom: 46, alignSelf: 'center', backgroundColor: 'rgba(0,26,51,0.8)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  coachHot: { backgroundColor: 'rgba(255,94,0,0.92)' },
  coachText: { fontSize: 13, fontWeight: '800', color: 'white' },
  toast: { position: 'absolute', top: '38%', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 18, paddingVertical: 8 },
  toastText: { fontSize: 26, fontWeight: '900', letterSpacing: 1 },

  intro: { ...StyleSheet.absoluteFill, borderRadius: BORDER_RADIUS.lg, backgroundColor: 'rgba(0,26,51,0.72)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: 8 },
  introTitle: { fontSize: 30, fontWeight: '900', color: 'white', marginBottom: 6 },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  introIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  introLine: { flex: 1, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.92)' },
  introGoal: { fontSize: 14, fontWeight: '800', color: '#FFC83D', marginTop: 8, textAlign: 'center' },
  startBtn: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  startGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 34, paddingVertical: 14 },
  startText: { fontSize: 18, fontWeight: '900', color: 'white' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: 28, padding: SPACING.xl, paddingTop: SPACING.lg, alignItems: 'center', gap: 10, width: '100%', ...SHADOWS.medium },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 2, color: '#0077B6' },
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

export default KiteFight;
