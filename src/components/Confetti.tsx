import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { seeded } from '../lib/anim';
import { colors } from '../theme';

const PALETTE = [colors.pinkDeep, colors.water, colors.sun, colors.mint, colors.lilac, colors.blush];

/** Burst of confetti from the centre-top. Change `burst` to fire again. */
export function Confetti({ burst, count = 28, spread = 180 }: { burst: number; count?: number; spread?: number }) {
  const pieces = useMemo(() => {
    const rand = seeded(burst + count);
    return Array.from({ length: count }, (_, i) => ({
      angle: (rand() - 0.5) * Math.PI * 1.2 - Math.PI / 2,
      dist: spread * (0.5 + rand() * 0.7),
      color: PALETTE[i % PALETTE.length],
      w: 6 + rand() * 6,
      h: 10 + rand() * 8,
      spin: (rand() - 0.5) * 900,
      delay: rand() * 120,
      round: rand() < 0.35,
    }));
    // New layout on every burst.
  }, [burst, count, spread]);
  if (!burst) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
      {pieces.map((p, i) => (
        <Piece key={`${burst}-${i}`} {...p} />
      ))}
    </View>
  );
}

function Piece({ angle, dist, color, w, h, spin, delay, round }: { angle: number; dist: number; color: string; w: number; h: number; spin: number; delay: number; round: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 1500, easing: Easing.out(Easing.quad) }));
  }, [p, delay]);
  const style = useAnimatedStyle(() => {
    const x = Math.cos(angle) * dist * p.value;
    // Fly out, then gravity pulls the pieces down.
    const y = Math.sin(angle) * dist * p.value + 260 * p.value * p.value;
    return {
      opacity: p.value < 0.8 ? 1 : (1 - p.value) * 5,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${spin * p.value}deg` }, { scaleX: Math.cos(p.value * 12) }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', width: w, height: round ? w : h, borderRadius: round ? w / 2 : 2, backgroundColor: color }, style]} />;
}
