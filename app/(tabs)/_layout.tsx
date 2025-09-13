import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useCanAdjustStock, useCanManageSettings, useCanSell, useCanViewAnalytics } from '@/contexts/UserContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const canSell = useCanSell();
  const canAdjustStock = useCanAdjustStock();
  const canViewAnalytics = useCanViewAnalytics();
  const canManageSettings = useCanManageSettings();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            paddingBottom: Math.max(8, insets.bottom),
            height: 56 + insets.bottom,
          },
          default: {
            height: 56 + insets.bottom,
            paddingBottom: Math.max(8, insets.bottom),
          },
        }),
      }}>
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Sell',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name="cart" 
              color={canSell ? color : '#d1d5db'} 
              size={size ?? 24} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ color, size }) => (
            <Ionicons 
              name="cube-outline" 
              color={canAdjustStock ? color : '#d1d5db'} 
              size={size ?? 24} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons 
              name="analytics" 
              color={canViewAnalytics ? color : '#d1d5db'} 
              size={size ?? 24} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: 'Sync',
          tabBarIcon: ({ color, size }) => (
            <Ionicons 
              name="sync" 
              color={canManageSettings ? color : '#d1d5db'} 
              size={size ?? 24} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
