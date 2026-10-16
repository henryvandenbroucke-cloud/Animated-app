import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInLeft, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { feedback, play } from '../../lib/feedback';
import { colors, fonts } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

const STEPS = ['Calculating your daily goal', 'Planning gentle reminders', 'Warming up the pool', 'Teaching Sippy your name'];
const DURATION = 3600;

export function Building() {
  const { next, stage } = useOnboarding();
  const p = useSharedValue(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    stage({ mode: 'normal', pose: 'sip', bubble: 'Just a sec…' });
    p.value = withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.quad) });
    const start = Date.now();
    const iv = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / DURATION);
      // Matches the bar's ease-in-out curve.
      setPct(Math.round(100 * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)));
    }, 50);
    const done = setTimeout(() => {
      play('success');
      stage({ pose: 'cheer', bubble: 'All set!' });
    }, DURATION + 100);
    const go = setTimeout(next, DURATION + 1100);
    return () => {
      clearInterval(iv);
      clearTimeout(done);
      clearTimeout(go);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bar = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const finished = Math.floor((pct / 100) * STEPS.length + 0.05);

  return (
    <StepShell title="Building your plan">
      <View style={{ gap: 18 }}>
        <Text style={styles.pct}>{pct}%</Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
        <View style={{ gap: 10, marginTop: 6 }}>
          {STEPS.map((s, i) => (i <= finished ? <Item key={s} label={s} done={i < finished} /> : null))}
        </View>
      </View>
    </StepShell>
  );
}

function Item({ label, done }: { label: string; done: boolean }) {
  useEffect(() => {
    if (done) feedback('pop', 'light');
  }, [done]);
  return (
    <Animated.View entering={FadeInLeft.springify().damping(14)} style={styles.item}>
      <View style={[styles.check, done && { backgroundColor: colors.mint, borderColor: colors.mint }]}>
        {done && (
          <Animated.Text entering={ZoomIn.springify()} style={styles.tick}>
            ✓
          </Animated.Text>
        )}
      </View>
      <Text style={[styles.itemText, done && { color: colors.ink }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pct: { fontFamily: fonts.bold, fontSize: 44, color: colors.pinkDeep, textAlign: 'center' },
  track: { height: 16, borderRadius: 8, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 16, borderRadius: 8, backgroundColor: colors.water },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  tick: { color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  itemText: { fontFamily: fonts.medium, fontSize: 17, color: colors.inkSoft },
});
