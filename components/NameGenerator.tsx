import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { NameInput as NameInputType } from '../types';
import NameInput from './NameInput';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface NameGeneratorProps {
  onShowModal: (title: string, message: string, type: 'error' | 'warning' | 'info') => void;
  onShowResult: (type: 'name', result: string, subtitle: string, badgeText: string) => void;
}

const NameGenerator: React.FC<NameGeneratorProps> = ({ onShowModal, onShowResult }) => {
  const { t } = useLanguage();
  const [names, setNames] = useState<NameInputType[]>([
    { id: '1', value: '', isValid: true },
    { id: '2', value: '', isValid: true }
  ]);
  const [pickedName, setPickedName] = useState<string>('');
  const [isPickingName, setIsPickingName] = useState<boolean>(false);
  const spinnerAnim = useRef(new Animated.Value(0)).current;

  const startSpinnerAnimation = () => {
    spinnerAnim.setValue(0);
    Animated.loop(
      Animated.timing(spinnerAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopSpinnerAnimation = () => {
    spinnerAnim.stopAnimation();
  };

  const validateNames = (): boolean => {
    const validNames = names.filter(name => name.value.trim() !== '');
    
    if (validNames.length === 0) {
      onShowModal(t('validation.warning'), t('names.validation.empty'), 'warning');
      return false;
    }

    if (validNames.length === 1) {
      onShowModal(t('validation.warning'), t('names.validation.minimum'), 'warning');
      return false;
    }

    return true;
  };

  const pickName = (): void => {
    if (!validateNames()) {
      return;
    }

    setIsPickingName(true);
    startSpinnerAnimation();
    
    // Simulate picking delay
    setTimeout(() => {
      const validNames = names.filter(name => name.value.trim() !== '');
      const randomIndex = Math.floor(Math.random() * validNames.length);
      const selectedName = validNames[randomIndex].value.trim();
      
      setPickedName(selectedName);
      setIsPickingName(false);
      stopSpinnerAnimation();
      
      // Show result in modal
      onShowResult(
        'name',
        selectedName,
        t('names.result.title'),
        t('names.result.badge').replace('{count}', validNames.length.toString())
      );
    }, 500);
  };

  const handleNamesChange = (newNames: NameInputType[]) => {
    setNames(newNames);
  };

  const addName = () => {
    setNames(prev => ([...prev, { id: Date.now().toString(), value: '', isValid: true }]));
  };

  const resetNames = () => {
    setNames([
      { id: Date.now().toString(), value: '', isValid: true },
      { id: (Date.now() + 1).toString(), value: '', isValid: true },
    ]);
    onShowModal(t('success.namesCleared'), t('success.clearMessage'), 'info');
  };

  const renderButtonContent = (isLoading: boolean, loadingText: string, normalText: string) => (
    <View style={styles.buttonContent}>
      {isLoading && (
        <Animated.View
          style={[
            styles.buttonSpinner,
            {
              transform: [{
                rotate: spinnerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })
              }]
            }
          ]}
        />
      )}
      <Text style={styles.primaryButtonText}>
        {isLoading ? loadingText : normalText}
      </Text>
    </View>
  );

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('names.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('names.subtitle')}</Text>
      </View>

      {/* Names Input Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.iconButtonPrimary}
            onPress={addName}
            activeOpacity={0.8}
            accessibilityLabel={t('names.addName')}
          >
            <Ionicons name="add-circle" size={22} color={COLORS.background} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButtonGhost}
            onPress={resetNames}
            activeOpacity={0.8}
            accessibilityLabel={t('names.clearAll')}
          >
            <Ionicons name="refresh" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
        <NameInput names={names} onNamesChange={handleNamesChange} onShowModal={onShowModal} hideHeader />
      </View>

      {/* Pick Name Button */}
      <TouchableOpacity
        style={[styles.primaryButton, isPickingName && styles.primaryButtonDisabled]}
        onPress={pickName}
        disabled={isPickingName}
        activeOpacity={0.8}
      >
        {renderButtonContent(isPickingName, t('names.picking'), t('names.pickName'))}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: 6,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconButtonPrimary: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  iconButtonGhost: {
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 22,
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.primaryDark,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.background,
    borderTopColor: 'transparent',
    borderRadius: 10,
    marginRight: 12,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    textAlign: 'center',
  },
});

export default NameGenerator;
