import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { Water } from '../water/Water';
import { findSkin, type Skin } from './skins';

/**
 * Sippy the axolotl.
 *
 * Motion design, following character-animation practice rather than looping sine waves:
 *  - Nothing important loops on a fixed cycle. Breathing has a quick inhale and a slower exhale
 *    whose pace drifts; blinks come at random intervals (sometimes doubled).
 *  - Secondary motion is simulated: gills and tail are damped springs driven by how fast the body
 *    moves, so they trail behind a jump and overshoot when it lands (follow-through).
 *  - Big moves have anticipation (crouch before a jump, a dip before waving) and settle with a spring.
 *  - When idle, Sippy does small, randomly chosen "idle breaks": look around, flick the tail,
 *    flutter the gills, shift weight, yawn. In between it is calm and mostly still.
 *  - Eyes can follow a point (a finger, the slider) via the `look` prop.
 *
 * All coordinates live in a 200×200 box and scale with `size`.
 */

export type Pose = 'idle' | 'wave' | 'cheer' | 'swim' | 'sleep' | 'listen' | 'sip' | 'float';
export type Mood = 'smile' | 'open' | 'sleep' | 'o' | 'happy' | 'yawn' | 'worried';
export type Action = { type: 'jump' | 'nod' | 'wiggle' | 'spin' | 'flinch' | 'gulp' | 'hop'; key: number };

type Props = {
  size: number;
  pose?: Pose;
  mood?: Mood;
  action?: Action;
  /** Colour morph (see skins.ts). */
  skin?: string;
  /** Where Sippy is looking, each axis in -1..1 (0,0 is straight ahead). */
  look?: { readonly value: { x: number; y: number } };
  /** Random idle behaviours (look around, tail flick…). On by default. */
  idle?: boolean;
  /** Turn Sippy into a see-through tank that fills with water (home screen). */
  tank?: { level: SharedValue<number>; ghost?: SharedValue<number>; maskColor: string };
  style?: ViewStyle;
  children?: ReactNode;
};

// Head + body as one outline, so it can also be used as a mask for the water tank.
export const SILHOUETTE =
  'M100 32 C140 32 172 52 172 88 C172 114 156 132 138 138 C150 150 140 188 100 188 C60 188 50 150 62 138 C44 132 28 114 28 88 C28 52 60 32 100 32 Z';
const BOX = { x: 28, y: 32, w: 144, h: 156 };

const GILLS = [
  { x: 36, y: 66, angle: 205, seed: 0.3, k: 1.15 },
  { x: 30, y: 86, angle: 180, seed: 1.9, k: 1 },
  { x: 36, y: 106, angle: 155, seed: 3.7, k: 0.85 },
  { x: 164, y: 66, angle: -25, seed: 5.1, k: 1.15 },
  { x: 170, y: 86, angle: 0, seed: 6.4, k: 1 },
  { x: 164, y: 106, angle: 25, seed: 8.2, k: 0.85 },
];

type PoseSpec = {
  /** Gill rest angle: + droops the tips down, − perks them up. */
  gillRest: number;
  /** Gills swept back, as when swimming. */
  sweep: number;
  /** Seconds per breath. */
  breath: number;
  /** Breath depth (scale). */
  depth: number;
  lean: number;
  tilt: number;
  swim: number;
};

const POSE: Record<Pose, PoseSpec> = {
  idle: { gillRest: 0, sweep: 0, breath: 3.6, depth: 0.014, lean: 0, tilt: 0, swim: 0 },
  wave: { gillRest: -4, sweep: 0, breath: 3.2, depth: 0.014, lean: 0, tilt: -3, swim: 0 },
  cheer: { gillRest: -10, sweep: 0, breath: 2.4, depth: 0.018, lean: 0, tilt: 0, swim: 0 },
  swim: { gillRest: 0, sweep: 26, breath: 2.8, depth: 0.01, lean: 12, tilt: 0, swim: 1 },
  sleep: { gillRest: 12, sweep: -6, breath: 5.2, depth: 0.026, lean: 0, tilt: -6, swim: 0 },
  listen: { gillRest: -6, sweep: 0, breath: 3.6, depth: 0.012, lean: 0, tilt: 10, swim: 0 },
  sip: { gillRest: 2, sweep: 0, breath: 3, depth: 0.012, lean: 0, tilt: 0, swim: 0 },
  float: { gillRest: 2, sweep: 8, breath: 4.2, depth: 0.014, lean: 0, tilt: 0, swim: 0 },
};

const DEFAULT_MOOD: Record<Pose, Mood> = {
  idle: 'smile',
  wave: 'open',
  cheer: 'open',
  swim: 'smile',
  sleep: 'sleep',
  listen: 'smile',
  sip: 'o',
  float: 'smile',
};

const pct = (x: number, y: number) => `${x / 2}% ${y / 2}%`;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Smooth, non-repeating wobble from three incommensurate sines. */
function noise(t: number, seed: number) {
  'worklet';
  return 0.5 * Math.sin(t * 0.83 + seed) + 0.3 * Math.sin(t * 1.97 + seed * 1.7) + 0.2 * Math.sin(t * 3.41 + seed * 2.3);
}

function easeInOut(x: number) {
  'worklet';
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function Sippy({ size, pose = 'idle', mood, action, skin, look, idle = true, tank, style, children }: Props) {
  const s = size / 200;
  const pal = findSkin(skin);
  const p = POSE[pose];
  const [tempMood, setTempMood] = useState<Mood | null>(null);
  const face = tempMood ?? mood ?? DEFAULT_MOOD[pose];

  // ---- Pose parameters (eased, never snapped) ----
  const gillRest = useSharedValue(p.gillRest);
  const sweep = useSharedValue(p.sweep);
  const breathLen = useSharedValue(p.breath);
  const depth = useSharedValue(p.depth);
  const lean = useSharedValue(p.lean);
  const tilt = useSharedValue(p.tilt);
  const swimAmt = useSharedValue(p.swim);

  // ---- Simulation state ----
  // Each Sippy starts at a different point so two on screen never move in lockstep.
  const [seed] = useState(() => Math.random());
  const time = useSharedValue(seed * 100);
  const breath = useSharedValue(seed);
  const breathVal = useSharedValue(0);
  const prevY = useSharedValue(0);
  const prevRot = useSharedValue(0);
  const gillP = useSharedValue(0);
  const gillV = useSharedValue(0);
  const tailP = useSharedValue(0);
  const tailV = useSharedValue(0);
  const flutter = useSharedValue(0);

  // ---- Driven by behaviours and actions ----
  const jumpY = useSharedValue(0);
  const sqX = useSharedValue(1);
  const sqY = useSharedValue(1);
  const nod = useSharedValue(0);
  const shift = useSharedValue(0);
  const flip = useSharedValue(1);
  const eyeX = useSharedValue(0);
  const eyeY = useSharedValue(0);
  const blink = useSharedValue(1);
  const armL = useSharedValue(0);
  const armR = useSharedValue(0);

  useEffect(() => {
    const ease = { duration: 500, easing: Easing.inOut(Easing.cubic) };
    gillRest.set(withSpring(p.gillRest, { damping: 10, stiffness: 90 }));
    sweep.set(withTiming(p.sweep, ease));
    breathLen.set(withTiming(p.breath, ease));
    depth.set(withTiming(p.depth, ease));
    lean.set(withSpring(p.lean, { damping: 14, stiffness: 90 }));
    tilt.set(withSpring(p.tilt, { damping: 11, stiffness: 120 }));
    swimAmt.set(withTiming(p.swim, ease));
  }, [pose]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Per-frame simulation on the UI thread ----
  useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    time.value += dt;
    const t = time.value;

    // Breathing: inhale over 40% of the cycle, exhale over 60%, pace drifting slightly.
    const period = breathLen.value * (1 + 0.12 * Math.sin(t * 0.21));
    breath.value = (breath.value + dt / period) % 1;
    const b = breath.value;
    breathVal.value = b < 0.4 ? easeInOut(b / 0.4) : 1 - easeInOut((b - 0.4) / 0.6);

    // Body velocity, used to drive the gills and tail.
    const y = jumpY.value;
    const vy = (y - prevY.value) / dt;
    prevY.value = y;
    const rot = nod.value + shift.value;
    const vr = (rot - prevRot.value) / dt;
    prevRot.value = rot;

    // Gills: damped spring. Moving up pushes the tips down; landing flicks them up.
    const gTarget = Math.max(-40, Math.min(40, (-vy / s) * 0.06 + vr * 0.04));
    gillV.value += ((gTarget - gillP.value) * 150 - gillV.value * 10) * dt;
    gillP.value += gillV.value * dt;

    // Tail: lags behind body rotation and bounces with vertical motion.
    const tTarget = Math.max(-35, Math.min(35, -vr * 0.12 + (vy / s) * 0.025));
    tailV.value += ((tTarget - tailP.value) * 110 - tailV.value * 7) * dt;
    tailP.value += tailV.value * dt;

    flutter.value = Math.max(0, flutter.value - dt * 1.6);
  });

  // ---- Blinking: random, sometimes double, never on a timer you can feel ----
  useEffect(() => {
    if (face === 'sleep' || face === 'happy') return;
    let timer: ReturnType<typeof setTimeout>;
    const once = () =>
      withSequence(
        withTiming(0.08, { duration: 55, easing: Easing.in(Easing.quad) }),
        withDelay(35, withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) })),
      );
    const schedule = () => {
      timer = setTimeout(() => {
        blink.set(Math.random() < 0.18 ? withSequence(once(), withDelay(90, once())) : once());
        schedule();
      }, rand(2200, 5600));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [face, blink]);

  // ---- Pose entrances and recurring gestures ----
  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const arm = (v: SharedValue<number>, to: number, damping = 11) => v.set(withSpring(to, { damping, stiffness: 140 }));

    const waveOnce = () => {
      // Anticipation dip, raise, three waves that get smaller, then lower.
      armR.set(
        withSequence(
          withTiming(12, { duration: 110, easing: Easing.out(Easing.quad) }),
          withSpring(-150, { damping: 12, stiffness: 160 }),
          withTiming(-125, { duration: 170, easing: Easing.inOut(Easing.sin) }),
          withTiming(-160, { duration: 170, easing: Easing.inOut(Easing.sin) }),
          withTiming(-132, { duration: 170, easing: Easing.inOut(Easing.sin) }),
          withTiming(-152, { duration: 170, easing: Easing.inOut(Easing.sin) }),
          withDelay(250, withSpring(0, { damping: 13, stiffness: 90 })),
        ),
      );
      later(380, () => tilt.set(withSequence(withSpring(-7, { damping: 9 }), withDelay(600, withSpring(POSE.wave.tilt, { damping: 12 })))));
    };

    if (pose === 'wave') {
      later(200, waveOnce);
      const again = () => later(rand(5500, 9000), () => { waveOnce(); again(); });
      again();
    } else {
      arm(armR, 0, 14);
    }

    if (pose === 'cheer') {
      arm(armL, 150, 9);
      arm(armR, -150, 9);
      flutter.set(1);
      // Little celebratory hops at uneven intervals, each a bit different.
      const hop = () =>
        later(rand(900, 2200), () => {
          const h = size * rand(0.06, 0.12);
          jumpY.set(
            withSequence(
              withTiming(0, { duration: 70 }),
              withTiming(-h, { duration: 190, easing: Easing.out(Easing.quad) }),
              withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
            ),
          );
          sqY.set(withSequence(withTiming(0.9, { duration: 70 }), withTiming(1.06, { duration: 190 }), withTiming(0.93, { duration: 170 }), withSpring(1, { damping: 7, stiffness: 300 })));
          sqX.set(withSequence(withTiming(1.08, { duration: 70 }), withTiming(0.96, { duration: 190 }), withTiming(1.06, { duration: 170 }), withSpring(1, { damping: 7, stiffness: 300 })));
          // Arms pump with the hop, slightly out of sync with each other.
          armL.set(withSequence(withTiming(125, { duration: 160 }), withSpring(150, { damping: 8 })));
          armR.set(withDelay(40, withSequence(withTiming(-125, { duration: 160 }), withSpring(-150, { damping: 8 }))));
          hop();
        });
      hop();
    } else {
      arm(armL, 0, 14);
      if (pose !== 'wave') arm(armR, 0, 14);
    }

    if (pose === 'listen') {
      const nodAgain = () =>
        later(rand(2500, 5000), () => {
          nod.set(withSequence(withTiming(5, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 9, stiffness: 140 })));
          nodAgain();
        });
      nodAgain();
    }

    return () => timers.forEach(clearTimeout);
  }, [pose]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Idle breaks: small, random, with calm stretches in between ----
  const moodTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!idle || pose === 'swim' || pose === 'sleep' || pose === 'cheer') return;
    let timer: ReturnType<typeof setTimeout>;
    const behaviours: [number, () => void][] = [
      [3, () => {
        // Look around: eyes lead, head follows a moment later, then back.
        const dir = Math.random() < 0.5 ? -1 : 1;
        eyeX.set(withSequence(withTiming(dir * 0.9, { duration: 160 }), withDelay(rand(500, 900), withTiming(-dir * 0.7, { duration: 220 })), withDelay(rand(400, 700), withSpring(0, { damping: 12 }))));
        eyeY.set(withSequence(withTiming(rand(-0.4, 0.2), { duration: 180 }), withDelay(1200, withSpring(0, { damping: 12 }))));
        shift.set(withSequence(withDelay(90, withSpring(dir * 3, { damping: 12, stiffness: 80 })), withDelay(700, withSpring(-dir * 2, { damping: 12, stiffness: 80 })), withDelay(500, withSpring(0, { damping: 14, stiffness: 70 }))));
      }],
      [2, () => {
        // Tail flick: a single kick into the tail spring.
        tailV.set(tailV.get() + (Math.random() < 0.5 ? -320 : 320));
      }],
      [2, () => {
        // Gill ruffle.
        flutter.set(rand(0.6, 1));
      }],
      [2, () => {
        // Shift weight from one side to the other.
        shift.set(withSequence(withSpring(rand(-4, 4), { damping: 10, stiffness: 60 }), withDelay(rand(900, 1600), withSpring(0, { damping: 12, stiffness: 50 }))));
      }],
      [pose === 'idle' || pose === 'float' ? 1 : 0, () => {
        // Yawn: inhale and stretch, mouth wide, settle.
        setTempMood('yawn');
        sqY.set(withSequence(withTiming(1.06, { duration: 600, easing: Easing.inOut(Easing.sin) }), withDelay(300, withSpring(1, { damping: 12, stiffness: 80 }))));
        sqX.set(withSequence(withTiming(0.97, { duration: 600, easing: Easing.inOut(Easing.sin) }), withDelay(300, withSpring(1, { damping: 12, stiffness: 80 }))));
        gillRest.set(withSequence(withTiming(-12, { duration: 600 }), withDelay(300, withSpring(POSE[pose].gillRest, { damping: 9 }))));
        if (moodTimer.current) clearTimeout(moodTimer.current);
        moodTimer.current = setTimeout(() => setTempMood(null), 1300);
      }],
    ];
    const total = behaviours.reduce((a, [w]) => a + w, 0);
    const schedule = () => {
      timer = setTimeout(() => {
        let r = Math.random() * total;
        for (const [w, fn] of behaviours) {
          if ((r -= w) <= 0) {
            fn();
            break;
          }
        }
        schedule();
      }, rand(2800, 6500));
    };
    schedule();
    return () => clearTimeout(timer);
  }, [idle, pose]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (moodTimer.current) clearTimeout(moodTimer.current); }, []);

  // ---- One-shot actions ----
  useEffect(() => {
    if (!action) return;
    const H = size * 0.28;
    const showMood = (m: Mood, ms: number) => {
      setTempMood(m);
      if (moodTimer.current) clearTimeout(moodTimer.current);
      moodTimer.current = setTimeout(() => setTempMood(null), ms);
    };
    if (action.type === 'jump' || action.type === 'hop') {
      const h = action.type === 'jump' ? H : H * 0.45;
      // Anticipation crouch, launch (stretch), hang, land (squash), settle.
      sqY.set(withSequence(
        withTiming(0.82, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1.12, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200 }),
        withTiming(0.84, { duration: 70, easing: Easing.in(Easing.quad) }),
        withSpring(1, { damping: 7, stiffness: 320 }),
      ));
      sqX.set(withSequence(
        withTiming(1.14, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(0.92, { duration: 120 }),
        withTiming(1, { duration: 200 }),
        withTiming(1.14, { duration: 70 }),
        withSpring(1, { damping: 7, stiffness: 320 }),
      ));
      jumpY.set(withSequence(
        withTiming(0, { duration: 150 }),
        withTiming(-h, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 230, easing: Easing.in(Easing.quad) }),
      ));
      // Arms lift on the way up, drop on landing.
      armL.set(withSequence(withTiming(-10, { duration: 150 }), withTiming(60, { duration: 200 }), withDelay(150, withSpring(armL.value > 100 ? 150 : 0, { damping: 9 }))));
      armR.set(withSequence(withTiming(10, { duration: 150 }), withTiming(-60, { duration: 200 }), withDelay(150, withSpring(armR.value < -100 ? -150 : 0, { damping: 9 }))));
      if (action.type === 'jump') showMood('happy', 900);
    } else if (action.type === 'nod') {
      nod.set(withSequence(
        withTiming(-3, { duration: 90 }),
        withTiming(9, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(-4, { duration: 160, easing: Easing.inOut(Easing.quad) }),
        withSpring(0, { damping: 10, stiffness: 160 }),
      ));
    } else if (action.type === 'wiggle') {
      // A happy shimmy that starts big and settles, not a mechanical shake.
      shift.set(withSequence(
        withTiming(-7, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(7, { duration: 170, easing: Easing.inOut(Easing.sin) }),
        withTiming(-5, { duration: 160, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 150, easing: Easing.inOut(Easing.sin) }),
        withSpring(0, { damping: 12, stiffness: 120 }),
      ));
      flutter.set(0.7);
      showMood('happy', 700);
    } else if (action.type === 'spin') {
      // Turn around: squash thin at the midpoint, overshoot on return.
      flip.set(withSequence(withTiming(-1, { duration: 240, easing: Easing.inOut(Easing.cubic) }), withDelay(120, withSpring(1, { damping: 11, stiffness: 160 }))));
    } else if (action.type === 'flinch') {
      // Poked: quick squash, eyes squeeze shut, a little bounce back.
      sqY.set(withSequence(withTiming(0.86, { duration: 80, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 6, stiffness: 260 })));
      sqX.set(withSequence(withTiming(1.1, { duration: 80, easing: Easing.out(Easing.quad) }), withSpring(1, { damping: 6, stiffness: 260 })));
      gillV.set(gillV.get() - 260);
      tailV.set(tailV.get() + 200);
      showMood('happy', 650);
    } else if (action.type === 'gulp') {
      // Swallow: chin dips, belly bulges, then a satisfied exhale.
      nod.set(withSequence(withTiming(5, { duration: 140 }), withSpring(0, { damping: 9, stiffness: 140 })));
      sqX.set(withSequence(withDelay(120, withTiming(1.07, { duration: 140 })), withSpring(1, { damping: 8, stiffness: 200 })));
      sqY.set(withSequence(withDelay(120, withTiming(0.95, { duration: 140 })), withSpring(1, { damping: 8, stiffness: 200 })));
      showMood('o', 450);
    }
  }, [action?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Styles ----
  const body = useAnimatedStyle(() => {
    const t = time.value;
    const bv = breathVal.value * depth.value;
    const swimBob = swimAmt.value * Math.sin(t * 4.2) * 3;
    return {
      transform: [
        { translateY: jumpY.value + swimBob * s },
        { rotate: `${lean.value + shift.value + noise(t * 0.35, 1.1) * 0.8 + swimAmt.value * Math.sin(t * 4.2 + 1) * 4}deg` },
        { scaleX: sqX.value * (1 - bv * 0.45) * flip.value },
        { scaleY: sqY.value * (1 + bv) },
      ],
    };
  });

  const head = useAnimatedStyle(() => {
    const lx = (look?.value.x ?? 0) + eyeX.value;
    return { transform: [{ rotate: `${tilt.value + nod.value + lx * 3}deg` }] };
  });

  const tailStyle = useAnimatedStyle(() => {
    const t = time.value;
    const swim = swimAmt.value * (Math.sin(t * 9) * 20 + Math.sin(t * 4.5) * 6);
    return { transform: [{ rotate: `${tailP.value + noise(t * 0.6, 4) * 4 + swim + breathVal.value * 2}deg` }] };
  });

  const eyes = useAnimatedStyle(() => {
    const lx = Math.max(-1, Math.min(1, (look?.value.x ?? 0) + eyeX.value));
    const ly = Math.max(-1, Math.min(1, (look?.value.y ?? 0) + eyeY.value));
    return { transform: [{ translateX: lx * 4 * s }, { translateY: ly * 3 * s }, { scaleY: blink.value }] };
  });

  const armLStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armL.value + breathVal.value * 3}deg` }] }));
  const armRStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${armR.value - breathVal.value * 3}deg` }] }));

  const gills = GILLS.map((g, i) => (
    <Gill key={i} {...g} size={size} pal={pal} time={time} gillP={gillP} rest={gillRest} sweep={sweep} flutter={flutter} breath={breathVal} />
  ));

  const tailLayer = (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(128, 168) }, tailStyle]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G transform="translate(128 168) rotate(-12)">
          <Path d="M0 -12 C22 -26 48 -22 62 -34 C58 -8 34 12 0 12 Z" fill={pal.body} stroke={pal.line} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M10 -10 C26 -18 44 -18 54 -26" stroke={pal.gill} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" fill="none" />
        </G>
      </Svg>
    </Animated.View>
  );

  const feet = (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Ellipse cx={80} cy={187} rx={13} ry={7} fill={pal.body} stroke={pal.line} strokeWidth={3} />
      <Ellipse cx={120} cy={187} rx={13} ry={7} fill={pal.body} stroke={pal.line} strokeWidth={3} />
    </Svg>
  );

  const eyesClosed = face === 'sleep' || face === 'happy';

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 94%' }, body]} pointerEvents="none">
        {!tank && tailLayer}
        {!tank && feet}
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(100, 140) }, head]} pointerEvents="none">
          {!tank && gills}
          {tank ? (
            <TankBody size={size} pal={pal} level={tank.level} ghost={tank.ghost} maskColor={tank.maskColor} />
          ) : (
            <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
              <Path d={SILHOUETTE} fill={pal.body} stroke={pal.line} strokeWidth={3.5} strokeLinejoin="round" />
              <Ellipse cx={100} cy={160} rx={28} ry={20} fill={pal.belly} />
              <Circle cx={88} cy={46} r={2.6} fill={pal.spots} opacity={0.45} />
              <Circle cx={100} cy={42} r={2.6} fill={pal.spots} opacity={0.45} />
              <Circle cx={112} cy={46} r={2.6} fill={pal.spots} opacity={0.45} />
              {pal.id === 'wild' || pal.id === 'galaxy' || pal.id === 'copper' ? (
                <G fill={pal.spots} opacity={0.5}>
                  <Circle cx={56} cy={76} r={2.4} />
                  <Circle cx={146} cy={70} r={2} />
                  <Circle cx={138} cy={124} r={2.2} />
                  <Circle cx={68} cy={128} r={1.8} />
                  <Circle cx={118} cy={58} r={1.6} />
                </G>
              ) : null}
            </Svg>
          )}
          {tank && gills}
          <Face mood={face} size={size} pal={pal} />
          {!eyesClosed && (
            <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(100, 92) }, eyes]} pointerEvents="none">
              <Svg width={size} height={size} viewBox="0 0 200 200">
                {[74, 126].map((x) => (
                  <G key={x}>
                    <Ellipse cx={x} cy={92} rx={7.5} ry={face === 'yawn' ? 5 : face === 'worried' ? 10 : 9} fill={pal.eye} />
                    <Circle cx={x - 2.5} cy={88.5} r={2.7} fill={pal.shine} />
                    <Circle cx={x + 2.2} cy={95} r={1.2} fill={pal.shine} />
                  </G>
                ))}
              </Svg>
            </Animated.View>
          )}
        </Animated.View>
        {tank && feet}

        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(66, 146) }, armLStyle]} pointerEvents="none">
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <G transform="translate(66 146) rotate(28)">
              <Path d="M-7 0 a7 7 0 0 1 14 0 v14 a7 7 0 0 1 -14 0 Z" fill={pal.body} stroke={pal.line} strokeWidth={3} />
            </G>
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(134, 146) }, armRStyle]} pointerEvents="none">
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <G transform="translate(134 146) rotate(-28)">
              <Path d="M-7 0 a7 7 0 0 1 14 0 v14 a7 7 0 0 1 -14 0 Z" fill={pal.body} stroke={pal.line} strokeWidth={3} />
            </G>
          </Svg>
        </Animated.View>
        {children}
      </Animated.View>
    </View>
  );
}

function Gill({
  x,
  y,
  angle,
  seed,
  k,
  size,
  pal,
  time,
  gillP,
  rest,
  sweep,
  flutter,
  breath,
}: {
  x: number;
  y: number;
  angle: number;
  seed: number;
  k: number;
  size: number;
  pal: Skin;
  time: SharedValue<number>;
  gillP: SharedValue<number>;
  rest: SharedValue<number>;
  sweep: SharedValue<number>;
  flutter: SharedValue<number>;
  breath: SharedValue<number>;
}) {
  const side = x < 100 ? -1 : 1;
  const style = useAnimatedStyle(() => {
    const t = time.value;
    // Tips down is clockwise for right gills, anticlockwise for left ones.
    const droop = (gillP.value * k + rest.value) * side;
    const swept = sweep.value * -side;
    const drift = noise(t * 0.7, seed) * 2.5 + breath.value * 3 * side;
    const ruffle = flutter.value * Math.sin(t * 26 + seed * 3) * 9;
    return { transform: [{ rotate: `${droop + swept + drift + ruffle}deg` }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(x, y) }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G transform={`translate(${x} ${y}) rotate(${angle})`}>
          <Path d="M-2 -5 C12 -8 28 -6 36 0 C28 6 12 8 -2 5 Z" fill={pal.gill} />
          {[11, 20, 29].map((fx) => (
            <G key={fx}>
              <Circle cx={fx} cy={-6.5 + fx / 10} r={3.6 - fx / 20} fill={pal.gillDot} />
              <Circle cx={fx} cy={6.5 - fx / 10} r={3.6 - fx / 20} fill={pal.gillDot} />
            </G>
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

function Face({ mood, size, pal }: { mood: Mood; size: number; pal: Skin }) {
  const mouth = '#7A2E45';
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Ellipse cx={58} cy={108} rx={10} ry={6} fill={pal.blush} opacity={mood === 'happy' ? 0.85 : 0.55} />
      <Ellipse cx={142} cy={108} rx={10} ry={6} fill={pal.blush} opacity={mood === 'happy' ? 0.85 : 0.55} />
      {mood === 'smile' && (
        <Path d="M91 106 Q95.5 112 100 106 Q104.5 112 109 106" stroke={pal.eye} strokeWidth={3} strokeLinecap="round" fill="none" />
      )}
      {(mood === 'open' || mood === 'happy') && (
        <G>
          <Path d="M89 105 Q100 126 111 105 Z" fill={mouth} stroke={pal.eye} strokeWidth={2.5} strokeLinejoin="round" />
          <Ellipse cx={100} cy={114} rx={5.5} ry={3.2} fill={pal.blush} />
        </G>
      )}
      {mood === 'happy' && (
        <G stroke={pal.eye} strokeWidth={3.4} strokeLinecap="round" fill="none">
          <Path d="M66 95 Q74 85 82 95" />
          <Path d="M118 95 Q126 85 134 95" />
        </G>
      )}
      {mood === 'o' && <Ellipse cx={100} cy={109} rx={4.5} ry={5.5} fill={mouth} stroke={pal.eye} strokeWidth={2} />}
      {mood === 'yawn' && <Ellipse cx={100} cy={112} rx={7} ry={10} fill={mouth} stroke={pal.eye} strokeWidth={2.4} />}
      {mood === 'worried' && (
        <Path d="M92 111 Q100 105 108 111" stroke={pal.eye} strokeWidth={3} strokeLinecap="round" fill="none" />
      )}
      {mood === 'sleep' && (
        <G stroke={pal.eye} strokeWidth={3} strokeLinecap="round" fill="none">
          <Path d="M66 93 Q74 99 82 93" />
          <Path d="M118 93 Q126 99 134 93" />
          <Path d="M95 109 Q100 112 105 109" />
        </G>
      )}
    </Svg>
  );
}

function TankBody({
  size,
  pal,
  level,
  ghost,
  maskColor,
}: {
  size: number;
  pal: Skin;
  level: SharedValue<number>;
  ghost?: SharedValue<number>;
  maskColor: string;
}) {
  const s = size / 200;
  // Rectangle with the silhouette cut out (even-odd), painted in the background colour.
  const mask = `M${BOX.x - 2} ${BOX.y - 2} H${BOX.x + BOX.w + 2} V${BOX.y + BOX.h + 2} H${BOX.x - 2} Z ${SILHOUETTE}`;
  return (
    <>
      <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
        <Path d={SILHOUETTE} fill={pal.belly} />
      </Svg>
      <View style={{ position: 'absolute', left: BOX.x * s, top: BOX.y * s }}>
        <Water width={BOX.w * s} height={BOX.h * s} level={level} ghost={ghost} />
      </View>
      <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
        <Path d={mask} fill={maskColor} fillRule="evenodd" />
        <Path d={SILHOUETTE} fill="none" stroke={pal.line} strokeWidth={3.5} strokeLinejoin="round" />
        <Path d="M54 70 C58 56 70 46 84 42" stroke="#fff" strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" fill="none" />
      </Svg>
    </>
  );
}
