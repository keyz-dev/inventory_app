import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function StockScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Stock</ThemedText>
      <ThemedText>Receive or adjust stock with reasons.</ThemedText>
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


