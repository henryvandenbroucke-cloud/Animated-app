import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { withSpring } from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { VolumeSlider } from '../../components/VolumeSlider';
import { feedback, play } from '../../lib/feedback';
import { useApp } from '../../lib/store';
import { colors } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

const CAPACITY = 1000;

/** Let people feel the core interaction before they've signed up for anything. */
export function TryIt() {
  const { next, stage, act, level, ghost } = useOnboarding();
  const unit = useApp((s) => s.draft.unit);
  const [amount, setAmount] = useState(250);
  const [filled, setFilled] = useState(0);
  const [adds, setAdds] = useState(0);

  useEffect(() => {
    level.set(0);
    ghost.set(0);
    stage({ mode: 'tank', pose: 'idle', bubble: "I'm empty… fill me up!" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ghost.set(withSpring(Math.min(1, (filled + amount) / CAPACITY), { damping: 14 }));
  }, [amount, filled, ghost]);

  const add = () => {
    const total = Math.min(CAPACITY, filled + amount);
    setFilled(total);
    setAdds((n) => n + 1);
    level.set(withSpring(total / CAPACITY, { damping: 9, stiffness: 70 }));
    feedback('pour', 'medium');
    act('jump');
    if (total >= CAPACITY) {
      setTimeout(() => play('celebrate'), 350);
      stage({ pose: 'cheer', bubble: "Ahh, so refreshing! You're a natural." });
    } else {
      stage({ pose: 'idle', bubble: adds === 0 ? 'Ooh, that tickles! More?' : 'Glug glug glug!' });
    }
  };

  const full = filled >= CAPACITY;

  return (
    <StepShell
      title="Give it a try!"
      subtitle="Drag to pick how much you drank, then tap add."
      footer={
        <>
          {full ? (
            <Button
              title="Empty and refill"
              variant="soft"
              onPress={() => {
                setFilled(0);
                level.set(withSpring(0, { damping: 14 }));
                stage({ pose: 'idle', bubble: 'Again! Again!' });
              }}
            />
          ) : (
            <Button testID="try-add" title="Add water" color={colors.waterDeep} sound={null} onPress={add} />
          )}
          <Button testID="try-next" title={adds ? 'Continue' : 'Skip for now'} variant={adds ? 'primary' : 'ghost'} wiggle={full} onPress={next} />
        </>
      }
    >
      <View>
        <VolumeSlider value={amount} onChange={setAmount} unit={unit} max={750} />
      </View>
    </StepShell>
  );
}
