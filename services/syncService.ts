import { execute, query } from '@/lib/db';
import {
    ApiResponse,
    RemoteEntity,
    SyncConfig,
    SyncConflict,
    SyncEntity,
    SyncError,
    SyncOperation,
    SyncPayload,
    SyncRecord,
    SyncResult,
    SyncState
} from '@/types/sync';

class SyncService {
  private config: SyncConfig;
  private syncState: SyncState;
  private deviceId: string;
  private syncListeners: ((state: SyncState) => void)[] = [];

  constructor(config: SyncConfig) {
    this.config = config;
    this.deviceId = this.generateDeviceId();
    this.syncState = {
      status: 'idle',
      pendingOperations: 0,
      isOnline: true
    };
  }

  // Initialize the sync service
  async initialize(): Promise<void> {
    await this.loadSyncState();
    await this.setupNetworkListener();
    await this.startAutoSync();
  }

  // Get current sync state
  getState(): SyncState {
    return { ...this.syncState };
  }

  // Subscribe to sync state changes
  subscribe(listener: (state: SyncState) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  // Manual sync trigger
  async syncNow(): Promise<SyncResult> {
    if (this.syncState.status === 'syncing') {
      throw new Error('Sync already in progress');
    }

    this.updateState({ status: 'syncing' });

    try {
      const result = await this.performSync();
      this.updateState({ 
        status: 'success', 
        lastSyncAt: result.timestamp,
        pendingOperations: 0,
        errorMessage: undefined
      });
      return result;
    } catch (error) {
      this.updateState({ 
        status: 'error', 
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Queue an operation for sync
  async queueOperation(
    entity: SyncEntity, 
    operation: SyncOperation, 
    data: any
  ): Promise<void> {
    const record: SyncRecord = {
      id: `${entity}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entity,
      operation,
      data,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0
    };

    await this.saveSyncRecord(record);
    this.updateState({ 
      pendingOperations: this.syncState.pendingOperations + 1 
    });

    // Try to sync immediately if online
    if (this.syncState.isOnline && this.syncState.status === 'idle') {
      this.syncNow().catch(() => {
        // Ignore errors for background sync attempts
      });
    }
  }

  // Perform the actual sync
  private async performSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedRecords: 0,
      conflicts: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    // Get pending operations
    const pendingOps = await this.getPendingOperations();
    
    if (pendingOps.length === 0) {
      return result;
    }

    // Upload local changes
    const uploadResult = await this.uploadChanges(pendingOps);
    result.syncedRecords += uploadResult.synced;
    result.errors.push(...uploadResult.errors);

    // Download remote changes
    const downloadResult = await this.downloadChanges();
    result.syncedRecords += downloadResult.synced;
    result.conflicts.push(...downloadResult.conflicts);
    result.errors.push(...downloadResult.errors);

    // Update last sync time
    await this.updateLastSyncTime(result.timestamp);

    return result;
  }

  // Upload local changes to server
  private async uploadChanges(operations: SyncRecord[]): Promise<{
    synced: number;
    errors: SyncError[];
  }> {
    const errors: SyncError[] = [];
    let synced = 0;

    try {
      const payload: SyncPayload = {
        operations,
        lastSyncAt: this.syncState.lastSyncAt,
        deviceId: this.deviceId
      };

      const response = await this.apiRequest('/sync/upload', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.success) {
        // Mark operations as synced
        for (const op of operations) {
          await this.markOperationSynced(op.id);
          synced++;
        }
      } else {
        // Handle upload errors
        for (const op of operations) {
          errors.push({
            id: op.id,
            entity: op.entity,
            operation: op.operation,
            error: response.error || 'Upload failed',
            retryable: true
          });
        }
      }
    } catch (error) {
      // Network or other errors
      for (const op of operations) {
        errors.push({
          id: op.id,
          entity: op.entity,
          operation: op.operation,
          error: error instanceof Error ? error.message : 'Network error',
          retryable: true
        });
      }
    }

    return { synced, errors };
  }

  // Download remote changes from server
  private async downloadChanges(): Promise<{
    synced: number;
    conflicts: SyncConflict[];
    errors: SyncError[];
  }> {
    const conflicts: SyncConflict[] = [];
    const errors: SyncError[] = [];
    let synced = 0;

    try {
      const response = await this.apiRequest('/sync/download', {
        method: 'POST',
        body: JSON.stringify({
          lastSyncAt: this.syncState.lastSyncAt,
          deviceId: this.deviceId
        })
      });

      if (response.success && response.data) {
        const { entities } = response.data;
        
        for (const entity of entities) {
          try {
            const conflict = await this.applyRemoteEntity(entity);
            if (conflict) {
              conflicts.push(conflict);
            } else {
              synced++;
            }
          } catch (error) {
            errors.push({
              id: entity.id,
              entity: entity.entity,
              operation: 'update',
              error: error instanceof Error ? error.message : 'Apply failed',
              retryable: false
            });
          }
        }
      }
    } catch (error) {
      errors.push({
        id: 'download',
        entity: 'product',
        operation: 'update',
        error: error instanceof Error ? error.message : 'Download failed',
        retryable: true
      });
    }

    return { synced, conflicts, errors };
  }

  // Apply a remote entity to local database
  private async applyRemoteEntity(entity: RemoteEntity): Promise<SyncConflict | null> {
    const localData = await this.getLocalEntity(entity.entity, entity.id);
    
    // Check for conflicts
    if (localData && localData.updatedAt > entity.updatedAt) {
      return {
        id: entity.id,
        entity: entity.entity,
        localData,
        remoteData: entity.data,
        conflictType: 'concurrent_edit'
      };
    }

    // Apply the remote data
    await this.saveLocalEntity(entity.entity, entity.data, entity.updatedAt);
    return null;
  }

  // API request helper
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<ApiResponse> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Database operations
  private async saveSyncRecord(record: SyncRecord): Promise<void> {
    execute(
      `INSERT INTO sync_queue (id, entity, operation, data, timestamp, synced, retryCount) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.entity, record.operation, JSON.stringify(record.data), 
       record.timestamp, record.synced ? 1 : 0, record.retryCount]
    );
  }

  private async getPendingOperations(): Promise<SyncRecord[]> {
    const rows = query<any>(
      `SELECT * FROM sync_queue WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?`,
      [this.config.batchSize]
    );

    return rows.map(row => ({
      id: row.id,
      entity: row.entity,
      operation: row.operation,
      data: JSON.parse(row.data),
      timestamp: row.timestamp,
      synced: row.synced === 1,
      retryCount: row.retryCount,
      lastError: row.lastError
    }));
  }

  private async markOperationSynced(operationId: string): Promise<void> {
    execute(
      `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
      [operationId]
    );
  }

  private async getLocalEntity(entity: SyncEntity, id: string): Promise<any> {
    switch (entity) {
      case 'product':
        return query<any>(`SELECT * FROM products WHERE id = ?`, [id])[0];
      case 'category':
        return query<any>(`SELECT * FROM categories WHERE id = ?`, [id])[0];
      case 'sale':
        return query<any>(`SELECT * FROM sales WHERE id = ?`, [id])[0];
      case 'stock_adjustment':
        return query<any>(`SELECT * FROM stock_adjustments WHERE id = ?`, [id])[0];
      default:
        return null;
    }
  }

  private async saveLocalEntity(entity: SyncEntity, data: any, updatedAt: string): Promise<void> {
    switch (entity) {
      case 'product':
        execute(
          `INSERT OR REPLACE INTO products (id, name, priceXaf, quantity, sizeLabel, variantOfId, categoryId, updatedAt, deletedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.id, data.name, data.priceXaf, data.quantity, data.sizeLabel, 
           data.variantOfId, data.categoryId, updatedAt, data.deletedAt]
        );
        break;
      case 'category':
        execute(
          `INSERT OR REPLACE INTO categories (id, name, parentId) VALUES (?, ?, ?)`,
          [data.id, data.name, data.parentId]
        );
        break;
      // Add other entities as needed
    }
  }

  // Utility methods
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadSyncState(): Promise<void> {
    try {
      const lastSyncAt = query<any>(`SELECT value FROM meta WHERE key = 'lastSyncedAt'`)[0]?.value;
      const pendingCount = query<any>(`SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0`)[0]?.count || 0;
      
      this.syncState = {
        ...this.syncState,
        lastSyncAt,
        pendingOperations: pendingCount
      };
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  }

  private async updateLastSyncTime(timestamp: string): Promise<void> {
    execute(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('lastSyncedAt', ?)`,
      [timestamp]
    );
  }

  private async setupNetworkListener(): Promise<void> {
    // This would integrate with a network state library
    // For now, we'll assume online
    this.syncState.isOnline = true;
  }

  private async startAutoSync(): Promise<void> {
    if (this.config.syncInterval > 0) {
      setInterval(() => {
        if (this.syncState.isOnline && this.syncState.status === 'idle') {
          this.syncNow().catch(() => {
            // Ignore errors for background sync
          });
        }
      }, this.config.syncInterval * 60 * 1000);
    }
  }

  private updateState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates };
    this.syncListeners.forEach(listener => listener(this.syncState));
  }
}

export default SyncService;
