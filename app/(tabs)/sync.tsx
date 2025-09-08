import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function SyncScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Sync</ThemedText>
      <ThemedText>Status and manual sync controls.</ThemedText>
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


