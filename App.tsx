import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image, TouchableOpacity } from 'react-native';
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

const Tab = createBottomTabNavigator<RootTabParamList>();
const { width, height } = Dimensions.get('window');

// Tab Navigator Component with Language Switcher
const TabNavigatorWithLanguage = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  
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

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Number') iconName = focused ? 'dice' : 'dice-outline';
            else if (route.name === 'Names') iconName = focused ? 'people' : 'people-outline';
            else if (route.name === 'Coin') iconName = focused ? 'sync-circle' : 'sync-circle-outline';
            else if (route.name === 'TruthDare') iconName = focused ? 'help-buoy' : 'help-buoy-outline';
            else if (route.name === 'Mastermind') iconName = focused ? 'grid' : 'grid-outline';
            else if (route.name === 'Privacy') iconName = focused ? 'lock-closed' : 'lock-closed-outline';
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
          headerRight: () => <HeaderLanguageSwitcher />,
        })}
      >
        <Tab.Screen name="Number" component={NumberScreen} />
        <Tab.Screen name="Names" component={NamesScreen}  />
        <Tab.Screen name="Coin" component={CoinScreen}  />
        <Tab.Screen name="TruthDare" component={TruthDareScreen}  />
        <Tab.Screen name="Mastermind" component={MastermindScreen} />
        <Tab.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
      </Tab.Navigator>
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
        <NavigationContainer>
          <StatusBar style="light" />
          <TabNavigatorWithLanguage />
        </NavigationContainer>
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

// Header styles for language switcher
const headerStyles = StyleSheet.create({
  languageContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 4,
    marginRight: 16,
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
});

