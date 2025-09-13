import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Supabase configuration

console.log('Constants', Constants);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment variables or app.json extra section.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable auto-refresh for React Native
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          price_xaf: number | null;
          quantity: number;
          size_label: string | null;
          variant_of_id: string | null;
          category_id: string | null;
          updated_at: string;
          deleted_at: string | null;
          version: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          price_xaf?: number | null;
          quantity?: number;
          size_label?: string | null;
          variant_of_id?: string | null;
          category_id?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price_xaf?: number | null;
          quantity?: number;
          size_label?: string | null;
          variant_of_id?: string | null;
          category_id?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
          version?: number;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          updated_at: string;
          deleted_at: string | null;
          version: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          parent_id?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
          version?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
          version?: number;
          created_at?: string;
        };
      };
      sync_queue: {
        Row: {
          id: string;
          entity: string;
          operation: string;
          data: any;
          timestamp: string;
          synced: boolean;
          retry_count: number;
          last_error: string | null;
        };
        Insert: {
          id: string;
          entity: string;
          operation: string;
          data: any;
          timestamp?: string;
          synced?: boolean;
          retry_count?: number;
          last_error?: string | null;
        };
        Update: {
          id?: string;
          entity?: string;
          operation?: string;
          data?: any;
          timestamp?: string;
          synced?: boolean;
          retry_count?: number;
          last_error?: string | null;
        };
      };
      meta: {
        Row: {
          key: string;
          value: string;
        };
        Insert: {
          key: string;
          value: string;
        };
        Update: {
          key?: string;
          value?: string;
        };
      };
    };
  };
}

// Typed Supabase client
export type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;
