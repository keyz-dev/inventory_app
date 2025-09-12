export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export type SyncOperation = 'create' | 'update' | 'delete';

export type SyncEntity = 'product' | 'category' | 'sale' | 'stock_adjustment';

export interface SyncRecord {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  data: any;
  timestamp: string;
  synced: boolean;
  retryCount: number;
  lastError?: string;
}

export interface SyncConfig {
  apiBaseUrl: string;
  apiKey?: string;
  syncInterval: number; // minutes
  maxRetries: number;
  batchSize: number;
  conflictResolution: 'local_wins' | 'remote_wins' | 'manual';
}

export interface SyncState {
  status: SyncStatus;
  lastSyncAt?: string;
  nextSyncAt?: string;
  pendingOperations: number;
  errorMessage?: string;
  isOnline: boolean;
}

export interface SyncResult {
  success: boolean;
  syncedRecords: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
  timestamp: string;
}

export interface SyncConflict {
  id: string;
  entity: SyncEntity;
  localData: any;
  remoteData: any;
  conflictType: 'data_mismatch' | 'concurrent_edit' | 'deleted_modified';
}

export interface SyncError {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  error: string;
  retryable: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface SyncPayload {
  operations: SyncRecord[];
  lastSyncAt?: string;
  deviceId: string;
}

export interface RemoteEntity {
  id: string;
  data: any;
  updatedAt: string;
  deletedAt?: string;
  version: number;
}
