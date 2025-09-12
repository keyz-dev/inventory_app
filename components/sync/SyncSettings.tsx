import { ThemedText } from '@/components/ThemedText';
import { useSync } from '@/hooks/useSync';
import backupService from '@/services/backupService';
import { SyncConflict } from '@/types/sync';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { ConflictResolutionModal } from './ConflictResolutionModal';

interface SyncSettingsProps {
  visible: boolean;
  onClose: () => void;
  syncState: any;
  onSyncNow: () => void;
}

export function SyncSettings({ visible, onClose, syncState, onSyncNow }: SyncSettingsProps) {
  const [autoSync, setAutoSync] = useState(true);
  const [syncOnWiFi, setSyncOnWiFi] = useState(false); // Default to mobile data
  const [syncInterval, setSyncInterval] = useState(15); // minutes
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingConflicts, setPendingConflicts] = useState<SyncConflict[]>([]);
  const { updateConfig, getConfig, resolveConflict, getPendingConflicts } = useSync();

  // Load current sync configuration
  useEffect(() => {
    const config = getConfig();
    if (config) {
      setSyncInterval(config.syncInterval);
      setAutoSync(config.syncInterval > 0);
      setSyncOnWiFi(config.syncOnWiFiOnly);
    }
  }, [getConfig]);

  // Update sync configuration when settings change
  const handleSyncIntervalChange = (newInterval: number) => {
    setSyncInterval(newInterval);
    updateConfig({ 
      syncInterval: newInterval,
      // Disable auto-sync if interval is 0
      ...(newInterval === 0 && { syncInterval: 0 })
    });
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSync(enabled);
    updateConfig({ 
      syncInterval: enabled ? syncInterval : 0 
    });
  };

  const handleWiFiOnlyToggle = (enabled: boolean) => {
    setSyncOnWiFi(enabled);
    updateConfig({ 
      syncOnWiFiOnly: enabled 
    });
  };

  // Check for pending conflicts
  useEffect(() => {
    const conflicts = getPendingConflicts();
    setPendingConflicts(conflicts);
    if (conflicts.length > 0) {
      setShowConflictModal(true);
    }
  }, [getPendingConflicts, syncState]);

  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    try {
      await resolveConflict(conflictId, resolution);
      // Refresh conflicts list
      setPendingConflicts(getPendingConflicts());
    } catch (error) {
      Alert.alert('Resolution Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleCloseConflictModal = () => {
    setShowConflictModal(false);
  };

  const handleBackupNow = async () => {
    if (isBackingUp) return;

    const localCounts = backupService.getLocalDataCounts();
    
    if (localCounts.products === 0 && localCounts.categories === 0) {
      Alert.alert('No Data', 'No local data found to backup.');
      return;
    }

    Alert.alert(
      'Backup Data',
      `This will create a backup of your local data to the cloud.\n\nData to backup:\n• ${localCounts.categories} categories\n• ${localCounts.products} products\n• ${localCounts.sales} sales\n• ${localCounts.stockAdjustments} stock adjustments`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup Now',
          onPress: async () => {
            setIsBackingUp(true);
            try {
              const result = await backupService.createBackup();
              
              if (result.success) {
                const message = `Backup completed successfully!\n\nBacked up:\n• ${result.backedUp.categories} categories\n• ${result.backedUp.products} products\n• ${result.backedUp.sales} sales\n• ${result.backedUp.stockAdjustments} stock adjustments`;
                Alert.alert('Backup Success', message);
              } else {
                const errorMessage = result.errors.length > 0 
                  ? result.errors.join('\n') 
                  : 'Backup failed for unknown reasons';
                Alert.alert('Backup Failed', errorMessage);
              }
            } catch (error) {
              Alert.alert('Backup Error', error instanceof Error ? error.message : 'Unknown error occurred');
            } finally {
              setIsBackingUp(false);
            }
          }
        }
      ]
    );
  };

  const handleRestoreData = async () => {
    if (isRestoring) return;

    const localCounts = backupService.getLocalDataCounts();
    const hasLocalData = localCounts.products > 0 || localCounts.categories > 0 || localCounts.sales > 0;

    Alert.alert(
      'Restore Data',
      hasLocalData 
        ? 'This will download all data from the cloud and REPLACE your local data. This action cannot be undone.\n\nAre you sure you want to continue?'
        : 'This will download all data from the cloud to your local device. Use this if you\'re setting up the app on a new device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: hasLocalData ? 'destructive' : 'default',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const result = await backupService.restoreData();
              
              if (result.success) {
                const message = `Restore completed successfully!\n\nRestored:\n• ${result.restored.categories} categories\n• ${result.restored.products} products\n• ${result.restored.sales} sales\n• ${result.restored.stockAdjustments} stock adjustments`;
                Alert.alert('Restore Success', message);
              } else {
                const errorMessage = result.errors.length > 0 
                  ? result.errors.join('\n') 
                  : 'Restore failed for unknown reasons';
                Alert.alert('Restore Failed', errorMessage);
              }
            } catch (error) {
              Alert.alert('Restore Error', error instanceof Error ? error.message : 'Unknown error occurred');
            } finally {
              setIsRestoring(false);
            }
          }
        }
      ]
    );
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>Sync Settings</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={24} color="#3b82f6" />
              <ThemedText style={styles.quickActionsTitle}>Quick Actions</ThemedText>
            </View>
            <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton} onPress={onSyncNow}>
              <Ionicons name="refresh" size={24} color="#3b82f6" />
              <ThemedText style={styles.quickActionText}>Sync Now</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickActionButton, isBackingUp && styles.disabledButton]} 
              onPress={handleBackupNow}
              disabled={isBackingUp}
            >
              <Ionicons name="cloud-upload" size={24} color={isBackingUp ? "#9ca3af" : "#10b981"} />
              <ThemedText style={[styles.quickActionText, isBackingUp && styles.disabledText]}>
                {isBackingUp ? 'Backing Up...' : 'Backup'}
              </ThemedText>
            </TouchableOpacity>
            </View>
          </View>

          {/* Sync Status */}
          <View style={styles.statusSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pulse" size={24} color="#3b82f6" />
              <ThemedText style={styles.statusTitle}>Sync Status</ThemedText>
            </View>
            
            <View style={styles.statusCard}>
              <View style={styles.statusItem}>
                <View style={[styles.statusIndicator, { backgroundColor: syncState.isOnline ? '#10b981' : '#ef4444' }]} />
                <ThemedText style={styles.statusText}>
                  {syncState.isOnline ? 'Connected' : 'Offline'}
                </ThemedText>
              </View>
              
              <View style={styles.statusItem}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <ThemedText style={styles.statusText}>
                  {syncState.lastSyncAt ? 'Last sync: ' + new Date(syncState.lastSyncAt).toLocaleDateString() : 'Never synced'}
                </ThemedText>
              </View>
              
              {syncState.pendingOperations > 0 && (
                <View style={styles.statusItem}>
                  <Ionicons name="hourglass-outline" size={16} color="#f59e0b" />
                  <ThemedText style={styles.statusText}>
                    {syncState.pendingOperations} pending operations
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Settings */}
          <View style={styles.settingsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={24} color="#3b82f6" />
              <ThemedText style={styles.settingsTitle}>Settings</ThemedText>
            </View>
            
            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>Auto Sync</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Automatically sync changes when online
                </ThemedText>
              </View>
              <Switch
                value={autoSync}
                onValueChange={setAutoSync}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={autoSync ? '#ffffff' : '#f3f4f6'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingLabel}>WiFi Only</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  Only sync when connected to WiFi (default: uses mobile data)
                </ThemedText>
              </View>
              <Switch
                value={syncOnWiFi}
                onValueChange={handleWiFiOnlyToggle}
                trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
                thumbColor={syncOnWiFi ? '#ffffff' : '#f3f4f6'}
              />
            </View>
          </View>

          {/* Data Management */}
          <View style={styles.dataSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="server" size={24} color="#3b82f6" />
              <ThemedText style={styles.dataTitle}>Data Management</ThemedText>
            </View>
            
            <TouchableOpacity 
              style={[styles.dataButton, isRestoring && styles.disabledButton]} 
              onPress={handleRestoreData}
              disabled={isRestoring}
            >
              <Ionicons 
                name={isRestoring ? "hourglass" : "cloud-download"} 
                size={20} 
                color={isRestoring ? "#9CA3AF" : "#3b82f6"} 
              />
              <View style={styles.dataButtonContent}>
                <ThemedText style={[styles.dataButtonLabel, isRestoring && styles.disabledText]}>
                  {isRestoring ? 'Restoring...' : 'Restore from Cloud'}
                </ThemedText>
                <ThemedText style={[styles.dataButtonDescription, isRestoring && styles.disabledText]}>
                  {isRestoring ? 'Downloading data from cloud' : 'Download all data from the cloud'}
                </ThemedText>
              </View>
              <Ionicons 
                name={isRestoring ? "hourglass" : "chevron-forward"} 
                size={16} 
                color={isRestoring ? "#9CA3AF" : "#9ca3af"} 
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>

    <ConflictResolutionModal
      visible={showConflictModal}
      conflicts={pendingConflicts}
      onResolve={handleResolveConflict}
      onClose={handleCloseConflictModal}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopWidth: 3,
    borderTopColor: '#3b82f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40, // Extra padding at bottom for better scrolling
    flexGrow: 1,
  },
  // Header styles
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1e293b',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  // Quick Actions
  quickActionsSection: {
    marginBottom: 32,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1e293b',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
  },
  // Status Section
  statusSection: {
    marginBottom: 32,
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: 16,
    fontFamily: 'Poppins_500Medium',
    color: '#374151',
  },
  // Settings Section
  settingsSection: {
    marginBottom: 32,
  },
  settingsTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  settingContent: {
    flex: 1,
    marginRight: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
    marginBottom: 6,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  // Data Section
  dataSection: {
    marginBottom: 32,
  },
  dataTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  dataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dataButtonContent: {
    flex: 1,
    marginLeft: 16,
  },
  dataButtonLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1e293b',
    marginBottom: 6,
  },
  dataButtonDescription: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'Poppins_400Regular',
    lineHeight: 20,
  },
  // Disabled states
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#9ca3af',
  },
});
