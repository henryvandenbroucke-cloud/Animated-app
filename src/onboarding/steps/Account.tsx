import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { AuthForm } from '../../components/AuthForm';
import { Button } from '../../components/Button';
import { Confetti } from '../../components/Confetti';
import { play } from '../../lib/feedback';
import { useApp } from '../../lib/store';
import { colors, fonts } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell, text } from '../StepShell';

/** Last step: create the account (or, if already signed in, just save the answers). */
export function Account() {
  const { stage, act } = useOnboarding();
  const name = useApp((s) => s.draft.name);
  const session = useApp((s) => s.session);
  const saveDraftToProfile = useApp((s) => s.saveDraftToProfile);
  const setApp = useApp((s) => s.set);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [state, setState] = useState<'form' | 'inbox' | 'done'>('form');
  const [burst, setBurst] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    stage({ mode: 'normal', pose: 'wave', bubble: session ? 'Ready when you are!' : "Let's save your progress!" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const celebrate = async () => {
    setApp({ onboardingDone: true });
    setState('done');
    setBurst((b) => b + 1);
    play('celebrate');
    act('jump');
    stage({ pose: 'cheer', bubble: `Yay${name.trim() ? `, ${name.trim()}` : ''}! Let's go!` });
    try {
      // The session can take a moment to land in the store after sign-up.
      for (let i = 0; i < 20 && !useApp.getState().session; i++) await new Promise((r) => setTimeout(r, 100));
      await useApp.getState().loadAll();
      await saveDraftToProfile();
      setTimeout(() => router.replace('/(tabs)'), 1300);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save your answers.');
    }
  };

  if (state === 'inbox') {
    return (
      <StepShell
        title="Check your inbox"
        subtitle="Tap the link we just emailed you, then sign in. Your answers are saved on this phone."
        footer={<Button title="I've confirmed, sign in" onPress={() => router.replace('/auth')} />}
      >
        <Animated.Text entering={ZoomIn.springify().damping(8)} style={styles.envelope}>
          💌
        </Animated.Text>
      </StepShell>
    );
  }

  if (state === 'done') {
    return (
      <StepShell title="You're all set!">
        <Confetti burst={burst} count={40} spread={220} />
        <Text style={text.body}>{saveError ?? 'Filling up your pool…'}</Text>
        {saveError && <Button title="Try again" onPress={celebrate} style={{ marginTop: 16 }} />}
      </StepShell>
    );
  }

  return (
    <StepShell title={session ? 'All done!' : mode === 'signup' ? 'Save your progress' : 'Welcome back'} subtitle={session ? undefined : 'So Sippy remembers you on any device.'}>
      {session ? (
        <Button testID="account-finish" title="Start sipping" wiggle onPress={celebrate} />
      ) : (
        <View>
          <AuthForm
            mode={mode}
            name={name}
            onModeChange={setMode}
            onDone={(confirmed) => {
              if (confirmed) celebrate();
              else {
                setApp({ onboardingDone: true });
                setState('inbox');
                stage({ pose: 'sleep', bubble: 'Zzz… waiting for your email' });
              }
            }}
          />
        </View>
      )}
    </StepShell>
  );
}

const styles = StyleSheet.create({
  envelope: { fontSize: 90, textAlign: 'center', fontFamily: fonts.regular, color: colors.ink },
});
