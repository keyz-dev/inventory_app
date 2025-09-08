import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function ProductsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Products</ThemedText>
      <ThemedText>Add and manage products and sizes.</ThemedText>
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


