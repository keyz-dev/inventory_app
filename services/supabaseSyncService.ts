import { getSupabaseSyncConfig, validateSupabaseConfig } from '@/config/supabase';
import { supabase } from '@/lib/supabase';
import {
    RemoteEntity,
    SyncConfig,
    SyncConflict,
    SyncEntity,
    SyncError,
    SyncOperation,
    SyncRecord,
    SyncResult,
    SyncState
} from '@/types/sync';

class SupabaseSyncService {
  private config: SyncConfig;
  private syncState: SyncState;
  private deviceId: string;
  private syncListeners: ((state: SyncState) => void)[] = [];

  constructor(config?: Partial<SyncConfig>) {
    // Validate Supabase configuration
    if (!validateSupabaseConfig()) {
      throw new Error('Invalid Supabase configuration');
    }

    this.config = { ...getSupabaseSyncConfig(), ...config };
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

  // Upload local changes to Supabase
  private async uploadChanges(operations: SyncRecord[]): Promise<{
    synced: number;
    errors: SyncError[];
  }> {
    const errors: SyncError[] = [];
    let synced = 0;

    for (const operation of operations) {
      try {
        await this.processOperation(operation);
        await this.markOperationSynced(operation.id);
        synced++;
      } catch (error) {
        errors.push({
          id: operation.id,
          entity: operation.entity,
          operation: operation.operation,
          error: error instanceof Error ? error.message : 'Upload failed',
          retryable: true
        });
      }
    }

    return { synced, errors };
  }

  // Process a single operation
  private async processOperation(operation: SyncRecord): Promise<void> {
    const { entity, operation: op, data } = operation;

    switch (entity) {
      case 'product':
        await this.processProductOperation(op, data);
        break;
      case 'category':
        await this.processCategoryOperation(op, data);
        break;
      case 'sale':
        await this.processSaleOperation(op, data);
        break;
      case 'stock_adjustment':
        await this.processStockAdjustmentOperation(op, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  // Process product operations
  private async processProductOperation(operation: SyncOperation, data: any): Promise<void> {
    const productData = {
      id: data.id,
      name: data.name,
      price_xaf: data.priceXaf,
      quantity: data.quantity,
      size_label: data.sizeLabel,
      variant_of_id: data.variantOfId,
      category_id: data.categoryId,
      updated_at: new Date().toISOString(),
      deleted_at: data.deletedAt || null,
      version: data.version || 1
    };

    switch (operation) {
      case 'create':
      case 'update':
        const { error } = await supabase
          .from('products')
          .upsert(productData);
        if (error) throw error;
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('products')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Process category operations
  private async processCategoryOperation(operation: SyncOperation, data: any): Promise<void> {
    const categoryData = {
      id: data.id,
      name: data.name,
      parent_id: data.parentId,
      updated_at: new Date().toISOString(),
      deleted_at: data.deletedAt || null,
      version: data.version || 1
    };

    switch (operation) {
      case 'create':
      case 'update':
        const { error } = await supabase
          .from('categories')
          .upsert(categoryData);
        if (error) throw error;
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('categories')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Process sale operations
  private async processSaleOperation(operation: SyncOperation, data: any): Promise<void> {
    const saleData = {
      id: data.id,
      product_id: data.productId,
      quantity: data.quantity,
      price_xaf: data.priceXaf,
      total_xaf: data.totalXaf,
      updated_at: new Date().toISOString(),
      deleted_at: data.deletedAt || null,
      version: data.version || 1
    };

    switch (operation) {
      case 'create':
      case 'update':
        const { error } = await supabase
          .from('sales')
          .upsert(saleData);
        if (error) throw error;
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('sales')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Process stock adjustment operations
  private async processStockAdjustmentOperation(operation: SyncOperation, data: any): Promise<void> {
    const adjustmentData = {
      id: data.id,
      product_id: data.productId,
      quantity_change: data.quantityChange,
      reason: data.reason,
      updated_at: new Date().toISOString(),
      deleted_at: data.deletedAt || null,
      version: data.version || 1
    };

    switch (operation) {
      case 'create':
      case 'update':
        const { error } = await supabase
          .from('stock_adjustments')
          .upsert(adjustmentData);
        if (error) throw error;
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('stock_adjustments')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Download remote changes from Supabase
  private async downloadChanges(): Promise<{
    synced: number;
    conflicts: SyncConflict[];
    errors: SyncError[];
  }> {
    const conflicts: SyncConflict[] = [];
    const errors: SyncError[] = [];
    let synced = 0;

    try {
      const lastSyncAt = this.syncState.lastSyncAt;
      
      // Get modified products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .gt('updated_at', lastSyncAt || '1970-01-01T00:00:00Z')
        .is('deleted_at', null);

      if (productsError) throw productsError;

      // Get modified categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .gt('updated_at', lastSyncAt || '1970-01-01T00:00:00Z')
        .is('deleted_at', null);

      if (categoriesError) throw categoriesError;

      // Process products
      for (const product of products || []) {
        try {
          const conflict = await this.applyRemoteEntity({
            id: product.id,
            entity: 'product',
            data: {
              id: product.id,
              name: product.name,
              priceXaf: product.price_xaf,
              quantity: product.quantity,
              sizeLabel: product.size_label,
              variantOfId: product.variant_of_id,
              categoryId: product.category_id,
              version: product.version
            },
            updatedAt: product.updated_at,
            version: product.version
          });
          if (conflict) {
            conflicts.push(conflict);
          } else {
            synced++;
          }
        } catch (error) {
          errors.push({
            id: product.id,
            entity: 'product',
            operation: 'update',
            error: error instanceof Error ? error.message : 'Apply failed',
            retryable: false
          });
        }
      }

      // Process categories
      for (const category of categories || []) {
        try {
          const conflict = await this.applyRemoteEntity({
            id: category.id,
            entity: 'category',
            data: {
              id: category.id,
              name: category.name,
              parentId: category.parent_id,
              version: category.version
            },
            updatedAt: category.updated_at,
            version: category.version
          });
          if (conflict) {
            conflicts.push(conflict);
          } else {
            synced++;
          }
        } catch (error) {
          errors.push({
            id: category.id,
            entity: 'category',
            operation: 'update',
            error: error instanceof Error ? error.message : 'Apply failed',
            retryable: false
          });
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
    // For now, we'll just store the remote data
    // In a real implementation, you'd check for conflicts with local data
    // and apply the appropriate conflict resolution strategy
    
    // This is a simplified version - you might want to integrate with your existing
    // local database operations here
    
    return null; // No conflicts for now
  }

  // Database operations
  private async saveSyncRecord(record: SyncRecord): Promise<void> {
    const { error } = await supabase
      .from('sync_queue')
      .insert({
        id: record.id,
        entity: record.entity,
        operation: record.operation,
        data: record.data,
        timestamp: record.timestamp,
        synced: record.synced,
        retry_count: record.retryCount,
        last_error: record.lastError
      });

    if (error) throw error;
  }

  private async getPendingOperations(): Promise<SyncRecord[]> {
    const { data, error } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('synced', false)
      .order('timestamp', { ascending: true })
      .limit(this.config.batchSize);

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      entity: row.entity as SyncEntity,
      operation: row.operation as SyncOperation,
      data: row.data,
      timestamp: row.timestamp,
      synced: row.synced,
      retryCount: row.retry_count,
      lastError: row.last_error
    }));
  }

  private async markOperationSynced(operationId: string): Promise<void> {
    const { error } = await supabase
      .from('sync_queue')
      .update({ synced: true })
      .eq('id', operationId);

    if (error) throw error;
  }

  // Utility methods
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadSyncState(): Promise<void> {
    try {
      const { data: lastSyncData } = await supabase
        .from('meta')
        .select('value')
        .eq('key', 'lastSyncedAt')
        .single();

      const { data: pendingCountData } = await supabase
        .from('sync_queue')
        .select('id', { count: 'exact' })
        .eq('synced', false);

      this.syncState = {
        ...this.syncState,
        lastSyncAt: lastSyncData?.value,
        pendingOperations: pendingCountData?.length || 0
      };
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  }

  private async updateLastSyncTime(timestamp: string): Promise<void> {
    const { error } = await supabase
      .from('meta')
      .upsert({ key: 'lastSyncedAt', value: timestamp });

    if (error) throw error;
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

export default SupabaseSyncService;
