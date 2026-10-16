import { useEffect, useRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Button } from '../../components/Button';
import { play } from '../../lib/feedback';
import { useApp } from '../../lib/store';
import { colors, fonts } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

export function Name() {
  const { next, stage, act } = useOnboarding();
  const name = useApp((s) => s.draft.name);
  const setDraft = useApp((s) => s.setDraft);
  const lastLen = useRef(name.length);

  useEffect(() => {
    stage({ mode: 'normal', pose: 'listen', bubble: name ? `Hi ${name.trim()}!` : "What's your name?" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (v: string) => {
    setDraft({ name: v.slice(0, 24) });
    stage({ bubble: v.trim() ? `Hi ${v.trim()}!` : "What's your name?" });
    if (v.length > lastLen.current) play('tick');
    if (lastLen.current === 0 && v.length === 1) act('nod');
    lastLen.current = v.length;
  };

  return (
    <StepShell
      title="What should I call you?"
      subtitle="I like to know who I'm swimming with."
      footer={
        <>
          <Button testID="name-next" title="Continue" disabled={!name.trim()} onPress={next} />
          <Button variant="ghost" title="Skip" onPress={next} />
        </>
      }
    >
      <TextInput
        testID="name-input"
        style={styles.input}
        value={name}
        onChangeText={onChange}
        placeholder="Your name"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => name.trim() && next()}
      />
    </StepShell>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 64,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: colors.pink,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 24,
    color: colors.ink,
  },
});
