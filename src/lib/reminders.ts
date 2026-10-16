import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, startOfDay } from './stats';
import type { DrinkLog } from './supabase';

/** Reminder sounds, bundled via the expo-notifications plugin in app.json (`sounds`). */
export const REMINDER_SOUNDS = [
  { id: 'bubble', label: 'Bubble', file: 'boop-1.wav', preview: 'boop' as const },
  { id: 'splash', label: 'Splash', file: 'pour-1.wav', preview: 'pour' as const },
  { id: 'plink', label: 'Plink', file: 'select-1.wav', preview: 'select' as const },
  { id: 'chime', label: 'Chime', file: 'success.wav', preview: 'success' as const },
  { id: 'default', label: 'Phone default', file: null, preview: 'tap' as const },
];

const LINES = [
  'Psst… Sippy is getting thirsty! Time for a sip 💧',
  'Gills drooping a little. Got a glass of water nearby?',
  'Water break! Sippy will do a happy flip 🌊',
  'A few sips now keeps the afternoon slump away.',
  'Sippy is floating by to say: hydrate!',
  'Your water bottle misses you.',
  'Quick sip? Sippy is cheering you on.',
];

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestReminderPermission() {
  if (Platform.OS === 'web') return false;
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    return granted;
  } catch {
    return false;
  }
}

type Plan = {
  wake: string; // "08:00"
  sleep: string; // "22:00"
  everyMin: number;
  sound: string;
  goalMl: number;
  logs: DrinkLog[];
  now?: Date;
};

const atTime = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

/**
 * Smart reminders: works out today's and tomorrow's nudges between wake and sleep time,
 * skipping any that fall within 45 minutes of a drink you logged, and the rest of today
 * once the goal is reached. Call it whenever the plan or the log changes.
 */
export function planReminders({ wake, sleep, everyMin, goalMl, logs, now = new Date() }: Plan) {
  const times: Date[] = [];
  const today = startOfDay(now);
  const todayWater = logs.filter((l) => new Date(l.logged_at) >= today).reduce((a, l) => a + l.water_ml, 0);
  const lastLog = logs.reduce((max, l) => Math.max(max, new Date(l.logged_at).getTime()), 0);
  for (const day of [today, addDays(today, 1)]) {
    const isToday = day.getTime() === today.getTime();
    if (isToday && todayWater >= goalMl) continue;
    const start = new Date(atTime(day, wake).getTime() + 30 * 60000);
    const end = new Date(atTime(day, sleep).getTime() - 30 * 60000);
    for (let t = start.getTime(); t <= end.getTime(); t += everyMin * 60000) {
      if (t <= now.getTime() + 60000) continue;
      if (isToday && t - lastLog < 45 * 60000) continue;
      times.push(new Date(t));
    }
  }
  return times.slice(0, 40);
}

export async function scheduleReminders(plan: Plan) {
  if (Platform.OS === 'web') return 0;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const times = planReminders(plan);
    const file = REMINDER_SOUNDS.find((s) => s.id === plan.sound)?.file;
    await Promise.all(
      times.map((date, i) =>
        Notifications.scheduleNotificationAsync({
          content: { title: 'Sippy', body: LINES[(date.getHours() + i) % LINES.length], sound: file ?? 'default' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        }),
      ),
    );
    return times.length;
  } catch {
    return 0;
  }
}

export async function disableReminders() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
