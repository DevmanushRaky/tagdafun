import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface CoinTossProps {
  onShowResult: (type: 'coin', result: string, subtitle: string, badgeText: string, win: boolean) => void;
}

const CoinToss: React.FC<CoinTossProps> = ({ onShowResult }) => {
  const { t } = useLanguage();
  const [choice, setChoice] = useState<'heads' | 'tails'>('heads');
  const [isFlipping, setIsFlipping] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const targetDegRef = useRef<number>(0);
  const outcomeRef = useRef<'heads' | 'tails'>('heads');

  const startFlip = () => {
    outcomeRef.current = Math.random() < 0.5 ? 'heads' : 'tails';

    const baseSpins = 5; // full spins
    const endOffset = outcomeRef.current === 'heads' ? 0 : 180; // land on correct face
    targetDegRef.current = baseSpins * 360 + endOffset;

    flipAnim.setValue(0);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 5000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      const raw = outcomeRef.current;
      const win = raw === choice;
      onShowResult(
        'coin',
        raw === 'heads' ? t('coin.heads') : t('coin.tails'),
        win ? t('coin.result.win') : t('coin.result.lose'),
        t('coin.result.badge').replace('{choice}', choice === 'heads' ? t('coin.heads') : t('coin.tails')),
        win
      );
      setIsFlipping(false);
    });
  };

  const flipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    startFlip();
  };

  // Dynamic rotation (lands on decided outcome)
  const rotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${targetDegRef.current}deg`] });
  const tilt = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['14deg', '0deg', '10deg'] });
  const scale = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });

  // Toggle front/back visibility per half-turn to avoid flicker and ensure tails shows
  const { frontOpacity, backOpacity } = useMemo(() => {
    const totalHalfTurns = Math.max(1, Math.round(targetDegRef.current / 180));
    const inputRange: number[] = [];
    const frontRange: number[] = [];
    const backRange: number[] = [];
    for (let i = 0; i <= totalHalfTurns; i += 1) {
      const p = i / totalHalfTurns;
      inputRange.push(p);
      // front visible on even half-turn index, back visible on odd
      frontRange.push(i % 2 === 0 ? 1 : 0);
      backRange.push(i % 2 === 1 ? 1 : 0);
    }
    return {
      frontOpacity: flipAnim.interpolate({ inputRange, outputRange: frontRange as any }),
      backOpacity: flipAnim.interpolate({ inputRange, outputRange: backRange as any }),
    };
  }, [flipAnim, targetDegRef.current]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('coin.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('coin.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('coin.choose')}</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.choiceButton, choice === 'heads' && styles.choiceActive]}
            onPress={() => !isFlipping && setChoice('heads')}
            activeOpacity={0.85}
            disabled={isFlipping}
          >
            <Ionicons name="happy-outline" size={20} color={choice === 'heads' ? COLORS.background : COLORS.secondary} />
            <Text style={[styles.choiceText, choice === 'heads' && styles.choiceTextActive]}>{t('coin.heads')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceButton, choice === 'tails' && styles.choiceActive]}
            onPress={() => !isFlipping && setChoice('tails')}
            activeOpacity={0.85}
            disabled={isFlipping}
          >
            <Ionicons name="sad-outline" size={20} color={choice === 'tails' ? COLORS.background : COLORS.secondary} />
            <Text style={[styles.choiceText, choice === 'tails' && styles.choiceTextActive]}>{t('coin.tails')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.coinStage}>
          <Animated.View
            style={[
              styles.coin3D,
              { transform: [{ perspective: 700 }, { rotateX: tilt }, { rotateY }, { scale }] },
            ]}
          >
            {/* Front face (HEADS) */}
            <Animated.View style={[styles.face, styles.frontFace, { opacity: frontOpacity }]}>
              <View style={[styles.faceInner, styles.headInner]}>
                <Ionicons name="happy" size={42} color={COLORS.secondary} />
              </View>
            </Animated.View>
            {/* Back face (TAILS) */}
            <Animated.View style={[styles.face, styles.backFace, { opacity: backOpacity }] }>
              <View style={[styles.faceInner, styles.tailInner]}>
                <Ionicons name="sad" size={42} color={COLORS.secondary} />
              </View>
            </Animated.View>
            {/* Coin rim */}
            <View style={styles.rim} />
            {/* Removed shine overlay */}
          </Animated.View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isFlipping && styles.primaryButtonDisabled]}
          onPress={flipCoin}
          activeOpacity={0.85}
          disabled={isFlipping}
        >
          <Text style={styles.primaryButtonText}>{isFlipping ? t('coin.flipping') : t('coin.flip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const COIN_SIZE = 120;

const styles = StyleSheet.create({
  section: { width: '100%' },
  sectionHeader: { alignItems: 'center', marginBottom: 20 },
  sectionTitle: { ...TYPOGRAPHY.h2, color: COLORS.text, marginBottom: 6 },
  sectionSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    width: '100%'
  },
  label: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary, marginBottom: 8, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  choiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  choiceActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  choiceText: { ...TYPOGRAPHY.captionBold, color: COLORS.secondary },
  choiceTextActive: { color: COLORS.background },
  coinStage: { alignItems: 'center', marginVertical: 24 },
  coin3D: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  frontFace: { backgroundColor: COLORS.secondary },
  backFace: { backgroundColor: COLORS.secondary, transform: [{ rotateY: '180deg' }] },
  faceInner: {
    width: COIN_SIZE - 16,
    height: COIN_SIZE - 16,
    borderRadius: (COIN_SIZE - 16) / 2,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headInner: {
    backgroundColor: '#FFE6CC',
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  tailInner: {
    backgroundColor: '#CCE6FF',
    borderWidth: 3,
    borderColor: COLORS.secondary,
  },
  rim: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    borderWidth: 6,
    borderColor: '#D4AF37',
  },
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 20, alignItems: 'center' },
  primaryButtonText: { ...TYPOGRAPHY.button, color: COLORS.background },
  primaryButtonDisabled: { backgroundColor: COLORS.primaryDark },
});

export default CoinToss;
