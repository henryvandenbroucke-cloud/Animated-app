import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { feedback } from '../lib/feedback';
import { useApp } from '../lib/store';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../theme';
import { Button } from './Button';

type Props = {
  mode: 'signup' | 'signin';
  name?: string;
  onModeChange: (mode: 'signup' | 'signin') => void;
  /** `confirmed` is false when Supabase still needs the user to confirm their email. */
  onDone: (confirmed: boolean) => void;
};

export function AuthForm({ mode, name, onModeChange, onDone }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const fail = (message: string) => {
    setError(message);
    feedback('error', 'warning');
    shake.set(withSequence(...[10, -10, 7, -7, 3, 0].map((v) => withTiming(v, { duration: 50 }))));
  };

  // Use the new session straight away instead of waiting for the auth event, so the next
  // screen never sees a signed-out state for a moment and bounces back here.
  const adopt = (session: NonNullable<ReturnType<typeof useApp.getState>['session']>) => {
    const prev = useApp.getState().session;
    useApp.setState({ session, authReady: true });
    if (prev?.user.id !== session.user.id) useApp.getState().loadAll();
  };

  const submit = async () => {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail('That email looks a bit off.');
    if (password.length < 6) return fail('Passwords need at least 6 characters.');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name?.trim() || null } },
        });
        if (error) return fail(error.message);
        if (data.session) adopt(data.session);
        onDone(!!data.session);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return fail(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
        if (data.session) adopt(data.session);
        onDone(true);
      }
    } catch (e) {
      fail(e instanceof Error ? e.message : 'Something went wrong. Try again?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View style={[styles.wrap, shakeStyle]} entering={FadeInDown.springify().damping(14)}>
      <TextInput
        testID="auth-email"
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.inkSoft}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="auth-password"
        style={styles.input}
        placeholder={mode === 'signup' ? 'Create a password' : 'Password'}
        placeholderTextColor={colors.inkSoft}
        secureTextEntry
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
      />
      {error && (
        <Animated.Text entering={FadeIn} style={styles.error}>
          {error}
        </Animated.Text>
      )}
      <Button testID="auth-submit" title={busy ? 'One sec…' : mode === 'signup' ? 'Create my account' : 'Sign in'} onPress={submit} disabled={busy} />
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>{mode === 'signup' ? 'Already have an account?' : 'New to Sippy?'}</Text>
        <Text
          style={styles.switchLink}
          onPress={() => {
            setError(null);
            onModeChange(mode === 'signup' ? 'signin' : 'signup');
          }}
        >
          {mode === 'signup' ? 'Sign in' : 'Create one'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%' },
  input: {
    height: 56,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: colors.line,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    fontFamily: fonts.medium,
    fontSize: 17,
    color: colors.ink,
  },
  error: { fontFamily: fonts.medium, color: '#D9435F', textAlign: 'center', fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 4 },
  switchText: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 15 },
  switchLink: { fontFamily: fonts.semibold, color: colors.pinkDeep, fontSize: 15 },
});
