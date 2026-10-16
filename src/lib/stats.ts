import type { DrinkLog } from './supabase';

export type DayStats = {
  key: string;
  date: Date;
  water: number;
  volume: number;
  caffeine: number;
  kcal: number;
  drinks: Set<string>;
  count: number;
  /** Hour (0-23.99) of the earliest drink that day, or null. */
  firstHour: number | null;
};

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startOfDay(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function byDay(logs: DrinkLog[]) {
  const map = new Map<string, DayStats>();
  for (const l of logs) {
    const at = new Date(l.logged_at);
    const key = dayKey(at);
    let s = map.get(key);
    if (!s) {
      s = { key, date: startOfDay(at), water: 0, volume: 0, caffeine: 0, kcal: 0, drinks: new Set(), count: 0, firstHour: null };
      map.set(key, s);
    }
    s.water += l.water_ml;
    s.volume += l.volume_ml;
    s.caffeine += l.caffeine_mg ?? 0;
    s.kcal += l.kcal ?? 0;
    s.drinks.add(l.drink);
    s.count++;
    const h = at.getHours() + at.getMinutes() / 60;
    s.firstHour = s.firstHour == null ? h : Math.min(s.firstHour, h);
  }
  return map;
}

export function emptyDay(date: Date): DayStats {
  return { key: dayKey(date), date: startOfDay(date), water: 0, volume: 0, caffeine: 0, kcal: 0, drinks: new Set(), count: 0, firstHour: null };
}

/** Consecutive days reaching the goal, ending today (today counts only once it is reached). */
export function currentStreak(days: Map<string, DayStats>, goal: number, today = new Date()) {
  let streak = 0;
  let d = startOfDay(today);
  if ((days.get(dayKey(d))?.water ?? 0) < goal) d = addDays(d, -1);
  while ((days.get(dayKey(d))?.water ?? 0) >= goal) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

export function bestStreak(days: Map<string, DayStats>, goal: number) {
  const keys = [...days.values()].filter((s) => s.water >= goal).map((s) => s.date.getTime()).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = -Infinity;
  for (const t of keys) {
    run = Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}
