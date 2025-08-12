import React, { useState } from 'react';
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
}

const NameInput: React.FC<NameInputProps> = ({ names, onNamesChange, onShowModal, hideHeader = false }) => {
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
        const isValid = cleanValue.trim().length > 0;
        return { ...name, value: cleanValue, isValid };
      }
      return name;
    });
    onNamesChange(updatedNames);
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
          <View style={styles.nameInputContainer}>
            <Text style={styles.nameLabel}>
              {t('names.enterNames')} {index + 1}
            </Text>
            <TextInput
              style={[
                styles.nameInput,
                !name.isValid && styles.invalidInput
              ]}
              value={name.value}
              onChangeText={(value) => updateName(name.id, value)}
              placeholder={t('names.placeholder')}
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {!name.isValid && (
              <Text style={styles.errorText}>{t('names.validation.alphabets')}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.iconButtonOutline}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  iconButtonPrimary: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: 12,
    marginBottom: 12,
  },
  emptyStateText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  nameInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  nameLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  nameInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    minHeight: 48,
  },
  invalidInput: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: 4,
  },
  iconButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    backgroundColor: COLORS.surfaceDark,
    padding: 14,
    borderRadius: 12,
  },
  infoText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
});

export default NameInput;

