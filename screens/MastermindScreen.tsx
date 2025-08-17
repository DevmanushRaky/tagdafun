import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import Mastermind from '../components/Mastermind';
import ResultModal from '../components/ResultModal';
import CustomModal from '../components/CustomModal';

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface ResultModalState {
  visible: boolean;
  type: 'mastermind';
  result: string;
  subtitle: string;
  badgeText: string;
}

const STORAGE_KEY = 'tagdafun.mastermind.stats';

const MastermindScreen: React.FC = () => {
  const [modal, setModal] = useState<ModalState>({ visible: false, title: '', message: '', type: 'info' });
  const [resultModal, setResultModal] = useState<ResultModalState>({ visible: false, type: 'mastermind', result: '', subtitle: '', badgeText: '' });

  const onShowResult = (type: 'mastermind', result: string, subtitle: string, badgeText: string, win: boolean) => {
    setResultModal({ visible: true, type, result, subtitle, badgeText });
  };

  const onHide = () => setResultModal(prev => ({ ...prev, visible: false }));

  const showModal = (title: string, message: string, type: 'error' | 'warning' | 'info' = 'info') => setModal({ visible: true, title, message, type });
  const hideModal = () => setModal((prev: ModalState) => ({ ...prev, visible: false }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Mastermind onShowResult={onShowResult} />
          </View>
        </ScrollView>

       
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});

export default MastermindScreen;
