import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SyncConflict } from '@/types/sync';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ConflictResolutionModalProps {
  visible: boolean;
  conflicts: SyncConflict[];
  onResolve: (conflictId: string, resolution: 'local' | 'remote' | 'merge') => void;
  onClose: () => void;
}

export function ConflictResolutionModal({ 
  visible, 
  conflicts, 
  onResolve, 
  onClose 
}: ConflictResolutionModalProps) {
  
  const handleResolve = (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    onResolve(conflictId, resolution);
  };

  const getConflictTypeText = (type: string) => {
    switch (type) {
      case 'concurrent_edit':
        return 'Both versions were edited';
      case 'data_mismatch':
        return 'Data mismatch detected';
      case 'deleted_modified':
        return 'Item was deleted and modified';
      default:
        return 'Unknown conflict';
    }
  };

  const getEntityDisplayName = (entity: string) => {
    switch (entity) {
      case 'product':
        return 'Product';
      case 'category':
        return 'Category';
      case 'sale':
        return 'Sale';
      case 'stock_adjustment':
        return 'Stock Adjustment';
      default:
        return entity;
    }
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Resolve Conflicts</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.subtitle}>
          {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} found. Choose how to resolve each one:
        </ThemedText>

        <ScrollView style={styles.conflictsList}>
          {conflicts.map((conflict) => (
            <View key={conflict.id} style={styles.conflictItem}>
              <View style={styles.conflictHeader}>
                <ThemedText style={styles.conflictTitle}>
                  {getEntityDisplayName(conflict.entity)}: {conflict.localData.name || conflict.id}
                </ThemedText>
                <ThemedText style={styles.conflictType}>
                  {getConflictTypeText(conflict.conflictType)}
                </ThemedText>
              </View>

              <View style={styles.conflictDetails}>
                <View style={styles.versionContainer}>
                  <ThemedText style={styles.versionTitle}>Local Version</ThemedText>
                  <ThemedText style={styles.versionData}>
                    {JSON.stringify(conflict.localData, null, 2)}
                  </ThemedText>
                </View>

                <View style={styles.versionContainer}>
                  <ThemedText style={styles.versionTitle}>Remote Version</ThemedText>
                  <ThemedText style={styles.versionData}>
                    {JSON.stringify(conflict.remoteData, null, 2)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.resolutionButtons}>
                <TouchableOpacity
                  style={[styles.resolutionButton, styles.localButton]}
                  onPress={() => handleResolve(conflict.id, 'local')}
                >
                  <Ionicons name="phone-portrait" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.buttonText}>Keep Local</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resolutionButton, styles.remoteButton]}
                  onPress={() => handleResolve(conflict.id, 'remote')}
                >
                  <Ionicons name="cloud" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.buttonText}>Use Remote</ThemedText>
                </TouchableOpacity>

                {conflict.conflictType === 'concurrent_edit' && (
                  <TouchableOpacity
                    style={[styles.resolutionButton, styles.mergeButton]}
                    onPress={() => handleResolve(conflict.id, 'merge')}
                  >
                    <Ionicons name="git-merge" size={16} color="#FFFFFF" />
                    <ThemedText style={styles.buttonText}>Merge</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.resolveAllButton} onPress={onClose}>
            <ThemedText style={styles.resolveAllText}>
              Resolve All Later
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  closeButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: 'Poppins_400Regular',
  },
  conflictsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  conflictItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  conflictHeader: {
    marginBottom: 12,
  },
  conflictTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  conflictType: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Poppins_400Regular',
  },
  conflictDetails: {
    marginBottom: 16,
  },
  versionContainer: {
    marginBottom: 12,
  },
  versionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  versionData: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontFamily: 'Poppins_400Regular',
  },
  resolutionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  resolutionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  localButton: {
    backgroundColor: '#3B82F6',
  },
  remoteButton: {
    backgroundColor: '#10B981',
  },
  mergeButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resolveAllButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resolveAllText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
});
