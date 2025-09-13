import { getSupabaseSyncConfig, validateSupabaseConfig } from '@/config/supabase';
import { query } from '@/lib/db';
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
  private pendingConflicts: SyncConflict[] = [];

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

  // Update sync configuration
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart auto-sync if interval changed
    if (newConfig.syncInterval !== undefined) {
      this.restartAutoSync();
    }
  }

  // Get current configuration
  getConfig(): SyncConfig {
    return { ...this.config };
  }

  // Resolve a conflict
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    // Find the conflict in pending conflicts
    const conflict = this.pendingConflicts.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    try {
      let resolvedData: any;
      
      switch (resolution) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'remote':
          resolvedData = conflict.remoteData;
          break;
        case 'merge':
          resolvedData = await this.mergeData(conflict.localData, conflict.remoteData, conflict.entity);
          break;
      }

      // Apply the resolved data
      await this.updateLocalEntity(
        conflict.entity, 
        conflict.id, 
        resolvedData, 
        new Date().toISOString(), 
        (conflict.localData.version || 1) + 1
      );

      // Remove from pending conflicts
      this.pendingConflicts = this.pendingConflicts.filter(c => c.id !== conflictId);
      
      // Queue the resolution for upload
      await this.queueOperation(conflict.entity, 'update', resolvedData);
      
    } catch (error) {
      console.error(`Failed to resolve conflict ${conflictId}:`, error);
      throw error;
    }
  }

  // Merge data from local and remote versions
  private async mergeData(localData: any, remoteData: any, entity: SyncEntity): Promise<any> {
    // Simple merge strategy - in a real app, you'd have more sophisticated merging
    const merged = { ...localData };
    
    // For products, merge quantity and price but keep local name
    if (entity === 'product') {
      merged.quantity = Math.max(localData.quantity || 0, remoteData.quantity || 0);
      merged.priceXaf = remoteData.priceXaf || localData.priceXaf;
      merged.updatedAt = new Date().toISOString();
    }
    
    // For categories, keep local name but merge parent
    if (entity === 'category') {
      merged.parentId = remoteData.parentId || localData.parentId;
      merged.updatedAt = new Date().toISOString();
    }
    
    // For sales and stock adjustments, prefer remote data
    if (entity === 'sale' || entity === 'stock_adjustment') {
      return remoteData;
    }
    
    return merged;
  }

  // Get pending conflicts
  getPendingConflicts(): SyncConflict[] {
    return [...this.pendingConflicts];
  }

  // Manually refresh sync state (useful for debugging)
  async refreshSyncState(): Promise<void> {
    await this.loadSyncState();
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

    // Check if we can sync (respects WiFi-only setting)
    const canPerformSync = await this.canSync();
    
    if (!canPerformSync) {
      const errorMessage = this.config.syncOnWiFiOnly 
        ? 'Sync requires WiFi connection' 
        : 'No internet connection available';
      console.log('❌ [ONLINE_CHECK] Cannot sync:', errorMessage);
      throw new Error(errorMessage);
    }

    this.updateState({ status: 'syncing' });

    try {
      const result = await this.performSync();
      
      // Log detailed error information if there are errors
      if (result.errors.length > 0) {
        console.log('❌ [SYNC_ERRORS] Detailed error information:');
        result.errors.forEach((error, index) => {
          console.log(`  Error ${index + 1}:`, {
            id: error.id,
            entity: error.entity,
            operation: error.operation,
            error: error.error,
            retryable: error.retryable
          });
        });
      }
      
      // Log detailed conflict information if there are conflicts
      if (result.conflicts.length > 0) {
        console.log('⚠️ [SYNC_CONFLICTS] Detailed conflict information:');
        result.conflicts.forEach((conflict, index) => {
          console.log(`  Conflict ${index + 1}:`, {
            id: conflict.id,
            entity: conflict.entity,
            localData: conflict.localData,
            remoteData: conflict.remoteData
          });
        });
      }
      
      // Update the state
      this.updateState({ 
        status: 'success', 
        lastSyncAt: result.timestamp,
        pendingOperations: 0,
        errorMessage: undefined
      });
      return result;
    } catch (error) {
      console.error('❌ [SYNC_ERROR] Sync failed:', error);
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
    
    const newPendingCount = this.syncState.pendingOperations + 1;    
    this.updateState({ 
      pendingOperations: newPendingCount 
    });

    // Try to sync immediately if we can sync
    if (this.syncState.status === 'idle') {
      this.canSync().then(canPerformSync => {
        if (canPerformSync) {
          this.syncNow().catch(() => {
            // Ignore errors for background sync attempts
          });
        }
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
    
    if (pendingOps.length > 0) {
      // Upload local changes
      const uploadResult = await this.uploadChanges(pendingOps);
      result.syncedRecords += uploadResult.synced;
      result.errors.push(...uploadResult.errors);
    }

    // Download remote changes
    const downloadResult = await this.downloadChanges();
    result.syncedRecords += downloadResult.synced;
    result.conflicts.push(...downloadResult.conflicts);
    result.errors.push(...downloadResult.errors);

    // Update last sync time
    await this.updateLastSyncTime(result.timestamp);

    // Clean up old synced operations to prevent queue from growing indefinitely
    await this.cleanupOldSyncedOperations();

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
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        errors.push({
          id: operation.id,
          entity: operation.entity,
          operation: operation.operation,
          error: errorMessage,
          retryable: true
        });
      }
    }

    // Update pending operations count after successful uploads
    if (synced > 0) {
      await this.refreshPendingOperationsCount();
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
      created_at: data.createdAt || new Date().toISOString(),
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
      created_at: data.createdAt || new Date().toISOString(),
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
    // Validate required fields
    if (!data.id) {
      throw new Error('Sale ID is required');
    }
    if (!data.productId) {
      throw new Error('Product ID is required');
    }
    if (data.priceXaf === undefined || data.priceXaf === null) {
      throw new Error('Price is required for sale');
    }
    if (data.totalXaf === undefined || data.totalXaf === null) {
      throw new Error('Total amount is required for sale');
    }

    const saleData = {
      id: data.id,
      product_id: data.productId,
      quantity: data.quantity || 1,
      price_xaf: data.priceXaf,
      total_xaf: data.totalXaf,
      created_at: data.createdAt || new Date().toISOString(),
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
        if (error) {
          throw new Error(`Sale upsert failed: ${error.message}`);
        }
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('sales')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', data.id);
        if (deleteError) {
          throw new Error(`Sale delete failed: ${deleteError.message}`);
        }
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
      created_at: data.createdAt || new Date().toISOString(),
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

      // Get modified sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gt('updated_at', lastSyncAt || '1970-01-01T00:00:00Z')
        .is('deleted_at', null);

      if (salesError) throw salesError;

      // Get modified stock adjustments
      const { data: stockAdjustments, error: stockAdjustmentsError } = await supabase
        .from('stock_adjustments')
        .select('*')
        .gt('updated_at', lastSyncAt || '1970-01-01T00:00:00Z')
        .is('deleted_at', null);

      if (stockAdjustmentsError) throw stockAdjustmentsError;

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
              createdAt: product.created_at,
              updatedAt: product.updated_at,
              deletedAt: product.deleted_at,
              version: product.version
            },
            updatedAt: product.updated_at,
            version: product.version
          });
          if (conflict) {
            console.log(`⚠️ [DOWNLOAD] Conflict detected for product:`, product.id);
            conflicts.push(conflict);
          } else {
            synced++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Apply failed';
          console.log(`❌ [DOWNLOAD] Failed to apply product:`, product.id, errorMessage);
          console.log(`❌ [DOWNLOAD] Product data:`, JSON.stringify(product, null, 2));
          
          errors.push({
            id: product.id,
            entity: 'product',
            operation: 'update',
            error: errorMessage,
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
              createdAt: category.created_at,
              updatedAt: category.updated_at,
              deletedAt: category.deleted_at,
              version: category.version
            },
            updatedAt: category.updated_at,
            version: category.version
          });
          if (conflict) {
            console.log(`⚠️ [DOWNLOAD] Conflict detected for category:`, category.id);
            conflicts.push(conflict);
          } else {
            synced++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Apply failed';
          console.log(`❌ [DOWNLOAD] Failed to apply category:`, category.id, errorMessage);
          console.log(`❌ [DOWNLOAD] Category data:`, JSON.stringify(category, null, 2));
          
          errors.push({
            id: category.id,
            entity: 'category',
            operation: 'update',
            error: errorMessage,
            retryable: false
          });
        }
      }

      // Process sales
      for (const sale of sales || []) {
        try {
          const conflict = await this.applyRemoteEntity({
            id: sale.id,
            entity: 'sale',
            data: {
              id: sale.id,
              productId: sale.product_id,
              quantity: sale.quantity,
              priceXaf: sale.price_xaf,
              totalXaf: sale.total_xaf,
              createdAt: sale.created_at,
              updatedAt: sale.updated_at,
              deletedAt: sale.deleted_at,
              version: sale.version
            },
            updatedAt: sale.updated_at,
            version: sale.version
          });
          if (conflict) {
            console.log(`⚠️ [DOWNLOAD] Conflict detected for sale:`, sale.id);
            conflicts.push(conflict);
          } else {
            synced++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Apply failed';
          console.log(`❌ [DOWNLOAD] Failed to apply sale:`, sale.id, errorMessage);
          console.log(`❌ [DOWNLOAD] Sale data:`, JSON.stringify(sale, null, 2));
          
          errors.push({
            id: sale.id,
            entity: 'sale',
            operation: 'update',
            error: errorMessage,
            retryable: false
          });
        }
      }

      // Process stock adjustments
      for (const adjustment of stockAdjustments || []) {
        try {
          const conflict = await this.applyRemoteEntity({
            id: adjustment.id,
            entity: 'stock_adjustment',
            data: {
              id: adjustment.id,
              productId: adjustment.product_id,
              quantityChange: adjustment.quantity_change,
              reason: adjustment.reason,
              createdAt: adjustment.created_at,
              updatedAt: adjustment.updated_at,
              deletedAt: adjustment.deleted_at,
              version: adjustment.version
            },
            updatedAt: adjustment.updated_at,
            version: adjustment.version
          });
          if (conflict) {
            console.log(`⚠️ [DOWNLOAD] Conflict detected for stock adjustment:`, adjustment.id);
            conflicts.push(conflict);
          } else {
            synced++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Apply failed';
          console.log(`❌ [DOWNLOAD] Failed to apply stock adjustment:`, adjustment.id, errorMessage);
          console.log(`❌ [DOWNLOAD] Stock adjustment data:`, JSON.stringify(adjustment, null, 2));
          
          errors.push({
            id: adjustment.id,
            entity: 'stock_adjustment',
            operation: 'update',
            error: errorMessage,
            retryable: false
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      console.log(`❌ [DOWNLOAD] Download process failed:`, errorMessage);
      console.log(`❌ [DOWNLOAD] Full error:`, error);
      
      errors.push({
        id: 'download',
        entity: 'product',
        operation: 'update',
        error: errorMessage,
        retryable: true
      });
    }

    return { synced, conflicts, errors };
  }

  // Apply a remote entity to local database
  private async applyRemoteEntity(remoteEntity: RemoteEntity): Promise<SyncConflict | null> {
    const { id, entity, data, updatedAt, version } = remoteEntity;
    
    try {
      // Check if local entity exists and get its version
      const localEntity = await this.getLocalEntity(entity, id);
      
      if (localEntity) {
        // Check for conflicts
        const conflict = await this.detectConflict(localEntity, remoteEntity);
        if (conflict) {
          // Store conflict for later resolution
          this.pendingConflicts.push(conflict);
          return conflict;
        }
        
        // Apply conflict resolution strategy
        const resolvedData = await this.resolveConflictAutomatically(localEntity, remoteEntity);
        await this.updateLocalEntity(entity, id, resolvedData, updatedAt, version);
      } else {
        // No local entity, safe to insert
        await this.insertLocalEntity(entity, data, updatedAt, version);
      }
      
      return null; // No conflicts
    } catch (error) {
      throw error;
    }
  }

  // Get local entity from database
  private async getLocalEntity(entity: SyncEntity, id: string): Promise<any | null> {
    try {
      const tableName = this.getTableName(entity);
      const result = query<any>(`SELECT * FROM ${tableName} WHERE id = ? AND deletedAt IS NULL`, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      return null;
    }
  }

  // Detect conflicts between local and remote entities
  private async detectConflict(localEntity: any, remoteEntity: RemoteEntity): Promise<SyncConflict | null> {
    const localVersion = localEntity.version || 1;
    const remoteVersion = remoteEntity.version || 1;
    
    // Only detect conflicts if there are actual concurrent edits
    // Check if both entities were modified since last sync
    if (localVersion > remoteVersion && localEntity.updatedAt > (this.syncState.lastSyncAt || '1970-01-01T00:00:00Z')) {
      return {
        id: remoteEntity.id,
        entity: remoteEntity.entity,
        localData: localEntity,
        remoteData: remoteEntity.data,
        conflictType: 'concurrent_edit'
      };
    }
    
    // For sales, be more lenient with timestamp differences
    // Only detect data mismatch if there are significant differences in critical fields
    if (remoteEntity.entity === 'sale') {
      // For sales, only conflict if the core data is different
      const localPrice = localEntity.priceXaf || localEntity.price_xaf;
      const remotePrice = remoteEntity.data.priceXaf || remoteEntity.data.price_xaf;
      const localQuantity = localEntity.quantity;
      const remoteQuantity = remoteEntity.data.quantity;
      
      if (localPrice !== remotePrice || localQuantity !== remoteQuantity) {
        return {
          id: remoteEntity.id,
          entity: remoteEntity.entity,
          localData: localEntity,
          remoteData: remoteEntity.data,
          conflictType: 'data_mismatch'
        };
      }
    } else {
      // For other entities, check for data mismatches more carefully
      // Only conflict if versions are the same but critical data differs
      if (localVersion === remoteVersion) {
        // Check if there are meaningful differences in the data
        const hasSignificantDifference = this.hasSignificantDataDifference(localEntity, remoteEntity.data, remoteEntity.entity);
        if (hasSignificantDifference) {
          return {
            id: remoteEntity.id,
            entity: remoteEntity.entity,
            localData: localEntity,
            remoteData: remoteEntity.data,
            conflictType: 'data_mismatch'
          };
        }
      }
    }
    
    return null; // No conflict
  }

  // Check if there are significant differences in entity data
  private hasSignificantDataDifference(localData: any, remoteData: any, entity: SyncEntity): boolean {
    switch (entity) {
      case 'product':
        return localData.name !== remoteData.name || 
               localData.priceXaf !== remoteData.priceXaf ||
               localData.quantity !== remoteData.quantity;
      case 'category':
        return localData.name !== remoteData.name;
      case 'stock_adjustment':
        return localData.quantityChange !== remoteData.quantityChange ||
               localData.reason !== remoteData.reason;
      default:
        // For unknown entities, be conservative and don't detect conflicts
        return false;
    }
  }

  // Resolve conflicts based on configured strategy
  private async resolveConflictAutomatically(localEntity: any, remoteEntity: RemoteEntity): Promise<any> {
    switch (this.config.conflictResolution) {
      case 'local_wins':
        return localEntity;
      case 'remote_wins':
        return remoteEntity.data;
      case 'manual':
        // For manual resolution, we'll keep the local version and mark for manual review
        // In a real app, you'd show a UI for the user to choose
        return localEntity;
      default:
        return remoteEntity.data;
    }
  }

  // Update local entity in database
  private async updateLocalEntity(entity: SyncEntity, id: string, data: any, updatedAt: string, version: number): Promise<void> {
    const tableName = this.getTableName(entity);
    const fields = this.getEntityFields(entity);
    
    const fieldNames = ['id', ...fields, 'createdAt', 'updatedAt', 'version'].join(', ');
    const placeholders = fields.map(() => '?').concat(['?', '?', '?', '?']).join(', ');
    const values = [id, ...fields.map(field => data[field] || null)];
    values.push(updatedAt, updatedAt, version);
    
    query(`INSERT OR REPLACE INTO ${tableName} (${fieldNames}) VALUES (${placeholders})`, values);
  }

  // Insert new local entity
  private async insertLocalEntity(entity: SyncEntity, data: any, updatedAt: string, version: number): Promise<void> {
    const tableName = this.getTableName(entity);
    const fields = this.getEntityFields(entity);
    
    const fieldNames = ['id', ...fields, 'createdAt', 'updatedAt', 'version'].join(', ');
    const placeholders = fields.map(() => '?').concat(['?', '?', '?', '?']).join(', ');
    const values = [data.id, ...fields.map(field => data[field] || null)];
    values.push(updatedAt, updatedAt, version);
    
    query(`INSERT OR REPLACE INTO ${tableName} (${fieldNames}) VALUES (${placeholders})`, values);
  }

  // Get table name for entity
  private getTableName(entity: SyncEntity): string {
    switch (entity) {
      case 'product': return 'products';
      case 'category': return 'categories';
      case 'sale': return 'sales';
      case 'stock_adjustment': return 'stock_adjustments';
      default: throw new Error(`Unknown entity: ${entity}`);
    }
  }

  // Get field names for entity
  private getEntityFields(entity: SyncEntity): string[] {
    switch (entity) {
      case 'product':
        return ['name', 'priceXaf', 'quantity', 'sizeLabel', 'variantOfId', 'categoryId'];
      case 'category':
        return ['name', 'parentId'];
      case 'sale':
        return ['productId', 'quantity', 'priceXaf', 'totalXaf'];
      case 'stock_adjustment':
        return ['productId', 'quantityChange', 'reason'];
      default:
        throw new Error(`Unknown entity: ${entity}`);
    }
  }

  // Database operations - Use local SQLite for sync queue
  private async saveSyncRecord(record: SyncRecord): Promise<void> {
    const { execute } = await import('@/lib/db');
    execute(
      `INSERT OR REPLACE INTO sync_queue (id, entity, operation, data, timestamp, synced, retryCount, lastError) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.entity, record.operation, JSON.stringify(record.data), 
       record.timestamp, record.synced ? 1 : 0, record.retryCount, record.lastError || null]
    );
  }

  private async getPendingOperations(): Promise<SyncRecord[]> {
    const { query } = await import('@/lib/db');
    const rows = query<any>(
      `SELECT * FROM sync_queue WHERE synced = 0 ORDER BY timestamp ASC LIMIT ?`,
      [this.config.batchSize]
    );

    return rows.map(row => ({
      id: row.id,
      entity: row.entity as SyncEntity,
      operation: row.operation as SyncOperation,
      data: JSON.parse(row.data),
      timestamp: row.timestamp,
      synced: row.synced === 1,
      retryCount: row.retryCount,
      lastError: row.lastError
    }));
  }

  private async markOperationSynced(operationId: string): Promise<void> {
    const { execute } = await import('@/lib/db');
    execute(
      `UPDATE sync_queue SET synced = 1 WHERE id = ?`,
      [operationId]
    );
  }

  private async refreshPendingOperationsCount(): Promise<void> {
    try {
      const { query } = await import('@/lib/db');
      const pendingCountData = query<any>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0`
      )[0];
      
      this.updateState({
        pendingOperations: pendingCountData?.count || 0
      });
    } catch (error) {
    }
  }

  private async cleanupOldSyncedOperations(): Promise<void> {
    try {
      const { execute } = await import('@/lib/db');
      // Keep only the last 100 synced operations for debugging purposes
      // Delete older synced operations
      execute(`
        DELETE FROM sync_queue 
        WHERE synced = 1 
        AND id NOT IN (
          SELECT id FROM sync_queue 
          WHERE synced = 1 
          ORDER BY timestamp DESC 
          LIMIT 100
        )
      `);
    } catch (error) {
    }
  }

  // Utility methods
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadSyncState(): Promise<void> {
    try {
      const { query } = await import('@/lib/db');
      
      // Get last sync time from local meta table
      const lastSyncData = query<any>(
        `SELECT value FROM meta WHERE key = 'lastSyncedAt'`
      )[0];

      // Get pending operations count from local sync_queue
      const pendingCountData = query<any>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0`
      )[0]; 

      this.syncState = {
        ...this.syncState,
        lastSyncAt: lastSyncData?.value,
        pendingOperations: pendingCountData?.count || 0
      };
      
      // Notify listeners about the state change
      this.syncListeners.forEach(listener => listener(this.syncState));
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  }

  private async updateLastSyncTime(timestamp: string): Promise<void> {
    const { execute } = await import('@/lib/db');
    execute(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('lastSyncedAt', ?)`,
      [timestamp]
    );
  }

  private async setupNetworkListener(): Promise<void> {
    // Check initial network state
    this.syncState.isOnline = await this.checkNetworkState();
    
    // Set up periodic network state checks
    setInterval(async () => {
      const isOnline = await this.checkNetworkState();
      if (isOnline !== this.syncState.isOnline) {
        this.updateState({ isOnline });
        
        // Trigger sync when coming back online (if we can sync)
        if (isOnline && this.syncState.pendingOperations > 0) {
          this.canSync().then(canPerformSync => {
            if (canPerformSync) {
              this.syncNow().catch(() => {
                // Ignore errors for background sync
              });
            }
          });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async checkNetworkState(): Promise<boolean> {
    try {
      // Simple network check by pinging Supabase
      const { error } = await supabase
        .from('meta')
        .select('key')
        .limit(1);
  
      const isOnline = !error;
      return isOnline;
    } catch (error) {
      return false;
    }
  }

  private async isWiFiConnection(): Promise<boolean> {
    // For now, we'll assume any connection is acceptable
    // In a real implementation, you'd use a network state library
    // like @react-native-netinfo to detect WiFi vs mobile data
    return true; // Allow sync on any connection by default
  }

  private async canSync(): Promise<boolean> {
    const isOnline = await this.checkNetworkState();
    
    if (!isOnline) {
      return false;
    }

    // If WiFi-only is enabled, check if we're on WiFi
    if (this.config.syncOnWiFiOnly) {
      const isWiFi = await this.isWiFiConnection();
      return isWiFi;
    }
    return true;
  }

  private async startAutoSync(): Promise<void> {
    if (this.config.syncInterval > 0) {
      // Calculate next sync time
      const nextSyncAt = new Date(Date.now() + this.config.syncInterval * 60 * 1000);
      this.updateState({ nextSyncAt: nextSyncAt.toISOString() });
      
      // Trigger immediate sync for new users
      setTimeout(() => {
        this.performAutoSync();
      }, 2000); // Wait 2 seconds after initialization
      
      setInterval(() => {
        this.performAutoSync();
      }, this.config.syncInterval * 60 * 1000);
    }
  }

  private async performAutoSync(): Promise<void> {
    
    // Only auto-sync if:
    // 1. We can sync (online + WiFi check if enabled)
    // 2. Not currently syncing
    // 3. Have pending operations or it's been a while since last sync
    const canPerformSync = await this.canSync();
    const shouldForceSync = this.shouldForceSync();
    const shouldSync = canPerformSync && 
                      this.syncState.status === 'idle' && 
                      (this.syncState.pendingOperations > 0 || shouldForceSync);


    if (shouldSync) {
      try {
        await this.syncNow();
      } catch (error) {
        // Don't throw - this is background sync
      }
    } 

    // Update next sync time
    const nextSyncAt = new Date(Date.now() + this.config.syncInterval * 60 * 1000);
    this.updateState({ nextSyncAt: nextSyncAt.toISOString() });
  }

  private shouldForceSync(): boolean {
    if (!this.syncState.lastSyncAt) {
      return true;
    }
    
    const lastSync = new Date(this.syncState.lastSyncAt);
    const now = new Date();
    const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
    
    // Force sync if it's been more than 2x the sync interval
    const shouldForce = hoursSinceLastSync > (this.config.syncInterval * 2 / 60);
    
    return shouldForce;
  }

  private restartAutoSync(): void {
    // Clear existing interval and restart
    if (this.config.syncInterval > 0) {
      const nextSyncAt = new Date(Date.now() + this.config.syncInterval * 60 * 1000);
      this.updateState({ nextSyncAt: nextSyncAt.toISOString() });
      
      // Note: In a real implementation, you'd want to store the interval ID
      // and clear it before setting a new one
      setInterval(() => {
        this.performAutoSync();
      }, this.config.syncInterval * 60 * 1000);
    }
  }

  private updateState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates }
    
    this.syncListeners.forEach(listener => listener(this.syncState));
  }

}

export default SupabaseSyncService;
