import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { useApp } from '../../lib/store';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

const FEELINGS = [
  '⚡ More energy',
  '🧠 Sharper focus',
  '✨ Glowy skin',
  '😌 Fewer headaches',
  '😴 Better sleep',
  '🌈 Happier mood',
  '💪 Better workouts',
  '🌱 A healthy habit',
];

export function Feelings() {
  const { next, stage, act } = useOnboarding();
  const feelings = useApp((s) => s.draft.feelings);
  const setDraft = useApp((s) => s.setDraft);

  useEffect(() => {
    stage({ mode: 'normal', pose: 'idle', bubble: 'Pick as many as you like!' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (f: string) => {
    const on = feelings.includes(f);
    setDraft({ feelings: on ? feelings.filter((x) => x !== f) : [...feelings, f] });
    if (!on) act(feelings.length % 2 ? 'jump' : 'wiggle');
  };

  return (
    <StepShell
      title="How do you want to feel?"
      footer={<Button testID="feelings-next" title={feelings.length ? 'Continue' : 'Skip'} variant={feelings.length ? 'primary' : 'ghost'} onPress={next} />}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {FEELINGS.map((f, i) => (
          <Animated.View key={f} entering={ZoomIn.delay(250 + i * 70).springify().damping(10)}>
            <Chip label={f} selected={feelings.includes(f)} onPress={() => toggle(f)} />
          </Animated.View>
        ))}
      </View>
    </StepShell>
  );
}
