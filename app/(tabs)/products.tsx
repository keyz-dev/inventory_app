import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function ProductsScreen() {
  return (
    <Screen title="Products">
      <ThemedText>Add and manage products and sizes.</ThemedText>
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


