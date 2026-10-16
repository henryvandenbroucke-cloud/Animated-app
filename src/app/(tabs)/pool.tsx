import { LinearGradient } from 'expo-linear-gradient';
import { DeviceMotion } from 'expo-sensors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { ClipPath, Defs, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { TAU, useLoop } from '../../lib/anim';
import { play } from '../../lib/feedback';
import { Sippy } from '../../mascot/Sippy';
import { colors, fonts } from '../../theme';

const FLOAT_W = 190;
const FLOAT_H = 200;
const SIPPY = 150;

type Ripple = { id: number; x: number; y: number; big?: boolean };

let rippleId = 0;

/**
 * The "wow" screen: Sippy lounges on a pool ring. Tilt the phone and the ring drifts downhill;
 * tap or drag anywhere and it paddles towards your finger. Ripples trail behind it.
 */
export default function Pool() {
  const { width, height } = useWindowDimensions();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [hint, setHint] = useState(true);

  // Where Sippy is, how fast it moves, and where it wants to go (all in screen px).
  const x = useSharedValue(width / 2);
  const y = useSharedValue(height * 0.45);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const tx = useSharedValue(width / 2);
  const ty = useSharedValue(height * 0.45);
  /** Seconds left during which touch steering overrides tilt. */
  const touchHold = useSharedValue(0);

  const bounds = { minX: FLOAT_W / 2, maxX: width - FLOAT_W / 2, minY: 140, maxY: height - 190 };

  // Spring-damper physics: feels like floating, not like snapping.
  useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    const k = 9;
    const damping = 3.2;
    vx.value += ((tx.value - x.value) * k - vx.value * damping) * dt;
    vy.value += ((ty.value - y.value) * k - vy.value * damping) * dt;
    x.value += vx.value * dt;
    y.value += vy.value * dt;
    if (touchHold.value > 0) touchHold.value = Math.max(0, touchHold.value - dt);
  });

  // Tilt control.
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!(await DeviceMotion.isAvailableAsync())) return;
        if (Platform.OS !== 'web') await DeviceMotion.requestPermissionsAsync();
        if (cancelled) return;
        DeviceMotion.setUpdateInterval(50);
        sub = DeviceMotion.addListener(({ rotation }) => {
          if (!rotation || touchHold.get() > 0) return;
          // gamma: left/right roll, beta: forward/back pitch (holding the phone at ~45°is neutral).
          const gx = Math.max(-1, Math.min(1, rotation.gamma / 0.6));
          const gy = Math.max(-1, Math.min(1, (rotation.beta - 0.75) / 0.5));
          tx.set(width / 2 + gx * (bounds.maxX - bounds.minX) * 0.5);
          ty.set((bounds.minY + bounds.maxY) / 2 + gy * (bounds.maxY - bounds.minY) * 0.5);
        });
      } catch {
        // No sensor: touch still works.
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  const spawn = useCallback((rx: number, ry: number, big = false) => {
    const id = rippleId++;
    setRipples((r) => [...r.slice(-14), { id, x: rx, y: ry, big }]);
  }, []);
  const remove = useCallback((id: number) => setRipples((r) => r.filter((p) => p.id !== id)), []);

  // Wake trail: drop a ripple behind Sippy whenever it's moving.
  useEffect(() => {
    let last = { x: x.value, y: y.value };
    const iv = setInterval(() => {
      const dx = x.value - last.x;
      const dy = y.value - last.y;
      if (Math.hypot(dx, dy) > 7) {
        spawn(x.value, y.value + 40);
        last = { x: x.value, y: y.value };
      }
    }, 160);
    const idle = setInterval(() => spawn(x.value, y.value + 40), 2200);
    const hide = setTimeout(() => setHint(false), 5000);
    return () => {
      clearInterval(iv);
      clearInterval(idle);
      clearTimeout(hide);
    };
  }, [spawn]); // eslint-disable-line react-hooks/exhaustive-deps

  const steer = (px: number, py: number) => {
    'worklet';
    touchHold.set(2.5);
    tx.set(Math.max(bounds.minX, Math.min(bounds.maxX, px)));
    ty.set(Math.max(bounds.minY, Math.min(bounds.maxY, py - 60)));
  };

  const tap = Gesture.Tap().onEnd((e) => {
    steer(e.absoluteX, e.absoluteY);
    scheduleOnRN(spawn, e.absoluteX, e.absoluteY, true);
    scheduleOnRN(play, 'bloop');
  });
  const pan = Gesture.Pan().onUpdate((e) => steer(e.absoluteX, e.absoluteY));

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - FLOAT_W / 2 },
      { translateY: y.value - FLOAT_H / 2 },
      { rotate: `${Math.max(-18, Math.min(18, vx.value / 25))}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View style={styles.fill}>
        <PoolWater width={width} height={height} />
        {ripples.map((r) => (
          <RippleRing key={r.id} {...r} onDone={remove} />
        ))}
        <Animated.View style={[styles.float, floatStyle]} pointerEvents="none">
          <Floatie />
        </Animated.View>
        <SafeAreaView style={styles.top} edges={['top']} pointerEvents="none">
          <Text style={styles.title}>Pool time</Text>
          {hint && (
            <Animated.View entering={FadeIn.delay(400)} exiting={FadeOut} style={styles.hint}>
              <Text style={styles.hintText}>{Platform.OS === 'web' ? 'Tap or drag to steer Sippy' : 'Tilt your phone, or tap to steer Sippy'}</Text>
            </Animated.View>
          )}
        </SafeAreaView>
      </View>
    </GestureDetector>
  );
}

function Floatie() {
  const t = useLoop(4000);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: Math.sin(t.value * TAU) * 4 }, { rotate: `${Math.sin(t.value * TAU * 2) * 2}deg` }] }));
  const ringTop = 112;
  return (
    <Animated.View style={[{ width: FLOAT_W, height: FLOAT_H }, bob]}>
      <View style={{ position: 'absolute', top: ringTop + 22, left: 14 }}>
        <Svg width={FLOAT_W - 28} height={40}>
          <Ellipse cx={(FLOAT_W - 28) / 2} cy={20} rx={(FLOAT_W - 28) / 2} ry={16} fill="#1E8DB8" opacity={0.25} />
        </Svg>
      </View>
      <Ring half="back" top={ringTop} />
      <View style={{ position: 'absolute', left: (FLOAT_W - SIPPY) / 2, top: 0 }}>
        <Sippy size={SIPPY} pose="float" />
      </View>
      <View style={{ position: 'absolute', top: ringTop, left: 0 }} pointerEvents="none">
        <Svg width={FLOAT_W} height={70}>
          <Ellipse cx={FLOAT_W / 2} cy={35} rx={56} ry={17} fill={colors.pool} opacity={0.9} />
          <Ellipse cx={FLOAT_W / 2 - 18} cy={31} rx={18} ry={3} fill="#fff" opacity={0.35} />
        </Svg>
      </View>
      <Ring half="front" top={ringTop} />
    </Animated.View>
  );
}

/** Half of a striped donut float, so Sippy can sit "inside" it. */
function Ring({ half, top }: { half: 'back' | 'front'; top: number }) {
  const W = FLOAT_W;
  const H = 70;
  const id = `ring-${half}`;
  return (
    <View style={{ position: 'absolute', top, left: 0 }} pointerEvents="none">
      <Svg width={W} height={H}>
        <Defs>
          <ClipPath id={id}>
            <Rect x={0} y={half === 'back' ? 0 : H / 2} width={W} height={H / 2} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id})`}>
          <Ellipse cx={W / 2} cy={H / 2} rx={W / 2 - 14} ry={H / 2 - 12} fill="none" stroke="#FF8FB8" strokeWidth={22} />
          <Ellipse cx={W / 2} cy={H / 2} rx={W / 2 - 14} ry={H / 2 - 12} fill="none" stroke="#FFFFFF" strokeWidth={22} strokeDasharray="22 26" />
          <Ellipse cx={W / 2} cy={H / 2 - 5} rx={W / 2 - 18} ry={H / 2 - 18} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} />
        </G>
      </Svg>
    </View>
  );
}

function PoolWater({ width, height }: { width: number; height: number }) {
  const tile = 46;
  const cols = Math.ceil(width / tile) + 1;
  const rows = Math.ceil(height / tile) + 1;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={['#7BE3F7', '#3CC4E8', '#22A6D6']} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {Array.from({ length: cols }, (_, i) => (
          <Line key={`c${i}`} x1={i * tile} y1={0} x2={i * tile} y2={height} stroke="#fff" strokeOpacity={0.13} strokeWidth={2} />
        ))}
        {Array.from({ length: rows }, (_, i) => (
          <Line key={`r${i}`} x1={0} y1={i * tile} x2={width} y2={i * tile} stroke="#fff" strokeOpacity={0.13} strokeWidth={2} />
        ))}
      </Svg>
      {GLINTS.map((g, i) => (
        <Glint key={i} {...g} width={width} height={height} />
      ))}
    </View>
  );
}

const GLINTS = [
  { y: 0.16, amp: 7, period: 140, speed: 7000, opacity: 0.22 },
  { y: 0.31, amp: 5, period: 110, speed: 9000, opacity: 0.16 },
  { y: 0.47, amp: 8, period: 170, speed: 8000, opacity: 0.2 },
  { y: 0.62, amp: 6, period: 120, speed: 10000, opacity: 0.15 },
  { y: 0.78, amp: 7, period: 150, speed: 7500, opacity: 0.2 },
  { y: 0.92, amp: 5, period: 100, speed: 9500, opacity: 0.15 },
];

/** Wobbly lines of light drifting across the water, like sun glinting off ripples. */
function Glint({ y, amp, period, speed, opacity, width, height }: { y: number; amp: number; period: number; speed: number; opacity: number; width: number; height: number }) {
  const t = useLoop(speed);
  const d = useMemo(() => {
    let path = `M0 ${amp}`;
    for (let x = 0; x < width * 2 + period; x += period) {
      path += ` Q${x + period / 4} ${-amp} ${x + period / 2} ${amp} T${x + period} ${amp}`;
    }
    return path;
  }, [amp, period, width]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -t.value * period * Math.ceil(width / period) }, { translateY: Math.sin(t.value * TAU * 2) * 6 }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: y * height }, style]} pointerEvents="none">
      <Svg width={width * 2 + period} height={amp * 2 + 8} viewBox={`0 ${-amp - 4} ${width * 2 + period} ${amp * 2 + 8}`}>
        <Path d={d} stroke="#fff" strokeOpacity={opacity} strokeWidth={4} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

function RippleRing({ id, x, y, big, onDone }: Ripple & { onDone: (id: number) => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: big ? 1500 : 1300, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) scheduleOnRN(onDone, id);
    });
  }, [p, id, big, onDone]);
  const size = big ? 120 : 90;
  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.7,
    transform: [{ scale: 0.3 + p.value * (big ? 2 : 1.6) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: x - size / 2, top: y - size * 0.2, width: size, height: size * 0.4, borderRadius: size, borderWidth: 3, borderColor: '#fff' },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.pool, overflow: 'hidden' },
  float: { position: 'absolute', left: 0, top: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 28, color: '#fff', marginTop: 10, textShadowColor: 'rgba(0,80,120,0.3)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  hint: { marginTop: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  hintText: { fontFamily: fonts.medium, color: colors.ink, fontSize: 14 },
});
