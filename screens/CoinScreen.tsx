import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CoinScreenProps } from '../types';
import { COLORS, TYPOGRAPHY } from '../constants/theme';
import CoinToss from '../components/CoinToss';
import ResultModal from '../components/ResultModal';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomModal from '../components/CustomModal';

interface ResultState {
  visible: boolean;
  type: 'coin';
  result: string | number;
  subtitle: string;
  badgeText: string;
}

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface ResultModalState {
  visible: boolean;
  type: 'name';
  result: string | number;
  subtitle: string;
  badgeText: string;
}

const STORAGE_KEY = 'tagdafun.coin.stats';

const CoinScreen: React.FC<CoinScreenProps> = () => {
  const insets = useSafeAreaInsets();
  const [modal, setModal] = useState<ModalState>({ visible: false, title: '', message: '', type: 'info' });
  const [resultModal, setResultModal] = useState<ResultModalState>({ visible: false, type: 'name', result: '', subtitle: '', badgeText: '' });
  const [result, setResult] = useState<ResultState>({ visible: false, type: 'coin', result: '', subtitle: '', badgeText: '' });
  const [wins, setWins] = useState<number>(0);
  const [losses, setLosses] = useState<number>(0);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { wins: w = 0, losses: l = 0 } = JSON.parse(raw);
          setWins(w);
          setLosses(l);
        }
      } catch {}
    };
    loadStats();
  }, []);

  const saveStats = async (w: number, l: number) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ wins: w, losses: l }));
    } catch {}
  };

  const onShowResult = (type: 'coin', res: string, subtitle: string, badgeText: string, win: boolean) => {
    const newWins = win ? wins + 1 : wins;
    const newLosses = win ? losses : losses + 1;
    setWins(newWins);
    setLosses(newLosses);
    saveStats(newWins, newLosses);
    setResult({ visible: true, type, result: res, subtitle, badgeText });
  };

  const onHide = () => setResult(prev => ({ ...prev, visible: false }));

  const resetStats = async () => {
    setWins(0);
    setLosses(0);
    await saveStats(0, 0);
  };

  const showModal = (title: string, message: string, type: 'error' | 'warning' | 'info' = 'info') => setModal({ visible: true, title, message, type });
  const hideModal = () => setModal((prev: ModalState) => ({ ...prev, visible: false }));

  const showResultModal = (type: 'name', result: string, subtitle: string, badgeText: string) => setResultModal({ visible: true, type, result, subtitle, badgeText });
  const hideResultModal = () => setResultModal((prev: ResultModalState) => ({ ...prev, visible: false }));

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Top stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statPill}>
            <Ionicons name="thumbs-up" size={16} color={COLORS.background} />
            <Text style={styles.statText}>Wins: {wins}</Text>
          </View>
          <View style={[styles.statPill, styles.lossPill]}>
            <Ionicons name="thumbs-down" size={16} color={COLORS.background} />
            <Text style={styles.statText}>Losses: {losses}</Text>
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={resetStats} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color={COLORS.primary} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <CoinToss onShowResult={onShowResult} />
          </View>
        </ScrollView>

        <CustomModal visible={modal.visible} title={modal.title} message={modal.message} type={modal.type} onClose={hideModal} />

        <ResultModal visible={result.visible} onClose={onHide} type={result.type} result={result.result} subtitle={result.subtitle} badgeText={result.badgeText} />
      </KeyboardAvoidingView>
    </View>
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
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lossPill: { backgroundColor: COLORS.error },
  statText: { ...TYPOGRAPHY.captionBold, color: COLORS.background },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetText: { ...TYPOGRAPHY.captionBold, color: COLORS.primary },
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

export default CoinScreen;
