import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { SyncStatus } from '@/components/sync/SyncStatus';
import { useSettings } from '@/contexts/SettingsContext';
import { useSync } from '@/hooks/useSync';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

export default function SyncScreen() {
  const { syncState, isInitialized, syncNow } = useSync();
  const { showSettings } = useSettings();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleSyncPress = async () => {
    if (isManualSyncing) return;
    
    setIsManualSyncing(true);
    try {
      const result = await syncNow();
      
      Alert.alert(
        'Sync Complete',
        `Synced ${result.syncedRecords} records. ${result.conflicts.length} conflicts found.`,
        [{ text: 'OK' }]
      );
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
});