import { ThemedText } from '@/components/ThemedText';
import { SyncState } from '@/types/sync';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

interface Props {
  syncState: SyncState;
  onSyncPress: () => void;
  onSettingsPress?: () => void;
}

export function SyncStatus({ syncState, onSyncPress, onSettingsPress }: Props) {
  const getStatusIcon = () => {
    switch (syncState.status) {
      case 'syncing':
        return <ActivityIndicator size="small" color="#3b82f6" />;
      case 'success':
        return <Ionicons name="checkmark-circle" size={20} color="#10b981" />;
      case 'error':
        return <Ionicons name="alert-circle" size={20} color="#ef4444" />;
      case 'offline':
        return <Ionicons name="cloud-offline" size={20} color="#f59e0b" />;
      default:
        return <Ionicons name="cloud" size={20} color="#6b7280" />;
    }
  };

  const getStatusText = () => {
    switch (syncState.status) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync Error';
      case 'offline':
        return 'Offline';
      default:
        return 'Ready';
    }
  };

  const getStatusColor = () => {
    switch (syncState.status) {
      case 'syncing':
        return '#3b82f6';
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'offline':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const isSyncDisabled = syncState.status === 'syncing' || !syncState.isOnline;

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={styles.statusInfo}>
          {getStatusIcon()}
          <View style={styles.statusText}>
            <ThemedText style={[styles.statusLabel, { color: getStatusColor() }]}>
              {getStatusText()}
            </ThemedText>
            <ThemedText style={styles.lastSyncText}>
              Last sync: {formatLastSync(syncState.lastSyncAt)}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.actions}>
          {syncState.pendingOperations > 0 && (
            <View style={styles.pendingBadge}>
              <ThemedText style={styles.pendingText}>
                {syncState.pendingOperations}
              </ThemedText>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.syncButton, isSyncDisabled && styles.syncButtonDisabled]}
            onPress={onSyncPress}
            disabled={isSyncDisabled}
          >
            <Ionicons 
              name="refresh" 
              size={16} 
              color={isSyncDisabled ? '#9ca3af' : '#3b82f6'} 
            />
          </TouchableOpacity>
          
          {onSettingsPress && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onSettingsPress}
            >
              <Ionicons name="settings" size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {syncState.errorMessage && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            {syncState.errorMessage}
          </ThemedText>
        </View>
      )}
      
      {syncState.nextSyncAt && (
        <ThemedText style={styles.nextSyncText}>
          Next sync: {formatLastSync(syncState.nextSyncAt)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  lastSyncText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Poppins_400Regular',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pendingText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  syncButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  settingsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  nextSyncText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Poppins_400Regular',
  },
});
