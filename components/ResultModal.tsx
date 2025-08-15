import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';

// Color theme constants
const COLORS = {
  primary: '#FF6B00',
  primaryLight: '#FF8533',
  primaryDark: '#E55A00',
  secondary: '#002244',
  secondaryLight: '#1A3A5A',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceDark: '#E9ECEF',
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  textLight: '#ADB5BD',
  border: '#DEE2E6',
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)'
};

// Typography constants
const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 'bold' as const },
  h2: { fontSize: 24, fontWeight: 'bold' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyBold: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  captionBold: { fontSize: 14, fontWeight: '600' as const },
  button: { fontSize: 18, fontWeight: 'bold' as const }
};

const { width, height } = Dimensions.get('window');

interface ResultModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'number' | 'name' | 'coin' | 'truthdare';
  result: string | number;
  subtitle: string;
  badgeText: string;
}

export default function ResultModal({ 
  visible, 
  onClose, 
  type, 
  result, 
  subtitle, 
  badgeText 
}: ResultModalProps): React.JSX.Element {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const resultScaleAnim = useRef(new Animated.Value(0.5)).current;
  const resultFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate modal in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate result in with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(resultScaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(resultFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, 300);
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      resultScaleAnim.setValue(0.5);
      resultFadeAnim.setValue(0);
    }
  }, [visible, scaleAnim, fadeAnim, resultScaleAnim, resultFadeAnim]);

  const getIcon = () => {
    if (type === 'number') return '🎲';
    if (type === 'name') return '👥';
    if (type === 'coin') return '🪙';
    return '🎭';
  };

  const getTitle = () => {
    if (type === 'number') return 'Your Lucky Number!';
    if (type === 'name') return 'The Chosen One!';
    if (type === 'coin') return 'Coin Result';
    return 'Truth or Dare';
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>{getIcon()}</Text>
            <Text style={styles.title}>{getTitle()}</Text>
          </View>

          {/* Result Section */}
          <Animated.View
            style={[
              styles.resultSection,
              {
                opacity: resultFadeAnim,
                transform: [{ scale: resultScaleAnim }],
              },
            ]}
          >
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{result}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </Animated.View>

          {/* Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
           
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 400,
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    textAlign: 'center',
  },
  resultSection: {
    width: '100%',
    marginBottom: 24,
  },
  resultContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  resultText: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  badgeContainer: {
    marginBottom: 32,
  },
  badge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  badgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.background,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.background,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
}); 