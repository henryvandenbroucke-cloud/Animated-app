import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Drink } from './drinks';
import { findDrink, waterContent } from './drinks';
import type { Activity, Climate } from './goal';
import { supabase, type DrinkLog, type Profile } from './supabase';
import type { Unit } from './units';

export type Draft = {
  name: string;
  unit: Unit;
  weightKg: number;
  activity: Activity;
  climate: Climate;
  feelings: string[];
  goalMl: number;
};

const DEFAULT_DRAFT: Draft = {
  name: '',
  unit: 'ml',
  weightKg: 65,
  activity: 'active',
  climate: 'mild',
  feelings: [],
  goalMl: 2400,
};

type State = {
  // Persisted on the device
  soundOn: boolean;
  remindersOn: boolean;
  onboardingDone: boolean;
  draft: Draft;
  customDrinks: Drink[];

  // Live
  authReady: boolean;
  session: Session | null;
  profile: Profile | null;
  logs: DrinkLog[];
  loading: boolean;

  setDraft: (patch: Partial<Draft>) => void;
  set: (patch: Partial<Pick<State, 'soundOn' | 'remindersOn' | 'onboardingDone'>>) => void;
  addCustomDrink: (d: Omit<Drink, 'id' | 'custom'>) => void;
  removeCustomDrink: (id: string) => void;
  init: () => () => void;
  loadAll: () => Promise<void>;
  saveDraftToProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  addLog: (drinkId: string, volumeMl: number) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export function startOfDay(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function todaysLogs(logs: DrinkLog[]) {
  const start = startOfDay().getTime();
  return logs.filter((l) => new Date(l.logged_at).getTime() >= start);
}

export function totalWater(logs: DrinkLog[]) {
  return logs.reduce((sum, l) => sum + l.water_ml, 0);
}

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      soundOn: true,
      remindersOn: false,
      onboardingDone: false,
      draft: DEFAULT_DRAFT,
      customDrinks: [],

      authReady: false,
      session: null,
      profile: null,
      logs: [],
      loading: false,

      setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
      set: (patch) => set(patch),

      addCustomDrink: (d) =>
        set({ customDrinks: [...get().customDrinks, { ...d, id: `custom-${Date.now()}`, custom: true }] }),
      removeCustomDrink: (id) => set({ customDrinks: get().customDrinks.filter((d) => d.id !== id) }),

      init: () => {
        supabase.auth.getSession().then(({ data }) => {
          set({ session: data.session, authReady: true });
          if (data.session) get().loadAll();
        });
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          const prev = get().session;
          set({ session, authReady: true });
          if (!session) set({ profile: null, logs: [] });
          else if (!prev || prev.user.id !== session.user.id) {
            // Defer: calling Supabase inside this callback can deadlock the auth lock.
            setTimeout(() => get().loadAll(), 0);
          }
        });
        return () => data.subscription.unsubscribe();
      },

      loadAll: async () => {
        const session = get().session;
        if (!session) return;
        set({ loading: true });
        const since = startOfDay();
        since.setDate(since.getDate() - 6);
        const [{ data: profile }, { data: logs }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
          supabase
            .from('drink_logs')
            .select('id, drink, volume_ml, water_ml, logged_at')
            .gte('logged_at', since.toISOString())
            .order('logged_at', { ascending: false }),
        ]);
        set({ profile: (profile as Profile) ?? null, logs: (logs as DrinkLog[]) ?? [], loading: false });
        // Someone finished onboarding before confirming their email: carry the answers over now.
        if (profile && !profile.onboarded_at && get().onboardingDone) await get().saveDraftToProfile();
      },

      saveDraftToProfile: async () => {
        const { draft } = get();
        await get().updateProfile({
          name: draft.name.trim() || null,
          unit: draft.unit,
          daily_goal_ml: draft.goalMl,
          weight_kg: draft.weightKg,
          activity: draft.activity,
          climate: draft.climate,
          feelings: draft.feelings,
          onboarded_at: new Date().toISOString(),
        });
      },

      updateProfile: async (patch) => {
        const session = get().session;
        if (!session) return;
        const prev = get().profile;
        if (prev) set({ profile: { ...prev, ...patch } });
        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select('*')
          .single();
        if (error) {
          set({ profile: prev });
          throw error;
        }
        set({ profile: data as Profile });
      },

      addLog: async (drinkId, volumeMl) => {
        const drink = findDrink(drinkId, get().customDrinks);
        const temp: DrinkLog = {
          id: `temp-${Date.now()}`,
          drink: drink.id,
          volume_ml: Math.round(volumeMl),
          water_ml: waterContent(drink, volumeMl),
          logged_at: new Date().toISOString(),
        };
        set({ logs: [temp, ...get().logs] });
        const { data, error } = await supabase
          .from('drink_logs')
          .insert({ drink: temp.drink, volume_ml: temp.volume_ml, water_ml: temp.water_ml })
          .select('id, drink, volume_ml, water_ml, logged_at')
          .single();
        if (error) {
          set({ logs: get().logs.filter((l) => l.id !== temp.id) });
          throw error;
        }
        set({ logs: get().logs.map((l) => (l.id === temp.id ? (data as DrinkLog) : l)) });
      },

      deleteLog: async (id) => {
        const prev = get().logs;
        set({ logs: prev.filter((l) => l.id !== id) });
        if (id.startsWith('temp-')) return;
        const { error } = await supabase.from('drink_logs').delete().eq('id', id);
        if (error) {
          set({ logs: prev });
          throw error;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ profile: null, logs: [] });
      },
    }),
    {
      name: 'sippy-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        soundOn: s.soundOn,
        remindersOn: s.remindersOn,
        onboardingDone: s.onboardingDone,
        draft: s.draft,
        customDrinks: s.customDrinks,
      }),
    },
  ),
);
