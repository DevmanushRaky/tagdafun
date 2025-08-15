import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NumberScreenProps } from '../types';
import NumberGenerator from '../components/NumberGenerator';
import CustomModal from '../components/CustomModal';
import ResultModal from '../components/ResultModal';
import { COLORS } from '../constants/theme';

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface ResultModalState {
  visible: boolean;
  type: 'number';
  result: number | string;
  subtitle: string;
  badgeText: string;
}

const NumberScreen: React.FC<NumberScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const [modal, setModal] = useState<ModalState>({ visible: false, title: '', message: '', type: 'info' });
  const [resultModal, setResultModal] = useState<ResultModalState>({ visible: false, type: 'number', result: 0, subtitle: '', badgeText: '' });

  const showModal = (title: string, message: string, type: 'error' | 'warning' | 'info' = 'info') => setModal({ visible: true, title, message, type });
  const hideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const showResultModal = (type: 'number', result: number, subtitle: string, badgeText: string) => setResultModal({ visible: true, type, result, subtitle, badgeText });
  const hideResultModal = () => setResultModal(prev => ({ ...prev, visible: false }));

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <NumberGenerator onShowModal={showModal} onShowResult={showResultModal} />
        </View>
      </ScrollView>

      <CustomModal visible={modal.visible} title={modal.title} message={modal.message} type={modal.type} onClose={hideModal} />

      <ResultModal visible={resultModal.visible} onClose={hideResultModal} type={resultModal.type} result={resultModal.result} subtitle={resultModal.subtitle} badgeText={resultModal.badgeText} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({ 
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  }, 
  scrollContent: { 
    flexGrow: 1,
    // Dynamic padding will be applied inline using insets
  }, 
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 20 
  }, 
});

export default NumberScreen;
