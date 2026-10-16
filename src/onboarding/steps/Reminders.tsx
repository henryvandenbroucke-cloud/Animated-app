import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { play } from '../../lib/feedback';
import { enableReminders } from '../../lib/reminders';
import { useApp } from '../../lib/store';
import { colors, fonts, shadow } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

export function Reminders() {
  const { next, stage } = useOnboarding();
  const setApp = useApp((s) => s.set);

  useEffect(() => {
    stage({ mode: 'swim', pose: 'swim', bubble: undefined });
    play('whoosh');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const yes = async () => {
    const ok = await enableReminders();
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
          <Text style={styles.time}>now</Text>
        </View>
        <Text style={styles.msg}>Psst… I’m getting thirsty! Time for a sip 💧</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 14, alignItems: 'center', ...shadow },
  appIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  app: { fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft, letterSpacing: 1 },
  time: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  msg: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink, marginTop: 2 },
});
