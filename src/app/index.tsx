import { Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useApp } from '../lib/store';
import { useHydrated } from '../lib/useHydrated';
import { Sippy } from '../mascot/Sippy';
import { colors, fonts } from '../theme';

/** Decides where to go: onboarding, sign-in, or the app. Shows a bobbing Sippy meanwhile. */
export default function Gate() {
  const hydrated = useHydrated();
  const { authReady, session, profile, loading, onboardingDone } = useApp();

  if (hydrated && authReady) {
    if (!session) return <Redirect href={onboardingDone ? '/auth' : '/onboarding'} />;
    if (profile && !loading) {
      return <Redirect href={profile.onboarded_at || onboardingDone ? '/(tabs)' : '/onboarding'} />;
    }
  }

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center' }}>
        <Sippy size={180} pose="swim" />
        <Text style={styles.title}>Sippy</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontFamily: fonts.bold, fontSize: 34, color: colors.pinkDeep, marginTop: 8 },
});
