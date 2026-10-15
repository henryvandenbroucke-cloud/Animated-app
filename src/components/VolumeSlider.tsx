import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic, play } from '../lib/feedback';
import { formatAmount, stepMl, type Unit } from '../lib/units';
import { colors, fonts, shadow } from '../theme';

type Props = {
  value: number;
  onChange: (ml: number) => void;
  unit: Unit;
  min?: number;
  max?: number;
  color?: string;
};

const THUMB = 34;

/** Chunky drag slider with tick sounds on each step and a bouncy thumb. */
export function VolumeSlider({ value, onChange, unit, min = 50, max = 1000, color = colors.water }: Props) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const grab = useSharedValue(1);
  const dragging = useSharedValue(false);
  const step = stepMl(unit);
  const usable = Math.max(1, width - THUMB);

  useEffect(() => {
    if (width && !dragging.value) x.value = withSpring(((value - min) / (max - min)) * usable, { damping: 18, stiffness: 220 });
  }, [value, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const emit = (px: number) => {
    const raw = min + (Math.max(0, Math.min(usable, px)) / usable) * (max - min);
    const snapped = Math.max(min, Math.min(max, Math.round(raw / step) * step));
    if (Math.abs(snapped - value) >= step / 2) {
      play('tick');
      haptic('select');
      onChange(snapped);
    }
  };

  const settle = () => {
    x.set(withSpring(((value - min) / (max - min)) * usable, { damping: 18, stiffness: 220 }));
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      dragging.set(true);
      grab.set(withSpring(1.25));
      x.set(Math.max(0, Math.min(usable, e.x - THUMB / 2)));
      scheduleOnRN(emit, e.x - THUMB / 2);
    })
    .onUpdate((e) => {
      x.set(Math.max(0, Math.min(usable, e.x - THUMB / 2)));
      scheduleOnRN(emit, e.x - THUMB / 2);
    })
    .onFinalize(() => {
      dragging.set(false);
      grab.set(withSpring(1, { damping: 6 }));
      scheduleOnRN(settle);
    });

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: grab.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value + THUMB / 2 }));

  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.amount}>{formatAmount(value, unit)}</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.hit}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
          accessibilityRole="adjustable"
          accessibilityLabel="Amount"
          accessibilityValue={{ text: formatAmount(value, unit) }}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
          </View>
          <Animated.View style={[styles.thumb, { borderColor: color }, thumb]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { alignItems: 'center', marginBottom: 6 },
  amount: { fontFamily: fonts.bold, fontSize: 26, color: colors.ink },
  hit: { height: 48, justifyContent: 'center' },
  track: { height: 14, borderRadius: 7, backgroundColor: colors.line, overflow: 'hidden', marginHorizontal: 2 },
  fill: { height: 14, borderRadius: 7 },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#fff',
    borderWidth: 5,
    ...shadow,
  },
});
