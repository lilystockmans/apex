import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { kvGet, kvSet, kvDelete } from './storage';

const url = Constants.expoConfig?.extra?.supabaseUrl ?? '';
const key = Constants.expoConfig?.extra?.supabaseAnonKey ?? '';

// Custom storage backed by existing SQLite KV store — avoids adding AsyncStorage native dependency
const sqliteStorage = {
  getItem: async (k: string): Promise<string | null> => kvGet(k),
  setItem: async (k: string, v: string): Promise<void> => { kvSet(k, v); },
  removeItem: async (k: string): Promise<void> => { kvDelete(k); },
};

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // must be false for React Native
    storage: sqliteStorage,
  },
});
