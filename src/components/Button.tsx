import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
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
  sound?: Sound;
  style?: ViewStyle;
  testID?: string;
};

export function useWiggle(active: boolean, delay = 1800) {
  const rot = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      rot.set(withSpring(0));
      return;
    }
    rot.value = withRepeat(
      withSequence(
        withDelay(delay, withTiming(-4, { duration: 70 })),
        withTiming(4, { duration: 70 }),
        withTiming(-3, { duration: 70 }),
        withTiming(3, { duration: 70 }),
        withTiming(0, { duration: 70 }),
      ),
      -1,
    );
  }, [active, delay, rot]);
  return rot;
}

export function Button({ title, children, onPress, variant = 'primary', color = colors.pinkDeep, disabled, wiggle, sound = 'pop', style, testID }: Props) {
  const scale = useSharedValue(1);
  const rot = useWiggle(!!wiggle && !disabled);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
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
        feedback(sound, 'light');
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
