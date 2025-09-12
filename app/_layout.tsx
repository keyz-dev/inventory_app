import { runMigrations } from '@/lib/db';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { SplashScreen } from '@/components/ui/SplashScreen';
import { SettingsProvider } from '@/contexts/SettingsContext';

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [databaseReady, setDatabaseReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Ensure hooks order is stable across renders
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await runMigrations();
        setDatabaseReady(true);
        
        // Hide splash screen after a minimum delay for better UX
        setTimeout(() => {
          setShowSplash(false);
        }, 2000);
      } catch (error) {
        console.error('Database migration failed:', error);
        // In production, surface a non-blocking toast
        setDatabaseReady(true); // Still allow app to continue
        
        // Hide splash screen even on error
        setTimeout(() => {
          setShowSplash(false);
        }, 2000);
      }
    };
    
    initializeDatabase();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  // Show splash screen during initialization
  if (showSplash) {
    return <SplashScreen visible={true} />;
  }

  // Show loading screen while database is initializing (fallback)
  if (!databaseReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#fff' 
      }}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ 
          marginTop: 16, 
          fontSize: 16, 
          color: '#000',
          fontFamily: 'Poppins_400Regular'
        }}>
          Setting up your inventory...
        </Text>
        <Text style={{ 
          marginTop: 8, 
          fontSize: 14, 
          color: '#666',
          fontFamily: 'Poppins_400Regular',
          textAlign: 'center',
          paddingHorizontal: 40
        }}>
          Loading products and categories
        </Text>
      </View>
    );
  }

  return (
    <SettingsProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack initialRouteName="pin">
          <Stack.Screen name="pin" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SettingsProvider>
  );
}
