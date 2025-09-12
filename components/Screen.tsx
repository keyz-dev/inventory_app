import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HeaderLogo } from '@/components/ui/HeaderLogo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode } from 'react';
import { SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

type ScreenProps = {
  title?: string;
  children: ReactNode;
  rightHeaderAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
};

export function Screen({ title, children, rightHeaderAction }: ScreenProps) {
  return (
    <LinearGradient
      colors={['#ffffff', '#f8fafc']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}> 
        <ThemedView style={styles.container}>
          {title ? (
            <View style={styles.header}> 
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <HeaderLogo size="small" />
                </View>
                <View style={styles.headerCenter}>
                  <ThemedText type="title" style={styles.headerTitle}>{title}</ThemedText>
                  <View style={styles.headerLine} />
                </View>
                <View style={styles.headerRight}>
                  {rightHeaderAction ? (
                    <TouchableOpacity 
                      style={styles.headerActionButton} 
                      onPress={rightHeaderAction.onPress}
                    >
                      <Ionicons name={rightHeaderAction.icon} size={24} color="#6b7280" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
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
    backgroundColor: 'white',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
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
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
});


