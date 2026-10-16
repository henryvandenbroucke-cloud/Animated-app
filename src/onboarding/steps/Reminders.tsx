import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { feedback, play } from '../../lib/feedback';
import { requestReminderPermission } from '../../lib/reminders';
import { useApp } from '../../lib/store';
import { colors, fonts, shadow } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

export function Reminders() {
  const { next, stage } = useOnboarding();
  const setApp = useApp((s) => s.set);

  useEffect(() => {
    stage({ mode: 'swim', pose: 'swim', bubble: undefined });
    play('swim');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { wakeTime, sleepTime } = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const yes = async () => {
    const ok = Platform.OS === 'web' || (await requestReminderPermission());
    setApp({ remindersOn: ok });
    next();
  };

  return (
    <StepShell
      title="Want gentle nudges?"
      subtitle="I'll swim by a few times a day to remind you to sip."
      footer={
        <>
          <Button testID="reminders-yes" title="Yes, remind me" wiggle onPress={yes} />
          <Button variant="ghost" title="Not now" onPress={next} />
        </>
      }
    >
      <FakeNotification />
      <View style={styles.times}>
        <TimeStepper label="I wake up" value={wakeTime} onChange={(v) => setDraft({ wakeTime: v })} />
        <TimeStepper label="I go to bed" value={sleepTime} onChange={(v) => setDraft({ sleepTime: v })} />
      </View>
    </StepShell>
  );
}

/** A preview notification that slides down, waits, then slides away, on repeat. */
function FakeNotification() {
  const y = useSharedValue(-30);
  const o = useSharedValue(0);
  useEffect(() => {
    y.value = withRepeat(withSequence(withDelay(400, withSpring(0, { damping: 11 })), withDelay(2600, withTiming(-30, { duration: 300 }))), -1);
    o.value = withRepeat(withSequence(withDelay(400, withTiming(1, { duration: 250 })), withDelay(2600, withTiming(0, { duration: 300 }))), -1);
  }, [y, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={[styles.note, style]}>
      <View style={styles.appIcon}>
        <Text style={{ fontSize: 20 }}>💧</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.app}>SIPPY</Text>
          <Text style={styles.now}>now</Text>
        </View>
        <Text style={styles.msg}>Psst… I’m getting thirsty! Time for a sip 💧</Text>
      </View>
    </Animated.View>
  );
}

function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const shift = (m: number) => {
    feedback('tick', 'select');
    const [h, mm] = value.split(':').map(Number);
    const t = (((h * 60 + mm + m) % 1440) + 1440) % 1440;
    onChange(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  };
  const [h, m] = value.split(':').map(Number);
  return (
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <Pressable style={styles.round} onPress={() => shift(-30)} accessibilityLabel={`${label} earlier`}><Text style={styles.roundText}>−</Text></Pressable>
        <Text style={styles.time}>{`${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`}</Text>
        <Pressable style={styles.round} onPress={() => shift(30)} accessibilityLabel={`${label} later`}><Text style={styles.roundText}>+</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', gap: 10, marginTop: 16 },
  timeBox: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 10, alignItems: 'center' },
  timeLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  time: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, minWidth: 66, textAlign: 'center' },
  round: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.bold, fontSize: 18, color: colors.pinkDeep, marginTop: -2 },
  note: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 14, alignItems: 'center', ...shadow },
  appIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  app: { fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft, letterSpacing: 1 },
  now: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  msg: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink, marginTop: 2 },
});
