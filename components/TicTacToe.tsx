import React, { useEffect, useRef, useState, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, Animated, Easing, Dimensions, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import { useGameStats } from '../contexts/GameStatsContext';
import { useShop } from '../contexts/ShopContext';
import { markSet } from '../constants/shop';
import { TicTacMark } from './TicTacMarks';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { GAME_CONFIG } from '../constants/gameConfig';
import { logGame } from '../utils/gameHistory';
import { playSound } from '../utils/sound';
import { prepareInterstitial, interstitialAfterGame } from '../services/interstitialAd';
import { Cell, Mark, Win, winnerOf, isFull, other, computerMove } from '../utils/ticTacToe';

const { width: SCREEN_W } = Dimensions.get('window');
const BOARD = Math.min(SCREEN_W - SPACING.md * 2, 340);
const CELL = BOARD / 3;
const AI_DELAY_MS = 450;
const RESULT_DELAY_MS = 750;   // let the winning line show before the result card

const SETUP_KEY = '@tagdafun_tictactoe_setup_v1';

type Mode = 'ai' | 'duo';
type Outcome = 'win' | 'loss' | 'draw';

/** A mark in the symbol set the player picked in the Shop. */
const MarkArt = memo(({ mark, size }: { mark: Mark; size: number }) => {
  const { shop } = useShop();
  return <TicTacMark setId={shop.markSet} mark={mark} size={size} id={`${mark}${size}`} />;
});

/** One square: the mark pops in when it is placed. */
const Square = memo(({ mark, win, onPress }: { mark: Cell; win: boolean; onPress: () => void }) => {
  const pop = useRef(new Animated.Value(mark ? 1 : 0)).current;
  useEffect(() => {
    if (mark) {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, tension: 200, friction: 7, useNativeDriver: true }).start();
    } else {
      pop.setValue(0);
    }
  }, [mark, pop]);
  return (
    <Pressable onPress={onPress} style={[styles.square, win && styles.squareWin]}>
      {mark && (
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          <MarkArt mark={mark} size={CELL * 0.62} />
        </Animated.View>
      )}
    </Pressable>
  );
});

interface TicTacToeProps { onWin: () => void }

const TicTacToe: React.FC<TicTacToeProps> = ({ onWin }) => {
  const { stats, recordGame } = useGameStats();
  const { shop } = useShop();
  const accent = markSet(shop.markSet);
  const [screen, setScreen] = useState<'menu' | 'play'>('menu');
  const [mode, setMode] = useState<Mode>('ai');
  const [human, setHuman] = useState<Mark>('X');
  const [cells, setCells] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<Mark>('X');
  const [win, setWin] = useState<Win | null>(null);
  const [over, setOver] = useState<{ outcome: Outcome; mark: Mark | null; coins: number } | null>(null);
  const [score, setScore] = useState({ win: 0, loss: 0, draw: 0 });

  const cellsRef = useRef<Cell[]>(cells);
  const turnRef = useRef<Mark>('X');
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const playingRef = useRef(false);   // false on the menu, so a pending computer move is dropped

  const markSound = useAudioPlayer(require('../assets/sounds/bubble-pop.m4a'));
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
        if (s.mode === 'ai' || s.mode === 'duo') setMode(s.mode);
        if (s.human === 'X' || s.human === 'O') setHuman(s.human);
      } catch {}
    }).catch(() => {});
  }, []);

  const isHuman = (m: Mark) => mode === 'duo' || m === human;

  // ── Start ──
  const startGame = () => {
    AsyncStorage.setItem(SETUP_KEY, JSON.stringify({ mode, human })).catch(() => {});
    const empty: Cell[] = Array(9).fill(null);
    cellsRef.current = empty;
    turnRef.current = 'X';
    busyRef.current = false;
    playingRef.current = true;
    prepareInterstitial();
    setCells(empty);
    setTurn('X');
    setWin(null);
    setOver(null);
    setScreen('play');
    // X always moves first, so the computer opens when the player chose O.
    if (mode === 'ai' && human === 'O') {
      busyRef.current = true;
      setTimeout(computerTurn, AI_DELAY_MS + 200);
    }
  };

  // ── Result ──
  const finish = async (final: Cell[], w: Win | null) => {
    busyRef.current = true;
    const outcome: Outcome = w ? (mode === 'duo' || w.mark === human ? 'win' : 'loss') : 'draw';
    const coins = mode === 'ai'
      ? outcome === 'win' ? GAME_CONFIG.tictac.winCoins : outcome === 'loss' ? GAME_CONFIG.tictac.loseCoins : GAME_CONFIG.tictac.drawCoins
      : 0;
    setWin(w);
    await wait(RESULT_DELAY_MS);
    if (!mounted.current || !playingRef.current) return;
    setOver({ outcome, mark: w ? w.mark : null, coins });
    if (mode === 'ai') setScore(s => ({ ...s, [outcome]: s[outcome] + 1 }));
    if (outcome === 'loss') {
      playSound(loseSound);
    } else {
      playSound(winSound);
      if (outcome === 'win') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    // Every third game, an ad comes up by itself over the result card.
    setTimeout(interstitialAfterGame, 500);
    if (mode === 'ai') {
      await recordGame('tictac', undefined, coins);
      await logGame({ timestamp: Date.now(), gameType: 'tictac', costCoins: 0, earnedCoins: coins, netCoins: coins, tictacResult: outcome });
      onWin();
    }
  };

  // ── A mark is placed ──
  const place = (i: number, mark: Mark) => {
    const next = cellsRef.current.slice();
    next[i] = mark;
    cellsRef.current = next;
    setCells(next);
    playSound(markSound);
    const w = winnerOf(next);
    if (w || isFull(next)) {
      finish(next, w);
      return;
    }
    const nextTurn = other(mark);
    turnRef.current = nextTurn;
    setTurn(nextTurn);
    if (!isHuman(nextTurn)) {
      busyRef.current = true;
      setTimeout(computerTurn, AI_DELAY_MS);
    } else {
      busyRef.current = false;
    }
  };

  const computerTurn = () => {
    if (!mounted.current || !playingRef.current) return;
    const me = turnRef.current;
    place(computerMove(cellsRef.current, me), me);
  };

  const tap = (i: number) => {
    if (busyRef.current || cellsRef.current[i] || !isHuman(turnRef.current)) return;
    place(i, turnRef.current);
  };

  // ── Menu ──
  if (screen === 'menu') {
    return (
      <View style={styles.root}>
        <Text style={[styles.label, { marginTop: 0 }]}>MODE</Text>
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
              {(['X', 'O'] as Mark[]).map(m => {
                const on = human === m;
                return (
                  <TouchableOpacity key={m} style={[styles.sideCard, on && (m === 'X' ? { borderColor: accent.x, backgroundColor: accent.x + '14' } : { borderColor: accent.o, backgroundColor: accent.o + '14' })]} onPress={() => setHuman(m)} activeOpacity={0.85}>
                    <MarkArt mark={m} size={52} />
                    <Text style={styles.sideTitle}>{m}</Text>
                    <Text style={styles.sideSub}>{m === 'X' ? 'You go first' : 'Computer goes first'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.rules}>
          <Rule icon="grid" text="Take turns to place your mark. Three in a row wins" />
          {mode === 'ai' ? (
            <Rule icon="wallet" text={`Win +${GAME_CONFIG.tictac.winCoins} coins, lose or draw +${GAME_CONFIG.tictac.loseCoins} coins`} />
          ) : (
            <Rule icon="people" text="Pass the phone back and forth. 2-player games give no coins" />
          )}
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
  const nameFor = (m: Mark) => (mode === 'duo' ? (m === 'X' ? 'Player 1' : 'Player 2') : m === human ? 'You' : 'Computer');
  const thinking = !over && !win && mode === 'ai' && !isHuman(turn);
  const status = win || over ? ' ' : thinking ? 'Computer is thinking…' : `${nameFor(turn)}: place ${turn}`;
  const winCells = new Set(win ? win.line : []);

  return (
    <View style={styles.root}>
      {mode === 'ai' ? (
        <View style={styles.scoreRow}>
          {[
            { label: 'You', value: score.win, color: '#2ED573' },
            { label: 'Draw', value: score.draw, color: COLORS.textSecondary },
            { label: 'Computer', value: score.loss, color: '#E74C3C' },
          ].map(c => (
            <View key={c.label} style={styles.scoreChip}>
              <Text style={[styles.scoreValue, { color: c.color }]}>{c.value}</Text>
              <Text style={styles.scoreLabel}>{c.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.scoreRow}>
          {(['X', 'O'] as Mark[]).map(m => (
            <View key={m} style={[styles.scoreChip, turn === m && !win && !over && styles.scoreChipOn]}>
              <MarkArt mark={m} size={26} />
              <Text style={styles.scoreLabel}>{nameFor(m)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.turnText}>{status}</Text>

      <View style={styles.board}>
        {cells.map((c, i) => (
          <Square key={i} mark={c} win={winCells.has(i)} onPress={() => tap(i)} />
        ))}
      </View>

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
              {over.mark ? <MarkArt mark={over.mark} size={86} /> : <Ionicons name="remove-circle" size={76} color={COLORS.textSecondary} />}
              <Text style={styles.kicker}>
                {over.outcome === 'draw' ? 'NOBODY WON' : over.mark === 'X' ? 'X TOOK THREE IN A ROW' : 'O TOOK THREE IN A ROW'}
              </Text>
              <Text style={styles.title}>
                {mode === 'duo'
                  ? over.outcome === 'draw' ? 'Draw!' : `${nameFor(over.mark as Mark)} wins!`
                  : over.outcome === 'win' ? 'Jeet gaye!' : over.outcome === 'loss' ? 'Is baar nahi!' : 'Barabar!'}
              </Text>
              {over.coins > 0 && (
                <>
                  <LinearGradient colors={['#FF8C42', '#FF6B00']} style={styles.reward} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="wallet" size={20} color="white" />
                    <Text style={styles.rewardText}>+{over.coins} Coins Earned!</Text>
                  </LinearGradient>
                  <Text style={styles.xp}>+{GAME_CONFIG.tictac.xpPerPlay} XP · balance {stats.totalCoins}</Text>
                </>
              )}
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

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

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
  segment: { flexDirection: 'row', alignSelf: 'stretch', backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: BORDER_RADIUS.sm + 2 },
  segBtnOn: { backgroundColor: '#E8590C' },
  segText: { fontSize: 13, fontWeight: '800', color: COLORS.textSecondary },
  segTextOn: { color: 'white' },
  sideCard: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: 12, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
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
  scoreRow: { flexDirection: 'row', alignSelf: 'stretch', gap: 10 },
  scoreChip: { flex: 1, alignItems: 'center', gap: 2, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingVertical: 10, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
  scoreChipOn: { borderColor: '#F0B36B', backgroundColor: '#FFF1DE' },
  scoreValue: { fontSize: 22, fontWeight: '900' },
  scoreLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary },
  turnText: { fontSize: 13, fontWeight: '800', color: '#8C5A2B', marginVertical: 12, height: 18 },
  board: { width: BOARD, height: BOARD, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  square: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.surfaceDark },
  squareWin: { backgroundColor: '#FFF1C9' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, ...SHADOWS.card },
  actionText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },

  // Result
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  card: { backgroundColor: COLORS.surface, borderRadius: 28, padding: SPACING.xl, paddingTop: SPACING.lg, alignItems: 'center', gap: 10, width: '100%', ...SHADOWS.medium },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: '#8C5A2B', textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  reward: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: BORDER_RADIUS.full, paddingVertical: 12, width: '100%' },
  rewardText: { fontSize: 17, fontWeight: '800', color: 'white' },
  xp: { ...TYPOGRAPHY.small, fontWeight: '800', color: '#A55EEA' },
  primaryBtn: { width: '100%', borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginTop: 4 },
  primaryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  primaryText: { fontSize: 16, fontWeight: '800', color: 'white' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  secondaryText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
});

export default TicTacToe;
