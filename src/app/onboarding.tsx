import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { feedback } from '../lib/feedback';
import { OnboardingContext, type Onboarding, type StageState } from '../onboarding/context';
import { Stage } from '../onboarding/Stage';
import { AboutYou } from '../onboarding/steps/AboutYou';
import { Account } from '../onboarding/steps/Account';
import { Building } from '../onboarding/steps/Building';
import { Feelings } from '../onboarding/steps/Feelings';
import { Goal } from '../onboarding/steps/Goal';
import { Name } from '../onboarding/steps/Name';
import { Paywall } from '../onboarding/steps/Paywall';
import { Reminders } from '../onboarding/steps/Reminders';
import { TryIt } from '../onboarding/steps/TryIt';
import { Units } from '../onboarding/steps/Units';
import { Welcome } from '../onboarding/steps/Welcome';
import { colors, fonts } from '../theme';

const STEPS = [Welcome, Name, Units, TryIt, AboutYou, Goal, Reminders, Feelings, Building, Paywall, Account];
// Steps you can't go back from (the auto-advancing loader and what follows it).
const NO_BACK = new Set([0, 8, 9, 10]);

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [stage, setStage] = useState<StageState>({ mode: 'rise', pose: 'wave' });
  const level = useSharedValue(0);
  const ghost = useSharedValue(0);
  const progress = useSharedValue(0);

  const go = useCallback(
    (to: number) => {
      const clamped = Math.max(0, Math.min(STEPS.length - 1, to));
      setDir(clamped >= step ? 1 : -1);
      setStep(clamped);
      progress.set(withSpring(clamped / (STEPS.length - 1), { damping: 14 }));
    },
    [step, progress],
  );

  const ctx = useMemo<Onboarding>(
    () => ({
      next: () => go(step + 1),
      // `compact` only lasts for the step that asks for it.
      stage: (patch) => setStage((s) => ({ ...s, compact: false, ...patch })),
      act: (type) => setStage((s) => ({ ...s, action: { type, key: (s.action?.key ?? 0) + 1 } })),
      level,
      ghost,
    }),
    [go, step, level, ghost],
  );

  const bar = useAnimatedStyle(() => ({ width: `${8 + progress.value * 92}%` }));
  const Step = STEPS[step];
  const stageHeight = Math.min(300, height * 0.34) * (stage.compact ? 0.62 : 1);
  const contentWidth = Math.min(width, 480);

  return (
    <OnboardingContext.Provider value={ctx}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.column, { width: contentWidth }]}>
          <View style={styles.topRow}>
            <Pressable
              onPress={() => {
                feedback('tap', 'light');
                go(step - 1);
              }}
              disabled={NO_BACK.has(step)}
              style={[styles.back, NO_BACK.has(step) && { opacity: 0 }]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.backText}>‹</Text>
            </Pressable>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, bar]} />
            </View>
            <View style={styles.back} />
          </View>

          <Stage width={contentWidth} height={stageHeight} level={level} ghost={ghost} {...stage} />

          <View style={{ flex: 1 }}>
            <Animated.View
              key={step}
              style={StyleSheet.absoluteFill}
              entering={(dir > 0 ? SlideInRight : SlideInLeft).springify().damping(18).stiffness(140)}
              exiting={(dir > 0 ? SlideOutLeft : SlideOutRight).duration(220)}
            >
              <Step />
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </OnboardingContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { flex: 1, overflow: 'hidden' },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 6, gap: 8 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontFamily: fonts.bold, fontSize: 34, color: colors.inkSoft, marginTop: -4 },
  track: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.pinkDeep },
});
