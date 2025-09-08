import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function SellScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText className="text-3xl font-extrabold">Sell</ThemedText>
      <ThemedText className="text-base text-gray-600 dark:text-gray-300">Search categories and add items to cart.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
});


