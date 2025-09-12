import { getSupabaseSyncConfig } from '@/config/supabase';
import { getSyncConfig } from '@/config/sync';
import SupabaseSyncService from '@/services/supabaseSyncService';
import SyncService from '@/services/syncService';
import { SyncConfig, SyncResult, SyncState } from '@/types/sync';
import { useCallback, useEffect, useState } from 'react';

let syncServiceInstance: SyncService | SupabaseSyncService | null = null;

export function useSync(config?: Partial<SyncConfig>) {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'idle',
    pendingOperations: 0,
    isOnline: true
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize sync service
  useEffect(() => {
    const initializeSync = async () => {
      try {
        // Try to use Supabase first, fallback to custom sync service
        try {
          const supabaseConfig = { ...getSupabaseSyncConfig(), ...config };
          syncServiceInstance = new SupabaseSyncService(supabaseConfig);
          console.log('✅ Using Supabase sync service');
        } catch (supabaseError) {
          console.warn('⚠️ Supabase not configured, falling back to custom sync service');
          const syncConfig = { ...getSyncConfig(), ...config };
          syncServiceInstance = new SyncService(syncConfig);
        }
        
        // Subscribe to state changes
        const unsubscribe = syncServiceInstance.subscribe(setSyncState);
        
        // Initialize the service
        await syncServiceInstance.initialize();
        setIsInitialized(true);

        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize sync service:', error);
        setSyncState(prev => ({
          ...prev,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Initialization failed'
        }));
      }
    };

    const cleanup = initializeSync();
    
    return () => {
      cleanup.then(unsubscribe => unsubscribe?.());
    };
  }, []);

  // Manual sync function
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!syncServiceInstance) {
      throw new Error('Sync service not initialized');
    }
    return syncServiceInstance.syncNow();
  }, []);

  // Queue operation function
  const queueOperation = useCallback(async (
    entity: 'product' | 'category' | 'sale' | 'stock_adjustment',
    operation: 'create' | 'update' | 'delete',
    data: any
  ) => {
    if (!syncServiceInstance) {
      throw new Error('Sync service not initialized');
    }
    return syncServiceInstance.queueOperation(entity, operation, data);
  }, []);

  // Get current state
  const getState = useCallback((): SyncState => {
    if (!syncServiceInstance) {
      return syncState;
    }
    return syncServiceInstance.getState();
  }, [syncState]);

  // Update sync configuration
  const updateConfig = useCallback((newConfig: Partial<SyncConfig>) => {
    if (!syncServiceInstance) {
      throw new Error('Sync service not initialized');
    }
    syncServiceInstance.updateConfig(newConfig);
  }, []);

  // Get current configuration
  const getConfig = useCallback((): SyncConfig | null => {
    if (!syncServiceInstance) {
      return null;
    }
    return syncServiceInstance.getConfig();
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback(async (conflictId: string, resolution: 'local' | 'remote' | 'merge') => {
    if (!syncServiceInstance) {
      throw new Error('Sync service not initialized');
    }
    return syncServiceInstance.resolveConflict(conflictId, resolution);
  }, []);

  // Get pending conflicts
  const getPendingConflicts = useCallback(() => {
    if (!syncServiceInstance) {
      return [];
    }
    return syncServiceInstance.getPendingConflicts();
  }, []);

  return {
    syncState,
    isInitialized,
    syncNow,
    queueOperation,
    getState,
    updateConfig,
    getConfig,
    resolveConflict,
    getPendingConflicts
  };
}
