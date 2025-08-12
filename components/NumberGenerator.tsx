import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface NumberGeneratorProps {
  onShowModal: (title: string, message: string, type: 'error' | 'warning' | 'info') => void;
  onShowResult: (type: 'number', result: number, subtitle: string, badgeText: string) => void;
}

const NumberGenerator: React.FC<NumberGeneratorProps> = ({ onShowModal, onShowResult }) => {
  const { t } = useLanguage();
  const [generatedNumber, setGeneratedNumber] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [minNumber, setMinNumber] = useState<string>('1');
  const [maxNumber, setMaxNumber] = useState<string>('100');
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

  const validateInputs = (): boolean => {
    const min = parseInt(minNumber);
    const max = parseInt(maxNumber);

    if (isNaN(min) || isNaN(max)) {
      onShowModal(t('validation.invalidInput'), t('validation.enterValidNumbers'), 'error');
      return false;
    }

    if (min < 1) {
      onShowModal(t('validation.invalidMin'), t('validation.minValue'), 'warning');
      return false;
    }

    if (max > 100) {
      onShowModal(t('validation.invalidMax'), t('validation.maxValue'), 'warning');
      return false;
    }

    if (min >= max) {
      onShowModal(t('validation.invalidRange'), t('validation.rangeError'), 'error');
      return false;
    }

    return true;
  };

  const generateNumber = (): void => {
    if (!validateInputs()) {
      return;
    }

    setIsGenerating(true);
    startSpinnerAnimation();
    
    // Simulate generation delay
    setTimeout(() => {
      const min = parseInt(minNumber);
      const max = parseInt(maxNumber);
      
      // Generate random number between user-defined min and max
      const randomNumber: number = Math.floor(Math.random() * (max - min + 1)) + min;
      setGeneratedNumber(randomNumber);
      setIsGenerating(false);
      stopSpinnerAnimation();
      
      // Show result in modal
      onShowResult(
        'number',
        randomNumber,
        t('number.result.title'),
        t('number.result.badge').replace('{min}', minNumber).replace('{max}', maxNumber)
      );
    }, 500);
  };

  const resetToDefaults = (): void => {
    setMinNumber('1');
    setMaxNumber('100');
    setGeneratedNumber(null);
    onShowModal(t('success.resetComplete'), t('success.resetMessage'), 'info');
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
        <Text style={styles.sectionTitle}>{t('number.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('number.subtitle')}</Text>
      </View>

      {/* Input Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('number.setRange')}</Text>
          <TouchableOpacity
            style={styles.iconButtonGhost}
            onPress={resetToDefaults}
            activeOpacity={0.8}
            accessibilityLabel={t('number.reset')}
          >
            <Ionicons name="refresh" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('number.minimum')}</Text>
            <TextInput
              style={styles.input}
              value={minNumber}
              onChangeText={setMinNumber}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('number.maximum')}</Text>
            <TextInput
              style={styles.input}
              value={maxNumber}
              onChangeText={setMaxNumber}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.primaryButton, isGenerating && styles.primaryButtonDisabled]}
        onPress={generateNumber}
        disabled={isGenerating}
        activeOpacity={0.8}
      >
        {renderButtonContent(isGenerating, t('number.generating'), t('number.generate'))}
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
    marginBottom: 24,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  iconButtonGhost: {
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 6,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.background,
    textAlign: 'center',
    color: COLORS.text,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 25,
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginBottom: 24,
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

export default NumberGenerator;
