import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function SellScreen() {
  return (
    <Screen title="Sell">
      <ThemedText className="text-base text-gray-600 dark:text-gray-300">Search categories and add items to cart.</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
});


