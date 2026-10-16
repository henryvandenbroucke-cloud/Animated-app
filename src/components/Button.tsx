import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { feedback, type Sound } from '../lib/feedback';
import { colors, fonts, shadow } from '../theme';

type Props = {
  title?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'soft';
  color?: string;
  disabled?: boolean;
  /** Wiggle every few seconds to invite a tap (stops once pressed). */
  wiggle?: boolean;
  sound?: Sound | null;
  style?: ViewStyle;
  testID?: string;
};

/**
 * An occasional "tap me" nudge: after a few idle seconds the element lifts a touch,
 * tilts once and settles on a spring. It waits a random 5–9 s before nudging again,
 * so it reads as a friendly hint rather than something constantly shaking.
 * Returns rotation (deg); pair it with `useNudgeLift` for the matching scale.
 */
export function useWiggle(active: boolean, delay = 3200) {
  const rot = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      rot.set(withSpring(0));
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const nudge = (wait: number) => {
      timer = setTimeout(() => {
        rot.set(
          withSequence(
            withTiming(-2.5, { duration: 110, easing: Easing.out(Easing.quad) }),
            withTiming(3, { duration: 160, easing: Easing.inOut(Easing.sin) }),
            withSpring(0, { damping: 8, stiffness: 180 }),
          ),
        );
        nudge(5000 + Math.random() * 4000);
      }, wait);
    };
    nudge(delay);
    return () => clearTimeout(timer);
  }, [active, delay, rot]);
  return rot;
}

export function Button({ title, children, onPress, variant = 'primary', color = colors.pinkDeep, disabled, wiggle, sound = 'tap', style, testID }: Props) {
  const scale = useSharedValue(1);
  const rot = useWiggle(!!wiggle && !disabled);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * (1 + Math.abs(rot.value) * 0.012) }, { rotate: `${rot.value}deg` }],
    opacity: withTiming(disabled ? 0.45 : 1),
  }));

  const bg = variant === 'primary' ? color : variant === 'soft' ? colors.pinkPale : 'transparent';
  const fg = variant === 'primary' ? '#fff' : variant === 'soft' ? colors.pinkDeep : colors.inkSoft;

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPressIn={() => scale.set(withSpring(0.93, { damping: 15, stiffness: 400 }))}
      onPressOut={() => scale.set(withSpring(1, { damping: 7, stiffness: 300 }))}
      onPress={() => {
        if (sound) feedback(sound, 'light');
        onPress?.();
      }}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.base, { backgroundColor: bg }, variant === 'primary' && shadow, style, anim]}>
        {children ?? <Text style={[styles.label, { color: fg }, variant === 'ghost' && styles.ghostLabel]}>{title}</Text>}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 28,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: { fontFamily: fonts.semibold, fontSize: 19, letterSpacing: 0.2 },
  ghostLabel: { fontSize: 16, fontFamily: fonts.medium },
});
