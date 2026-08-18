import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import CoinsScreen from './screens/CoinsScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import ProfileScreen from './screens/ProfileScreen';

import { LanguageProvider } from './contexts/LanguageContext';
import { GameStatsProvider } from './contexts/GameStatsContext';
import { RootTabParamList } from './types';
import { COLORS } from './constants/theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let icon: keyof typeof Ionicons.glyphMap = 'help-circle-outline';
        if (route.name === 'Home') icon = focused ? 'home' : 'home-outline';
        else if (route.name === 'Coins') icon = focused ? 'wallet' : 'wallet-outline';
        else if (route.name === 'Leaderboard') icon = focused ? 'trophy' : 'trophy-outline';
        else if (route.name === 'Profile') icon = focused ? 'person' : 'person-outline';
        return <Ionicons name={icon} size={size} color={color} />;
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: '#999',
      tabBarStyle: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Coins" component={CoinsScreen} />
    <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const loaderRotation = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(loaderOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      ]).start();
      Animated.loop(
        Animated.timing(loaderRotation, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    }, 600);

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(loaderOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setIsLoading(false));
    }, 3000);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }], marginBottom: 40 }}>
          <Image source={require('./assets/tagdafun-main-logo.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={{ opacity: textOpacity, transform: [{ scale: textScale }], alignItems: 'center', marginBottom: 60 }}>
          <Text style={styles.splashTitle}>TAGDA FUN</Text>
          <Text style={styles.splashTagline}>Play. Earn. Win!</Text>
        </Animated.View>
        <Animated.View style={{ opacity: loaderOpacity, alignItems: 'center' }}>
          <Animated.View style={[styles.loader, {
            transform: [{ rotate: loaderRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }]
          }]} />
          <Text style={styles.loadingText}>Loading...</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <GameStatsProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <MainTabs />
          </NavigationContainer>
        </GameStatsProvider>
      </SafeAreaProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  logo: { width: 120, height: 120 },
  splashTitle: { fontSize: 34, fontWeight: 'bold', color: 'white', letterSpacing: 3, marginBottom: 8 },
  splashTagline: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  loader: { width: 40, height: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: 20, marginBottom: 16 },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
});
