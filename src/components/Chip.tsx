import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { feedback } from '../lib/feedback';
import { colors, fonts } from '../theme';
import { useWiggle } from './Button';

type Props = {
  label: string;
  icon?: ReactNode;
  selected: boolean;
  onPress: () => void;
  /** Wiggle while nothing in the group has been picked yet. */
  invite?: boolean;
  wiggleDelay?: number;
  big?: boolean;
  testID?: string;
};

export function Chip({ label, icon, selected, onPress, invite, wiggleDelay, big, testID }: Props) {
  const scale = useSharedValue(1);
  const rot = useWiggle(!!invite && !selected, wiggleDelay);
  const sel = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    sel.value = withTiming(selected ? 1 : 0, { duration: 180 });
    if (selected) scale.value = withSequence(withTiming(1.12, { duration: 110 }), withSpring(1, { damping: 6 }));
  }, [selected, scale, sel]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rot.value}deg` }],
    borderColor: sel.value > 0.5 ? colors.pinkDeep : colors.line,
    backgroundColor: sel.value > 0.5 ? colors.pinkPale : colors.card,
  }));

  return (
    <Pressable testID={testID} onPress={() => { feedback('pop', 'select'); onPress(); }} accessibilityRole="button" accessibilityState={{ selected }}>
      <Animated.View style={[styles.chip, big && styles.big, anim]}>
        {icon}
        <Text style={[styles.label, big && styles.bigLabel, selected && { color: colors.pinkDeep }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 2.5,
  },
  big: { flexDirection: 'column', paddingVertical: 18, paddingHorizontal: 18, borderRadius: 26, minWidth: 140 },
  label: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  bigLabel: { fontSize: 18, fontFamily: fonts.semibold },
});
