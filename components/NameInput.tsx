import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { NameInput as NameInputType } from '../types';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface NameInputProps {
  names: NameInputType[];
  onNamesChange: (names: NameInputType[]) => void;
  onShowModal?: (title: string, message: string, type: 'error' | 'warning' | 'info') => void;
  hideHeader?: boolean;
  onPick?: () => void;
  isPicking?: boolean;
}

const NameInput: React.FC<NameInputProps> = ({ names, onNamesChange, onShowModal, hideHeader = false, onPick, isPicking = false }) => {
  const { t } = useLanguage();

  const addName = () => {
    const newName: NameInputType = {
      id: Date.now().toString(),
      value: '',
      isValid: true
    };
    onNamesChange([...names, newName]);
  };

  const removeName = (id: string) => {
    if (names.length <= 2) {
      if (onShowModal) {
        onShowModal(t('validation.warning'), t('names.validation.minimum'), 'warning');
      }
      return;
    }
    onNamesChange(names.filter(name => name.id !== id));
  };

  const updateName = (id: string, value: string) => {
    const updatedNames = names.map(name => {
      if (name.id === id) {
        const cleanValue = value.replace(/[^a-zA-Z\s\u0900-\u097F]/g, '');
        const truncated = cleanValue.slice(0, 25);
        // Consider valid while typing/clearing; overall modal validation checks min 2 names
        return { ...name, value: truncated, isValid: true };
      }
      return name;
    });
    onNamesChange(updatedNames);
  };

  const renderAvatar = (value: string) => {
    const letter = (value.trim()[0] || '?').toUpperCase();
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{letter}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.title}>{t('names.enterNames')}</Text>
          <TouchableOpacity
            style={styles.iconButtonPrimary}
            onPress={addName}
            activeOpacity={0.85}
            accessibilityLabel={t('names.addName')}
          >
            <Ionicons name="add" size={20} color={COLORS.background} />
          </TouchableOpacity>
        </View>
      )}

      {names.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t('names.validation.empty')}</Text>
        </View>
      )}

      {names.map((name, index) => (
        <View key={name.id} style={styles.nameRow}>
          {renderAvatar(name.value)}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.nameInput, !name.isValid && styles.invalidInput]}
              value={name.value}
              onChangeText={(value) => updateName(name.id, value)}
              placeholder={`${t('names.placeholder')} ${index + 1}`}
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={25}
            />
            {!name.isValid && (
              <Text style={styles.errorText}>{t('names.validation.alphabets')}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeName(name.id)}
            activeOpacity={0.85}
            accessibilityLabel={t('button.remove')}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>💡 {t('names.validation.alphabets')}</Text>
        <Text style={styles.infoText}>📝 {t('names.validation.minimum')}</Text>
        <Text style={styles.infoText}>🔤 {t('names.validation.maxLength')}</Text>
      </View>

      {onPick && (
        <TouchableOpacity
          style={[styles.primaryButton, isPicking && styles.primaryButtonDisabled]}
          onPress={onPick}
          disabled={isPicking}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>{isPicking ? t('names.picking') : t('names.pickName')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { ...TYPOGRAPHY.h3, color: COLORS.text },
  iconButtonPrimary: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16 },
  emptyState: { padding: 16, alignItems: 'center', backgroundColor: COLORS.surfaceDark, borderRadius: 12, marginBottom: 12 },
  emptyStateText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, textAlign: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputContainer: { flex: 1 },
  nameInput: { height: 48, borderWidth: 2, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, ...TYPOGRAPHY.body, backgroundColor: COLORS.background, color: COLORS.text },
  invalidInput: { borderColor: COLORS.error },
  errorText: { ...TYPOGRAPHY.caption, color: COLORS.error, marginTop: 4 },
  deleteButton: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  infoContainer: { backgroundColor: COLORS.surfaceDark, padding: 14, borderRadius: 12 },
  infoText: { ...TYPOGRAPHY.caption, color: COLORS.textSecondary, marginBottom: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  avatarText: { ...TYPOGRAPHY.captionBold, color: COLORS.secondary },
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 20, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { ...TYPOGRAPHY.button, color: COLORS.background },
  primaryButtonDisabled: { backgroundColor: COLORS.primaryDark },
});

export default NameInput;

