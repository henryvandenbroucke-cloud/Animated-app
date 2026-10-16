import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthForm } from '../components/AuthForm';
import { Button } from '../components/Button';
import { useApp } from '../lib/store';
import { Sippy, type Action } from '../mascot/Sippy';
import { colors, fonts } from '../theme';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signup' | 'signin'>('signin');
  const [action, setAction] = useState<Action>();
  const name = useApp((s) => s.draft.name);
  const setApp = useApp((s) => s.set);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Sippy size={190} pose={mode === 'signin' ? 'wave' : 'listen'} action={action} />
          <Animated.Text entering={FadeInDown.springify()} style={styles.title}>
            {mode === 'signin' ? 'Welcome back!' : 'Join Sippy'}
          </Animated.Text>
          <Text style={styles.sub}>{notice ?? (mode === 'signin' ? 'Sippy missed you. Sign in to keep your streak.' : 'Create an account to save your progress.')}</Text>
          <View style={{ width: '100%', marginTop: 18 }}>
            <AuthForm
              mode={mode}
              name={name}
              onModeChange={(m) => {
                setMode(m);
                setAction((a) => ({ type: 'spin', key: (a?.key ?? 0) + 1 }));
              }}
              onDone={(confirmed) => {
                if (confirmed) {
                  setAction((a) => ({ type: 'jump', key: (a?.key ?? 0) + 1 }));
                  router.replace('/');
                } else {
                  setNotice('Check your inbox and tap the link, then sign in here.');
                  setMode('signin');
                }
              }}
            />
          </View>
          <Button
            variant="ghost"
            title="Start over with the intro"
            style={{ marginTop: 8 }}
            onPress={() => {
              setApp({ onboardingDone: false });
              router.replace('/onboarding');
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { alignItems: 'center', padding: 24, paddingTop: 30, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.ink, marginTop: 8 },
  sub: { fontFamily: fonts.regular, fontSize: 16, color: colors.inkSoft, textAlign: 'center', marginTop: 6 },
});
