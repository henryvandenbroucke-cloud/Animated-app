import { findDrink, type Drink } from './drinks';
import { addDays, byDay, emptyDay, startOfDay, type DayStats } from './stats';
import type { DrinkLog } from './supabase';

export type ChallengeDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** The Sippy colour morph you unlock by finishing it. */
  reward: string;
  /** Number shown as "x / target". */
  target: number;
  unit: string;
  /** Days you have to finish it in; null for no time limit. */
  days: number | null;
};

export type ChallengeProgress = { value: number; target: number; failed: boolean; done: boolean; daysLeft: number | null; note?: string };

export const CHALLENGES: ChallengeDef[] = [
  { id: 'streak-7', name: 'Seven Day Splash', icon: '🔥', description: 'Reach your daily goal seven days in a row.', reward: 'golden', target: 7, unit: 'days', days: 7 },
  { id: 'morning-5', name: 'Early Sipper', icon: '🌅', description: 'Log a drink before 10 am on five days this week.', reward: 'mint', target: 5, unit: 'mornings', days: 7 },
  { id: 'no-caffeine-5', name: 'Caffeine Detox', icon: '🌿', description: 'Five days in a row with no caffeinated drinks.', reward: 'lavender', target: 5, unit: 'days', days: 5 },
  { id: 'no-soda-7', name: 'Soda-Free Week', icon: '🥤', description: 'Seven days without a single soda.', reward: 'copper', target: 7, unit: 'days', days: 7 },
  { id: 'variety-8', name: 'Taste Tester', icon: '🧃', description: 'Try eight different drinks within two weeks.', reward: 'wild', target: 8, unit: 'drinks', days: 14 },
  { id: 'big-3', name: 'Big Gulp', icon: '💪', description: 'Hit 120% of your goal on three days within a week.', reward: 'melanoid', target: 3, unit: 'days', days: 7 },
  { id: 'hero-30', name: 'Hydration Hero', icon: '🌊', description: 'Drink 30 litres of water in 30 days.', reward: 'galaxy', target: 30, unit: 'litres', days: 30 },
];

export function findChallenge(id: string) {
  return CHALLENGES.find((c) => c.id === id);
}

/** Works out progress from the drink log; nothing is stored except when the attempt started. */
export function evaluate(def: ChallengeDef, startedAt: string, logs: DrinkLog[], goal: number, custom: Drink[] = [], now = new Date()): ChallengeProgress {
  const start = startOfDay(new Date(startedAt));
  const today = startOfDay(now);
  const elapsed = Math.round((today.getTime() - start.getTime()) / 86400000) + 1; // days including today
  const daysLeft = def.days == null ? null : Math.max(0, def.days - elapsed + 1);
  const inRange = logs.filter((l) => new Date(l.logged_at) >= start);
  const map = byDay(inRange);
  const days: DayStats[] = [];
  for (let i = 0; i < Math.min(elapsed, def.days ?? elapsed); i++) {
    const date = addDays(start, i);
    days.push(map.get(emptyDay(date).key) ?? emptyDay(date));
  }
  const past = days.slice(0, -1); // finished days
  const todayStats = days[days.length - 1] ?? emptyDay(today);
  const result = (value: number, failed: boolean, note?: string): ChallengeProgress => {
    const done = value >= def.target;
    const outOfTime = def.days != null && elapsed > def.days;
    return { value: Math.min(value, def.target), target: def.target, done, failed: !done && (failed || outOfTime), daysLeft, note };
  };
  const has = (s: DayStats, pred: (dr: Drink) => boolean) => [...s.drinks].some((id) => pred(findDrink(id, custom)));

  switch (def.id) {
    case 'streak-7': {
      const missed = past.some((s) => s.water < goal);
      const hits = days.filter((s) => s.water >= goal).length;
      return result(hits, missed, missed ? 'A day was missed.' : undefined);
    }
    case 'morning-5': {
      const hits = days.filter((s) => s.firstHour != null && s.firstHour < 10).length;
      const remaining = (def.days ?? 0) - elapsed + (todayStats.firstHour != null && todayStats.firstHour < 10 ? 0 : 1);
      return result(hits, hits + Math.max(0, remaining) < def.target);
    }
    case 'no-caffeine-5': {
      const broke = days.some((s) => s.caffeine > 0);
      return result(broke ? 0 : past.length + (todayStats.count > 0 ? 1 : 0), broke, broke ? 'Caffeine was logged.' : undefined);
    }
    case 'no-soda-7': {
      const broke = days.some((s) => has(s, (dr) => dr.category === 'Soda'));
      return result(broke ? 0 : past.length + (todayStats.count > 0 ? 1 : 0), broke, broke ? 'A soda was logged.' : undefined);
    }
    case 'variety-8': {
      const kinds = new Set(inRange.map((l) => l.drink));
      return result(kinds.size, false);
    }
    case 'big-3': {
      const hits = days.filter((s) => s.water >= goal * 1.2).length;
      return result(hits, false);
    }
    case 'hero-30': {
      const litres = Math.floor(inRange.reduce((a, l) => a + l.water_ml, 0) / 1000);
      return result(litres, false);
    }
  }
  return result(0, false);
}
