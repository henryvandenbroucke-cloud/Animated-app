import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh tokens while the app is in the foreground (recommended for React Native).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export type Profile = {
  id: string;
  name: string | null;
  unit: 'ml' | 'oz';
  daily_goal_ml: number;
  weight_kg: number | null;
  activity: string | null;
  climate: string | null;
  feelings: string[];
  onboarded_at: string | null;
};

export type DrinkLog = {
  id: string;
  drink: string;
  volume_ml: number;
  water_ml: number;
  logged_at: string;
};
