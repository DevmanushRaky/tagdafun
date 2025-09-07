import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Modal, Dimensions, Share, Platform, Animated, BackHandler } from 'react-native';
import { COLORS, TYPOGRAPHY } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameGuard } from '../contexts/GameGuardContext';


interface Peg {
  id: number;
  color: string;
  value: number;
}

interface Guess {
  pegs: Peg[];
  feedback: {
    black: number;
    white: number;
  };
}

interface MastermindProps {
  onShowResult: (type: 'mastermind', result: string, subtitle: string, badgeText: string, win: boolean) => void;
}

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  bestScore: number;
  bestTime: number;
  bestAttempts: number;
  totalPlayTime: number;
  achievements: string[];
  achievementCounts: { [key: string]: number };
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type Difficulty = 'easy' | 'hard';

const COLORS_OPTIONS = [
  { color: '#FF4757', value: 1, name: 'Red', nameHi: 'लाल', gradient: [COLORS.primary, COLORS.primaryDark] },
  { color: '#3742FA', value: 2, name: 'Blue', nameHi: 'नीला', gradient: [COLORS.secondary, COLORS.secondaryLight] },
  { color: '#2ED573', value: 3, name: 'Green', nameHi: 'हरा', gradient: [COLORS.success, '#1E90FF'] },
  { color: '#FFA502', value: 4, name: 'Yellow', nameHi: 'पीला', gradient: [COLORS.warning, COLORS.primary] },
  { color: '#FF6348', value: 5, name: 'Orange', nameHi: 'नारंगी', gradient: [COLORS.primary, '#FF4757'] },
  { color: '#A55EEA', value: 6, name: 'Purple', nameHi: 'बैंगनी', gradient: [COLORS.secondary, '#8B5CF6'] },
];

const STORAGE_KEY = 'tagdafun.mastermind.stats';

const Mastermind: React.FC<MastermindProps> = ({ onShowResult }) => {
  const { language } = useLanguage();
  const { setMastermindActive, setRequestMastermindExit, pendingNavigation, setPendingNavigation } = useGameGuard();
  const [gameStarted, setGameStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [secretCode, setSecretCode] = useState<Peg[]>([]);
  const [currentGuess, setCurrentGuess] = useState<(Peg | undefined)[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [selectedColor, setSelectedColor] = useState<typeof COLORS_OPTIONS[0] | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentPegIndex, setCurrentPegIndex] = useState(0);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    bestScore: 0,
    bestTime: 0,
    bestAttempts: 0,
    totalPlayTime: 0,
    achievements: [],
    achievementCounts: {},
  });

  // Achievement info tooltip state
  const [showAchievementInfo, setShowAchievementInfo] = useState(false);
  const [achievementInfoTitle, setAchievementInfoTitle] = useState('');
  const [achievementInfoText, setAchievementInfoText] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Animated gradient for review title
  const reviewGradientAnim = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(8)).current;
  const titlePulse = useRef(new Animated.Value(0)).current;
  const bannerIconScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (reviewMode) {
      reviewGradientAnim.setValue(0);
      titleOpacity.setValue(0);
      titleTranslateY.setValue(8);
      titlePulse.setValue(0);
      bannerIconScale.setValue(0.9);

      Animated.parallel([
        Animated.loop(
          Animated.timing(reviewGradientAnim, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: true,
          })
        ),
        Animated.timing(titleOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(titlePulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
            Animated.timing(titlePulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
          ])
        ),
        Animated.spring(bannerIconScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [reviewMode]);

  useEffect(() => {
    if (gameStarted) {
      setMastermindActive(true);
      generateSecretCode();
      // Initialize first row with empty pegs
      setCurrentGuess([undefined, undefined, undefined, undefined]);
      setCurrentRow(0);
      setCurrentPegIndex(0);
      setTimeLeft(60); // 1 minute for the entire first row (all 4 pegs)
      setTimerActive(true);
      setIsPaused(false);
    }
    return () => {
      setMastermindActive(false);
    };
  }, [gameStarted]);

  // Load stats when component mounts
  useEffect(() => {
    loadGameStats();
  }, []);

  const loadGameStats = async () => {
    try {
      const savedStats = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        // Ensure achievementCounts is always an object
        if (!parsedStats.achievementCounts) {
          parsedStats.achievementCounts = {};
        }
        setGameStats(parsedStats);
      }
    } catch (error) {
      console.log('Error loading stats:', error);
    }
  };

  // Register exit request handler with guard
  useEffect(() => {
    const handler = () => {
      if (gameStarted && !gameOver) {
        setShowExitAlert(true);
      }
    };
    setRequestMastermindExit(() => handler);
    return () => {
      setRequestMastermindExit(undefined);
    };
  }, [gameStarted, gameOver]);

  // Android hardware back handling
  useEffect(() => {
    const onBackPress = () => {
      if (reviewMode) {
        // Exit review mode back to start screen
        setReviewMode(false);
        setGameStarted(false);
        setGameOver(false);
        setIsPaused(false);
        setTimerActive(false);
        return true; // handled
      }
      if (gameStarted && !gameOver) {
        // In-game: show exit confirmation instead of navigating tabs
        setShowExitAlert(true);
        return true; // handled
      }
      return false; // allow default behavior
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [gameStarted, gameOver, reviewMode]);

  const saveGameStats = async (newStats: GameStats) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
      setGameStats(newStats);
    } catch (error) {
      console.log('Error saving stats:', error);
    }
  };

  const shareGameResult = async () => {
    try {
      const timeUsed = 60 - timeLeft;
      const score = calculateScore(attempts, timeUsed);
      const date = new Date().toLocaleDateString();
      const time = new Date().toLocaleTimeString();
      
      let shareMessage = '';
      
      if (language === 'hi') {
        shareMessage = `🎯 मास्टरमाइंड गेम में जीत! 🎉\n\n` +
          `🏆 स्कोर: ${score} अंक\n` +
          `⏰ समय: ${Math.floor(timeUsed / 60)}:${(timeUsed % 60).toString().padStart(2, '0')}\n` +
          `🎲 प्रयास: ${attempts}\n` +
          `📅 तारीख: ${date}\n` +
          `🕐 समय: ${time}\n\n` +
          `🎮 TagDaFun ऐप से खेलें!\n` +
          `📱 डाउनलोड करें: https://play.google.com/store/apps/details?id=com.tagdafun.app\n\n` +
          `#TagDaFun #Mastermind #PuzzleGame #BrainGame`;
      } else {
        shareMessage = `🎯 Mastermind Game Victory! 🎉\n\n` +
          `🏆 Score: ${score} points\n` +
          `⏰ Time: ${Math.floor(timeUsed / 60)}:${(timeUsed % 60).toString().padStart(2, '0')}\n` +
          `🎲 Attempts: ${attempts}\n` +
          `📅 Date: ${date}\n` +
          `🕐 Time: ${time}\n\n` +
          `🎮 Play on TagDaFun App!\n` +
          `📱 Download: https://play.google.com/store/apps/details?id=com.tagdafun.app\n\n` +
          `#TagDaFun #Mastermind #PuzzleGame #BrainGame`;
      }
      
      const shareOptions = {
        message: shareMessage,
        title: language === 'hi' ? 'मास्टरमाइंड गेम जीत!' : 'Mastermind Game Victory!',
        url: 'https://play.google.com/store/apps/details?id=com.tagdafun.app',
      };
      
      if (Platform.OS === 'android') {
        await Share.share(shareOptions);
      } else {
        await Share.share(shareOptions);
      }
      
      console.log('📤 Game result shared successfully!');
    } catch (error) {
      console.log('Error sharing game result:', error);
      Alert.alert(
        language === 'hi' ? 'शेयर करने में त्रुटि' : 'Share Error',
        language === 'hi' ? 'गेम रिजल्ट शेयर करने में समस्या आई।' : 'There was an issue sharing the game result.'
      );
    }
  };

  const shareGameStats = async () => {
    try {
      const date = new Date().toLocaleDateString();
      const time = new Date().toLocaleTimeString();
      
      let shareMessage = '';
      
      if (language === 'hi') {
        shareMessage = `🎯 मास्टरमाइंड गेम स्टैट्स 📊\n\n` +
          `🎮 कुल खेल: ${gameStats.gamesPlayed}\n` +
          `🏆 जीते गए: ${gameStats.gamesWon}\n` +
          `📈 जीत दर: ${gameStats.gamesPlayed > 0 ? Math.round((gameStats.gamesWon / gameStats.gamesPlayed) * 100) : 0}%\n` +
          `💯 सर्वश्रेष्ठ स्कोर: ${gameStats.bestScore}\n` +
          `⏰ सर्वश्रेष्ठ समय: ${gameStats.bestTime > 0 ? `${Math.floor(gameStats.bestTime / 60)}:${(gameStats.bestTime % 60).toString().padStart(2, '0')}` : '-'}\n` +
          `🎲 सर्वश्रेष्ठ प्रयास: ${gameStats.bestAttempts > 0 ? gameStats.bestAttempts : '-'}\n` +
          `🏅 उपलब्धियां: ${gameStats.achievements.length}/4\n\n` +
          `📅 तारीख: ${date}\n` +
          `🕐 समय: ${time}\n\n` +
          `🎮 TagDaFun ऐप से खेलें!\n` +
          `📱 डाउनलोड करें: https://play.google.com/store/apps/details?id=com.tagdafun.app\n\n` +
          `#TagDaFun #Mastermind #GameStats #PuzzleGame`;
      } else {
        shareMessage = `🎯 Mastermind Game Statistics 📊\n\n` +
          `🎮 Total Games: ${gameStats.gamesPlayed}\n` +
          `🏆 Games Won: ${gameStats.gamesWon}\n` +
          `📈 Win Rate: ${gameStats.gamesPlayed > 0 ? Math.round((gameStats.gamesWon / gameStats.gamesPlayed) * 100) : 0}%\n` +
          `💯 Best Score: ${gameStats.bestScore}\n` +
          `⏰ Best Time: ${gameStats.bestTime > 0 ? `${Math.floor(gameStats.bestTime / 60)}:${(gameStats.bestTime % 60).toString().padStart(2, '0')}` : '-'}\n` +
          `🎲 Best Attempts: ${gameStats.bestAttempts > 0 ? gameStats.bestAttempts : '-'}\n` +
          `🏅 Achievements: ${gameStats.achievements.length}/4\n\n` +
          `📅 Date: ${date}\n` +
          `🕐 Time: ${time}\n\n` +
          `🎮 Play on TagDaFun App!\n` +
          `📱 Download: https://play.google.com/store/apps/details?id=com.tagdafun.app\n\n` +
          `#TagDaFun #Mastermind #GameStats #PuzzleGame`;
      }
      
      const shareOptions = {
        message: shareMessage,
        title: language === 'hi' ? 'मास्टरमाइंड गेम स्टैट्स' : 'Mastermind Game Statistics',
        url: 'https://play.google.com/store/apps/details?id=com.tagdafun.app',
      };
      
      await Share.share(shareOptions);
      console.log('📤 Game stats shared successfully!');
    } catch (error) {
      console.log('Error sharing game stats:', error);
      Alert.alert(
        language === 'hi' ? 'शेयर करने में त्रुटि' : 'Share Error',
        language === 'hi' ? 'गेम स्टैट्स शेयर करने में समस्या आई।' : 'There was an issue sharing the game stats.'
      );
    }
  };
  
  const confirmResetStats = () => setShowResetConfirm(true);

  const checkAchievements = (attempts: number, timeUsed: number, score: number): string[] => {
    const newAchievements: string[] = [];
    
    // Super Demon - Win on first attempt
    if (attempts === 1) {
      newAchievements.push('Super Demon');
    }
    
    // Mastermind - Win in 2-3 attempts
    if (attempts >= 2 && attempts <= 3) {
      newAchievements.push('Mastermind');
    }
    
    // Persistent - Win after 6+ attempts
    if (attempts >= 6) {
      newAchievements.push('Persistent');
    }
    
    // Perfect Game - Score 180+ points
    if (score >= 180) {
      newAchievements.push('Perfect Game');
    }
    
    return newAchievements;
  };

  const updateGameStats = (won: boolean, attempts: number, timeUsed: number, score: number) => {
    const newAchievements = checkAchievements(attempts, timeUsed, score);
    const allAchievements = [...new Set([...gameStats.achievements, ...newAchievements])];
    
    // Update achievement counts - ensure achievementCounts is always an object
    const currentAchievementCounts = gameStats.achievementCounts || {};
    const newAchievementCounts = { ...currentAchievementCounts };
    newAchievements.forEach(achievement => {
      newAchievementCounts[achievement] = (newAchievementCounts[achievement] || 0) + 1;
    });
    
    const newStats: GameStats = {
      gamesPlayed: gameStats.gamesPlayed + 1,
      gamesWon: gameStats.gamesWon + (won ? 1 : 0),
      bestScore: Math.max(gameStats.bestScore, score),
      bestTime: won && (gameStats.bestTime === 0 || timeUsed < gameStats.bestTime) ? timeUsed : gameStats.bestTime,
      bestAttempts: won && (gameStats.bestAttempts === 0 || attempts < gameStats.bestAttempts) ? attempts : gameStats.bestAttempts,
      totalPlayTime: gameStats.totalPlayTime + timeUsed,
      achievements: allAchievements,
      achievementCounts: newAchievementCounts,
    };
    
    saveGameStats(newStats);
    
    // Show new achievements
    const newUnlocked = newAchievements.filter(achievement => !gameStats.achievements.includes(achievement));
    if (newUnlocked.length > 0) {
      console.log('🏆 New achievements unlocked:', newUnlocked);
    }
  };

  const getAchievementInfo = (key: string) => {
    if (language === 'hi') {
      switch (key) {
        case 'Super Demon':
          return { title: '⚡ सुपर डेमन', text: 'पहले प्रयास में गेम जीतें।' };
        case 'Mastermind':
          return { title: '🎯 मास्टरमाइंड', text: '2-3 प्रयासों में गेम जीतें।' };
        case 'Persistent':
          return { title: '💪 पर्सिस्टेंट', text: '6 या अधिक प्रयासों के बाद गेम जीतें।' };
        case 'Perfect Game':
          return { title: '🏆 परफेक्ट गेम', text: '180+ स्कोर प्राप्त करें।' };
        default:
          return { title: 'उपलब्धि', text: 'इस उपलब्धि को अनलॉक करने के लिए खेलते रहें।' };
      }
    }
    switch (key) {
      case 'Super Demon':
        return { title: '⚡ Super Demon', text: 'Win the game on your first attempt.' };
      case 'Mastermind':
        return { title: '🎯 Mastermind', text: 'Win the game in 2-3 attempts.' };
      case 'Persistent':
        return { title: '💪 Persistent', text: 'Win the game after 6 or more attempts.' };
      case 'Perfect Game':
        return { title: '🏆 Perfect Game', text: 'Achieve a score of 180+ points.' };
      default:
        return { title: 'Achievement', text: 'Keep playing to unlock this achievement.' };
    }
  };

  const openAchievementInfo = (key: string) => {
    const info = getAchievementInfo(key);
    setAchievementInfoTitle(info.title);
    setAchievementInfoText(info.text);
    setShowAchievementInfo(true);
  };

  // Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerActive && !isPaused && timeLeft > 0 && !gameOver) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up! Lose this attempt
            handleTimeUp();
            return 60; // Reset for next attempt
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, isPaused, timeLeft, gameOver]);

  const generateSecretCode = () => {
    let newCode: Peg[] = [];

    if (difficulty === 'easy') {
      // 4 unique colors, no duplicates
      const shuffled = [...COLORS_OPTIONS].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, 4);
      newCode = selected.map((opt, i) => ({ id: i, color: opt.color, value: opt.value }));
    } else {
      // hard: exactly one pair + two other distinct colors (total 3 unique colors)
      const shuffled = [...COLORS_OPTIONS].sort(() => Math.random() - 0.5);
      const pairColor = shuffled[0];
      // pick two other distinct colors different from pair
      const others = shuffled.slice(1).filter(c => c.value !== pairColor.value).slice(0, 2);
      const pool = [pairColor, pairColor, ...others];
      // shuffle positions
      const arranged = pool.sort(() => Math.random() - 0.5);
      newCode = arranged.map((opt, i) => ({ id: i, color: opt.color, value: opt.value }));
    }
    setSecretCode(newCode);
    
    // Log the secret code colors for testing
    console.log('🎯 SECRET CODE COLORS FOR TESTING:');
    newCode.forEach((peg, index) => {
      const colorInfo = COLORS_OPTIONS.find(opt => opt.value === peg.value);
      console.log(`Position ${index + 1}: ${colorInfo?.name} (${peg.color}) - Value: ${peg.value}`);
    });
    console.log('🔍 Use these colors to test the game and see the exit modal!');
  };

  const startGame = () => {
    console.log('Start button pressed! Starting game...');
    setGameStarted(true);
    setSecretCode([]);
    setCurrentGuess([]);
    setGuesses([]);
    setAttempts(0);
    setGameWon(false);
    setGameOver(false);
    setSelectedColor(null);
    setCurrentRow(0);
    setCurrentPegIndex(0);
  };

  const selectColor = (colorOption: typeof COLORS_OPTIONS[0]) => {
    if (isPaused || gameOver || reviewMode) return; // Don't allow selection when paused, finished or reviewing
    
    // Find the first empty peg position (not necessarily the currentPegIndex)
    const emptyPosition = currentGuess.findIndex(peg => peg === undefined);
    
    if (emptyPosition !== -1) {
      // Fill the first empty position found
      const newGuess = [...currentGuess];
      newGuess[emptyPosition] = {
        id: emptyPosition,
        color: colorOption.color,
        value: colorOption.value,
      };
      setCurrentGuess(newGuess);
      
      // Update current peg index to the next empty position
      const nextEmptyPosition = newGuess.findIndex(peg => peg === undefined);
      setCurrentPegIndex(nextEmptyPosition !== -1 ? nextEmptyPosition : 4);
    }
    
    // Clear selected color after placing
    setSelectedColor(null);
  };

  const removePeg = (position: number) => {
    if (isPaused || gameOver || reviewMode) return; // Don't allow peg removal when paused, finished or reviewing
    
    const newGuess = [...currentGuess];
    newGuess[position] = undefined;
    setCurrentGuess(newGuess);
    
    // Update current peg index to the first empty position
    const firstEmptyPosition = newGuess.findIndex(peg => peg === undefined);
    setCurrentPegIndex(firstEmptyPosition !== -1 ? firstEmptyPosition : 4);
    
    console.log('⏰ Peg removed from position', position, 'New current index:', firstEmptyPosition);
  };

  const submitGuess = () => {
    if (isPaused || reviewMode) return; // Don't allow guess submission when paused or reviewing
    
    if (currentGuess.filter(peg => peg !== undefined).length !== 4) {
      Alert.alert(
        language === 'hi' ? 'अधूरी अनुमान' : 'Incomplete Guess',
        language === 'hi' ? 'कृपया 4 रंग चुनें' : 'Please select exactly 4 colors'
      );
      return;
    }

    const validGuess = currentGuess.filter((peg): peg is Peg => peg !== undefined);
    const feedback = checkGuess(validGuess);
    const newGuess: Guess = {
      pegs: validGuess,
      feedback,
    };

    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setAttempts(attempts + 1);

    // Check if won
    if (feedback.black === 4) {
      console.log('🎉 GAME WON! Showing game over modal...');
      setGameWon(true);
      setGameOver(true);
      setShowGameOverModal(true);
      updateGameStats(true, attempts + 1, 60 - timeLeft, calculateScore(attempts + 1, 60 - timeLeft));
    } else if (attempts + 1 >= 8) {
      console.log('😔 GAME OVER! Showing game over modal...');
      setGameOver(true);
      setShowGameOverModal(true);
      updateGameStats(false, attempts + 1, 60 - timeLeft, calculateScore(attempts + 1, 60 - timeLeft));
    } else {
      // Move to next row below (increment currentRow)
      setCurrentRow(currentRow + 1);
      setCurrentPegIndex(0);
      setCurrentGuess([undefined, undefined, undefined, undefined]);
      setTimeLeft(60); // Reset timer for next row (1 minute for all 4 pegs)
      setSelectedColor(null);
      console.log('⏰ Moving to next row, timer reset to 60 seconds for new row');
    }
  };

  const checkGuess = (guess: Peg[]) => {
    let black = 0;
    let white = 0;
    const secretCopy = [...secretCode];
    const guessCopy = [...guess];

    // Check for black pins (correct position and color)
    for (let i = 0; i < 4; i++) {
      if (guessCopy[i] && secretCopy[i] && guessCopy[i].value === secretCopy[i].value) {
        black++;
        secretCopy[i] = null as any;
        guessCopy[i] = null as any;
      }
    }

    // Check for white pins (correct color, wrong position)
    for (let i = 0; i < 4; i++) {
      if (guessCopy[i]) {
        const foundIndex = secretCopy.findIndex(peg => peg && peg.value === guessCopy[i]!.value);
        if (foundIndex !== -1) {
          white++;
          secretCopy[foundIndex] = null as any;
        }
      }
    }

    return { black, white };
  };

  const calculateScore = (attemptNumber: number, timeUsed: number): number => {
    let baseScore = 0;
    
    // Base score based on attempts
    if (attemptNumber === 1) baseScore = 100;
    else if (attemptNumber <= 3) baseScore = 80;
    else if (attemptNumber <= 5) baseScore = 60;
    else if (attemptNumber <= 7) baseScore = 40;
    else baseScore = 20;
    
    // Time bonus (faster = more points)
    let timeBonus = 0;
    if (timeUsed <= 30) timeBonus = 50;      // Under 30 seconds
    else if (timeUsed <= 45) timeBonus = 30; // Under 45 seconds
    else if (timeUsed <= 55) timeBonus = 15; // Under 55 seconds
    
    // Perfect attempt bonus
    let perfectBonus = 0;
    if (attemptNumber === 1) perfectBonus = 30;
    else if (attemptNumber === 2) perfectBonus = 20;
    
    const totalScore = baseScore + timeBonus + perfectBonus;
    console.log(`🎯 Score calculation: Base(${baseScore}) + Time(${timeBonus}) + Perfect(${perfectBonus}) = ${totalScore}`);
    
    return totalScore;
  };

  const resetGame = () => {
    setGameStarted(false);
    setMastermindActive(false);
    setSecretCode([]);
    setCurrentGuess([]);
    setGuesses([]);
    setAttempts(0);
    setGameWon(false);
    setGameOver(false);
    setSelectedColor(null);
    setCurrentRow(0);
    setCurrentPegIndex(0);
    setShowGameOverModal(false);
    setTimeLeft(60);
    setIsPaused(false);
    setTimerActive(false);
    setReviewMode(false);
  };

  const closeGameOverModal = () => {
    setShowGameOverModal(false);
    resetGame();
  };

  const handleTimeUp = () => {
    console.log('⏰ Time\'s up for this row! Losing this attempt...');
    console.log('Current attempts:', attempts, 'Current row:', currentRow);
    
    // Create a failed attempt with empty feedback (no pegs to avoid rendering errors)
    const failedGuess: Guess = {
      pegs: [], // Empty array instead of undefined pegs
      feedback: { black: 0, white: 0 }
    };
    
    const newGuesses = [...guesses, failedGuess];
    setGuesses(newGuesses);
    setAttempts(attempts + 1);
    
    console.log('Added failed guess, new attempts:', attempts + 1);
    
    // Check if game is over
    if (attempts + 1 >= 8) {
      console.log('Game over due to time running out!');
      setGameOver(true);
      setShowGameOverModal(true);
      updateGameStats(false, attempts + 1, 60, calculateScore(attempts + 1, 60));
    } else {
      // Move to next row and reset timer
      console.log('Moving to next row, resetting timer to 60 seconds for new row');
      setCurrentRow(currentRow + 1);
      setCurrentPegIndex(0);
      setCurrentGuess([undefined, undefined, undefined, undefined]);
      setTimeLeft(60);
      setSelectedColor(null);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    console.log(isPaused ? '▶️ Game resumed' : '⏸️ Game paused');
  };

  const viewGameHistory = () => {
    setShowGameOverModal(false);
    setTimerActive(false);
    setIsPaused(false);
    setReviewMode(true);
  };

  const renderPeg = (peg: Peg | undefined, position: number, rowIndex: number, isCurrentGuess: boolean = false) => {
    const isHighlighted = isCurrentGuess && position === currentPegIndex;
    
    if (peg) {
      return (
        <View style={styles.pegContainer}>
          <View style={[styles.peg, { backgroundColor: peg.color }]}>
            {/* Remove close button from here - it's handled in the wrapper */}
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.pegContainer}
        onPress={() => {
          // Allow tapping on empty pegs to show they're selectable
          // The actual color selection happens in selectColor function
        }}
        disabled={gameOver || !isCurrentGuess || isPaused}
      >
        <View style={[
          styles.peg, 
          styles.emptyPeg,
          isHighlighted && styles.highlightedPeg
        ]}>
          {isHighlighted && !gameOver && !isPaused && (
            <View style={[styles.pegPreview, { backgroundColor: '#dee2e6' }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeedback = (feedback: { black: number; white: number }) => {
    const pins = [];
    
    // Black pins
    for (let i = 0; i < feedback.black; i++) {
      pins.push(
        <View key={`black-${i}`} style={styles.feedbackPinContainer}>
          <View style={[styles.feedbackPin, styles.blackPin]} />
        </View>
      );
    }
    
    // White pins
    for (let i = 0; i < feedback.white; i++) {
      pins.push(
        <View key={`white-${i}`} style={styles.feedbackPinContainer}>
          <View style={[styles.feedbackPin, styles.whitePin]} />
        </View>
      );
    }

    return <View style={styles.feedbackContainer}>{pins}</View>;
  };

  const t = (key: string) => {
    const translations: { [key: string]: { en: string; hi: string } } = {
      title: { en: '🎯 Mastermind', hi: '🎯 मास्टरमाइंड' },
      subtitle: { en: 'Crack the secret code in 8 attempts', hi: '8 प्रयासों में गुप्त कोड को तोड़ें' },
      attempts: { en: 'Attempts', hi: 'प्रयास' },
      remaining: { en: 'Remaining', hi: 'शेष' },
      currentGuess: { en: 'Your Current Guess', hi: 'आपकी वर्तमान अनुमान' },
      selectColor: { en: 'Select Color', hi: 'रंग चुनें' },
      submit: { en: 'OK', hi: 'ठीक है' },
      previousAttempts: { en: 'Previous Attempts', hi: 'पिछले प्रयास' },
      blackPin: { en: 'Black = Correct position & color', hi: 'काला = सही स्थान और रंग' },
      whitePin: { en: 'White = Correct color, wrong position', hi: 'सफेद = सही रंग, गलत स्थान' },
      howToPlay: { en: 'How to Play', hi: 'कैसे खेलें' },
      instructions: { en: 'Instructions', hi: 'निर्देश' },
      step1: { en: '1. Select a color from the palette below', hi: '1. नीचे दिए गए पैलेट से रंग चुनें' },
      step2: { en: '2. Tap on empty pegs to place your colors', hi: '2. अपने रंग रखने के लिए खाली पेग पर टैप करें' },
      step3: { en: '3. Submit your guess when you have 4 pegs', hi: '3. जब आपके पास 4 पेग हों तो अपनी अनुमान जमा करें' },
      step4: { en: '4. Use the feedback to improve your next guess', hi: '4. अपनी अगली अनुमान को बेहतर बनाने के लिए फीडबैक का उपयोग करें' },
      step5: { en: '5. You have 60 seconds to complete each row.', hi: '5. प्रत्येक पंक्ति को 60 सेकंड में पूरा करें।' },
      close: { en: 'Close', hi: 'बंद करें' },
      startGame: { en: 'Start Game', hi: 'खेल शुरू करें' },
      rules: { en: 'Game Rules', hi: 'खेल के नियम' },
      totalAttempts: { en: 'Total Attempts: 8', hi: 'कुल प्रयास: 8' },
      placeColors: { en: 'Place your 4 colors', hi: 'अपने 4 रंग रखें' },
      feedback: { en: 'Feedback', hi: 'फीडबैक' },
      time: { en: 'Time', hi: 'समय' },
      timeUp: { en: 'Time\'s up!', hi: 'समय समाप्त!' },
      pause: { en: 'Pause', hi: 'रोकें' },
      resume: { en: 'Resume', hi: 'जारी रखें' },
      timerRule: { en: 'You have 60 seconds to complete each row.', hi: 'प्रत्येक पंक्ति को 60 सेकंड में पूरा करें।' },
      timerRuleIcon: { en: '⏰', hi: '⏰' },
      timerInfoTitle: { en: 'Time Limit', hi: 'समय सीमा' },
      timerInfoText: { en: 'You have 60 seconds to complete each row. If you run out of time, your guess will be marked as a failed attempt.', hi: 'प्रत्येक पंक्ति को 60 सेकंड में पूरा करें। यदि समय समाप्त हो जाता है, तो आपका अनुमान एक विफल प्रयास के रूप में चिह्नित हो जाएगा।' },
      timerPauseInfo: { en: 'You can pause and resume the timer during your turn.', hi: 'आप अपने टर्म के दौरान टाइमर को रोक और फिर से शुरू कर सकते हैं।' },
      gameStats: { en: 'Game Statistics', hi: 'खेल सांख्यिकी' },
      gamesPlayed: { en: 'Games Played', hi: 'खेल खेले गए' },
      gamesWon: { en: 'Games Won', hi: 'खेल जीते गए' },
      winRate: { en: 'Win Rate', hi: 'जीत दर' },
      bestScore: { en: 'Best Score', hi: 'अच्छी स्कोर' },
      bestTime: { en: 'Best Time', hi: 'अच्छी समय' },
      bestAttempts: { en: 'Best Attempts', hi: 'अच्छी प्रयास' },
      achievements: { en: 'Achievements', hi: 'अर्हान्वाद' },
      totalUnlocked: { en: 'Total Unlocked', hi: 'कुल अनलॉक किए गए' },
      share: { en: 'Share', hi: 'शेयर करें' },
      shareStats: { en: 'Share Stats', hi: 'स्टैट्स शेयर करें' },
    };
    return translations[key]?.[language] || translations[key]?.en || key;
  };

  // Initial Screen - Before game starts
  if (!gameStarted) {
    return (
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Start Button - Moved to Top */}
        <View style={styles.startButtonContainer}>
          <TouchableOpacity 
            style={styles.enhancedStartButton} 
            onPress={startGame}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.enhancedStartButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play-circle" size={32} color="white" />
              <Text style={styles.enhancedStartButtonText}>{t('startGame')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Difficulty Toggle - compact below Start */}
        <View style={styles.difficultyContainer}>
          <TouchableOpacity
            style={[styles.difficultyTab, difficulty === 'easy' ? styles.difficultyActive : styles.difficultyInactive]}
            onPress={() => setDifficulty('easy')}
          >
            <Text style={[styles.difficultyText, difficulty === 'easy' ? styles.difficultyTextActive : styles.difficultyTextInactive]}>
              {language === 'hi' ? 'आसान' : 'Easy'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.difficultyTab, difficulty === 'hard' ? styles.difficultyActive : styles.difficultyInactive]}
            onPress={() => setDifficulty('hard')}
          >
            <Text style={[styles.difficultyText, difficulty === 'hard' ? styles.difficultyTextActive : styles.difficultyTextInactive]}>
              {language === 'hi' ? 'कठिन' : 'Hard'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Game Statistics Section */}
        <View style={styles.statsSection}>
          <Text style={styles.statsSectionTitle}>{t('gameStats')}</Text>
          
          {/* Stats Cards */}
          <View style={styles.statsCardsContainer}>
            <View style={styles.statsCard}>
              <Text style={styles.statsCardValue}>{gameStats.gamesPlayed}</Text>
              <Text style={styles.statsCardLabel}>{t('gamesPlayed')}</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsCardValue}>{gameStats.gamesWon}</Text>
              <Text style={styles.statsCardLabel}>{t('gamesWon')}</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsCardValue}>{gameStats.gamesPlayed > 0 ? Math.round((gameStats.gamesWon / gameStats.gamesPlayed) * 100) : 0}%</Text>
              <Text style={styles.statsCardLabel}>{t('winRate')}</Text>
            </View>
          </View>

          {/* Best Records */}
          <View style={styles.bestRecordsContainer}>
            <View style={styles.bestRecordItem}>
              <Text style={styles.bestRecordLabel}>{t('bestScore')}</Text>
              <Text style={styles.bestRecordValue}>{gameStats.bestScore}</Text>
            </View>
            <View style={styles.bestRecordItem}>
              <Text style={styles.bestRecordLabel}>{t('bestTime')}</Text>
              <Text style={styles.bestRecordValue}>{gameStats.bestTime > 0 ? `${Math.floor(gameStats.bestTime / 60)}:${(gameStats.bestTime % 60).toString().padStart(2, '0')}` : '-'}</Text>
            </View>
            <View style={styles.bestRecordItem}>
              <Text style={styles.bestRecordLabel}>{t('bestAttempts')}</Text>
              <Text style={styles.bestRecordValue}>{gameStats.bestAttempts > 0 ? gameStats.bestAttempts : '-'}</Text>
            </View>
          </View>

          {/* Achievements (show all, lock unachieved) */}
          <View style={styles.achievementsContainer}>
            <Text style={styles.achievementsTitle}>{t('achievements')}</Text>

            {/* Achievement Summary */}
            <View style={styles.achievementSummary}>
              <Text style={styles.achievementSummaryText}>
                {t('totalUnlocked')}: {gameStats.achievements.length}/4
              </Text>
             
            </View>

            {/* Achievement Progress Bar */}
            <View style={styles.achievementProgressContainer}>
              <View style={styles.achievementProgressBar}>
                <View
                  style={[
                    styles.achievementProgressFill,
                    { width: `${(gameStats.achievements.length / 4) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.achievementProgressText}>
                {Math.round((gameStats.achievements.length / 4) * 100)}% Complete
              </Text>
            </View>

            {/* All achievements with lock state (2 x 2 grid) */}
            {[
              ['Super Demon', 'Mastermind'],
              ['Persistent', 'Perfect Game'],
            ].map((row, rowIndex) => (
              <View key={`ach-row-${rowIndex}`} style={styles.achievementRow}>
                {row.map((key) => {
                  const unlocked = gameStats.achievements.includes(key);
                  const count = (gameStats.achievementCounts && gameStats.achievementCounts[key]) || 0;
                  const icon = key === 'Super Demon' ? '⚡' : key === 'Mastermind' ? '🎯' : key === 'Persistent' ? '💪' : '🏆';
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.8}
                      delayLongPress={300}
                      onLongPress={() => openAchievementInfo(key)}
                    >
                      <View style={[styles.achievementBadge, !unlocked && styles.achievementBadgeLocked]}>
                        <Text style={[styles.achievementIcon, !unlocked && styles.achievementIconLocked]}>{icon}</Text>
                        <Text style={[styles.achievementText, !unlocked && styles.achievementTextLocked]}>{key}</Text>
                        <Text style={[styles.achievementCount, !unlocked && styles.achievementTextLocked]}>{count}x</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Achievement info tooltip modal */}
          <Modal
            visible={showAchievementInfo}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowAchievementInfo(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.achievementInfoCard}>
                <Text style={styles.achievementInfoTitle}>{achievementInfoTitle}</Text>
                <Text style={styles.achievementInfoText}>{achievementInfoText}</Text>
                <TouchableOpacity style={styles.achievementInfoClose} onPress={() => setShowAchievementInfo(false)}>
                  <Text style={styles.achievementInfoCloseText}>{language === 'hi' ? 'ठीक है' : 'OK'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          
          {/* Share / Reset Buttons */}
          <View style={styles.statsActionsRow}>
            <TouchableOpacity style={[styles.actionButton]} onPress={shareGameStats}>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="share-social" size={18} color="white" />
                <Text style={styles.actionButtonText}>{language === 'hi' ? 'शेयर' : 'Share'}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.resetButton]} onPress={confirmResetStats}>
              <View style={styles.resetButtonInner}>
                <Ionicons name="trash" size={18} color="#ff4757" />
                <Text style={styles.resetButtonText}>{language === 'hi' ? 'रीसेट' : 'Reset'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Styled Reset Confirm Modal */}
          <Modal
            visible={showResetConfirm}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowResetConfirm(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.exitAlertModal}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.exitAlertGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.exitAlertTitle}>
                    {language === 'hi' ? 'स्टैट्स रीसेट करें' : 'Reset Stats'}
                  </Text>
                  <Text style={styles.exitAlertMessage}>
                    {language === 'hi'
                      ? 'क्या आप वाकई सभी गेम स्टैट्स को साफ करना चाहते हैं? यह वापस नहीं लिया जा सकता।'
                      : 'Are you sure you want to clear all game stats? This cannot be undone.'}
                  </Text>
                  <View style={styles.exitAlertButtons}>
                    <TouchableOpacity
                      style={styles.exitAlertCancelButton}
                      onPress={() => setShowResetConfirm(false)}
                    >
                      <Text style={styles.exitAlertCancelText}>
                        {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.exitAlertExitButton}
                      onPress={async () => {
                        try {
                          await AsyncStorage.removeItem(STORAGE_KEY);
                          setGameStats({
                            gamesPlayed: 0,
                            gamesWon: 0,
                            bestScore: 0,
                            bestTime: 0,
                            bestAttempts: 0,
                            totalPlayTime: 0,
                            achievements: [],
                            achievementCounts: {},
                          });
                          setShowResetConfirm(false);
                        } catch (e) {
                          setShowResetConfirm(false);
                          Alert.alert(
                            language === 'hi' ? 'त्रुटि' : 'Error',
                            language === 'hi' ? 'स्टैट्स रीसेट नहीं हो पाए।' : 'Failed to reset stats.'
                          );
                        }
                      }}
                    >
                      <Text style={styles.exitAlertExitText}>
                        {language === 'hi' ? 'रीसेट' : 'Reset'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </Modal>
        </View>

        {/* Combined Instructions & Colors Section */}
        <View style={styles.combinedInstructionsColorsSection}>
          <Text style={styles.combinedSectionTitle}>{t('howToPlay')}</Text>
          
          {/* Instructions */}
          <View style={styles.combinedInstructionsContent}>
            <Text style={styles.combinedInstructionText}>{t('step1')}</Text>
            <Text style={styles.combinedInstructionText}>{t('step2')}</Text>
            <Text style={styles.combinedInstructionText}>{t('step3')}</Text>
            <Text style={styles.combinedInstructionText}>{t('step4')}</Text>
            <Text style={styles.combinedInstructionText}>{t('step5')}</Text>
          </View>

          {/* Rules */}
          <View style={styles.combinedRulesContent}>
            <View style={styles.combinedRuleItem}>
              <View style={styles.combinedRuleIcon}>
                <View style={[styles.feedbackPin, styles.blackPin]} />
              </View>
              <Text style={styles.combinedRuleText}>{t('blackPin')}</Text>
            </View>
            <View style={styles.combinedRuleItem}>
              <View style={styles.combinedRuleIcon}>
                <View style={[styles.feedbackPin, styles.whitePin]} />
              </View>
              <Text style={styles.combinedRuleText}>{t('whitePin')}</Text>
            </View>
            <View style={styles.combinedRuleItem}>
              <View style={styles.combinedRuleIcon}>
                <Text style={styles.timerRuleIcon}>⏰</Text>
              </View>
              <Text style={styles.combinedRuleText}>{t('timerRule')}</Text>
            </View>
          </View>

          {/* Timer Information Section */}
          <View style={styles.timerInfoSection}>
            <View style={styles.timerInfoHeader}>
              <Text style={styles.timerInfoIcon}>⏰</Text>
              <Text style={styles.timerInfoTitle}>{t('timerInfoTitle')}</Text>
            </View>
            <Text style={styles.timerInfoText}>{t('timerInfoText')}</Text>
            <Text style={styles.timerInfoText}>{t('timerPauseInfo')}</Text>
          </View>

          {/* Colors */}
          <View style={styles.combinedColorsContent}>
            <Text style={styles.combinedColorsTitle}>
              {language === 'hi' ? 'खेल में उपयोग किए जाने वाले रंग' : 'Select colors used in game'}
            </Text>
            <View style={styles.combinedColorsGrid}>
              {COLORS_OPTIONS.map((colorOption) => (
                <View key={colorOption.value} style={styles.combinedColorOption}>
                  <View
                    style={[styles.combinedColorCircle, { backgroundColor: colorOption.color }]}
                  >
                    <Text style={styles.combinedColorName}>{colorOption.name}</Text>
                    <Text style={styles.combinedColorNameHi}>{colorOption.nameHi}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
        
        {/* Extra Spacing for Better Scrolling */}
        <View style={styles.bottomSpacing} />
        
        {/* Additional Bottom Spacing */}
        <View style={styles.extraBottomSpacing} />

      </ScrollView>
    );
  }

  // Game Screen - After game starts
  return (
    <View style={styles.gameContainer}>
      {/* Top Bar with Attempts and Exit Button */}
      <View style={styles.topBar}>
        <View style={styles.attemptsDisplay}>
          <Text style={styles.attemptsLabel}>{t('remaining')}</Text>
          <Text style={styles.attemptsValue}>{8 - attempts}</Text>
        </View>
        
        {/* Timer Display */}
        <View style={styles.timerDisplay}>
          <Text style={styles.timerLabel}>
            {t('time')}
          </Text>
          <Text style={[
            styles.timerValue,
            timeLeft <= 10 && styles.timerWarning
          ]}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        
        {/* Pause/Resume Button */}
        <TouchableOpacity 
          style={[
            styles.pauseButton,
            isPaused && styles.pauseButtonActive,
            reviewMode && { opacity: 0.4 }
          ]} 
          onPress={togglePause}
          disabled={gameOver || reviewMode}
        >
          <Ionicons 
            name={isPaused ? "play" : "pause"} 
            size={24} 
            color={isPaused ? "white" : COLORS.primary} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.exitButton} onPress={() => {
          if (reviewMode) {
            // Exit review mode immediately
            setReviewMode(false);
            setGameStarted(false);
            setGameOver(false);
            setIsPaused(false);
            setTimerActive(false);
            return;
          }
          setShowExitAlert(true);
        }}>
          <Ionicons name="exit" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Game Area */}
      <View style={styles.gameArea}>
        {/* Left Sidebar - Color Palette + OK Button */}
        <View style={styles.leftSidebar}>
          <Text style={styles.sidebarTitle}>
            {language === 'hi' ? 'रंग चुनें' : 'Select Color'}
          </Text>
          <View style={styles.sidebarColorsGrid}>
            {COLORS_OPTIONS.map((colorOption) => (
              <TouchableOpacity
                key={colorOption.value}
                style={[
                  styles.sidebarColorOption,
                  isPaused && styles.sidebarColorOptionDisabled
                ]}
                onPress={() => selectColor(colorOption)}
                disabled={isPaused}
              >
                <View
                  style={[
                    styles.sidebarColorCircle,
                    { backgroundColor: colorOption.color },
                    selectedColor?.value === colorOption.value && styles.selectedSidebarColor,
                    isPaused && styles.sidebarColorCircleDisabled
                  ]}
                >
                  {selectedColor?.value === colorOption.value && (
                    <View style={styles.selectedSidebarIndicator}>
                      <Ionicons name="checkmark" size={14} color="white" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* OK Button in Left Sidebar */}
          <TouchableOpacity
            style={[
              styles.sidebarOkButton,
              (currentGuess.filter(peg => peg !== undefined).length !== 4 || isPaused || reviewMode) && styles.sidebarOkButtonDisabled,
            ]}
            onPress={submitGuess}
            disabled={currentGuess.filter(peg => peg !== undefined).length !== 4 || isPaused || reviewMode}
          >
            <LinearGradient
              colors={currentGuess.filter(peg => peg !== undefined).length === 4 ? [COLORS.primary, COLORS.primaryDark] : ['#ccc', '#999']}
              style={styles.sidebarOkButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.sidebarOkButtonText}>{t('submit')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Center - Game Pegs with Feedback */}
        <View style={styles.centerGameArea}>
          <Text style={styles.centerTitle}>{t('placeColors')}</Text>
          
          {/* Pause Overlay */}
          {isPaused && (
            <View style={styles.pauseOverlay}>
              <Text style={styles.pauseText}>{t('pause')}</Text>
            </View>
          )}
          
          {/* Game Board with 8 Rows */}
          <View style={styles.gameBoard}>
            {/* Previous Rows (completed attempts) */}
            {guesses.map((guess, rowIndex) => (
              <View key={rowIndex} style={styles.gameRow}>
                <View style={styles.centerPegsContainer}>
                  {guess.pegs.length > 0 ? (
                    // Render pegs if they exist
                    guess.pegs.map((peg, pegIndex) => (
                      <View key={pegIndex} style={styles.centerPegWrapper}>
                        <View style={[styles.peg, { backgroundColor: peg.color }]} />
                      </View>
                    ))
                  ) : (
                    // Render empty pegs for failed attempts (time ran out)
                    [0, 1, 2, 3].map((position) => (
                      <View key={position} style={styles.centerPegWrapper}>
                        <View style={[styles.peg, styles.emptyPeg, styles.failedPeg]} />
                      </View>
                    ))
                  )}
                </View>
                {/* Feedback for completed rows */}
                <View style={styles.feedbackContainer}>
                  {guess.pegs.length > 0 ? (
                    renderFeedback(guess.feedback)
                  ) : (
                    // Show time's up indicator for failed attempts
                    <View style={styles.timeUpIndicator}>
                      <Text style={styles.timeUpText}>⏰</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {/* Current Row (active attempt) - Only show if game is not over */}
            {!gameOver && (
              <View style={styles.gameRow}>
                <View style={styles.centerPegsContainer}>
                  {[0, 1, 2, 3].map((position) => (
                    <View 
                      key={position} 
                      style={[
                        styles.centerPegWrapper,
                        currentGuess[position] === undefined && position === currentPegIndex && styles.centerPegSelected
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.centerPegClickable}
                        onPress={() => {
                          if (currentGuess[position] !== undefined) {
                            removePeg(position);
                          }
                        }}
                      >
                        {renderPeg(currentGuess[position], position, currentRow, true)}
                        {currentGuess[position] !== undefined && (
                          <View style={styles.centerPegRemoveButton}>
                            <Ionicons name="close" size={12} color="white" />
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                {/* No feedback for current row - it's incomplete */}
              </View>
            )}

            {/* Empty Rows for remaining attempts - Only show if game is not over */}
            {!gameOver && Array.from({ length: Math.max(0, 8 - attempts - 1) }, (_, index) => (
              <View key={`empty-${index}`} style={styles.gameRow}>
                <View style={styles.centerPegsContainer}>
                  {[0, 1, 2, 3].map((position) => (
                    <View key={position} style={styles.centerPegWrapper}>
                      <View style={[styles.peg, styles.emptyPeg]} />
                    </View>
                  ))}
                </View>
                {/* Empty feedback for future rows */}
                <View style={styles.feedbackContainer}>
                  {[0, 1, 2, 3].map((slot) => (
                    <View key={slot} style={styles.feedbackSlot}>
                      <View style={styles.feedbackDot} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Right Sidebar - Feedback Slots */}
        {/* This section is removed as feedback is now integrated into the game board */}
      </View>

      {/* Review mode completion status banner placed below the entire game area */}
      {reviewMode && (
        <View style={styles.reviewStatusContainer}>
          <View style={styles.reviewTitleWrapper}>
            <Animated.Text
              style={[
                styles.reviewTitleText,
                {
                  color: gameWon ? COLORS.success : COLORS.error,
                  opacity: titleOpacity,
                  transform: [
                    { translateY: titleTranslateY },
                    {
                      scale: titlePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
                    }
                  ]
                }
              ]}
            >
              {language === 'hi'
                ? (gameWon ? 'आप जीते' : 'आप हारे')
                : (gameWon ? 'YOU WON' : 'YOU LOST')}
            </Animated.Text>
          </View>

          <View style={[ 
            styles.reviewStatusBanner,
            gameWon ? styles.reviewStatusWin : styles.reviewStatusLose
          ]}>
            <Animated.View style={{ transform: [{ scale: bannerIconScale }] }}>
              <Ionicons
                name={gameWon ? 'trophy' : 'close-circle'}
                size={18}
                color={gameWon ? '#155724' : '#721c24'}
              />
            </Animated.View>
            <Text style={styles.reviewStatusText}>
              {language === 'hi' ? 'खेल समाप्त' : 'Finished'}
            </Text>
          </View>
        </View>
      )}

      {/* Game Over Modal */}
      <Modal
        visible={showGameOverModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeGameOverModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.gameOverModal}>
            <LinearGradient
              colors={gameWon ? ['#2ed573', '#1e90ff'] : [COLORS.surfaceDark, COLORS.surface]}
              style={styles.gameOverModalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={[
                styles.gameOverModalTitle,
                { color: gameWon ? 'white' : COLORS.text }
              ]}>
                {gameWon ? '🎉 Congratulations!' : '😔 Game Over!'}
              </Text>
              
              {gameWon && (
                <View style={styles.scoreSection}>
                  <Text style={[styles.scoreText, { color: gameWon ? 'white' : COLORS.text }]}>
                    Score: {calculateScore(attempts, 60 - timeLeft)}
                  </Text>
                  <Text style={[styles.scoreBreakdown, { color: gameWon ? 'white' : COLORS.text }]}>
                    Base: {attempts <= 1 ? 100 : attempts <= 3 ? 80 : attempts <= 5 ? 60 : attempts <= 7 ? 40 : 20}
                    {60 - timeLeft <= 30 ? ' + Time: 50' : 60 - timeLeft <= 45 ? ' + Time: 30' : 60 - timeLeft <= 55 ? ' + Time: 15' : ''}
                    {attempts <= 2 ? ' + Perfect: ' + (attempts === 1 ? '30' : '20') : ''}
                  </Text>
                </View>
              )}
              
              <Text style={[
                styles.secretCodeModalTitle,
                { color: gameWon ? 'white' : COLORS.text }
              ]}>The Secret Code Was:</Text>
              <View style={styles.secretCodeModalRow}>
                {secretCode.map((peg, index) => (
                  <View key={index} style={[styles.modalPeg, { backgroundColor: peg.color }]} />
                ))}
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.modalResetButton,
                  !gameWon && { backgroundColor: COLORS.primary, borderColor: 'transparent' }
                ]} 
                onPress={closeGameOverModal}
              >
                <Ionicons name="refresh" size={24} color={gameWon ? 'white' : 'white'} />
                <Text style={[
                  styles.modalResetButtonText,
                  { color: 'white' }
                ]}>Play Again</Text>
              </TouchableOpacity>
              
              {/* Share Button - Only show when game is won */}
              {gameWon && (
                <TouchableOpacity style={styles.modalShareButton} onPress={shareGameResult}>
                  <Ionicons name="share-social" size={24} color="white" />
                  <Text style={styles.modalShareButtonText}>
                    {language === 'hi' ? 'शेयर करें' : 'Share'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* See Game (Review) Button - show for both win and loss */}
              <TouchableOpacity style={styles.modalSeeGameButton} onPress={viewGameHistory}>
                <Ionicons name="eye" size={24} color={COLORS.secondary} />
                <Text style={styles.modalSeeGameButtonText}>
                  {language === 'hi' ? 'गेम देखें' : 'See Game'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Custom Exit Alert Modal */}
      <Modal
        visible={showExitAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExitAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exitAlertModal}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.exitAlertGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.exitAlertTitle}>
                {language === 'hi' ? 'खेल से बाहर निकलें' : 'Exit Game'}
              </Text>
              
              <Text style={styles.exitAlertMessage}>
                {language === 'hi' ? 'क्या आप वाकई खेल से बाहर निकलना चाहते हैं? आपकी प्रगति खो जाएगी।' : 'Are you sure you want to exit the game? Your progress will be lost.'}
              </Text>
              
              <View style={styles.exitAlertButtons}>
                <TouchableOpacity 
                  style={styles.exitAlertCancelButton} 
                  onPress={() => setShowExitAlert(false)}
                >
                  <Text style={styles.exitAlertCancelText}>
                    {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.exitAlertExitButton} 
                  onPress={() => {
                    setShowExitAlert(false);
                    resetGame();
                    if (pendingNavigation) {
                      // perform deferred tab navigation
                      pendingNavigation();
                      setPendingNavigation(undefined);
                    }
                  }}
                >
                  <Text style={styles.exitAlertExitText}>
                    {language === 'hi' ? 'बाहर निकलें' : 'Exit'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  // New Enhanced Initial Screen Styles
  simpleHeader: {
    backgroundColor: 'white',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  simpleTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  // Combined Instructions & Colors Section Styles
  combinedInstructionsColorsSection: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 20,
  },
  combinedSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  difficultyContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    alignSelf: 'center',
    marginTop: 6,
    padding: 4,
    borderRadius: 12,
    gap: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    width: 160,
  },
  difficultyTab: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 5,
  },
  difficultyActive: {
    backgroundColor: COLORS.primary,
  },
  difficultyInactive: {
    backgroundColor: COLORS.surface,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  difficultyTextActive: {
    color: 'white',
  },
  difficultyTextInactive: {
    color: COLORS.primary,
  },
  combinedInstructionsContent: {
    marginBottom: 12,
  },
  combinedInstructionText: {
    fontSize: 15,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
    paddingLeft: 12,
  },
  combinedRulesContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 20,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  combinedRuleItem: {
    alignItems: 'center',
    flex: 1,
  },
  combinedRuleIcon: {
    marginBottom: 8,
  },
  combinedRuleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  combinedColorsContent: {
    marginTop: 12,
    marginBottom: 16,
  },
  combinedColorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  combinedColorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  combinedColorOption: {
    alignItems: 'center',
  },
  combinedColorCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  combinedColorName: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 1,
  },
  combinedColorNameHi: {
    fontSize: 6,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Compact Color Styles
  compactColorSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactColorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  compactColorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactColorOption: {
    alignItems: 'center',
  },
  compactColorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactColorName: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 1,
  },
  compactColorNameHi: {
    fontSize: 7,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  instructionsSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 24,
    paddingLeft: 16,
  },
  colorThemeSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  colorThemeSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  enhancedColorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  enhancedColorOption: {
    alignItems: 'center',
  },
  enhancedColorCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e9ecef',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  enhancedColorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  enhancedColorNameHi: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Smaller Color Styles
  smallerColorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  smallerColorOption: {
    alignItems: 'center',
  },
  smallerColorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  smallerColorName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 1,
  },
  smallerColorNameHi: {
    fontSize: 8,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  enhancedRulesSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  enhancedRulesContent: {
    gap: 20,
  },
  enhancedRuleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  ruleIconContainer: {
    width: 40,
    alignItems: 'center',
    paddingTop: 4,
  },
  ruleTextContainer: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  gameInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 120,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  infoTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  startButtonContainer: {
    padding: 12,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
    margin: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  enhancedStartButton: {
    borderRadius: 30,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  enhancedStartButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 12,
  },
  enhancedStartButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  bottomSpacing: {
    height: 80,
  },
  extraBottomSpacing: {
    height: 40,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  heroHeader: {
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    flex: 1,
    marginLeft: 20,
  },
  helpButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  colorPaletteSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  rulesSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  rulesContent: {
    gap: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ruleText: {
    fontSize: 16,
    color: '#2c3e50',
    flex: 1,
  },
  attemptsInfo: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  attemptsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  startButton: {
    margin: 20,
    borderRadius: 30,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderRadius: 30,
    gap: 16,
  },
  startButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  debugInfo: {
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  debugText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  colorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  colorOptionContainer: {
    alignItems: 'center',
  },
  colorOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e9ecef',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  colorName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  feedbackPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  blackPin: {
    backgroundColor: '#2c3e50',
  },
  whitePin: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2c3e50',
  },
  // Game Screen Styles
  topBar: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attemptsDisplay: {
    alignItems: 'flex-start',
  },
  attemptsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  attemptsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  exitButton: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    elevation: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 0,
  },
  gameArea: {
    flex: 0,
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    minHeight: 0,
    maxHeight: 'auto',
  },
  // Left Sidebar Styles
  leftSidebar: {
    flex: 0.7,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 3,
    paddingTop: 5,
    textAlign: 'center',
    paddingHorizontal: 10,
    lineHeight: 16,
  },
  sidebarColorsGrid: {
    flexDirection: 'column',
    gap: 2,
    marginBottom: 3,
  },
  sidebarColorOption: {
    alignItems: 'center',
  },
  sidebarColorOptionDisabled: {
    opacity: 0.5,
  },
  sidebarColorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  sidebarColorCircleDisabled: {
    opacity: 0.5,
  },
  selectedSidebarColor: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    elevation: 2,
  },
  selectedSidebarIndicator: {
    position: 'absolute',
    top: -1,
    right: -1,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
    width: 6,
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  // Center Game Area Styles
  centerGameArea: {
    flex: 2.6,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 0,
  },
  centerGameContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  centerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  gameBoard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  gameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
    paddingHorizontal: 2,
    minHeight: 0,
  },
  centerPegsContainer: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    minHeight: 0,
  },
  centerPegWrapper: {
    alignItems: 'center',
    marginHorizontal: 1,
  },
  centerPegSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 20,
    padding: 2,
  },
  centerPegClickable: {
    position: 'relative',
  },
  centerPegRemoveButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4757',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  centerOkButton: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  centerOkButtonDisabled: {
    elevation: 1,
    shadowOpacity: 0.1,
  },
  centerOkButtonGradient: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOkButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  // Right Sidebar Styles
  rightSidebar: {
    flex: 0.6,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  feedbackSlotsContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  feedbackSlot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dee2e6',
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    minWidth: 80,
  },
  feedbackPinContainer: {
    marginHorizontal: 1,
  },

  historySection: {
    display: 'none',
  },
  guessHistoryRow: {
    display: 'none',
  },
  guessNumber: {
    display: 'none',
  },
  guessNumberText: {
    display: 'none',
  },
  guessPegs: {
    display: 'none',
  },
  historyPeg: {
    display: 'none',
  },
  feedbackSection: {
    display: 'none',
  },
  gameOverSection: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  gameOverGradient: {
    alignItems: 'center',
    padding: 32,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  secretCodeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  secretCodeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  modalResetButtonLegacy: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalResetButtonTextLegacy: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  // Help Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  achievementInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '85%',
    maxWidth: 360,
    paddingVertical: 18,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  achievementInfoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  achievementInfoText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  achievementInfoClose: {
    alignSelf: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  achievementInfoCloseText: {
    color: 'white',
    fontWeight: '700',
  },
  helpModal: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  modalContent: {
    padding: 24,
  },

  closeModalButton: {
    margin: 24,
    borderRadius: 25,
    overflow: 'hidden',
  },
  closeModalButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  // Peg styles for game
  pegContainer: {
    position: 'relative',
  },
  peg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyPeg: {
    backgroundColor: '#f8f9fa',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#dee2e6',
  },
  pegPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  removeButton: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sidebarOkButton: {
    borderRadius: 8,
    elevation: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    overflow: 'hidden',
    marginTop: 3,
  },
  sidebarOkButtonDisabled: {
    elevation: 1,
    shadowOpacity: 0.05,
  },
  sidebarOkButtonGradient: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarOkButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  highlightedPeg: {
    borderWidth: 3,
    borderColor: COLORS.primary,
    borderRadius: 20,
    padding: 2,
  },
  gameOverModal: {
    backgroundColor: 'white',
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  gameOverModalGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 28,
  },
  gameOverModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scoreSection: {
    marginBottom: 20,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreBreakdown: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  secretCodeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  secretCodeModalRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  modalPeg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalResetButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalResetButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  exitAlertModal: {
    backgroundColor: 'white',
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  exitAlertGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 28,
  },
  exitAlertTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  exitAlertMessage: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  exitAlertButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  exitAlertCancelButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exitAlertCancelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  exitAlertExitButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exitAlertExitText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  timerDisplay: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  timerLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    fontWeight: '500',
    marginBottom: 2,
  },
  timerValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  timerWarning: {
    color: '#ff4757',
    fontWeight: '900',
  },
  pauseButton: {
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 0,
  },
  pauseButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pauseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  failedPeg: {
    backgroundColor: '#e74c3c', // Red background for failed attempts
  },
  timeUpIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  timeUpText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  timerRuleIcon: {
    fontSize: 16,
  },
  timerInfoSection: {
    backgroundColor: 'white',
    margin: 12,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginTop: 16,
  },
  timerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerInfoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  timerInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timerInfoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  statsSection: {
    backgroundColor: 'white',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    marginBottom: 16,
  },
  statsCard: {
    alignItems: 'center',
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsCardLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bestRecordsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
    marginBottom: 16,
  },
  bestRecordItem: {
    alignItems: 'center',
  },
  bestRecordLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  bestRecordValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  achievementsContainer: {
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  achievementsGrid: {
    display: 'none',
  },
  achievementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
    marginBottom: 8,
  },
  achievementBadge: {
    alignItems: 'center',
  },
  achievementBadgeLocked: {
    opacity: 0.35,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementIconLocked: {
    color: '#6c757d',
  },
  achievementText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
  },
  achievementTextLocked: {
    color: '#6c757d',
  },
  achievementCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  achievementSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  achievementSummaryText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  achievementProgressContainer: {
    marginBottom: 16,
  },
  achievementProgressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e9ecef',
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#2ed573',
  },
  achievementProgressText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  modalShareButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginTop: 16,
  },
  modalShareButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalSeeGameButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    marginTop: 12,
  },
  modalSeeGameButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  reviewStatusContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  reviewTitleWrapper: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  reviewMaskedTitle: {
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: 'black',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reviewStatusBanner: {
    marginTop: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  reviewStatusWin: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  reviewStatusLose: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  reviewStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  shareStatsButton: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  shareStatsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  shareStatsButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  statsActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 16,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  resetButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f1f2f6',
  },
  resetButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  resetButtonText: {
    color: '#ff4757',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default Mastermind;
