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
      colors={['#ffffff', '#f8fafc']}
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
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: 'white',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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


