import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image, TouchableOpacity, Modal, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import NumberScreen from './screens/NumberScreen';
import NamesScreen from './screens/NamesScreen';
import CoinScreen from './screens/CoinScreen';
import TruthDareScreen from './screens/TruthDareScreen';
import MastermindScreen from './screens/MastermindScreen';
import PrivacyScreen from './screens/PrivacyScreen';

// Import types
import { RootTabParamList } from './types';

// Import language context
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { GameGuardProvider, useGameGuard } from './contexts/GameGuardContext';

const Tab = createBottomTabNavigator<RootTabParamList>();
const { width, height } = Dimensions.get('window');

// Tab Navigator Component with Language Switcher
const TabNavigatorWithLanguage = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isMastermindActive, requestMastermindExit, setPendingNavigation } = useGameGuard();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Language Switcher Component for Header - defined inside the provider context
  const HeaderLanguageSwitcher = () => {
    const { language, setLanguage } = useLanguage();

    return (
      <View style={headerStyles.languageContainer}>
        <TouchableOpacity
          style={[headerStyles.languageButton, language === 'en' && headerStyles.activeLanguage]}
          onPress={() => setLanguage('en')}
          activeOpacity={0.8}
        >
          <Text style={[headerStyles.languageText, language === 'en' && headerStyles.activeLanguageText]}>
            EN
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[headerStyles.languageButton, language === 'hi' && headerStyles.activeLanguage]}
          onPress={() => setLanguage('hi')}
          activeOpacity={0.8}
        >
          <Text style={[headerStyles.languageText, language === 'hi' && headerStyles.activeLanguageText]}>
            हि
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Menu Component for Header
  const HeaderMenu = () => {
    return (
      <View style={headerStyles.menuContainer}>
        <TouchableOpacity
          style={headerStyles.menuButton}
          onPress={() => setShowMenu(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Mastermind"
        screenListeners={({ navigation, route }) => ({
          tabPress: (e) => {
            if (isMastermindActive) {
              e.preventDefault();
              setPendingNavigation(() => () => navigation.navigate(route.name as never));
              if (requestMastermindExit) {
                requestMastermindExit();
              }
            }
          },
        })}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Number') iconName = focused ? 'dice' : 'dice-outline';
            else if (route.name === 'Names') iconName = focused ? 'people' : 'people-outline';
            else if (route.name === 'Coin') iconName = focused ? 'sync-circle' : 'sync-circle-outline';
            else if (route.name === 'TruthDare') iconName = focused ? 'help-buoy' : 'help-buoy-outline';
            else if (route.name === 'Mastermind') iconName = focused ? 'grid' : 'grid-outline';
            else iconName = 'help-circle-outline';

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF6B00',
          tabBarInactiveTintColor: '#002244',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0',
            // paddingBottom: Math.max(insets.bottom, 5),
            paddingTop: 2,
            height:45 + insets.bottom,
            position: 'absolute',
            elevation: 0,
            shadowOpacity: 0,
            bottom: 0,
            left: 0,
            right: 0,
          },
          headerStyle: {
            backgroundColor: '#FF6B00',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => (
            <View style={headerStyles.headerRightContainer}>
              <HeaderLanguageSwitcher />
              <HeaderMenu />
            </View>
          ),
        })}
      >
        <Tab.Screen name="Number" component={NumberScreen} />
        <Tab.Screen name="Names" component={NamesScreen}  />
        <Tab.Screen name="Mastermind" component={MastermindScreen} />
        <Tab.Screen name="Coin" component={CoinScreen}  />
        <Tab.Screen name="TruthDare" component={TruthDareScreen}  />
      </Tab.Navigator>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={headerStyles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={headerStyles.menuContent}>
            <TouchableOpacity
              style={headerStyles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowPrivacyModal(true);
              }}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FF6B00" />
              <Text style={headerStyles.menuItemText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={{ flex: 1 }}>
          <View style={headerStyles.privacyHeader}>
            <TouchableOpacity
              style={headerStyles.closeButton}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={headerStyles.privacyHeaderTitle}>Privacy Policy</Text>
            <View style={{ width: 24 }} />
          </View>
          <PrivacyScreen 
            navigation={{} as any}
            route={{} as any}
          />
        </View>
      </Modal>
    </View>
  );
};

export default function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const loaderRotation = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start splash screen animation sequence
    const startAnimation = async () => {
      // Logo entrance animation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Show loader after logo appears
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(loaderOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(textScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();

        // Start loader rotation
        Animated.loop(
          Animated.timing(loaderRotation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ).start();
      }, 600);

      // Hide splash screen after 3 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(loaderOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(textOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsLoading(false);
        });
      }, 3000);
    };

    startAnimation();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar style="light" />
        
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('./assets/tagdafun-main-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textOpacity,
              transform: [{ scale: textScale }],
            },
          ]}
        >
          <Text style={styles.appName}>TAGDA FUN</Text>
          <Text style={styles.appTagline}>Making random decisions fun!</Text>
        </Animated.View>

        {/* Loading Spinner */}
        <Animated.View
          style={[
            styles.loaderContainer,
            {
              opacity: loaderOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.loader,
              {
                transform: [
                  {
                    rotate: loaderRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          />
          <Text style={styles.loadingText}>Loading...</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <GameGuardProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <TabNavigatorWithLanguage />
          </NavigationContainer>
        </GameGuardProvider>
      </SafeAreaProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 2,
  },
  appTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  loaderContainer: {
    alignItems: 'center',
  },
  loader: {
    width: 40,
    height: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: 20,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
});

// Header styles for language switcher and menu
const headerStyles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  languageContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 4,
    marginRight: 12,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLanguage: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  activeLanguageText: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  menuContainer: {
    padding: 8,
  },
  menuButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  privacyHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});

