import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { HomeScreenProps } from '../types';
import CustomModal from '../components/CustomModal';
import ResultModal from '../components/ResultModal';


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

const { width } = Dimensions.get('window');

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

export default function HomeScreen({ navigation }: HomeScreenProps): JSX.Element {
  const [generatedNumber, setGeneratedNumber] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [minNumber, setMinNumber] = useState<string>('1');
  const [maxNumber, setMaxNumber] = useState<string>('100');
  const [names, setNames] = useState<string>('');
  const [pickedName, setPickedName] = useState<string>('');
  const [isPickingName, setIsPickingName] = useState<boolean>(false);
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
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  const spinnerAnim = useRef(new Animated.Value(0)).current;

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

  const animateTabChange = (tab: 'number' | 'name') => {
    const toValue = tab === 'number' ? 0 : 1;
    Animated.spring(tabIndicatorAnim, {
      toValue,
      tension: 150,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const handleTabChange = (tab: 'number' | 'name') => {
    setActiveTab(tab);
    animateTabChange(tab);
  };

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
      showModal('Invalid Input', 'Please enter valid numbers for both minimum and maximum values.', 'error');
      return false;
    }

    if (min < 1) {
      showModal('Invalid Minimum', 'The minimum value must be at least 1. Please enter a higher number.', 'warning');
      return false;
    }

    if (max > 100) {
      showModal('Invalid Maximum', 'The maximum value cannot exceed 100. Please enter a lower number.', 'warning');
      return false;
    }

    if (min >= max) {
      showModal('Invalid Range', 'The minimum value must be less than the maximum value. Please adjust your range.', 'error');
      return false;
    }

    return true;
  };

  const validateNames = (): boolean => {
    const nameList = names.trim().split(',').filter(name => name.trim() !== '');
    
    if (nameList.length === 0) {
      showModal('No Names Entered', 'Please enter at least one name to pick from.', 'warning');
      return false;
    }

    if (nameList.length === 1) {
      showModal('Only One Name', 'Please enter at least two names to make the selection meaningful.', 'warning');
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
      showResultModal(
        'number',
        randomNumber,
        'Your lucky number!',
        `Range: ${minNumber} - ${maxNumber}`
      );
    }, 500);
  };

  const pickName = (): void => {
    if (!validateNames()) {
      return;
    }

    setIsPickingName(true);
    startSpinnerAnimation();
    
    // Simulate picking delay
    setTimeout(() => {
      const nameList = names.trim().split(',').filter(name => name.trim() !== '');
      const randomIndex = Math.floor(Math.random() * nameList.length);
      const selectedName = nameList[randomIndex].trim();
      
      setPickedName(selectedName);
      setIsPickingName(false);
      stopSpinnerAnimation();
      
      // Show result in modal
      showResultModal(
        'name',
        selectedName,
        'The chosen one!',
        `From ${nameList.length} names`
      );
    }, 500);
  };

  const resetToDefaults = (): void => {
    setMinNumber('1');
    setMaxNumber('100');
    setGeneratedNumber(null);
    showModal('Reset Complete', 'Your range has been reset to the default values (1-100).', 'info');
  };

  const clearNames = (): void => {
    setNames('');
    setPickedName('');
    showModal('Names Cleared', 'All names have been cleared. You can enter new names now.', 'info');
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

  const renderNumberSection = () => (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🎲 Number Generator</Text>
        <Text style={styles.sectionSubtitle}>Generate random numbers within your custom range</Text>
      </View>

      {/* Input Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Set Your Range</Text>
        
        <View style={styles.inputRow}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Minimum</Text>
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
            <Text style={styles.inputLabel}>Maximum</Text>
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

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={resetToDefaults}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Reset to Default (1-100)</Text>
        </TouchableOpacity>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.primaryButton, isGenerating && styles.primaryButtonDisabled]}
        onPress={generateNumber}
        disabled={isGenerating}
        activeOpacity={0.8}
      >
        {renderButtonContent(isGenerating, 'Generating...', 'Generate Number')}
      </TouchableOpacity>
    </View>
  );

  const renderNameSection = () => (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👥 Name Picker</Text>
        <Text style={styles.sectionSubtitle}>Randomly select from a list of names</Text>
      </View>

      {/* Names Input Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Enter Names</Text>
        
        <View style={styles.nameInputContainer}>
          <Text style={styles.inputLabel}>Names (separated by commas)</Text>
          <TextInput
            style={styles.nameInput}
            value={names}
            onChangeText={setNames}
            placeholder="John, Jane, Mike, Sarah"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={clearNames}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Clear All Names</Text>
        </TouchableOpacity>
      </View>

      {/* Pick Name Button */}
      <TouchableOpacity
        style={[styles.primaryButton, isPickingName && styles.primaryButtonDisabled]}
        onPress={pickName}
        disabled={isPickingName}
        activeOpacity={0.8}
      >
        {renderButtonContent(isPickingName, 'Picking...', 'Pick a Name')}
      </TouchableOpacity>
    </View>
  );

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
          {/* Enhanced Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'number' && styles.activeTab]}
              onPress={() => handleTabChange('number')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'number' && styles.activeTabText]}>
                🎲 Number
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'name' && styles.activeTab]}
              onPress={() => handleTabChange('name')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'name' && styles.activeTabText]}>
                👥 Names
              </Text>
            </TouchableOpacity>
            <Animated.View 
              style={[
                styles.tabIndicator,
                {
                  transform: [{
                    translateX: tabIndicatorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, (width - 40) / 2]
                    })
                  }]
                }
              ]} 
            />
          </View>

          {/* Content based on active tab */}
          {activeTab === 'number' ? renderNumberSection() : renderNameSection()}
        </View>
      </ScrollView>

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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 6,
    marginBottom: 30,
    width: '100%',
    position: 'relative',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    zIndex: 2,
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.background,
  },
  tabIndicator: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: (width - 40) / 2 - 6,
    height: 44,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    zIndex: 1,
  },
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
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
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
  nameInputContainer: {
    marginBottom: 20,
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
  nameInput: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.background,
    textAlign: 'left',
    textAlignVertical: 'top',
    minHeight: 100,
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
  secondaryButton: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.background,
  },
}); 