import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface Player { id: string; name: string; isValid: boolean; }

interface TruthDareProps {
  onShowModal: (title: string, message: string, type: 'error' | 'warning' | 'info') => void;
  onShowResult: (type: 'truthdare', result: string, subtitle: string, badgeText: string) => void;
}

const TruthDare: React.FC<TruthDareProps> = ({ onShowModal, onShowResult }) => {
  const { t } = useLanguage();
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', isValid: true },
    { id: '2', name: '', isValid: true },
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinnerAnim = useRef(new Animated.Value(0)).current;

  const addPlayer = () => {
    setPlayers(prev => ([...prev, { id: Date.now().toString(), name: '', isValid: true }]));
  };

  const removePlayer = (id: string) => {
    if (players.length <= 2) {
      onShowModal(t('validation.warning'), t('names.validation.minimum'), 'warning');
      return;
    }
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const updatePlayer = (id: string, value: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === id) {
        const clean = value.replace(/[^a-zA-Z\s\u0900-\u097F]/g, '');
        return { ...p, name: clean, isValid: clean.trim().length > 0 };
      }
      return p;
    }));
  };

  const validatePlayers = (): boolean => {
    const valid = players.filter(p => p.name.trim().length > 0);
    if (valid.length < 2) {
      onShowModal(t('validation.warning'), t('names.validation.minimum'), 'warning');
      return false;
    }
    return true;
  };

  const startSpin = () => {
    spinnerAnim.setValue(0);
    Animated.timing(spinnerAnim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();
  };

  const spin = () => {
    if (!validatePlayers() || isSpinning) return;
    setIsSpinning(true);
    startSpin();

    setTimeout(() => {
      const valid = players.filter(p => p.name.trim().length > 0);
      const picked = valid[Math.floor(Math.random() * valid.length)];
      const isTruth = Math.random() < 0.5;
      const typeText = isTruth ? t('td.truth') : t('td.dare');

      onShowResult(
        'truthdare',
        picked.name,
        t('td.result.title'),
        t('td.result.badge').replace('{name}', picked.name).replace('{type}', typeText)
      );
      setIsSpinning(false);
    }, 950);
  };

  const rotate = spinnerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('td.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('td.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('td.players')}</Text>
          <TouchableOpacity style={styles.iconButtonPrimary} onPress={addPlayer} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={COLORS.background} />
          </TouchableOpacity>
        </View>

        {players.map((p, idx) => (
          <View key={p.id} style={styles.row}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t('td.placeholder')} {idx + 1}</Text>
              <TextInput
                style={[styles.input, !p.isValid && styles.invalid]}
                value={p.name}
                onChangeText={val => updatePlayer(p.id, val)}
                placeholder={t('td.placeholder')}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <TouchableOpacity style={styles.iconButtonOutline} onPress={() => removePlayer(p.id)} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.spinnerContainer}>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: rotate }] }]} />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSpinning && styles.primaryButtonDisabled]}
          onPress={spin}
          disabled={isSpinning}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{isSpinning ? t('td.spinning') : t('td.start')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  iconButtonPrimary: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  inputContainer: { flex: 1, marginRight: 10 },
  inputLabel: { ...TYPOGRAPHY.captionBold, color: COLORS.textSecondary, marginBottom: 6 },
  input: { borderWidth: 2, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, ...TYPOGRAPHY.body, backgroundColor: COLORS.background, color: COLORS.text, minHeight: 48 },
  invalid: { borderColor: COLORS.error },
  iconButtonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  spinnerContainer: { alignItems: 'center', marginVertical: 16 },
  spinner: { width: 28, height: 28, borderWidth: 3, borderColor: COLORS.primary, borderTopColor: 'transparent', borderRadius: 14 },
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { ...TYPOGRAPHY.button, color: COLORS.background },
  primaryButtonDisabled: { backgroundColor: COLORS.primaryDark },
});

export default TruthDare;
