import { useEffect } from 'react';
import { disableReminders, scheduleReminders } from './reminders';
import { useApp } from './store';

/** Keeps the smart reminder schedule in step with the plan and today's drinks. */
export function useReminderSync() {
  const remindersOn = useApp((s) => s.remindersOn);
  const profile = useApp((s) => s.profile);
  const logs = useApp((s) => s.logs);

  useEffect(() => {
    if (!profile) return;
    if (!remindersOn) {
      disableReminders();
      return;
    }
    // Debounced: logging several drinks in a row reschedules once.
    const t = setTimeout(() => {
      scheduleReminders({
        wake: profile.wake_time,
        sleep: profile.sleep_time,
        everyMin: profile.reminder_every_min,
        sound: profile.reminder_sound,
        goalMl: profile.daily_goal_ml,
        logs,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [remindersOn, profile, logs]);
}
