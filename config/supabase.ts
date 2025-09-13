import Constants from 'expo-constants';

// Supabase configuration with fallbacks
export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || 'https://placeholder.supabase.co',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || 'placeholder-key',
};

// Validate configuration
export function validateSupabaseConfig(): boolean {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please set the following environment variables:');
    console.error('- EXPO_PUBLIC_SUPABASE_URL');
    console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
    return false;
  }
  
  if (!supabaseConfig.url.includes('supabase.co')) {
    console.error('❌ Invalid Supabase URL format');
    return false;
  }
  
  console.log('✅ Supabase configuration valid');
  return true;
}

// Get sync configuration with Supabase defaults
export function getSupabaseSyncConfig() {
  return {
    apiBaseUrl: supabaseConfig.url,
    apiKey: supabaseConfig.anonKey,
    syncInterval: parseInt(process.env.EXPO_PUBLIC_SYNC_INTERVAL || Constants.expoConfig?.extra?.syncInterval || '15'),
    maxRetries: parseInt(process.env.EXPO_PUBLIC_MAX_RETRIES || Constants.expoConfig?.extra?.maxRetries || '3'),
    batchSize: parseInt(process.env.EXPO_PUBLIC_BATCH_SIZE || Constants.expoConfig?.extra?.batchSize || '50'),
    conflictResolution: 'local_wins' as const,
    syncOnWiFiOnly: false // Default to mobile data
  };
}
