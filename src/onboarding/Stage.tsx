import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Sippy, type Action, type Pose } from '../mascot/Sippy';
import { colors, fonts, shadow } from '../theme';
import { Water } from '../water/Water';
import type { StageMode } from './context';

type Props = {
  width: number;
  height: number;
  mode: StageMode;
  pose: Pose;
  action?: Action;
  bubble?: string;
  level: SharedValue<number>;
  ghost: SharedValue<number>;
};

/** The persistent hero area: Sippy stays on stage across steps and just changes what it's doing. */
export function Stage({ width, height, mode, pose, action, bubble, level, ghost }: Props) {
  const size = Math.min(height * 0.86, 230);

  // Welcome: Sippy pops up out of a pool of water.
  const rise = useSharedValue(mode === 'rise' ? 1 : 0);
  const seaLevel = useSharedValue(mode === 'rise' ? 0.32 : 0);
  // Reminders: Sippy swims back and forth.
  const swimX = useSharedValue(0);
  const full = useSharedValue(0.86);
  const facing = useSharedValue(1);

  useEffect(() => {
    if (mode === 'rise') {
      rise.value = 1;
      rise.value = withDelay(250, withSpring(0, { damping: 9, stiffness: 70 }));
    }
    seaLevel.value = withTiming(mode === 'rise' ? 0.32 : 0, { duration: 600 });

    if (mode === 'swim') {
      const R = width / 2 + size / 2;
      const leg = 2600;
      swimX.value = -R;
      swimX.value = withRepeat(
        withSequence(
          withTiming(R, { duration: leg, easing: Easing.inOut(Easing.sin) }),
          withTiming(-R, { duration: leg, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
      facing.value = 1;
      facing.value = withRepeat(
        withSequence(withDelay(leg - 150, withTiming(-1, { duration: 300 })), withDelay(leg - 450, withTiming(1, { duration: 300 }))),
        -1,
      );
    } else {
      swimX.value = withSpring(0, { damping: 14 });
      facing.value = withTiming(1);
    }
  }, [mode, width, size]); // eslint-disable-line react-hooks/exhaustive-deps

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateX: swimX.value },
      { translateY: rise.value * size * 0.9 },
      { scaleX: facing.value },
    ],
  }));

  const sea = useAnimatedStyle(() => ({ opacity: seaLevel.value > 0.01 ? 1 : 0 }));

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <Animated.View style={body}>
        <Sippy
          size={size}
          pose={pose}
          action={action}
          tank={mode === 'tank' ? { level, ghost, maskColor: colors.bg } : undefined}
        />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.4 }, sea]} pointerEvents="none">
        <Water width={width} height={height * 0.4} level={full} color="rgba(94,194,247,0.85)" deep="rgba(47,163,230,0.6)" />
      </Animated.View>
      {bubble ? <Bubble key={bubble} text={bubble} top={Math.max(0, height - size - 54)} /> : null}
    </View>
  );
}

function Bubble({ text, top }: { text: string; top: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withSpring(1, { damping: 8, stiffness: 180 });
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: 0.5 + p.value * 0.5 }, { translateY: (1 - p.value) * 12 }] }));
  return (
    <Animated.View style={[styles.bubble, { top }, style]} pointerEvents="none">
      <Text style={styles.bubbleText} numberOfLines={2}>
        {text}
      </Text>
      <View style={styles.tail} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: 260,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
    ...shadow,
  },
  bubbleText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, textAlign: 'center' },
  tail: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    width: 14,
    height: 14,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
  },
});
