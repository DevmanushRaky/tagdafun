import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Animated, Easing, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStats } from '../contexts/GameStatsContext';
import { useShop, BuyResult } from '../contexts/ShopContext';
import { COLORS, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import {
  POWER_UPS, COIN_SKINS, CARD_BACKS, BOTTLE_THEMES, DAILY_GIFT_LADDER, PowerUp, CoinSkin, CardBack, BottleThemeItem,
} from '../constants/shop';
import { WaterThemeIcon } from '../components/GameIcons';
import { CoinFace } from '../components/CoinToss';
import NativeAdCard from '../components/ads/NativeAdCard';

const GAME_TINT = { memory: '#0077B6', water: '#17B85A' } as const;

// Tiles have a fixed width per section so an odd last row stays the same size (centred), not stretched.
const { width: SCREEN_W } = Dimensions.get('window');
const GRID_GAP = 10;
const tileWidth = (cols: number) => Math.floor((SCREEN_W - SPACING.md * 2 - GRID_GAP * (cols - 1)) / cols);
const SKIN_TILE_W = tileWidth(3);
const BACK_TILE_W = tileWidth(4);

type Pending =
  | { kind: 'power'; item: PowerUp }
  | { kind: 'skin'; item: CoinSkin }
  | { kind: 'back'; item: CardBack }
  | { kind: 'theme'; item: BottleThemeItem };

const PriceTag: React.FC<{ price: number; affordable: boolean }> = ({ price, affordable }) => (
  <View style={[styles.price, !affordable && styles.priceOff]}>
    <Ionicons name="wallet" size={12} color={affordable ? '#7A4E00' : COLORS.textLight} />
    <Text style={[styles.priceText, !affordable && styles.priceTextOff]}>{price}</Text>
  </View>
);

const CardBackPreview: React.FC<{ colors: [string, string]; size: number }> = ({ colors, size }) => (
  <LinearGradient colors={colors} style={[styles.backPreview, { width: size, height: size * 1.2 }]}>
    <View style={styles.backInset}>
      <Text style={[styles.backMark, { fontSize: size * 0.4 }]}>?</Text>
    </View>
  </LinearGradient>
);

const ThemePreview: React.FC<{ item: BottleThemeItem; size: number }> = ({ item, size }) => (
  <LinearGradient colors={item.theme.panel} style={[styles.themePreview, { width: size * 1.25, height: size }]}>
    <WaterThemeIcon size={size * 0.9} glass={item.theme.glass} stroke={item.theme.stroke} idKey={item.id} />
  </LinearGradient>
);

const ShopScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { stats } = useGameStats();
  const { shop, buyPowerUp, buySkin, selectSkin, buyBack, selectBack, buyTheme, selectTheme, giftToday, claimGift } = useShop();
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const giftPop = useRef(new Animated.Value(1)).current;

  const balance = stats.totalCoins;

  const showToast = (text: string) => {
    setToast(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1600),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const onClaim = async () => {
    const amount = await claimGift();
    if (amount <= 0) return;
    giftPop.setValue(0.9);
    Animated.spring(giftPop, { toValue: 1, tension: 160, friction: 5, useNativeDriver: true }).start();
    showToast(`+${amount} coins added`);
  };

  const confirm = async () => {
    if (!pending) return;
    const p = pending;
    setPending(null);
    let res: BuyResult;
    if (p.kind === 'power') res = await buyPowerUp(p.item.id);
    else if (p.kind === 'skin') res = await buySkin(p.item.id);
    else if (p.kind === 'back') res = await buyBack(p.item.id);
    else res = await buyTheme(p.item.id);
    if (res === 'ok') showToast(p.kind === 'power' ? `${p.item.title} added` : `${p.item.title} unlocked and equipped`);
    else if (res === 'poor') showToast('Not enough coins yet');
  };

  const ask = (p: Pending) => {
    if (balance < p.item.price) {
      showToast(`You need ${p.item.price - balance} more coins`);
      return;
    }
    setPending(p);
  };

  // Gift ladder: which step today is, and how many earlier steps of this run are done.
  const ladderLen = DAILY_GIFT_LADDER.length;
  const claimedToday = giftToday === null;
  const currentDay = claimedToday ? ((shop.giftStreak - 1) % ladderLen) + 1 : giftToday.day;
  const nextAmount = claimedToday ? DAILY_GIFT_LADDER[shop.giftStreak % ladderLen] : giftToday.amount;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#001A33', '#002A52', '#0B3F70']} style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <View style={styles.glow} />
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroKicker}>SPEND YOUR COINS</Text>
              <Text style={styles.heroTitle}>Shop</Text>
            </View>
            <View style={styles.balancePill}>
              <Ionicons name="wallet" size={16} color="#FFC83D" />
              <Text style={styles.balanceText}>{balance}</Text>
            </View>
          </View>

          {/* Daily gift */}
          <Animated.View style={[styles.giftCard, { transform: [{ scale: giftPop }] }]}>
            <View style={styles.giftTop}>
              <View style={styles.giftIcon}>
                <Ionicons name="gift" size={24} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.giftTitle}>Daily Gift</Text>
                <Text style={styles.giftSub}>
                  {claimedToday ? `Come back tomorrow for +${nextAmount}` : `Day ${giftToday.day} · claim your free coins`}
                </Text>
              </View>
              {claimedToday ? (
                <View style={styles.giftDone}>
                  <Ionicons name="checkmark-circle" size={16} color="#2ED573" />
                  <Text style={styles.giftDoneText}>Claimed</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.claimBtn} onPress={onClaim} activeOpacity={0.85}>
                  <Text style={styles.claimText}>+{giftToday.amount}</Text>
                  <Ionicons name="wallet" size={13} color="white" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.ladder}>
              {DAILY_GIFT_LADDER.map((amt, i) => {
                const day = i + 1;
                const done = day < currentDay || (claimedToday && day === currentDay);
                const today = day === currentDay;
                return (
                  <View key={day} style={[styles.step, done && styles.stepDone, today && !done && styles.stepToday]}>
                    <Text style={[styles.stepDay, (done || today) && styles.stepDayOn]}>D{day}</Text>
                    {done
                      ? <Ionicons name="checkmark" size={12} color="white" />
                      : <Text style={[styles.stepAmt, today && styles.stepAmtToday]}>{amt}</Text>}
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Power-ups */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Power-ups</Text>
          <Text style={styles.sectionSub}>Used before an ad is shown, so you skip the ad.</Text>
          <View style={styles.card}>
            {POWER_UPS.map((p, i) => (
              <View key={p.id} style={[styles.powerRow, i > 0 && styles.rowBorder]}>
                <View style={[styles.powerIcon, { backgroundColor: GAME_TINT[p.game] + '1A' }]}>
                  <Ionicons name={p.icon as any} size={22} color={GAME_TINT[p.game]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.powerTitle}>{p.title}</Text>
                  <Text style={styles.powerSub}>{p.description}</Text>
                  <Text style={styles.owned}>Owned: {shop.powerUps[p.id]}</Text>
                </View>
                <TouchableOpacity onPress={() => ask({ kind: 'power', item: p })} activeOpacity={0.8}>
                  <PriceTag price={p.price} affordable={balance >= p.price} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Coin skins */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coin skins</Text>
          <Text style={styles.sectionSub}>Changes the coin in Coin Toss.</Text>
          <View style={styles.grid}>
            {COIN_SKINS.map(skin => {
              const owned = shop.ownedSkins.includes(skin.id);
              const equipped = shop.coinSkin === skin.id;
              return (
                <TouchableOpacity
                  key={skin.id}
                  style={[styles.tile, { width: SKIN_TILE_W }, equipped && styles.tileOn]}
                  onPress={() => (owned ? selectSkin(skin.id) : ask({ kind: 'skin', item: skin }))}
                  activeOpacity={0.85}
                >
                  <CoinFace side="heads" size={58} skin={skin.palette} />
                  <Text style={styles.tileTitle} numberOfLines={1}>{skin.title}</Text>
                  {equipped
                    ? <Text style={styles.equipped}>Equipped</Text>
                    : owned
                      ? <Text style={styles.useText}>Use</Text>
                      : <PriceTag price={skin.price} affordable={balance >= skin.price} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Card backs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Card backs</Text>
          <Text style={styles.sectionSub}>Changes the back of the cards in Memory Cards.</Text>
          <View style={styles.grid}>
            {CARD_BACKS.map(back => {
              const owned = shop.ownedBacks.includes(back.id);
              const equipped = shop.cardBack === back.id;
              return (
                <TouchableOpacity
                  key={back.id}
                  style={[styles.tile, styles.tileCompact, { width: BACK_TILE_W }, equipped && styles.tileOn]}
                  onPress={() => (owned ? selectBack(back.id) : ask({ kind: 'back', item: back }))}
                  activeOpacity={0.85}
                >
                  <CardBackPreview colors={back.colors} size={40} />
                  <Text style={styles.tileTitle} numberOfLines={1}>{back.title}</Text>
                  {equipped
                    ? <Text style={styles.equipped}>Equipped</Text>
                    : owned
                      ? <Text style={styles.useText}>Use</Text>
                      : <PriceTag price={back.price} affordable={balance >= back.price} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottle themes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bottle themes</Text>
          <Text style={styles.sectionSub}>Changes the board and bottles in Water Sorting.</Text>
          <View style={styles.grid}>
            {BOTTLE_THEMES.map(item => {
              const owned = shop.ownedThemes.includes(item.id);
              const equipped = shop.waterTheme === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.tile, { width: SKIN_TILE_W }, equipped && styles.tileOn]}
                  onPress={() => (owned ? selectTheme(item.id) : ask({ kind: 'theme', item }))}
                  activeOpacity={0.85}
                >
                  <ThemePreview item={item} size={52} />
                  <Text style={styles.tileTitle} numberOfLines={1}>{item.title}</Text>
                  {equipped
                    ? <Text style={styles.equipped}>Equipped</Text>
                    : owned
                      ? <Text style={styles.useText}>Use</Text>
                      : <PriceTag price={item.price} affordable={balance >= item.price} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <NativeAdCard />
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { bottom: 90 + insets.bottom, opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}
      >
        <Text style={styles.toastText}>{toast}</Text>
      </Animated.View>

      {/* Confirm purchase */}
      <Modal visible={pending !== null} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <View style={styles.overlay}>
          {pending && (
            <View style={styles.sheet}>
              <View style={styles.sheetArt}>
                {pending.kind === 'skin' && <CoinFace side="heads" size={84} skin={pending.item.palette} />}
                {pending.kind === 'back' && <CardBackPreview colors={pending.item.colors} size={70} />}
                {pending.kind === 'theme' && <ThemePreview item={pending.item} size={76} />}
                {pending.kind === 'power' && (
                  <View style={[styles.sheetPower, { backgroundColor: GAME_TINT[pending.item.game] + '1A' }]}>
                    <Ionicons name={pending.item.icon as any} size={40} color={GAME_TINT[pending.item.game]} />
                  </View>
                )}
              </View>
              <Text style={styles.sheetTitle}>{pending.item.title}</Text>
              <Text style={styles.sheetSub}>
                {pending.kind === 'power' ? pending.item.description : 'Yours to keep. You can switch any time.'}
              </Text>
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>Price</Text>
                <Text style={styles.sheetValue}>{pending.item.price}</Text>
              </View>
              <View style={styles.sheetRow}>
                <Text style={styles.sheetLabel}>Balance after</Text>
                <Text style={styles.sheetValue}>{balance - pending.item.price}</Text>
              </View>
              <TouchableOpacity style={styles.buyBtn} onPress={confirm} activeOpacity={0.85}>
                <LinearGradient colors={['#FF8C42', '#FF5E00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyGrad}>
                  <Ionicons name="wallet" size={18} color="white" />
                  <Text style={styles.buyText}>Buy for {pending.item.price}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setPending(null)} style={styles.cancelBtn} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Not now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,107,0,0.14)', top: -90, right: -70 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  heroTitle: { fontSize: 26, fontWeight: '900', color: 'white' },
  balancePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,200,61,0.14)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,200,61,0.35)' },
  balanceText: { fontSize: 18, fontWeight: '800', color: '#FFC83D' },

  giftCard: { marginTop: SPACING.md, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.lg, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  giftTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  giftIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  giftTitle: { fontSize: 16, fontWeight: '800', color: 'white' },
  giftSub: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  claimBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  claimText: { fontSize: 15, fontWeight: '900', color: 'white' },
  giftDone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  giftDoneText: { fontSize: 13, fontWeight: '800', color: '#2ED573' },
  ladder: { flexDirection: 'row', gap: 5, marginTop: 12 },
  step: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  stepDone: { backgroundColor: '#2ED573' },
  stepToday: { backgroundColor: 'rgba(255,107,0,0.25)', borderWidth: 1, borderColor: COLORS.primary },
  stepDay: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  stepDayOn: { color: 'white' },
  stepAmt: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.75)', height: 14 },
  stepAmtToday: { color: 'white' },

  section: { marginHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.h4, fontWeight: '800', color: COLORS.text },
  sectionSub: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, ...SHADOWS.card },

  powerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.surfaceDark },
  powerIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  powerTitle: { ...TYPOGRAPHY.captionBold, color: COLORS.text },
  powerSub: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, marginTop: 1 },
  owned: { fontSize: 11, fontWeight: '800', color: COLORS.primary, marginTop: 3 },

  price: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFE08A', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 11, paddingVertical: 6 },
  priceOff: { backgroundColor: COLORS.surfaceDark },
  priceText: { fontSize: 13, fontWeight: '900', color: '#7A4E00' },
  priceTextOff: { color: COLORS.textLight },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GRID_GAP },
  tile: { alignItems: 'center', gap: 6, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, paddingVertical: 12, paddingHorizontal: 6, borderWidth: 2, borderColor: 'transparent', ...SHADOWS.card },
  tileOn: { borderColor: COLORS.primary },
  tileCompact: { paddingHorizontal: 4, gap: 5 },
  tileTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  equipped: { fontSize: 12, fontWeight: '800', color: COLORS.primary, paddingVertical: 6 },
  useText: { fontSize: 12, fontWeight: '800', color: '#0077B6', paddingVertical: 6 },

  themePreview: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backPreview: { borderRadius: 10, padding: 3 },
  backInset: { flex: 1, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backMark: { fontWeight: '900', color: 'rgba(255,255,255,0.3)' },

  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: 'rgba(0,26,51,0.92)', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 16, paddingVertical: 9 },
  toastText: { fontSize: 13, fontWeight: '800', color: 'white' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: SPACING.lg },
  sheet: { backgroundColor: COLORS.surface, borderRadius: 26, padding: SPACING.lg, alignItems: 'center', gap: 8, ...SHADOWS.medium },
  sheetArt: { height: 96, justifyContent: 'center', alignItems: 'center' },
  sheetPower: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  sheetSub: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 4 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', backgroundColor: COLORS.surfaceDark, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
  sheetLabel: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary },
  sheetValue: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  buyBtn: { alignSelf: 'stretch', borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginTop: 6 },
  buyGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  buyText: { fontSize: 16, fontWeight: '800', color: 'white' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary },
});

export default ShopScreen;
