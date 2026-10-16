import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { useCountUp } from '../../components/useCountUp';
import { feedback } from '../../lib/feedback';
import { computeGoalMl, KG_PER_LB, type Activity, type Climate } from '../../lib/goal';
import { useApp } from '../../lib/store';
import { formatAmount } from '../../lib/units';
import { colors, fonts, shadow } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell, text } from '../StepShell';

const ACTIVITY: { id: Activity; label: string; icon: string }[] = [
  { id: 'chill', label: 'Chill', icon: '🛋️' },
  { id: 'active', label: 'Active', icon: '🚶' },
  { id: 'athlete', label: 'Athlete', icon: '🏃' },
];
const CLIMATE: { id: Climate; label: string; icon: string }[] = [
  { id: 'cool', label: 'Cool', icon: '❄️' },
  { id: 'mild', label: 'Mild', icon: '🌤️' },
  { id: 'hot', label: 'Hot', icon: '☀️' },
];

export function AboutYou() {
  const { next, stage, act } = useOnboarding();
  const { weightKg, activity, climate, unit } = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const goal = computeGoalMl(weightKg, activity, climate);
  const shown = useCountUp(goal, 500);

  useEffect(() => {
    stage({ mode: 'normal', pose: 'idle', bubble: "I'll work out your perfect amount." });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setDraft({ goalMl: goal });
  }, [goal, setDraft]);

  const imperial = unit === 'oz';
  const weightShown = imperial ? Math.round(weightKg / KG_PER_LB) : Math.round(weightKg);
  const stepWeight = (dir: number) => {
    feedback('tick', 'select');
    const nextKg = imperial ? (weightShown + dir * 5) * KG_PER_LB : weightKg + dir * 2;
    setDraft({ weightKg: Math.min(200, Math.max(30, nextKg)) });
  };

  return (
    <StepShell title="A little about you" footer={<Button testID="about-next" title="Continue" onPress={next} />}>
      <View style={{ gap: 18 }}>
        <View>
          <Text style={text.label}>Weight</Text>
          <View style={styles.weightRow}>
            <Round label="−" onPress={() => stepWeight(-1)} />
            <Text style={styles.weight}>
              {weightShown}
              <Text style={styles.weightUnit}> {imperial ? 'lb' : 'kg'}</Text>
            </Text>
            <Round label="+" onPress={() => stepWeight(1)} />
          </View>
        </View>
        <View>
          <Text style={text.label}>How active are you?</Text>
          <View style={styles.row}>
            {ACTIVITY.map((a) => (
              <Chip key={a.id} label={`${a.icon} ${a.label}`} selected={activity === a.id} onPress={() => { setDraft({ activity: a.id }); act(a.id === 'athlete' ? 'jump' : 'nod'); }} />
            ))}
          </View>
        </View>
        <View>
          <Text style={text.label}>Where you live is usually…</Text>
          <View style={styles.row}>
            {CLIMATE.map((c) => (
              <Chip key={c.id} label={`${c.icon} ${c.label}`} selected={climate === c.id} onPress={() => { setDraft({ climate: c.id }); act('wiggle'); }} />
            ))}
          </View>
        </View>
        <View style={styles.goalCard}>
          <Text style={styles.goalLabel}>Your daily goal so far</Text>
          <Text style={styles.goal}>{formatAmount(shown, unit)}</Text>
        </View>
      </View>
    </StepShell>
  );
}

function Round({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.round, pressed && { transform: [{ scale: 0.9 }] }]} accessibilityRole="button" accessibilityLabel={label === '+' ? 'More' : 'Less'}>
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weightRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weight: { fontFamily: fonts.bold, fontSize: 38, color: colors.ink },
  weightUnit: { fontFamily: fonts.medium, fontSize: 20, color: colors.inkSoft },
  round: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.bold, fontSize: 28, color: colors.pinkDeep, marginTop: -2 },
  goalCard: { backgroundColor: '#fff', borderRadius: 22, padding: 14, alignItems: 'center', ...shadow },
  goalLabel: { fontFamily: fonts.medium, color: colors.inkSoft, fontSize: 14 },
  goal: { fontFamily: fonts.bold, fontSize: 30, color: colors.waterDeep },
});
