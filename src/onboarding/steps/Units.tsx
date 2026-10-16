import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { DrinkIcon } from '../../components/DrinkIcon';
import { BUILTIN_DRINKS } from '../../lib/drinks';
import { useApp } from '../../lib/store';
import type { Unit } from '../../lib/units';
import { colors, fonts } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

export function Units() {
  const { next, stage, act } = useOnboarding();
  const unit = useApp((s) => s.draft.unit);
  const setDraft = useApp((s) => s.setDraft);
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    stage({ mode: 'normal', pose: 'idle', bubble: 'Millilitres or ounces?' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (u: Unit) => {
    setDraft({ unit: u });
    setPicked(true);
    act('nod');
    stage({ bubble: u === 'ml' ? 'Metric it is!' : 'Ounces, got it!' });
  };

  const opts: { u: Unit; label: string; hint: string; drink: number }[] = [
    { u: 'ml', label: 'Millilitres', hint: 'ml', drink: 0 },
    { u: 'oz', label: 'Ounces', hint: 'fl oz', drink: 1 },
  ];

  return (
    <StepShell
      title="How do you measure drinks?"
      subtitle="You can change this any time."
      footer={<Button testID="units-next" title="Continue" disabled={!picked} wiggle={picked} onPress={next} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
        {opts.map((o, i) => (
          <Chip
            key={o.u}
            testID={`unit-${o.u}`}
            big
            label={o.label}
            selected={picked && unit === o.u}
            invite={!picked}
            wiggleDelay={1400 + i * 350}
            onPress={() => choose(o.u)}
            icon={
              <View style={{ alignItems: 'center' }}>
                <DrinkIcon drink={BUILTIN_DRINKS[o.drink]} size={56} />
                <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: colors.waterDeep }}>{o.hint}</Text>
              </View>
            }
          />
        ))}
      </View>
    </StepShell>
  );
}
