import { SyncConfig } from '@/types/sync';

// Default sync configuration
export const defaultSyncConfig: SyncConfig = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://your-api-server.com/api',
  apiKey: process.env.EXPO_PUBLIC_API_KEY,
  syncInterval: 15, // minutes
  maxRetries: 3,
  batchSize: 50,
  conflictResolution: 'local_wins' // or 'remote_wins' or 'manual'
};

// Development configuration
export const devSyncConfig: SyncConfig = {
  ...defaultSyncConfig,
  apiBaseUrl: 'http://localhost:3000/api',
  syncInterval: 5, // More frequent sync in dev
};

// Production configuration
export const prodSyncConfig: SyncConfig = {
  ...defaultSyncConfig,
  syncInterval: 30, // Less frequent sync in production
  conflictResolution: 'manual'
};

// Get the appropriate config based on environment
export function getSyncConfig(): SyncConfig {
  const isDev = __DEV__;
  return isDev ? devSyncConfig : prodSyncConfig;
}
