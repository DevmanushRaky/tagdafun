import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomModal from '../components/CustomModal';
import ResultModal from '../components/ResultModal';
import NumberGenerator from '../components/NumberGenerator';
import NameGenerator from '../components/NameGenerator';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface ResultModalState {
  visible: boolean;
  type: 'number' | 'name';
  result: string | number;
  subtitle: string;
  badgeText: string;
}

export default function HomeScreen(): JSX.Element {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'number' | 'name'>('number');
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [resultModal, setResultModal] = useState<ResultModalState>({
    visible: false,
    type: 'number',
    result: '',
    subtitle: '',
    badgeText: ''
  });

  const showModal = (title: string, message: string, type: 'error' | 'warning' | 'info' = 'info') => {
    setModal({
      visible: true,
      title,
      message,
      type
    });
  };

  const hideModal = () => {
    setModal(prev => ({ ...prev, visible: false }));
  };

  const showResultModal = (type: 'number' | 'name', result: string | number, subtitle: string, badgeText: string) => {
    setResultModal({
      visible: true,
      type,
      result,
      subtitle,
      badgeText
    });
  };

  const hideResultModal = () => {
    setResultModal(prev => ({ ...prev, visible: false }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Content based on active tab */}
          {activeTab === 'number' ? (
            <NumberGenerator 
              onShowModal={showModal}
              onShowResult={showResultModal}
            />
          ) : (
            <NameGenerator 
              onShowModal={showModal}
              onShowResult={showResultModal}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer navigation */}
      <View style={styles.footerNav}>
        <TouchableOpacity
          style={[styles.footerButton, activeTab === 'number' && styles.footerButtonActive]}
          onPress={() => setActiveTab('number')}
          activeOpacity={0.85}
        >
          <Ionicons
            name={activeTab === 'number' ? 'dice' : 'dice-outline'}
            size={22}
            color={activeTab === 'number' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.footerLabel,
              activeTab === 'number' && styles.footerLabelActive,
            ]}
          >
            {t('tab.number')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerButton, activeTab === 'name' && styles.footerButtonActive]}
          onPress={() => setActiveTab('name')}
          activeOpacity={0.85}
        >
          <Ionicons
            name={activeTab === 'name' ? 'people' : 'people-outline'}
            size={22}
            color={activeTab === 'name' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.footerLabel,
              activeTab === 'name' && styles.footerLabelActive,
            ]}
          >
            {t('tab.names')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Modal for alerts */}
      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={hideModal}
      />

      {/* Result Modal for displaying results */}
      <ResultModal
        visible={resultModal.visible}
        onClose={hideResultModal}
        type={resultModal.type}
        result={resultModal.result}
        subtitle={resultModal.subtitle}
        badgeText={resultModal.badgeText}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // space for footer
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  footerNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
  },
  footerButtonActive: {
    backgroundColor: COLORS.surfaceDark,
  },
  footerLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  footerLabelActive: {
    color: COLORS.primary,
  },
}); 