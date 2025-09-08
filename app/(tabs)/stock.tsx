import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function StockScreen() {
  return (
    <Screen title="Stock">
      <ThemedText>Receive or adjust stock with reasons.</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});


