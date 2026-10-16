import { useEffect } from 'react';
import { Easing, cancelAnimation, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** A shared value that loops 0 → 1 forever. Use sin(2π·k·t) with integer k for seamless loops. */
export function useLoop(duration: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [duration, t]);
  return t;
}

export const TAU = Math.PI * 2;

/** Small deterministic PRNG so particle layouts are pure functions of the burst number. */
export function seeded(seed: number) {
  let s = (seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
