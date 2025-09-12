// Supabase configuration
export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
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
    syncInterval: parseInt(process.env.EXPO_PUBLIC_SYNC_INTERVAL || '15'),
    maxRetries: parseInt(process.env.EXPO_PUBLIC_MAX_RETRIES || '3'),
    batchSize: parseInt(process.env.EXPO_PUBLIC_BATCH_SIZE || '50'),
    conflictResolution: 'local_wins' as const,
    syncOnWiFiOnly: false // Default to mobile data
  };
}
