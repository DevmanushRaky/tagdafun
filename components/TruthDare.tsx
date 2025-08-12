import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Easing, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface Player { id: string; name: string; isValid: boolean; }

interface TruthDareProps {
  onShowModal: (title: string, message: string, type: 'error' | 'warning' | 'info') => void;
  onShowResult: (type: 'truthdare', result: string, subtitle: string, badgeText: string) => void;
}

const PALETTE = ['#FF8A65', '#4FC3F7', '#81C784', '#BA68C8', '#FFD54F', '#F06292'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WHEEL_SIZE = Math.min(Math.floor(SCREEN_WIDTH * 0.86), 360);

const TruthDare: React.FC<TruthDareProps> = ({ onShowModal, onShowResult }) => {
  const { t } = useLanguage();
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '', isValid: true },
    { id: '2', name: '', isValid: true },
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isWheelVisible, setWheelVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const wheelAnim = useRef(new Animated.Value(0)).current;
  const targetDegRef = useRef<number>(0);

  const addPlayer = () => {
    setPlayers(prev => ([...prev, { id: Date.now().toString(), name: '', isValid: true }]));
  };

  const resetPlayers = () => {
    setPlayers([
      { id: Date.now().toString(), name: '', isValid: true },
      { id: (Date.now() + 1).toString(), name: '', isValid: true },
    ]);
    setSelectedIndex(null);
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
        const truncated = clean.slice(0, 25);
        // After sanitization, consider the field valid even when empty;
        // overall validation will ensure at least 2 non-empty names before starting.
        return { ...p, name: truncated, isValid: true };
      }
      return p;
    }));
  };

  const validatePlayers = (): boolean => {
    const trimmed = players.map(p => ({ ...p, name: p.name.trim() }));
    const nonEmpty = trimmed.filter(p => p.name.length > 0);

    if (nonEmpty.length < 2) {
      onShowModal(t('validation.warning'), t('names.validation.minimum'), 'warning');
      return false;
    }

    const hasInvalid = nonEmpty.some(p => !p.isValid);
    if (hasInvalid) {
      onShowModal(t('validation.warning'), t('names.validation.alphabets'), 'warning');
      return false;
    }

    return true;
  };

  const spinWheel = () => {
    if (isSpinning) return;
    if (!validatePlayers()) return;

    const valid = players.filter(p => p.name.trim().length > 0);
    const n = valid.length;
    const chosen = Math.floor(Math.random() * n);

    const anglePer = 360 / n;
    const stopAngle = 360 - (chosen * anglePer) + 360 * 3; // 3 extra spins
    targetDegRef.current = stopAngle;

    setIsSpinning(true);
    setSelectedIndex(null);
    setWheelVisible(true);
    wheelAnim.setValue(0);
    Animated.timing(wheelAnim, {
      toValue: 1,
      duration: 4500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setSelectedIndex(chosen);
      setIsSpinning(false);
    });
  };

  const handleChoose = (type: 'truth' | 'dare') => {
    const valid = players.filter(p => p.name.trim().length > 0);
    if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= valid.length) return;
    const picked = valid[selectedIndex];
    const typeText = type === 'truth' ? t('td.truth') : t('td.dare');
    setWheelVisible(false);
    onShowResult(
      'truthdare',
      picked.name,
      t('td.result.title'),
      t('td.result.badge').replace('{name}', picked.name).replace('{type}', typeText)
    );
    setSelectedIndex(null);
  };

  const rotate = wheelAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${targetDegRef.current}deg`] });

  const valid = players.filter(p => p.name.trim().length > 0);
  const validCount = valid.length;

  const renderWheel = () => {
    const n = valid.length;
    if (n < 2) return null;

    const anglePer = 360 / n;
    const labels = valid.map((p, idx) => {
      const angle = idx * anglePer;
      const letter = (p.name.trim()[0] || '?').toUpperCase();
      const color = PALETTE[idx % PALETTE.length];
      return (
        <View key={p.id} style={[styles.labelContainer, { transform: [{ rotate: `${angle}deg` }] }]}> 
          <View style={[styles.labelAvatar, { backgroundColor: color, borderColor: color }, selectedIndex === idx && styles.labelAvatarActive]}> 
            <Text style={[styles.labelAvatarText, selectedIndex === idx && styles.labelAvatarTextActive]}>{letter}</Text>
          </View>
        </View>
      );
    });

    return (
      <View style={styles.wheelModalContent}>
        <View style={styles.arrow} />
        <Animated.View style={[styles.wheel, { transform: [{ rotate }] }]}> 
          <View style={styles.wheelInner} />
          <View style={styles.centerDot} />
          {labels}
        </Animated.View>
        {selectedIndex !== null && !isSpinning && (
          <View style={styles.modalChooseRow}>
            <TouchableOpacity style={[styles.choicePrimary, styles.truthBtn]} onPress={() => handleChoose('truth')} activeOpacity={0.85}>
              <Ionicons name="help-circle" size={18} color={COLORS.background} />
              <Text style={styles.choicePrimaryText}>{t('td.truth')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.choicePrimary, styles.dareBtn]} onPress={() => handleChoose('dare')} activeOpacity={0.85}>
              <Ionicons name="flame" size={18} color={COLORS.background} />
              <Text style={styles.choicePrimaryText}>{t('td.dare')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderAvatar = (name: string) => {
    const letter = (name.trim()[0] || '?').toUpperCase();
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{letter}</Text>
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('td.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('td.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        {/* Controls: Add (left) and Reset (right) */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.iconButtonPrimary} onPress={addPlayer} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={COLORS.background} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButtonOutline} onPress={resetPlayers} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {players.map((p, idx) => (
          <View key={p.id} style={styles.row}>
            {renderAvatar(p.name)}
            <View style={styles.inputRowContainer}>
              <TextInput
                style={[styles.input, !p.isValid && styles.invalid]}
                value={p.name}
                onChangeText={val => updatePlayer(p.id, val)}
                placeholder={`${t('td.placeholder')} ${idx + 1}`}
                placeholderTextColor={COLORS.textLight}
                maxLength={25}
              />
              {!p.isValid && (
                <Text style={styles.errorText}>{t('names.validation.alphabets')}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => removePlayer(p.id)} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Info section like Names */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>💡 {t('names.validation.alphabets')}</Text>
          <Text style={styles.infoText}>📝 {t('names.validation.minimum')}</Text>
          <Text style={styles.infoText}>🔤 {t('td.validation.maxLength')}</Text>
        </View>

        {/* Start Game button: always visible */}
        <TouchableOpacity
          style={[styles.primaryButton, isSpinning && styles.primaryButtonDisabled]}
          onPress={spinWheel}
          disabled={isSpinning}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{isSpinning ? t('td.spinning') : t('td.start')}</Text>
        </TouchableOpacity>
      </View>

      {/* Wheel Modal */}
      <Modal transparent visible={isWheelVisible} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: Math.min(SCREEN_WIDTH - 24, WHEEL_SIZE + 80) }] }>
            {renderWheel()}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { width: '100%' },
  sectionHeader: { alignItems: 'center', marginBottom: 20 },
  sectionTitle: { ...TYPOGRAPHY.h2, color: COLORS.text, marginBottom: 6 },
  sectionSubtitle: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, textAlign: 'center' },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, elevation: 3, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, width: '100%' },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconButtonPrimary: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputRowContainer: { flex: 1 },
  input: { height: 48, borderWidth: 2, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, ...TYPOGRAPHY.body, backgroundColor: COLORS.background, color: COLORS.text },
  invalid: { borderColor: COLORS.error },
  errorRow: { minHeight: 18, justifyContent: 'center' },
  iconButtonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  // Info
  infoContainer: { backgroundColor: COLORS.surfaceDark, padding: 14, borderRadius: 12, marginTop: 4 },
  infoText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 4 },
  errorText: { ...TYPOGRAPHY.caption, color: COLORS.error },
  errorHidden: { opacity: 0 },

  // Wheel
  wheelModalContent: { alignItems: 'center', justifyContent: 'center' },
  wheel: { width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2, backgroundColor: COLORS.background, borderWidth: 6, borderColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  wheelInner: { position: 'absolute', width: WHEEL_SIZE - 60, height: WHEEL_SIZE - 60, borderRadius: (WHEEL_SIZE - 60) / 2, backgroundColor: COLORS.surface, borderWidth: 4, borderColor: COLORS.border },
  centerDot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.secondary },
  arrow: { width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: COLORS.primary, marginBottom: 14 },
  labelContainer: { position: 'absolute', width: WHEEL_SIZE, height: WHEEL_SIZE, alignItems: 'center' },
  labelAvatar: { position: 'absolute', top: 12, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  labelAvatarActive: { borderWidth: 2, borderColor: COLORS.background },
  labelAvatarText: { ...TYPOGRAPHY.captionBold, color: COLORS.background },
  labelAvatarTextActive: { color: COLORS.background },

  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { ...TYPOGRAPHY.button, color: COLORS.background },
  primaryButtonDisabled: { backgroundColor: COLORS.primaryDark },

  modalChooseRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 16, width: '100%' },
  choicePrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 16 },
  truthBtn: { backgroundColor: COLORS.secondary },
  dareBtn: { backgroundColor: COLORS.primary },
  choicePrimaryText: { ...TYPOGRAPHY.bodyBold, color: COLORS.background },

  // Avatar beside input
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatarText: { ...TYPOGRAPHY.captionBold, color: COLORS.secondary },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: COLORS.background, borderRadius: 20, padding: 24, alignItems: 'center', justifyContent: 'center', elevation: 8 },
});

export default TruthDare;
