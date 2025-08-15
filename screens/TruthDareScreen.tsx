import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TruthDareScreenProps } from '../types';
import { COLORS } from '../constants/theme';
import TruthDare from '../components/TruthDare';
import CustomModal from '../components/CustomModal';
import ResultModal from '../components/ResultModal';

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface ResultState {
  visible: boolean;
  type: 'truthdare';
  result: string | number;
  subtitle: string;
  badgeText: string;
}

const TruthDareScreen: React.FC<TruthDareScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const [modal, setModal] = useState<ModalState>({ visible: false, title: '', message: '', type: 'info' });
  const [result, setResult] = useState<ResultState>({ visible: false, type: 'truthdare', result: '', subtitle: '', badgeText: '' });

  const onShowModal = (title: string, message: string, type: 'error' | 'warning' | 'info' = 'info') => setModal({ visible: true, title, message, type });
  const onHideModal = () => setModal(prev => ({ ...prev, visible: false }));

  const onShowResult = (type: 'truthdare', res: string, subtitle: string, badgeText: string) => setResult({ visible: true, type, result: res, subtitle, badgeText });
  const onHideResult = () => setResult(prev => ({ ...prev, visible: false }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <TruthDare onShowModal={onShowModal} onShowResult={onShowResult} />
          </View>
        </ScrollView>

        <CustomModal visible={modal.visible} title={modal.title} message={modal.message} type={modal.type} onClose={onHideModal} />
        <ResultModal visible={result.visible} onClose={onHideResult} type={result.type} result={result.result} subtitle={result.subtitle} badgeText={result.badgeText} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ 
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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

export default TruthDareScreen;
