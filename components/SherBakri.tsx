import React, { useEffect, useRef, useState, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, Easing, Dimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { useGameStats } from '../contexts/GameStatsContext';
import { useShop } from '../contexts/ShopContext';
import { SherBoardTheme, SherColors, BakriColors, sherBoardTheme, pieceSet } from '../constants/shop';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG, coinsForStars } from '../constants/gameConfig';
import { logGame } from '../utils/gameHistory';
import { playSound } from '../utils/sound';
import WatchVideoButton from './ads/WatchVideoButton';
import StarRewardTiers from './StarRewardTiers';
import { SherToken, BakriToken } from './SherBakriIcons';
import {
  Board, Move, Side, Difficulty, SETUPS, huntGoal, BAKRI, SHER, startingBakri,
  newBoard, legalMoves, apply, result, bestMove, threatened, boardLines, sherBakriStars,
} from '../utils/sherBakri';

const { width: SCREEN_W } = Dimensions.get('window');

export const SETUP_KEY = '@tagdafun_sherbakri_setup_v2';

const BOARD_SIZE = Math.min(SCREEN_W - SPACING.md * 2, 400);
const AI_DELAY_MS = 520;
const MOVE_MS = 320;
const JUMP_MS = 460;

// Easy wins pay less and Hard more, so the quick Easy board isn't the best way to farm coins.
const COIN_FACTOR: Record<Difficulty, number> = { easy: 0.5, hard: 1.5 };

type Mode = 'ai' | 'duo';

interface Piece {
  id: number;
  kind: typeof BAKRI | typeof SHER;
  cell: number;
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  spin: Animated.Value;
}

const run = (a: Animated.CompositeAnimation) => new Promise<void>(r => a.start(() => r()));
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function geometryFor(n: number) {
  const pad = BOARD_SIZE * 0.09;
  const gap = (BOARD_SIZE - pad * 2) / (n - 1);
  const token = Math.min(gap * 0.66, 58);
  const at = (i: number) => ({ x: pad + (i % n) * gap, y: pad + Math.floor(i / n) * gap });
  return { pad, gap, token, at };
}

// ── Board drawing (static per size) ─────────────────────────────────────────
const BoardArt = memo(({ n, theme }: { n: number; theme: SherBoardTheme }) => {
  const { at } = geometryFor(n);
  const lines = boardLines(n);
  return (
    <Svg width={BOARD_SIZE} height={BOARD_SIZE} style={StyleSheet.absoluteFill}>
      {lines.map(([a, b], k) => {
        const p = at(a);
        const q = at(b);
        return <Line key={k} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={theme.line} strokeWidth={2.6} strokeLinecap="round" strokeOpacity={0.85} />;
      })}
      {Array.from({ length: n * n }, (_, i) => {
        const p = at(i);
        return <SvgCircle key={`p${i}`} cx={p.x} cy={p.y} r={4.5} fill={theme.dot} />;
      })}
    </Svg>
  );
});

const Token = memo(({ kind, size, id, sher, bakri }: { kind: number; size: number; id: number; sher: SherColors; bakri: BakriColors }) =>
  kind === SHER ? <SherToken size={size} id={`t${id}`} colors={sher} /> : <BakriToken size={size} id={`g${id}`} colors={bakri} />);

// ── Game ────────────────────────────────────────────────────────────────────
interface SherBakriProps { onWin: () => void }

const SherBakri: React.FC<SherBakriProps> = ({ onWin }) => {
  const { stats, recordGame } = useGameStats();
  const { shop } = useShop();
  const set = pieceSet(shop.pieceSet);
  const boardTheme = sherBoardTheme(shop.sherBoard);
  const [screen, setScreen] = useState<'menu' | 'play'>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [side, setSide] = useState<Side>('bakri');
  const [mode, setMode] = useState<Mode>('ai');
  const [board, setBoard] = useState<Board>(() => newBoard('easy'));
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [thinking, setThinking] = useState(false);
  const [over, setOver] = useState<{ winner: Side; reason: string; stars: number; coins: number } | null>(null);

  const piecesRef = useRef<Piece[]>([]);
  const boardRef = useRef(board);
  const busyRef = useRef(false);
  const nextId = useRef(1);
  const sherMovesRef = useRef(0);
  const mounted = useRef(true);
  const playingRef = useRef(false);   // false on the menu, so a pending computer move is dropped
  const pulse = useRef(new Animated.Value(0)).current;
  const turnAnim = useRef(new Animated.Value(0)).current;

  const placeSound = useAudioPlayer(require('../assets/sounds/bubble-pop.m4a'));
  const moveSound = useAudioPlayer(require('../assets/sounds/bubble-shoot.m4a'));
  const huntSound = useAudioPlayer(require('../assets/sounds/kite-cut.m4a'));
  const winSound = useAudioPlayer(require('../assets/sounds/water-win.m4a'));
  const loseSound = useAudioPlayer(require('../assets/sounds/kite-lost.m4a'));

  // Set it true again on every mount: Fast Refresh and Strict Mode re-run this effect after its cleanup.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Remember the last setup.
  useEffect(() => {
    AsyncStorage.getItem(SETUP_KEY).then(raw => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.difficulty in SETUPS) setDifficulty(s.difficulty);
        if (s.side === 'bakri' || s.side === 'sher') setSide(s.side);
        if (s.mode === 'ai' || s.mode === 'duo') setMode(s.mode);
      } catch {}
    }).catch(() => {});
  }, []);

  // One shared pulse drives the selection ring, move dots and danger rings.
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    Animated.spring(turnAnim, { toValue: board.turn === 'bakri' ? 0 : 1, tension: 120, friction: 12, useNativeDriver: false }).start();
  }, [board.turn, turnAnim]);

  const geo = geometryFor(board.n);
  const human = (s: Side) => mode === 'duo' || s === side;

  const setPiecesBoth = (p: Piece[]) => { piecesRef.current = p; setPieces(p); };

  const makePiece = (kind: typeof BAKRI | typeof SHER, cell: number, g = geo): Piece => {
    const p = g.at(cell);
    return {
      id: nextId.current++, kind, cell,
      x: new Animated.Value(p.x - g.token / 2), y: new Animated.Value(p.y - g.token / 2),
      scale: new Animated.Value(1), opacity: new Animated.Value(1), spin: new Animated.Value(0),
    };
  };

  // ── Start ──
  const startGame = () => {
    AsyncStorage.setItem(SETUP_KEY, JSON.stringify({ difficulty, side, mode })).catch(() => {});
    const b = newBoard(difficulty);
    const g = geometryFor(b.n);
    // Bakri first, so the sher stand on top of them in the draw order.
    const homes = b.cells.flatMap((c, i) => (c === BAKRI ? Array<number>(b.count[i]).fill(i) : []));
    const start = homes
      .concat(b.cells.map((c, i) => (c === SHER ? i : -1)).filter(i => i >= 0))
      .map(i => {
        const p = makePiece(b.cells[i] === SHER ? SHER : BAKRI, i, g);
        p.scale.setValue(0);
        return p;
      });
    boardRef.current = b;
    sherMovesRef.current = 0;
    busyRef.current = false;
    setBoard(b);
    setPiecesBoth(start);
    setSelected(null);
    setLastMove(null);
    setOver(null);
    setScreen('play');
    playingRef.current = true;
    // The herd gathers in the middle, then the sher take their places at the ends of the centre row.
    // The whole entrance takes about a second however many pieces there are.
    Animated.stagger(Math.min(90, Math.floor(700 / start.length)), start.map(t => Animated.spring(t.scale, { toValue: 1, tension: 90, friction: 6, useNativeDriver: true }))).start();
    // Safety net: whatever happened to the animation, every piece is on the board a moment later.
    setTimeout(() => { if (mounted.current) start.forEach(t => t.scale.setValue(1)); }, 1600);
    if (!human('bakri')) setTimeout(() => aiTurn(b), AI_DELAY_MS + 300);
  };

  // ── Animating a move ──
  const animateMove = async (b: Board, m: Move) => {
    const g = geometryFor(b.n);
    const to = g.at(m.to);
    const list = piecesRef.current;

    if (m.kind === 'place') {
      const p = makePiece(BAKRI, m.to, g);
      p.y.setValue(to.y - g.token / 2 - 40);
      p.opacity.setValue(0);
      p.scale.setValue(1.25);
      setPiecesBoth([...list, p]);
      playSound(placeSound);
      await run(Animated.parallel([
        Animated.timing(p.opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(p.y, { toValue: to.y - g.token / 2, tension: 180, friction: 9, useNativeDriver: true }),
        Animated.spring(p.scale, { toValue: 1, tension: 180, friction: 7, useNativeDriver: true }),
      ]));
      return;
    }

    // The top piece of a stack is the last one drawn there.
    const mover = [...list].reverse().find(p => p.cell === m.from)!;
    mover.cell = m.to;
    // Draw the mover above whatever is already on its new point.
    const reordered = [...list.filter(p => p !== mover), mover];
    piecesRef.current = reordered;
    setPieces(reordered);
    if (m.kind === 'move') {
      playSound(moveSound);
      await run(Animated.parallel([
        Animated.timing(mover.x, { toValue: to.x - g.token / 2, duration: MOVE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(mover.y, { toValue: to.y - g.token / 2, duration: MOVE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(mover.scale, { toValue: 1.12, duration: MOVE_MS / 2, useNativeDriver: true }),
          Animated.spring(mover.scale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
        ]),
      ]));
      return;
    }

    // Jump: the sher leaps in an arc, growing as it rises; the bakri is knocked off the board.
    const prey = [...list].reverse().find(p => p.cell === m.over)!;
    await run(Animated.parallel([
      Animated.timing(mover.x, { toValue: to.x - g.token / 2, duration: JUMP_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(mover.y, { toValue: to.y - g.token / 2, duration: JUMP_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(mover.scale, { toValue: 1.45, duration: JUMP_MS / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(mover.scale, { toValue: 1, tension: 220, friction: 7, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(JUMP_MS * 0.45),
        Animated.parallel([
          Animated.timing(prey.y, { toValue: g.at(m.over).y - g.token / 2 - 70, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(prey.spin, { toValue: 1, duration: 520, useNativeDriver: true }),
          Animated.timing(prey.scale, { toValue: 0.4, duration: 520, useNativeDriver: true }),
          Animated.timing(prey.opacity, { toValue: 0, duration: 520, useNativeDriver: true }),
        ]),
      ]),
    ]));
    playSound(huntSound);
    setPiecesBoth(piecesRef.current.filter(p => p !== prey));
  };

  const commit = async (m: Move) => {
    const b = boardRef.current;
    busyRef.current = true;
    setSelected(null);
    if (b.turn === 'sher') sherMovesRef.current += 1;
    await animateMove(b, m);
    if (!mounted.current) return;
    const nb = apply(b, m);
    boardRef.current = nb;
    setBoard(nb);
    setLastMove(m);

    const r = result(nb);
    if (r) {
      await wait(350);
      finish(nb, r.winner, r.reason);
      return;
    }
    busyRef.current = false;
    if (!human(nb.turn)) setTimeout(() => aiTurn(nb), AI_DELAY_MS);
  };

  const aiTurn = async (b: Board) => {
    if (!mounted.current || !playingRef.current || boardRef.current !== b) return;
    busyRef.current = true;
    setThinking(true);
    await wait(30);   // let "thinking" paint before the search blocks the thread
    let m: Move | null = null;
    try {
      m = bestMove(b);
    } catch {
      // Never leave the game waiting on the computer: fall back to any legal move.
      const all = legalMoves(b);
      m = all.length > 0 ? all[Math.floor(Math.random() * all.length)] : null;
    }
    setThinking(false);
    if (m) await commit(m);
    else busyRef.current = false;
  };

  const finish = async (b: Board, winner: Side, reason: string) => {
    busyRef.current = true;
    const playerWon = mode === 'ai' && winner === side;
    const stars = playerWon ? sherBakriStars(side, b, sherMovesRef.current) : 0;
    const coins = playerWon ? Math.round(coinsForStars(stars) * COIN_FACTOR[difficulty]) : 0;
    setOver({ winner, reason, stars, coins });
    if (mode === 'duo' || playerWon) {
      playSound(winSound);
      // The only vibration in this game: a win.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      playSound(loseSound);
    }
    // Trapped sher shiver.
    if (reason === 'trapped' && winner === 'bakri') {
      for (const t of piecesRef.current.filter(p => p.kind === SHER)) {
        Animated.sequence([1.15, 0.9, 1.08, 1].map(v => Animated.timing(t.scale, { toValue: v, duration: 110, useNativeDriver: true }))).start();
      }
    }
    if (playerWon) {
      await recordGame('bagh', undefined, coins);
      await logGame({ timestamp: Date.now(), gameType: 'bagh', costCoins: 0, earnedCoins: coins, netCoins: coins, baghSide: side, baghDifficulty: difficulty, stars });
      onWin();
    }
  };

  // ── Taps ──
  const moves = legalMoves(board);
  const humanTurn = screen === 'play' && !over && human(board.turn) && !thinking;
  const fromSelected = selected !== null ? moves.filter(m => m.from === selected) : [];

  const tap = (i: number) => {
    if (!humanTurn || busyRef.current) return;
    if (moves[0]?.kind === 'place') {
      const m = moves.find(x => x.to === i);
      if (m) commit(m);
      return;
    }
    const own = board.turn === 'bakri' ? BAKRI : SHER;
    const target = fromSelected.find(m => m.to === i);
    if (target) { commit(target); return; }
    if (board.cells[i] === own && moves.some(m => m.from === i)) { setSelected(i); return; }
    setSelected(null);
  };

  // ── Menu ──
  if (screen === 'menu') {
    const s = SETUPS[difficulty];
    return (
      <View style={styles.root}>
        <Text style={[styles.label, { marginTop: 0 }]}>DIFFICULTY</Text>
        <View style={styles.row}>
          {(['easy', 'hard'] as Difficulty[]).map(d => {
            const st = SETUPS[d];
            const on = difficulty === d;
            return (
              <TouchableOpacity key={d} style={[styles.diffCard, on && styles.diffCardOn]} onPress={() => setDifficulty(d)} activeOpacity={0.85}>
                <Text style={[styles.diffTitle, on && styles.diffTitleOn]}>{d === 'easy' ? 'Easy' : 'Hard'}</Text>
                <Text style={[styles.diffMeta, on && styles.diffMetaOn]}>{st.n}×{st.n} board</Text>
                <View style={styles.diffCounts}>
                  <SherToken size={18} id={`m${d}`} colors={set.sher} />
                  <Text style={[styles.diffMeta, on && styles.diffMetaOn]}>{st.sher}</Text>
                  <BakriToken size={18} id={`m${d}`} colors={set.bakri} />
                  <Text style={[styles.diffMeta, on && styles.diffMetaOn]}>{st.bakri}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>MODE</Text>
        <View style={styles.segment}>
          {(['ai', 'duo'] as Mode[]).map(m => (
            <TouchableOpacity key={m} style={[styles.segBtn, mode === m && styles.segBtnOn]} onPress={() => setMode(m)} activeOpacity={0.85}>
              <Ionicons name={m === 'ai' ? 'hardware-chip' : 'people'} size={16} color={mode === m ? 'white' : COLORS.textSecondary} />
              <Text style={[styles.segText, mode === m && styles.segTextOn]}>{m === 'ai' ? 'vs Computer' : '2 Players'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'ai' && (
          <>
            <Text style={styles.label}>PLAY AS</Text>
            <View style={styles.row}>
              {(['bakri', 'sher'] as Side[]).map(sd => {
                const on = side === sd;
                return (
                  <TouchableOpacity key={sd} style={[styles.sideCard, on && (sd === 'bakri' ? styles.sideBakriOn : styles.sideSherOn)]} onPress={() => setSide(sd)} activeOpacity={0.85}>
                    {sd === 'bakri' ? <BakriToken size={56} id="sg" colors={set.bakri} /> : <SherToken size={56} id="st" colors={set.sher} />}
                    <Text style={styles.sideTitle}>{sd === 'bakri' ? 'Bakri' : 'Sher'}</Text>
                    <Text style={styles.sideSub}>
                      {sd === 'bakri' ? 'Block every sher so none can move' : `Hunt ${huntGoal(s)} bakri to win`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.rules}>
          {s.homes ? (
            <>
              <Rule icon="home" text={`${s.bakri} bakri start at home: ${s.bakri / 4} to a point, on the four corners of the middle squares`} />
              <Rule icon="shield-checkmark" text="A sher can jump over a stack too, but takes only one bakri from it" />
            </>
          ) : (
            <>
              <Rule icon="people" text={`${startingBakri(s)} bakri start in the middle, a sher waits at each end of the centre row`} />
              <Rule icon="add-circle" text={`${s.bakri - startingBakri(s)} more bakri join one at a time, next to the herd, then they move`} />
            </>
          )}
          <Rule icon="trending-up" text="Pieces move one step along a line" />
          <Rule icon="flash" text="A sher jumps over a bakri to an empty point to hunt it" />
          <Rule icon="lock-closed" text="Bakri win when no sher can move" />
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={startGame} activeOpacity={0.85}>
          <LinearGradient colors={['#FF8C42', '#E8590C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.startGrad}>
            <Ionicons name="play" size={18} color="white" />
            <Text style={styles.startText}>Start</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Play ──
  const threats = threatened(board);
  const placing = board.toPlace > 0;
  const nameFor = (s: Side) => (mode === 'duo' ? (s === 'bakri' ? 'Player 1' : 'Player 2') : s === side ? 'You' : 'Computer');
  const placeTargets = humanTurn ? moves.filter(m => m.kind === 'place').map(m => m.to) : [];
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const indicatorLeft = turnAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] });

  return (
    <View style={styles.root}>
      {/* Sides */}
      <View style={styles.sides}>
        <Animated.View style={[styles.turnGlow, { left: indicatorLeft }]} />
        <View style={styles.sideStat}>
          <BakriToken size={34} id="hg" colors={set.bakri} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sideName}>{nameFor('bakri')}</Text>
            <Text style={styles.sideInfo}>{placing ? `${board.toPlace} to place` : `${board.captured}/${huntGoal(board.setup)} lost`}</Text>
          </View>
        </View>
        <View style={styles.sideStat}>
          <SherToken size={34} id="ht" colors={set.sher} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sideName}>{nameFor('sher')}</Text>
            <Text style={styles.sideInfo}>{board.captured}/{huntGoal(board.setup)} hunted</Text>
          </View>
        </View>
      </View>

      <Text style={styles.turnText}>
        {over ? ' ' : thinking ? 'Computer is thinking…' : `${nameFor(board.turn)}: ${board.turn === 'bakri' ? (placing ? 'place a bakri' : 'move a bakri') : 'move a sher'}`}
      </Text>

      {/* Board */}
      <LinearGradient colors={boardTheme.panel} style={[styles.board, { borderColor: boardTheme.border }]}>
        <BoardArt n={board.n} theme={boardTheme} />

        {/* Last move trail */}
        {lastMove && lastMove.from >= 0 && (
          <Svg width={BOARD_SIZE} height={BOARD_SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line
              x1={geo.at(lastMove.from).x} y1={geo.at(lastMove.from).y} x2={geo.at(lastMove.to).x} y2={geo.at(lastMove.to).y}
              stroke={lastMove.kind === 'jump' ? '#E03131' : '#FFFFFF'} strokeWidth={5} strokeOpacity={0.55} strokeLinecap="round"
            />
          </Svg>
        )}

        {/* Where you can go */}
        {[...fromSelected.map(m => ({ i: m.to, jump: m.kind === 'jump' })), ...placeTargets.map(i => ({ i, jump: false }))].map(({ i, jump }) => {
          const p = geo.at(i);
          const d = jump ? geo.token * 0.62 : geo.token * 0.34;
          return (
            <Animated.View
              key={`t${i}`}
              pointerEvents="none"
              style={[
                jump ? styles.jumpTarget : styles.moveTarget,
                { left: p.x - d / 2, top: p.y - d / 2, width: d, height: d, borderRadius: d / 2, transform: [{ scale: dotScale }] },
              ]}
            />
          );
        })}

        {/* Pieces */}
        {pieces.map(p => (
          <Animated.View
            key={p.id}
            pointerEvents="none"
            style={{
              position: 'absolute', left: 0, top: 0, width: geo.token, height: geo.token,
              opacity: p.opacity,
              transform: [
                { translateX: p.x }, { translateY: p.y }, { scale: p.scale },
                { rotate: p.spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) },
              ],
            }}
          >
            <View style={styles.tokenShadow} />
            <Token kind={p.kind} size={geo.token} id={p.id} sher={set.sher} bakri={set.bakri} />
            {/* A bakri a sher could take right now */}
            {p.kind === BAKRI && threats.has(p.cell) && !over && (
              <Animated.View style={[styles.dangerRing, { opacity: ringOpacity }]} />
            )}
            {selected === p.cell && <Animated.View style={[styles.selectRing, { opacity: ringOpacity }]} />}
          </Animated.View>
        ))}

        {/* How many bakri stand together on a point */}
        {board.count.map((c, i) => {
          if (c < 2) return null;
          const p = geo.at(i);
          const d = Math.max(16, geo.token * 0.4);
          return (
            <View key={`c${i}`} pointerEvents="none" style={[styles.stackBadge, { left: p.x + geo.token * 0.22, top: p.y - geo.token * 0.5, width: d, height: d, borderRadius: d / 2 }]}>
              <Text style={styles.stackText}>{c}</Text>
            </View>
          );
        })}

        {/* Tap targets for every point */}
        {Array.from({ length: board.n * board.n }, (_, i) => {
          const p = geo.at(i);
          const d = geo.gap * 0.9;
          return <Pressable key={`h${i}`} onPress={() => tap(i)} style={{ position: 'absolute', left: p.x - d / 2, top: p.y - d / 2, width: d, height: d }} />;
        })}
      </LinearGradient>

      {/* Bakri waiting, or the survival clock */}
      {placing ? (
        <View style={styles.tray}>
          {Array.from({ length: Math.min(board.toPlace, 12) }, (_, i) => (
            <View key={i} style={[styles.trayBakri, { marginLeft: i === 0 ? 0 : -10 }]}><BakriToken size={26} id={`r${i}`} colors={set.bakri} /></View>
          ))}
          {board.toPlace > 12 && <Text style={styles.trayMore}>+{board.toPlace - 12}</Text>}
        </View>
      ) : (
        <View style={styles.survive}>
          <Text style={styles.surviveText}>{board.setup.bakri - board.captured} bakri left · sher win when fewer than {board.setup.minBakri}</Text>
          <View style={styles.surviveTrack}>
            <View style={[styles.surviveFill, { width: `${(board.captured / huntGoal(board.setup)) * 100}%` }]} />
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={startGame} activeOpacity={0.7}>
          <Ionicons name="refresh" size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Restart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} onPress={() => { busyRef.current = true; playingRef.current = false; setScreen('menu'); }} activeOpacity={0.7}>
          <Ionicons name="options" size={16} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Change setup</Text>
        </TouchableOpacity>
      </View>

      {/* Result */}
      <Modal visible={over !== null} transparent animationType="fade">
        <View style={styles.overlay}>
          {over && (
            <View style={styles.card}>
              {over.winner === 'sher' ? <SherToken size={86} id="rw" colors={set.sher} /> : <BakriToken size={86} id="rw" colors={set.bakri} />}
              <Text style={styles.kicker}>
                {over.reason === 'captured' ? `${board.captured} BAKRI HUNTED` : over.reason === 'trapped' ? 'EVERY SHER BLOCKED' : `SHER CAN NO LONGER BE BLOCKED`}
              </Text>
              <Text style={styles.title}>
                {mode === 'duo' ? (over.winner === 'sher' ? 'Sher jeeta!' : 'Bakriyan jeeti!') : over.winner === side ? 'Jeet gaye!' : 'Is baar nahi!'}
              </Text>
              {over.coins > 0 && (
                <>
                  <View style={styles.stars}>
                    {[0, 1, 2].map(i => (
                      <Ionicons key={i} name="star" size={i === 1 ? 50 : 40} color={i < over.stars ? '#F5B820' : '#E2E5E9'} style={i === 1 ? { marginBottom: 8 } : undefined} />
                    ))}
                  </View>
                  <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.reward} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="wallet" size={20} color="white" />
                    <Text style={styles.rewardText}>+{over.coins} Coins Earned!</Text>
                  </LinearGradient>
                  <StarRewardTiers stars={over.stars} />
                  <Text style={styles.xp}>+{GAME_CONFIG.bagh.xpPerWin} XP · balance {stats.totalCoins}</Text>
                </>
              )}
              <WatchVideoButton resetKey={over} />
              <TouchableOpacity style={styles.primaryBtn} onPress={startGame} activeOpacity={0.85}>
                <LinearGradient colors={['#FF8C42', '#E8590C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGrad}>
                  <Ionicons name="refresh" size={18} color="white" />
                  <Text style={styles.primaryText}>Play again</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setOver(null); playingRef.current = false; setScreen('menu'); }} style={styles.secondaryBtn} activeOpacity={0.7}>
                <Ionicons name="options" size={16} color={COLORS.textSecondary} />
                <Text style={styles.secondaryText}>Change setup</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const Rule: React.FC<{ icon: keyof typeof Ionicons.glyphMap; text: string }> = ({ icon, text }) => (
  <View style={styles.rule}>
    <View style={styles.ruleIcon}><Ionicons name={icon} size={14} color="#8C5A2B" /></View>
    <Text style={styles.ruleText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },

  // Menu
  label: { alignSelf: 'stretch', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  diffCard: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingVertical: 12, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
  diffCardOn: { borderColor: '#E8590C', backgroundColor: '#FFF4E8' },
  diffTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  diffTitleOn: { color: '#E8590C' },
  diffMeta: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  diffMetaOn: { color: '#8C5A2B' },
  diffCounts: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  segment: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.sm + 2 },
  segBtnOn: { backgroundColor: '#6B4423' },
  segText: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
  segTextOn: { color: 'white' },
  sideCard: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: 12, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
  sideBakriOn: { borderColor: '#2E6B3A', backgroundColor: '#EEF8F0' },
  sideSherOn: { borderColor: '#E8590C', backgroundColor: '#FFF4E8' },
  sideTitle: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  sideSub: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  rules: { alignSelf: 'stretch', gap: 6, marginTop: SPACING.md, backgroundColor: '#FBF3E6', borderRadius: BORDER_RADIUS.lg, padding: 12 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F1DFC4', alignItems: 'center', justifyContent: 'center' },
  ruleText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#5C3D1E' },
  startBtn: { alignSelf: 'stretch', borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginTop: SPACING.md, ...SHADOWS.medium },
  startGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  startText: { fontSize: 17, fontWeight: '900', color: 'white' },

  // Play
  sides: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: 4, ...SHADOWS.card },
  turnGlow: { position: 'absolute', top: 4, bottom: 4, width: '50%', borderRadius: BORDER_RADIUS.md, backgroundColor: '#FFF1DE', borderWidth: 1.5, borderColor: '#F0B36B' },
  sideStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  sideName: { fontSize: 14, fontWeight: '900', color: COLORS.text },
  sideInfo: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginTop: 1 },
  turnText: { fontSize: 13, fontWeight: '800', color: '#8C5A2B', marginVertical: 10, height: 18 },
  board: { width: BOARD_SIZE, height: BOARD_SIZE, borderRadius: BORDER_RADIUS.lg, borderWidth: 3, borderColor: '#B07C45', ...SHADOWS.medium },
  moveTarget: { position: 'absolute', backgroundColor: 'rgba(46,213,115,0.85)', borderWidth: 2, borderColor: 'white' },
  jumpTarget: { position: 'absolute', borderWidth: 3, borderColor: '#E03131', backgroundColor: 'rgba(224,49,49,0.18)' },
  stackBadge: { position: 'absolute', backgroundColor: '#2E6B3A', borderWidth: 1.5, borderColor: 'white', alignItems: 'center', justifyContent: 'center' },
  stackText: { fontSize: 10, fontWeight: '900', color: 'white' },
  tokenShadow: { position: 'absolute', left: '12%', right: '12%', bottom: -4, height: 8, borderRadius: 4, backgroundColor: 'rgba(60,30,10,0.25)' },
  dangerRing: { position: 'absolute', top: -4, left: -4, right: -4, bottom: -4, borderRadius: 999, borderWidth: 3, borderColor: '#E03131' },
  selectRing: { position: 'absolute', top: -5, left: -5, right: -5, bottom: -5, borderRadius: 999, borderWidth: 3, borderColor: '#FFFFFF' },
  tray: { flexDirection: 'row', alignItems: 'center', marginTop: 12, height: 30 },
  trayBakri: { borderRadius: 13, borderWidth: 1.5, borderColor: 'white' },
  trayMore: { marginLeft: 6, fontSize: 13, fontWeight: '900', color: '#2E6B3A' },
  survive: { alignSelf: 'stretch', marginTop: 12, height: 30 },
  surviveText: { fontSize: 12, fontWeight: '800', color: '#2E6B3A', textAlign: 'center', marginBottom: 4 },
  surviveTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.surfaceDark, overflow: 'hidden' },
  surviveFill: { height: 6, borderRadius: 3, backgroundColor: '#2ED573' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, ...SHADOWS.card },
  actionText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },

  // Result
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: 28, padding: SPACING.xl, paddingTop: SPACING.lg, alignItems: 'center', gap: 10, width: '100%', ...SHADOWS.medium },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: '#8C5A2B', textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  stars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  reward: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: BORDER_RADIUS.full, paddingVertical: 12, width: '100%' },
  rewardText: { fontSize: 17, fontWeight: '800', color: 'white' },
  xp: { ...TYPOGRAPHY.small, fontWeight: '800', color: '#A55EEA' },
  primaryBtn: { width: '100%', borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginTop: 4 },
  primaryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  primaryText: { fontSize: 16, fontWeight: '800', color: 'white' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  secondaryText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
});

export default SherBakri;
