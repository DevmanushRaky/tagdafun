import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStats } from '../contexts/GameStatsContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { GAMES } from '../types';
import { getHistory, GameLog, formatTime, formatDate } from '../utils/gameHistory';

// 100 coins = ₹1, minimum ₹20 = 2000 coins
const COIN_TO_RUPEE = 100;
const MIN_REDEEM_COINS = 2000;
const MIN_REDEEM_RUPEE = 20;

type RedeemType = 'recharge' | 'playstore' | null;

interface DayGroup { label: string; entries: GameLog[]; }

function groupByDay(logs: GameLog[]): DayGroup[] {
  const map = new Map<string, GameLog[]>();
  for (const log of logs) {
    const key = formatDate(log.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries()).map(([label, entries]) => ({ label, entries }));
}

const CoinsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats } = useGameStats();
  const [history, setHistory] = useState<GameLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemModal, setRedeemModal] = useState<RedeemType>(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const load = async () => { const h = await getHistory(); setHistory(h); };
  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const spinActualEarned = history.filter(h => h.gameType === 'spin').reduce((sum, h) => sum + (h.earnedCoins ?? 0), 0);
  const gameBreakdown = GAMES.map(g => {
    const plays = stats.gamesPlayed[g.id as keyof typeof stats.gamesPlayed] ?? 0;
    const earned = g.id === 'spin' ? spinActualEarned : plays * g.coinsPerPlay;
    return { ...g, plays, earned };
  });
  const totalEarned = gameBreakdown.reduce((sum, g) => sum + g.earned, 0);
  const dayGroups = groupByDay(history);

  const rupeeValue = Math.floor(stats.totalCoins / COIN_TO_RUPEE);
  const coinsNeeded = Math.max(0, MIN_REDEEM_COINS - stats.totalCoins);
  const canRedeem = stats.totalCoins >= MIN_REDEEM_COINS;

  const amountNum = parseInt(amount) || 0;
  const coinsRequired = amountNum * COIN_TO_RUPEE;
  const isValidAmount = amountNum >= MIN_REDEEM_RUPEE && coinsRequired <= stats.totalCoins;

  const openModal = (type: RedeemType) => {
    setAmount('');
    setPhone('');
    setEmail('');
    setSubmitted(false);
    setRedeemModal(type);
  };

  const handleSubmit = () => {
    if (!isValidAmount) return;
    if (redeemModal === 'recharge' && phone.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (redeemModal === 'playstore' && !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setSubmitted(true);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Balance Hero */}
      <LinearGradient colors={['#F9A825', '#FF6B00']} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <Ionicons name="wallet" size={44} color="white" />
        <Text style={styles.heroBalance}>{stats.totalCoins}</Text>
        <Text style={styles.heroLabel}>Your Coin Balance</Text>
        <View style={styles.heroRupee}>
          <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroRupeeText}>= ₹{rupeeValue} value · 100 coins = ₹1</Text>
        </View>
      </LinearGradient>

      {/* Quick stats */}
      <View style={styles.infoRow}>
        <View style={styles.infoCard}>
          <Ionicons name="game-controller" size={20} color={COLORS.primary} />
          <Text style={styles.infoNum}>{stats.totalGamesPlayed}</Text>
          <Text style={styles.infoLabel}>Games Played</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="cash" size={20} color="#F9A825" />
          <Text style={styles.infoNum}>{totalEarned}</Text>
          <Text style={styles.infoLabel}>Total Earned</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="trending-up" size={20} color="#2ED573" />
          <Text style={styles.infoNum}>
            {stats.totalGamesPlayed > 0 ? Math.round(totalEarned / stats.totalGamesPlayed) : 0}
          </Text>
          <Text style={styles.infoLabel}>Per Game</Text>
        </View>
      </View>

      {/* ── REDEEM SECTION ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="gift" size={18} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Redeem Coins</Text>
          <View style={[styles.countBadge, { backgroundColor: canRedeem ? 'rgba(46,213,115,0.15)' : 'rgba(255,100,100,0.1)' }]}>
            <Text style={[styles.countBadgeText, { color: canRedeem ? '#2ED573' : '#e74c3c' }]}>
              {canRedeem ? 'Available' : `Need ${coinsNeeded} more`}
            </Text>
          </View>
        </View>

        {/* Min info bar */}
        <View style={styles.redeemInfoBar}>
          <Ionicons name="information-circle-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.redeemInfoText}>
            Min. ₹{MIN_REDEEM_RUPEE} ({MIN_REDEEM_COINS} coins) · 100 coins = ₹1 · Review in 24–48 hrs
          </Text>
        </View>

        {/* Two redemption cards */}
        <View style={styles.redeemRow}>
          {/* Mobile Recharge */}
          <TouchableOpacity
            style={[styles.redeemCard, !canRedeem && styles.redeemCardLocked]}
            onPress={() => canRedeem && openModal('recharge')}
            activeOpacity={canRedeem ? 0.8 : 1}
          >
            <LinearGradient
              colors={canRedeem ? ['#1a1a2e', '#16213e'] : ['#f5f5f5', '#eeeeee']}
              style={styles.redeemCardGrad}
            >
              <View style={[styles.redeemIconBox, { backgroundColor: canRedeem ? 'rgba(46,213,115,0.15)' : '#e0e0e0' }]}>
                <Ionicons name="phone-portrait-outline" size={28} color={canRedeem ? '#2ED573' : '#bdbdbd'} />
              </View>
              <Text style={[styles.redeemCardTitle, { color: canRedeem ? 'white' : '#9e9e9e' }]}>
                Mobile Recharge
              </Text>
              <Text style={[styles.redeemCardSub, { color: canRedeem ? 'rgba(255,255,255,0.6)' : '#bdbdbd' }]}>
                Any operator · Any amount
              </Text>
              {canRedeem ? (
                <View style={styles.redeemCta}>
                  <Text style={styles.redeemCtaText}>Redeem Now</Text>
                  <Ionicons name="arrow-forward" size={14} color="#2ED573" />
                </View>
              ) : (
                <View style={styles.redeemLocked}>
                  <Ionicons name="lock-closed" size={12} color="#bdbdbd" />
                  <Text style={styles.redeemLockedText}>Earn more coins</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Google Play */}
          <TouchableOpacity
            style={[styles.redeemCard, !canRedeem && styles.redeemCardLocked]}
            onPress={() => canRedeem && openModal('playstore')}
            activeOpacity={canRedeem ? 0.8 : 1}
          >
            <LinearGradient
              colors={canRedeem ? ['#1a1a2e', '#16213e'] : ['#f5f5f5', '#eeeeee']}
              style={styles.redeemCardGrad}
            >
              <View style={[styles.redeemIconBox, { backgroundColor: canRedeem ? 'rgba(233,30,140,0.15)' : '#e0e0e0' }]}>
                <Ionicons name="logo-google-playstore" size={28} color={canRedeem ? '#E91E8C' : '#bdbdbd'} />
              </View>
              <Text style={[styles.redeemCardTitle, { color: canRedeem ? 'white' : '#9e9e9e' }]}>
                Google Play
              </Text>
              <Text style={[styles.redeemCardSub, { color: canRedeem ? 'rgba(255,255,255,0.6)' : '#bdbdbd' }]}>
                Gift card code · Any amount
              </Text>
              {canRedeem ? (
                <View style={styles.redeemCta}>
                  <Text style={[styles.redeemCtaText, { color: '#E91E8C' }]}>Redeem Now</Text>
                  <Ionicons name="arrow-forward" size={14} color="#E91E8C" />
                </View>
              ) : (
                <View style={styles.redeemLocked}>
                  <Ionicons name="lock-closed" size={12} color="#bdbdbd" />
                  <Text style={styles.redeemLockedText}>Earn more coins</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Game breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="bar-chart" size={18} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Coins by Game</Text>
        </View>
        {gameBreakdown.map(g => (
          <View key={g.id} style={styles.breakdownRow}>
            <View style={[styles.breakdownIconBox, { backgroundColor: g.color + '20' }]}>
              <Ionicons name={g.icon as any} size={24} color={g.color} />
            </View>
            <View style={styles.breakdownInfo}>
              <Text style={styles.breakdownName}>{g.title}</Text>
              <Text style={styles.breakdownPlays}>
                {g.id === 'spin' ? `${g.plays} spins · wheel varies` : `${g.plays} plays × ${g.coinsPerPlay} coins each`}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: totalEarned > 0 ? `${Math.round((g.earned / totalEarned) * 100)}%` : '0%',
                  backgroundColor: g.color,
                }]} />
              </View>
            </View>
            <View style={styles.breakdownRight}>
              <Text style={styles.breakdownEarned}>{g.earned}</Text>
              <Ionicons name="wallet" size={13} color="#F9A825" />
            </View>
          </View>
        ))}
      </View>

      {/* Game History */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="receipt" size={18} color={COLORS.text} />
          <Text style={styles.sectionTitle}>Game History</Text>
          {history.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{history.length}</Text>
            </View>
          )}
        </View>
        {history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="game-controller-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No games yet</Text>
            <Text style={styles.emptyText}>Your game history will appear here</Text>
          </View>
        ) : (
          dayGroups.map(group => (
            <View key={group.label}>
              <View style={styles.dayRow}>
                <View style={styles.dayLine} />
                <Text style={styles.dayLabel}>{group.label}</Text>
                <View style={styles.dayLine} />
              </View>
              {group.entries.map(log => <LogRow key={log.id} log={log} />)}
            </View>
          ))
        )}
      </View>

      {/* ── Redeem Modal ── */}
      <Modal visible={!!redeemModal} transparent animationType="slide" onRequestClose={() => setRedeemModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: redeemModal === 'recharge' ? 'rgba(46,213,115,0.15)' : 'rgba(233,30,140,0.15)' }]}>
                <Ionicons
                  name={redeemModal === 'recharge' ? 'phone-portrait-outline' : 'logo-google-playstore'}
                  size={26}
                  color={redeemModal === 'recharge' ? '#2ED573' : '#E91E8C'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {redeemModal === 'recharge' ? 'Mobile Recharge' : 'Google Play Gift Card'}
                </Text>
                <Text style={styles.modalSub}>Balance: {stats.totalCoins} coins = ₹{rupeeValue}</Text>
              </View>
              <TouchableOpacity onPress={() => setRedeemModal(null)}>
                <Ionicons name="close-circle" size={28} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {submitted ? (
              /* Success state */
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={56} color="#2ED573" />
                </View>
                <Text style={styles.successTitle}>Request Submitted!</Text>
                <Text style={styles.successSub}>
                  Your redemption request of ₹{amount} has been submitted.{'\n'}
                  It will be reviewed and processed within 24–48 hours.
                </Text>
                <TouchableOpacity style={styles.successBtn} onPress={() => setRedeemModal(null)}>
                  <Text style={styles.successBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                {/* Amount input */}
                <Text style={styles.inputLabel}>Enter Amount (₹)</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputPrefix}>
                    <Text style={styles.inputPrefixText}>₹</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={`Min ₹${MIN_REDEEM_RUPEE}`}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                    maxLength={4}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

                {/* Coins needed indicator */}
                {amountNum > 0 && (
                  <View style={[styles.coinCalcRow, { backgroundColor: isValidAmount ? 'rgba(46,213,115,0.1)' : 'rgba(231,76,60,0.1)' }]}>
                    <Ionicons name="wallet" size={14} color={isValidAmount ? '#2ED573' : '#e74c3c'} />
                    <Text style={[styles.coinCalcText, { color: isValidAmount ? '#2ED573' : '#e74c3c' }]}>
                      {isValidAmount
                        ? `${coinsRequired} coins will be deducted`
                        : amountNum < MIN_REDEEM_RUPEE
                          ? `Minimum ₹${MIN_REDEEM_RUPEE} required`
                          : `Not enough coins (need ${coinsRequired}, have ${stats.totalCoins})`}
                    </Text>
                  </View>
                )}

                {/* Phone / Email input */}
                {redeemModal === 'recharge' ? (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Mobile Number</Text>
                    <View style={styles.inputRow}>
                      <View style={styles.inputPrefix}>
                        <Text style={styles.inputPrefixText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="10-digit number"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                        maxLength={10}
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>Email Address</Text>
                    <View style={styles.inputRow}>
                      <View style={styles.inputPrefix}>
                        <Ionicons name="mail-outline" size={16} color={COLORS.textSecondary} />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="your@email.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </>
                )}

                {/* Note */}
                <View style={styles.noteBox}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.noteText}>
                    Requests are manually reviewed. Processing takes 24–48 hours after approval.
                  </Text>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitBtn, !isValidAmount && { opacity: 0.4 }]}
                  onPress={handleSubmit}
                  disabled={!isValidAmount}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={redeemModal === 'recharge' ? ['#2ED573', '#00b894'] : ['#E91E8C', '#B91D73']}
                    style={styles.submitBtnGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="send" size={18} color="white" />
                    <Text style={styles.submitBtnText}>Submit Request · ₹{amount || '0'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

// ── Log Row ─────────────────────────────────────────────────────────────────
const LogRow: React.FC<{ log: GameLog }> = ({ log }) => {
  const isCoin = log.gameType === 'coin';
  const coinWon = log.coinWon;
  const headsOrTails = log.outcome ? log.outcome.charAt(0).toUpperCase() + log.outcome.slice(1) : '';
  const wheelVal = log.wheelValue ?? 0;
  const net = log.netCoins;
  const displayRight = isCoin
    ? { label: '+5', color: '#2ED573', sub: 'earned' }
    : wheelVal > 0
      ? { label: `+${wheelVal}`, color: '#2ED573', sub: `−${log.costCoins} cost` }
      : { label: `0`, color: '#F9A825', sub: `−${log.costCoins} cost` };

  return (
    <View style={styles.logRow}>
      <View style={[styles.logIcon, { backgroundColor: isCoin ? 'rgba(249,168,37,0.15)' : 'rgba(233,30,140,0.15)' }]}>
        <Ionicons name={isCoin ? 'cash-outline' : 'refresh-circle-outline'} size={22} color={isCoin ? '#F9A825' : '#E91E8C'} />
      </View>
      <View style={styles.logInfo}>
        <Text style={styles.logTitle}>{isCoin ? 'Coin Toss' : 'Spin Roulette'}</Text>
        <View style={styles.logDetailRow}>
          {isCoin ? (
            <View style={[styles.outcomePill, { backgroundColor: coinWon ? 'rgba(46,213,115,0.15)' : 'rgba(231,76,60,0.15)' }]}>
              <Ionicons name={coinWon ? 'checkmark-circle' : 'close-circle'} size={12} color={coinWon ? '#2ED573' : '#e74c3c'} />
              <Text style={[styles.outcomePillText, { color: coinWon ? '#2ED573' : '#e74c3c' }]}>{headsOrTails} · {coinWon ? 'Won' : 'Lost'}</Text>
            </View>
          ) : (
            <View style={styles.outcomePill}>
              <Text style={styles.outcomePillText}>Wheel: {wheelVal}</Text>
            </View>
          )}
          <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.logRight}>
        <Text style={[styles.logNet, { color: displayRight.color }]}>{displayRight.label}</Text>
        <Text style={styles.logNetLabel}>{displayRight.sub}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xl, alignItems: 'center', gap: 6 },
  heroBalance: { fontSize: 64, fontWeight: 'bold', color: 'white' },
  heroLabel: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.85)' },
  heroRupee: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  heroRupeeText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  infoRow: { flexDirection: 'row', margin: SPACING.md, gap: SPACING.sm },
  infoCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 4, ...SHADOWS.card },
  infoNum: { ...TYPOGRAPHY.h3, color: COLORS.text },
  infoLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, textAlign: 'center' },

  section: { marginHorizontal: SPACING.md, marginBottom: SPACING.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.text, flex: 1 },
  countBadge: { backgroundColor: COLORS.primaryGlow, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { ...TYPOGRAPHY.small, color: COLORS.primary, fontWeight: '700' },

  // Redeem
  redeemInfoBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm, ...SHADOWS.card },
  redeemInfoText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },
  redeemRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'stretch' },
  redeemCard: { flex: 1, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', ...SHADOWS.medium },
  redeemCardLocked: { opacity: 0.7 },
  redeemCardGrad: { flex: 1, padding: SPACING.md, gap: 8, minHeight: 160 },
  redeemIconBox: { width: 48, height: 48, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  redeemCardTitle: { fontSize: 14, fontWeight: '700' },
  redeemCardSub: { fontSize: 11, lineHeight: 15 },
  redeemCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  redeemCtaText: { fontSize: 12, fontWeight: '700', color: '#2ED573' },
  redeemLocked: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  redeemLockedText: { fontSize: 11, color: '#bdbdbd' },

  // Breakdown
  breakdownRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: 10, ...SHADOWS.card },
  breakdownIconBox: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.sm },
  breakdownInfo: { flex: 1 },
  breakdownName: { ...TYPOGRAPHY.captionBold, color: COLORS.text, marginBottom: 2 },
  breakdownPlays: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: COLORS.surfaceDark, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2, minWidth: 4 },
  breakdownRight: { alignItems: 'center', gap: 2, marginLeft: SPACING.sm },
  breakdownEarned: { ...TYPOGRAPHY.h4, color: COLORS.text },

  // History
  emptyBox: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  emptyText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.sm, marginTop: SPACING.sm },
  dayLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dayLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '600' },
  logRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: 8, ...SHADOWS.card },
  logIcon: { width: 42, height: 42, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.sm },
  logInfo: { flex: 1, gap: 4 },
  logTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  logDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  outcomePill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  outcomePillText: { ...TYPOGRAPHY.small, fontWeight: '600', color: COLORS.textSecondary },
  logTime: { ...TYPOGRAPHY.small, color: COLORS.textLight },
  logRight: { alignItems: 'flex-end', minWidth: 44 },
  logNet: { fontSize: 16, fontWeight: '800' },
  logNetLabel: { ...TYPOGRAPHY.small, color: COLORS.textSecondary },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalIconBox: { width: 46, height: 46, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { ...TYPOGRAPHY.h4, color: COLORS.text },
  modalSub: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 2 },
  modalBody: { padding: SPACING.lg, gap: 4 },

  inputLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.background },
  inputPrefix: { paddingHorizontal: 14, paddingVertical: 14, backgroundColor: COLORS.surfaceDark, borderRightWidth: 1, borderRightColor: COLORS.border },
  inputPrefixText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 13, ...TYPOGRAPHY.body, color: COLORS.text },

  coinCalcRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BORDER_RADIUS.md, padding: 10, marginTop: 6 },
  coinCalcText: { ...TYPOGRAPHY.small, fontWeight: '600', flex: 1 },

  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginTop: SPACING.md },
  noteText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, flex: 1, lineHeight: 16 },

  submitBtn: { marginTop: SPACING.md, borderRadius: BORDER_RADIUS.full, overflow: 'hidden', ...SHADOWS.medium },
  submitBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: 'white' },

  // Success
  successBox: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  successIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(46,213,115,0.1)', alignItems: 'center', justifyContent: 'center' },
  successTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  successSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  successBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 40, paddingVertical: 13 },
  successBtnText: { ...TYPOGRAPHY.button, color: 'white' },
});

export default CoinsScreen;
