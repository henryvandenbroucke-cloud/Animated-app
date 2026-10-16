import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BouncyText } from '../../components/BouncyText';
import { Button } from '../../components/Button';
import { play } from '../../lib/feedback';
import { colors, fonts } from '../../theme';
import { useOnboarding } from '../context';

export function Welcome() {
  const { next, stage, act } = useOnboarding();

  useEffect(() => {
    stage({ mode: 'rise', pose: 'wave', bubble: undefined });
    const t1 = setTimeout(() => play('splash'), 300);
    const t2 = setTimeout(() => act('jump'), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.wrap}>
      <BouncyText text="Hi, I'm Sippy!" style={styles.title} delay={500} />
      <Animated.Text entering={FadeIn.delay(1300).duration(600)} style={styles.sub}>
        A thirsty little axolotl. Keep me full of water and you’ll stay hydrated too.
      </Animated.Text>
      <View style={{ flex: 1 }} />
      <Animated.View entering={FadeIn.delay(1700)} style={{ gap: 6 }}>
        <Button testID="welcome-start" title="Let's be friends" wiggle onPress={next} />
        <Button variant="ghost" title="I already have an account" onPress={() => router.push('/auth')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title: { fontFamily: fonts.bold, fontSize: 42, color: colors.pinkDeep },
  sub: { fontFamily: fonts.regular, fontSize: 18, color: colors.inkSoft, textAlign: 'center', marginTop: 12, lineHeight: 25 },
});
