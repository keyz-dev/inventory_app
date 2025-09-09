import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

type ScreenProps = {
  title?: string;
  children: ReactNode;
};

export function Screen({ title, children }: ScreenProps) {
  return (
    <LinearGradient
      colors={['#f8fafc', '#e2e8f0']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}> 
        <ThemedView style={styles.container}>
          {title ? (
            <View style={styles.header}> 
              <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
              <View style={styles.headerLine} />
            </View>
          ) : null}
          <View style={styles.content}>{children}</View>
        </ThemedView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerLine: {
    width: 60,
    height: 3,
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
});


