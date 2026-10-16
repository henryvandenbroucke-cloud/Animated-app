import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Confetti } from '../../components/Confetti';
import { useCountUp } from '../../components/useCountUp';
import { feedback, play } from '../../lib/feedback';
import { clampGoal } from '../../lib/goal';
import { useApp } from '../../lib/store';
import { formatAmount, ML_PER_OZ } from '../../lib/units';
import { colors, fonts } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell, text } from '../StepShell';

export function Goal() {
  const { next, stage, act } = useOnboarding();
  const { goalMl, unit } = useApp((s) => s.draft);
  const setDraft = useApp((s) => s.setDraft);
  const [target, setTarget] = useState(0);
  const [burst, setBurst] = useState(0);
  const shown = useCountUp(target, 900);

  useEffect(() => {
    stage({ mode: 'normal', pose: 'cheer', bubble: undefined });
    const t = setTimeout(() => {
      setTarget(goalMl);
      setBurst(1);
      play('success');
      act('jump');
    }, 350);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nudge = (dir: number) => {
    const delta = unit === 'oz' ? 4 * ML_PER_OZ : 100;
    const v = clampGoal(Math.round(goalMl + dir * delta));
    setDraft({ goalMl: v });
    setTarget(v);
    feedback('tick', 'select');
    act('nod');
  };

  const glasses = Math.round(goalMl / 250);

  return (
    <StepShell
      title="Your daily goal"
      footer={<Button testID="goal-next" title="Sounds good!" wiggle onPress={next} />}
    >
      <View style={{ alignItems: 'center' }}>
        <Confetti burst={burst} />
        <Text style={text.big}>{formatAmount(shown, unit, false)}</Text>
        <Text style={styles.unit}>{unit} a day</Text>
        <Text style={[text.body, { marginTop: 10 }]}>That’s about {glasses} glasses. I’ll keep count.</Text>
        <View style={styles.adjust}>
          <Pressable style={styles.pill} onPress={() => nudge(-1)} accessibilityRole="button">
            <Text style={styles.pillText}>− Less</Text>
          </Pressable>
          <Pressable style={styles.pill} onPress={() => nudge(1)} accessibilityRole="button">
            <Text style={styles.pillText}>+ More</Text>
          </Pressable>
        </View>
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  unit: { fontFamily: fonts.semibold, fontSize: 20, color: colors.inkSoft, marginTop: -6 },
  adjust: { flexDirection: 'row', gap: 12, marginTop: 18 },
  pill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.pinkPale },
  pillText: { fontFamily: fonts.semibold, color: colors.pinkDeep, fontSize: 16 },
});
