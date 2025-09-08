import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function SyncScreen() {
  return (
    <Screen title="Sync">
      <ThemedText>Status and manual sync controls.</ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});


