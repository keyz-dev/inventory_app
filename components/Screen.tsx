import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

type ScreenProps = {
  title?: string;
  children: ReactNode;
};

export function Screen({ title, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}> 
      <ThemedView style={styles.container}>
        {title ? (
          <View style={styles.header}> 
            <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
          </View>
        ) : null}
        <View style={styles.content}>{children}</View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});


