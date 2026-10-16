import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const HOURS = [10, 13, 16, 19];
const LINES = [
  'Psst… Sippy is getting thirsty! Time for a sip 💧',
  "Gills drooping a little. Got a glass of water nearby?",
  'Water break! Sippy will do a happy flip 🌊',
  'Last call for hydration today, you’ve got this!',
];

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Asks permission and schedules a few gentle daily nudges. Returns false if not possible. */
export async function enableReminders() {
  if (Platform.OS === 'web') return false;
  try {
    const { granted } = await Notifications.requestPermissionsAsync();
    if (!granted) return false;
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Promise.all(
      HOURS.map((hour, i) =>
        Notifications.scheduleNotificationAsync({
          content: { title: 'Sippy', body: LINES[i] },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 },
        }),
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export async function disableReminders() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
