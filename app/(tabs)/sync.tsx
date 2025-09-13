import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { SyncStatus } from '@/components/sync/SyncStatus';
import { useSettings } from '@/contexts/SettingsContext';
import { useCanManageSettings, useUser } from '@/contexts/UserContext';
import { useSync } from '@/hooks/useSync';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

export default function SyncScreen() {
  const { syncState, isInitialized, syncNow } = useSync();
  const { showSettings } = useSettings();
  const { currentUser } = useUser();
  const canManageSettings = useCanManageSettings();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const router = useRouter();

  // Redirect if user doesn't have permission
  useFocusEffect(
    useCallback(() => {
      if (!canManageSettings) {
        router.replace('/(tabs)/products');
      }
    }, [canManageSettings, router])
  );

  const handleSyncPress = async () => {
    if (isManualSyncing) return;
    
    setIsManualSyncing(true);
    try {
      const result = await syncNow();
      
      // Create detailed sync report
      let message = `Sync completed successfully!\n\n`;
      message += `📤 Uploaded: ${result.syncedRecords} records\n`;
      message += `⚠️ Conflicts: ${result.conflicts.length}\n`;
      message += `❌ Errors: ${result.errors.length}\n`;
      
      if (result.errors.length > 0) {
        message += `\nErrors:\n`;
        result.errors.slice(0, 3).forEach(error => {
          message += `• ${error.entity}: ${error.error}\n`;
        });
        if (result.errors.length > 3) {
          message += `• ... and ${result.errors.length - 3} more\n`;
        }
      }
      
      Alert.alert('Sync Complete', message, [{ text: 'OK' }]);
    } catch (error) {
      Alert.alert(
        'Sync Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
        [{ text: 'OK' }]
      );
    } finally {
      setIsManualSyncing(false);
    }
  };



  if (!isInitialized) {
    return (
      <Screen title="Sync">
        <View style={styles.loadingContainer}>
          <ThemedText>Initializing sync service...</ThemedText>
        </View>
      </Screen>
    );
  }

  // Redirect if user doesn't have permission to manage settings
  if (!canManageSettings) {
    return (
      <Screen title="Sync" rightHeaderAction={{ icon: 'settings', onPress: showSettings }}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="cloudy-outline" size={64} color="#ef4444" />
          <ThemedText type="title" style={styles.noAccessTitle}>
            Access Denied
          </ThemedText>
          <ThemedText style={styles.noAccessText}>
            You don't have permission to access sync settings.
          </ThemedText>
          <ThemedText style={styles.noAccessSubtext}>
            Contact your manager for access.
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen 
      title="Sync"
      rightHeaderAction={{
        icon: 'settings',
        onPress: showSettings
      }}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <SyncStatus
          syncState={syncState}
          onSyncPress={handleSyncPress}
        />

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Sync Information
          </ThemedText>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Status:</ThemedText>
              <ThemedText style={styles.infoValue}>{syncState.status}</ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Online:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {syncState.isOnline ? 'Yes' : 'No'}
              </ThemedText>
            </View>
            
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Pending Operations:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {syncState.pendingOperations}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Sync Queue Details */}
        {syncState.pendingOperations > 0 && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Pending Operations Queue
            </ThemedText>
            <View style={styles.queueCard}>
              <ThemedText style={styles.queueText}>
                {syncState.pendingOperations} operations waiting to sync
              </ThemedText>
              <ThemedText style={styles.queueSubtext}>
                Operations will be processed automatically or when you tap sync
              </ThemedText>
            </View>
          </View>
        )}


        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Sync Features
          </ThemedText>
          
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <ThemedText style={styles.featureText}>
                Automatic background sync
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <ThemedText style={styles.featureText}>
                Offline operation queue
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <ThemedText style={styles.featureText}>
                Conflict resolution
              </ThemedText>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <ThemedText style={styles.featureText}>
                Incremental sync
              </ThemedText>
            </View>
          </View>
          </View>
        </ScrollView>
      </Screen>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins_400Regular',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'Poppins_500Medium',
  },
  featureList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'Poppins_400Regular',
  },
  queueCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  queueText: {
    fontSize: 14,
    color: '#92400e',
    fontFamily: 'Poppins_500Medium',
    marginBottom: 4,
  },
  queueSubtext: {
    fontSize: 12,
    color: '#a16207',
    fontFamily: 'Poppins_400Regular',
  },
  noAccessContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  noAccessTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: '#ef4444',
  },
  noAccessText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  noAccessSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});