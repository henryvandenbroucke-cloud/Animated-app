import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { seeded } from '../lib/anim';

/** A ring of droplets that jump out and fall, for "you just added water" moments. */
export function Splash({ burst, color, y = 0 }: { burst: number; color: string; y?: number }) {
  const drops = useMemo(() => {
    const rand = seeded(burst);
    return Array.from({ length: 12 }, (_, i) => ({
      angle: -Math.PI / 2 + ((i / 11) - 0.5) * Math.PI * 1.1,
      dist: 50 + rand() * 60,
      r: 4 + rand() * 5,
    }));
  }, [burst]);
  if (!burst) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', transform: [{ translateY: y }] }]} pointerEvents="none">
      {drops.map((d, i) => (
        <Drop key={`${burst}-${i}`} {...d} color={color} />
      ))}
    </View>
  );
}

function Drop({ angle, dist, r, color }: { angle: number; dist: number; r: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) });
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [
      { translateX: Math.cos(angle) * dist * p.value },
      { translateY: Math.sin(angle) * dist * p.value + 90 * p.value * p.value },
      { scale: 1 - p.value * 0.5 },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', width: r * 2, height: r * 2.4, borderRadius: r, backgroundColor: color }, style]} />;
}
