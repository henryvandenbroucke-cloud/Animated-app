import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeInRight, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { Button } from '../../components/Button';
import { feedback } from '../../lib/feedback';
import { colors, fonts, shadow } from '../../theme';
import { useOnboarding } from '../context';
import { StepShell } from '../StepShell';

const PERKS = ['Unlimited custom drinks', 'Smart reminder timing', 'Pool themes for Sippy', 'Weekly hydration insights'];

/** Mock paywall: shows the pattern from the reference app, but never charges anything. */
export function Paywall() {
  const { next, stage } = useOnboarding();
  const [plan, setPlan] = useState<'year' | 'month'>('year');

  useEffect(() => {
    stage({ mode: 'normal', pose: 'wave', bubble: 'Wanna make me extra fancy?' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StepShell
      title="Sippy Plus"
      subtitle="Try everything free for 7 days."
      footer={
        <>
          <Shimmer>
            <Button testID="paywall-continue" title="Start free trial" onPress={next} />
          </Shimmer>
          <Button variant="ghost" title="Maybe later" onPress={next} />
          <Text style={styles.note}>Demo screen: no payment is taken.</Text>
        </>
      }
    >
      <View style={{ gap: 7, marginBottom: 14 }}>
        {PERKS.map((p, i) => (
          <Animated.View key={p} entering={FadeInRight.delay(300 + i * 110).springify().damping(13)} style={styles.perk}>
            <Text style={styles.perkIcon}>💧</Text>
            <Text style={styles.perkText}>{p}</Text>
          </Animated.View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Plan label="Yearly" price="$29.99/yr" sub="$2.49 a month" tag="Best value" selected={plan === 'year'} onPress={() => setPlan('year')} />
        <Plan label="Monthly" price="$4.99/mo" sub="Cancel any time" selected={plan === 'month'} onPress={() => setPlan('month')} />
      </View>
    </StepShell>
  );
}

function Plan({ label, price, sub, tag, selected, onPress }: { label: string; price: string; sub: string; tag?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.plan, selected && styles.planOn]}
      onPress={() => {
        feedback('select', 'select');
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {tag && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      )}
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planPrice}>{price}</Text>
      <Text style={styles.planSub}>{sub}</Text>
    </Pressable>
  );
}

function Shimmer({ children }: { children: React.ReactNode }) {
  const x = useSharedValue(0);
  const [w, setW] = useState(300);
  useEffect(() => {
    x.value = withRepeat(withDelay(900, withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) })), -1);
  }, [x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: -80 + x.value * (w + 160) }, { rotate: '20deg' }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ borderRadius: 28, overflow: 'hidden' }}>
      {children}
      <Animated.View pointerEvents="none" style={[styles.shine, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  perk: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perkIcon: { fontSize: 16 },
  perkText: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  plan: { flex: 1, borderRadius: 22, borderWidth: 3, borderColor: colors.line, backgroundColor: '#fff', padding: 14, alignItems: 'center' },
  planOn: { borderColor: colors.pinkDeep, ...shadow },
  planLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.inkSoft },
  planPrice: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, marginTop: 2 },
  planSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  tag: { position: 'absolute', top: -12, backgroundColor: colors.sun, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, textAlign: 'center' },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 36, backgroundColor: 'rgba(255,255,255,0.45)' },
});
