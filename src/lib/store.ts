import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { findChallenge } from './challenges';
import { caffeineOf, findDrink, kcalOf, waterContent, type Drink } from './drinks';
import type { Activity, Climate, Sex } from './goal';
import { startOfDay } from './stats';
import { supabase, type DrinkLog, type Profile, type UserChallenge } from './supabase';
import type { Unit } from './units';

export { startOfDay };

export type Draft = {
  name: string;
  unit: Unit;
  weightKg: number;
  activity: Activity;
  climate: Climate;
  sex: Sex;
  feelings: string[];
  goalMl: number;
  wakeTime: string;
  sleepTime: string;
};

const DEFAULT_DRAFT: Draft = {
  name: '',
  unit: 'ml',
  weightKg: 65,
  activity: 'active',
  climate: 'mild',
  sex: 'other',
  feelings: [],
  goalMl: 2400,
  wakeTime: '08:00',
  sleepTime: '22:00',
};

/** How far back the app loads history: enough for the calendar and the longest challenge. */
const HISTORY_DAYS = 120;
const LOG_COLUMNS = 'id, drink, volume_ml, water_ml, caffeine_mg, kcal, logged_at';

type State = {
  // Persisted on the device
  soundOn: boolean;
  hapticsOn: boolean;
  remindersOn: boolean;
  onboardingDone: boolean;
  draft: Draft;
  customDrinks: Drink[];
  /** Day keys for which the "goal reached" recap has been shown already. */
  recapsSeen: string[];

  // Live
  authReady: boolean;
  session: Session | null;
  profile: Profile | null;
  logs: DrinkLog[];
  challenges: UserChallenge[];
  loading: boolean;

  setDraft: (patch: Partial<Draft>) => void;
  set: (patch: Partial<Pick<State, 'soundOn' | 'hapticsOn' | 'remindersOn' | 'onboardingDone' | 'recapsSeen'>>) => void;
  addCustomDrink: (d: Omit<Drink, 'id' | 'custom'>) => string;
  removeCustomDrink: (id: string) => void;
  init: () => () => void;
  loadAll: () => Promise<void>;
  saveDraftToProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  addLog: (drinkId: string, volumeMl: number, at?: Date) => Promise<void>;
  updateLog: (id: string, patch: { volume_ml?: number; logged_at?: string }) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
  joinChallenge: (challengeId: string) => Promise<void>;
  endChallenge: (id: string, status: 'completed' | 'quit') => Promise<void>;
  signOut: () => Promise<void>;
};

export function todaysLogs(logs: DrinkLog[]) {
  const start = startOfDay().getTime();
  return logs.filter((l) => new Date(l.logged_at).getTime() >= start);
}

export function totalWater(logs: DrinkLog[]) {
  return logs.reduce((sum, l) => sum + l.water_ml, 0);
}

/** Skins you own: the starter plus a reward for every completed challenge. */
export function unlockedSkins(challenges: UserChallenge[]) {
  const set = new Set(['leucistic']);
  for (const c of challenges) {
    if (c.status === 'completed') {
      const def = findChallenge(c.challenge_id);
      if (def) set.add(def.reward);
    }
  }
  return set;
}

// One load at a time: a second request waits for the running one, and an answer that is
// older than the newest request is thrown away so it can't overwrite fresher local changes.
let inflight: Promise<void> | null = null;
let loadSeq = 0;

const sortLogs = (logs: DrinkLog[]) => [...logs].sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      soundOn: true,
      hapticsOn: true,
      remindersOn: false,
      onboardingDone: false,
      draft: DEFAULT_DRAFT,
      customDrinks: [],
      recapsSeen: [],

      authReady: false,
      session: null,
      profile: null,
      logs: [],
      challenges: [],
      loading: false,

      setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
      set: (patch) => set(patch),

      addCustomDrink: (d) => {
        const id = `custom-${Date.now()}`;
        set({ customDrinks: [...get().customDrinks, { ...d, id, custom: true }] });
        return id;
      },
      removeCustomDrink: (id) => set({ customDrinks: get().customDrinks.filter((d) => d.id !== id) }),

      init: () => {
        supabase.auth.getSession().then(({ data }) => {
          const prev = get().session;
          set({ session: data.session, authReady: true });
          if (data.session && prev?.user.id !== data.session.user.id) get().loadAll();
        });
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          const prev = get().session;
          set({ session, authReady: true });
          if (!session) set({ profile: null, logs: [], challenges: [] });
          else if (!prev || prev.user.id !== session.user.id) {
            // Defer: calling Supabase inside this callback can deadlock the auth lock.
            setTimeout(() => get().loadAll(), 0);
          }
        });
        return () => data.subscription.unsubscribe();
      },

      loadAll: async () => {
        if (inflight) return inflight;
        let stale = false;
        inflight = (async () => {
          const session = get().session;
          if (!session) return;
          const seq = ++loadSeq;
          set({ loading: true });
          const since = startOfDay();
          since.setDate(since.getDate() - HISTORY_DAYS);
          const [{ data: profile }, { data: logs }, { data: challenges }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
            supabase.from('drink_logs').select(LOG_COLUMNS).gte('logged_at', since.toISOString()).order('logged_at', { ascending: false }),
            supabase.from('user_challenges').select('id, challenge_id, status, started_at, ended_at').order('started_at', { ascending: false }),
          ]);
          if (seq !== loadSeq) {
            // Something changed locally while this was loading: keep the local state, fetch again.
            stale = true;
            set({ loading: false });
            return;
          }
          set({
            profile: (profile as Profile) ?? null,
            logs: (logs as DrinkLog[]) ?? [],
            challenges: (challenges as UserChallenge[]) ?? [],
            loading: false,
          });
          // Someone finished onboarding before confirming their email: carry the answers over now.
          if (profile && !profile.onboarded_at && get().onboardingDone) await get().saveDraftToProfile();
        })().finally(() => {
          inflight = null;
          if (stale) setTimeout(() => get().loadAll(), 400);
        });
        return inflight;
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
          sex: draft.sex,
          feelings: draft.feelings,
          wake_time: draft.wakeTime,
          sleep_time: draft.sleepTime,
          onboarded_at: new Date().toISOString(),
        });
      },

      updateProfile: async (patch) => {
        loadSeq++; // a load already in flight must not overwrite this change
        const session = get().session;
        if (!session) return;
        const prev = get().profile;
        if (prev) set({ profile: { ...prev, ...patch } });
        const { data, error } = await supabase.from('profiles').update(patch).eq('id', session.user.id).select('*').single();
        if (error) {
          set({ profile: prev });
          throw error;
        }
        set({ profile: data as Profile });
      },

      addLog: async (drinkId, volumeMl, at) => {
        loadSeq++; // a load already in flight must not overwrite this change
        const drink = findDrink(drinkId, get().customDrinks);
        const volume = Math.round(volumeMl);
        const temp: DrinkLog = {
          id: `temp-${Date.now()}`,
          drink: drink.id,
          volume_ml: volume,
          water_ml: waterContent(drink, volume),
          caffeine_mg: caffeineOf(drink, volume),
          kcal: kcalOf(drink, volume),
          logged_at: (at ?? new Date()).toISOString(),
        };
        set({ logs: sortLogs([temp, ...get().logs]) });
        const { id: _id, ...row } = temp;
        const { data, error } = await supabase.from('drink_logs').insert(row).select(LOG_COLUMNS).single();
        if (error) {
          set({ logs: get().logs.filter((l) => l.id !== temp.id) });
          throw error;
        }
        set({ logs: get().logs.map((l) => (l.id === temp.id ? (data as DrinkLog) : l)) });
      },

      updateLog: async (id, patch) => {
        loadSeq++; // a load already in flight must not overwrite this change
        const prev = get().logs;
        const log = prev.find((l) => l.id === id);
        if (!log) return;
        const drink = findDrink(log.drink, get().customDrinks);
        const volume = patch.volume_ml ?? log.volume_ml;
        const full = {
          ...patch,
          volume_ml: volume,
          water_ml: waterContent(drink, volume),
          caffeine_mg: caffeineOf(drink, volume),
          kcal: kcalOf(drink, volume),
        };
        set({ logs: sortLogs(prev.map((l) => (l.id === id ? { ...l, ...full } : l))) });
        const { error } = await supabase.from('drink_logs').update(full).eq('id', id);
        if (error) {
          set({ logs: prev });
          throw error;
        }
      },

      deleteLog: async (id) => {
        loadSeq++; // a load already in flight must not overwrite this change
        const prev = get().logs;
        set({ logs: prev.filter((l) => l.id !== id) });
        if (id.startsWith('temp-')) return;
        const { error } = await supabase.from('drink_logs').delete().eq('id', id);
        if (error) {
          set({ logs: prev });
          throw error;
        }
      },

      joinChallenge: async (challengeId) => {
        loadSeq++; // a load already in flight must not overwrite this change
        const { data, error } = await supabase
          .from('user_challenges')
          .insert({ challenge_id: challengeId, started_at: startOfDay().toISOString() })
          .select('id, challenge_id, status, started_at, ended_at')
          .single();
        if (error) throw error;
        set({ challenges: [data as UserChallenge, ...get().challenges] });
      },

      endChallenge: async (id, status) => {
        loadSeq++; // a load already in flight must not overwrite this change
        const prev = get().challenges;
        const ended_at = new Date().toISOString();
        set({ challenges: prev.map((c) => (c.id === id ? { ...c, status, ended_at } : c)) });
        const { error } = await supabase.from('user_challenges').update({ status, ended_at }).eq('id', id);
        if (error) {
          set({ challenges: prev });
          throw error;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ profile: null, logs: [], challenges: [] });
      },
    }),
    {
      name: 'sippy-app',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        soundOn: s.soundOn,
        hapticsOn: s.hapticsOn,
        remindersOn: s.remindersOn,
        onboardingDone: s.onboardingDone,
        draft: s.draft,
        customDrinks: s.customDrinks,
        recapsSeen: s.recapsSeen.slice(-30),
      }),
      // Older saved drafts lack the newer fields.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, draft: { ...DEFAULT_DRAFT, ...(p.draft ?? {}) } };
      },
    },
  ),
);
