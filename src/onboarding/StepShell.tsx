import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, fonts } from '../theme';

export function StepShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children?: ReactNode; footer?: ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Animated.Text entering={FadeInDown.delay(60).springify().damping(14)} style={styles.title}>
        {title}
      </Animated.Text>
      {subtitle ? (
        <Animated.Text entering={FadeInDown.delay(140).springify().damping(14)} style={styles.subtitle}>
          {subtitle}
        </Animated.Text>
      ) : null}
      <Animated.View entering={FadeInDown.delay(220).springify().damping(14)} style={styles.body}>
        {children}
      </Animated.View>
      {footer ? (
        <Animated.View entering={FadeInDown.delay(320).springify().damping(14)} style={styles.footer}>
          {footer}
        </Animated.View>
      ) : null}
    </View>
  );
}

export const text = StyleSheet.create({
  big: { fontFamily: fonts.bold, fontSize: 56, color: colors.pinkDeep, textAlign: 'center' },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.inkSoft, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontFamily: fonts.regular, fontSize: 16, color: colors.inkSoft, textAlign: 'center' },
});

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24 },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink, textAlign: 'center', lineHeight: 36 },
  subtitle: { fontFamily: fonts.regular, fontSize: 17, color: colors.inkSoft, textAlign: 'center', marginTop: 8, lineHeight: 23 },
  body: { flex: 1, justifyContent: 'center', paddingVertical: 12 },
  footer: { gap: 6, paddingBottom: 12 },
});
