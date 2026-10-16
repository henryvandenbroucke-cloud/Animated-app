import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
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
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { TAU, useLoop } from '../lib/anim';
import { colors } from '../theme';
import { Water } from '../water/Water';

/**
 * Sippy the axolotl. Every body part is its own layer rotating around its own joint,
 * so motion is layered (gills, tail, arms, blink, breathing) instead of one stiff puppet.
 * All coordinates live in a 200×200 box and scale with `size`.
 */

export type Pose = 'idle' | 'wave' | 'cheer' | 'swim' | 'sleep' | 'listen' | 'sip' | 'float';
export type Mood = 'smile' | 'open' | 'sleep' | 'o';
export type Action = { type: 'jump' | 'nod' | 'wiggle' | 'spin'; key: number };

type Props = {
  size: number;
  pose?: Pose;
  mood?: Mood;
  action?: Action;
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
  { x: 36, y: 66, angle: 205, phase: 0 },
  { x: 30, y: 86, angle: 180, phase: 0.8 },
  { x: 36, y: 106, angle: 155, phase: 1.6 },
  { x: 164, y: 66, angle: -25, phase: 0.4 },
  { x: 170, y: 86, angle: 0, phase: 1.2 },
  { x: 164, y: 106, angle: 25, phase: 2 },
];

const POSE: Record<Pose, { gill: number; gillSweep: number; tailSlow: number; tailFast: number; bob: number; lean: number; tilt: number }> = {
  idle: { gill: 9, gillSweep: 0, tailSlow: 8, tailFast: 0, bob: 3, lean: 0, tilt: 0 },
  wave: { gill: 12, gillSweep: 0, tailSlow: 10, tailFast: 0, bob: 3, lean: 0, tilt: -4 },
  cheer: { gill: 16, gillSweep: 0, tailSlow: 6, tailFast: 10, bob: 6, lean: 0, tilt: 0 },
  swim: { gill: 14, gillSweep: 28, tailSlow: 4, tailFast: 22, bob: 5, lean: 14, tilt: 0 },
  sleep: { gill: 3, gillSweep: -8, tailSlow: 3, tailFast: 0, bob: 2, lean: 0, tilt: -7 },
  listen: { gill: 10, gillSweep: 0, tailSlow: 8, tailFast: 0, bob: 2, lean: 0, tilt: 11 },
  sip: { gill: 7, gillSweep: 0, tailSlow: 6, tailFast: 0, bob: 2, lean: 0, tilt: 0 },
  float: { gill: 10, gillSweep: 10, tailSlow: 12, tailFast: 0, bob: 0, lean: 0, tilt: 0 },
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

export function Sippy({ size, pose = 'idle', mood, action, tank, style, children }: Props) {
  const s = size / 200;
  const t = useLoop(6000);
  const face = mood ?? DEFAULT_MOOD[pose];
  const p = POSE[pose];

  // Pose parameters ease between poses instead of snapping.
  const gill = useSharedValue(p.gill);
  const gillSweep = useSharedValue(p.gillSweep);
  const tailSlow = useSharedValue(p.tailSlow);
  const tailFast = useSharedValue(p.tailFast);
  const bob = useSharedValue(p.bob);
  const lean = useSharedValue(p.lean);
  const tilt = useSharedValue(p.tilt);
  const wave = useSharedValue(pose === 'wave' ? 1 : 0);
  const cheer = useSharedValue(pose === 'cheer' ? 1 : 0);

  useEffect(() => {
    const cfg = { duration: 450, easing: Easing.inOut(Easing.cubic) };
    gill.value = withTiming(p.gill, cfg);
    gillSweep.value = withTiming(p.gillSweep, cfg);
    tailSlow.value = withTiming(p.tailSlow, cfg);
    tailFast.value = withTiming(p.tailFast, cfg);
    bob.value = withTiming(p.bob, cfg);
    lean.value = withSpring(p.lean, { damping: 12 });
    tilt.value = withSpring(p.tilt, { damping: 9 });
    wave.value = withSpring(pose === 'wave' ? 1 : 0, { damping: 11 });
    cheer.value = withSpring(pose === 'cheer' ? 1 : 0, { damping: 11 });
  }, [pose]); // eslint-disable-line react-hooks/exhaustive-deps

  // One-shot actions: squash & stretch jump, nod, wiggle, spin.
  const jumpY = useSharedValue(0);
  const sqX = useSharedValue(1);
  const sqY = useSharedValue(1);
  const nod = useSharedValue(0);
  const flip = useSharedValue(1);
  useEffect(() => {
    if (!action) return;
    const H = size * 0.28;
    if (action.type === 'jump') {
      sqY.value = withSequence(
        withTiming(0.8, { duration: 110 }),
        withTiming(1.14, { duration: 160 }),
        withDelay(180, withTiming(0.86, { duration: 90 })),
        withSpring(1, { damping: 6, stiffness: 260 }),
      );
      sqX.value = withSequence(
        withTiming(1.16, { duration: 110 }),
        withTiming(0.9, { duration: 160 }),
        withDelay(180, withTiming(1.12, { duration: 90 })),
        withSpring(1, { damping: 6, stiffness: 260 }),
      );
      jumpY.value = withSequence(
        withTiming(0, { duration: 110 }),
        withTiming(-H, { duration: 260, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 230, easing: Easing.in(Easing.quad) }),
      );
    } else if (action.type === 'nod') {
      nod.value = withSequence(
        withTiming(9, { duration: 120 }),
        withTiming(-6, { duration: 140 }),
        withTiming(5, { duration: 120 }),
        withSpring(0, { damping: 8 }),
      );
    } else if (action.type === 'wiggle') {
      nod.value = withSequence(
        ...[12, -12, 9, -9, 5].map((d) => withTiming(d, { duration: 70 })),
        withSpring(0, { damping: 8 }),
      );
    } else if (action.type === 'spin') {
      flip.value = withSequence(withTiming(-1, { duration: 220 }), withTiming(1, { duration: 220 }));
    }
  }, [action?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const rig = useAnimatedStyle(() => {
    const a = t.value * TAU;
    const breathe = Math.sin(a * 3) * 0.018;
    return {
      transform: [
        { translateY: (Math.sin(a * 2) * bob.value + jumpY.value / s) * s },
        { rotate: `${lean.value + tilt.value + nod.value + Math.sin(a) * 1.5}deg` },
        { scaleX: sqX.value * (1 - breathe * 0.5) * flip.value },
        { scaleY: sqY.value * (1 + breathe) },
      ],
    };
  });

  const tail = useAnimatedStyle(() => {
    const a = t.value * TAU;
    return {
      transform: [{ rotate: `${Math.sin(a * 2) * tailSlow.value + Math.sin(a * 9) * tailFast.value}deg` }],
    };
  });

  const blink = useSharedValue(1);
  useEffect(() => {
    blink.value = withRepeat(
      withSequence(
        withDelay(2600, withTiming(0.1, { duration: 70 })),
        withTiming(1, { duration: 90 }),
        withDelay(160, withTiming(0.1, { duration: 70 })),
        withTiming(1, { duration: 90 }),
      ),
      -1,
    );
  }, [blink]);
  const eyes = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));

  const armL = useAnimatedStyle(() => {
    const a = t.value * TAU;
    const c = cheer.value;
    return { transform: [{ rotate: `${Math.sin(a * 2) * 6 + c * (150 + Math.sin(a * 12) * 18)}deg` }] };
  });
  const armR = useAnimatedStyle(() => {
    const a = t.value * TAU;
    const up = Math.max(wave.value, cheer.value);
    return { transform: [{ rotate: `${-Math.sin(a * 2) * 6 - up * (155 + Math.sin(a * 12) * 24)}deg` }] };
  });

  const tailLayer = (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(128, 168) }, tail]} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <G transform="translate(128 168) rotate(-12)">
            <Path d="M0 -12 C22 -26 48 -22 62 -34 C58 -8 34 12 0 12 Z" fill={colors.pink} stroke={colors.pinkLine} strokeWidth={3} strokeLinejoin="round" />
            <Path d="M10 -10 C26 -18 44 -18 54 -26" stroke={colors.pinkDeep} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" fill="none" />
          </G>
        </Svg>
      </Animated.View>
    </>
  );
  const gills = GILLS.map((g, i) => <Gill key={i} {...g} size={size} t={t} amp={gill} sweep={gillSweep} />);

  const feet = (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Ellipse cx={80} cy={187} rx={13} ry={7} fill={colors.pink} stroke={colors.pinkLine} strokeWidth={3} />
      <Ellipse cx={120} cy={187} rx={13} ry={7} fill={colors.pink} stroke={colors.pinkLine} strokeWidth={3} />
    </Svg>
  );

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 94%' }, rig]} pointerEvents="none">
        {!tank && tailLayer}
        {!tank && gills}
        {!tank && feet}

        {tank ? (
          <TankBody size={size} level={tank.level} ghost={tank.ghost} maskColor={tank.maskColor} />
        ) : (
          <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
            <Path d={SILHOUETTE} fill={colors.pink} stroke={colors.pinkLine} strokeWidth={3.5} strokeLinejoin="round" />
            <Ellipse cx={100} cy={160} rx={28} ry={20} fill={colors.pinkPale} />
            <Circle cx={88} cy={46} r={2.6} fill={colors.pinkLine} opacity={0.45} />
            <Circle cx={100} cy={42} r={2.6} fill={colors.pinkLine} opacity={0.45} />
            <Circle cx={112} cy={46} r={2.6} fill={colors.pinkLine} opacity={0.45} />
          </Svg>
        )}

        {tank && gills}
        {tank && feet}

        <Face mood={face} size={size} />
        {face !== 'sleep' && (
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(100, 92) }, eyes]} pointerEvents="none">
            <Svg width={size} height={size} viewBox="0 0 200 200">
              {[74, 126].map((x) => (
                <G key={x}>
                  <Ellipse cx={x} cy={92} rx={7.5} ry={9} fill={colors.ink} />
                  <Circle cx={x - 2.5} cy={88.5} r={2.7} fill="#fff" />
                  <Circle cx={x + 2.2} cy={95} r={1.2} fill="#fff" />
                </G>
              ))}
            </Svg>
          </Animated.View>
        )}

        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(66, 146) }, armL]} pointerEvents="none">
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <G transform="translate(66 146) rotate(28)">
              <Path d="M-7 0 a7 7 0 0 1 14 0 v14 a7 7 0 0 1 -14 0 Z" fill={colors.pink} stroke={colors.pinkLine} strokeWidth={3} />
            </G>
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(134, 146) }, armR]} pointerEvents="none">
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <G transform="translate(134 146) rotate(-28)">
              <Path d="M-7 0 a7 7 0 0 1 14 0 v14 a7 7 0 0 1 -14 0 Z" fill={colors.pink} stroke={colors.pinkLine} strokeWidth={3} />
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
  phase,
  size,
  t,
  amp,
  sweep,
}: {
  x: number;
  y: number;
  angle: number;
  phase: number;
  size: number;
  t: SharedValue<number>;
  amp: SharedValue<number>;
  sweep: SharedValue<number>;
}) {
  const left = x < 100;
  const style = useAnimatedStyle(() => {
    const a = t.value * TAU;
    // Sweep pushes left gills clockwise and right gills anticlockwise (towards the back).
    const deg = Math.sin(a * 3 + phase) * amp.value + (left ? sweep.value : -sweep.value);
    return { transform: [{ rotate: `${deg}deg` }] };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: pct(x, y) }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G transform={`translate(${x} ${y}) rotate(${angle})`}>
          <Path d="M-2 -5 C12 -8 28 -6 36 0 C28 6 12 8 -2 5 Z" fill={colors.pinkDeep} />
          {[11, 20, 29].map((fx) => (
            <G key={fx}>
              <Circle cx={fx} cy={-6.5 + fx / 10} r={3.6 - fx / 20} fill="#FF9DBB" />
              <Circle cx={fx} cy={6.5 - fx / 10} r={3.6 - fx / 20} fill="#FF9DBB" />
            </G>
          ))}
        </G>
      </Svg>
    </Animated.View>
  );
}

function Face({ mood, size }: { mood: Mood; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Ellipse cx={58} cy={108} rx={10} ry={6} fill={colors.blush} opacity={0.55} />
      <Ellipse cx={142} cy={108} rx={10} ry={6} fill={colors.blush} opacity={0.55} />
      {mood === 'smile' && (
        <Path d="M91 106 Q95.5 112 100 106 Q104.5 112 109 106" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" fill="none" />
      )}
      {mood === 'open' && (
        <G>
          <Path d="M89 105 Q100 126 111 105 Z" fill="#7A2E45" stroke={colors.ink} strokeWidth={2.5} strokeLinejoin="round" />
          <Ellipse cx={100} cy={114} rx={5.5} ry={3.2} fill={colors.blush} />
        </G>
      )}
      {mood === 'o' && <Ellipse cx={100} cy={109} rx={4.5} ry={5.5} fill="#7A2E45" stroke={colors.ink} strokeWidth={2} />}
      {mood === 'sleep' && (
        <G stroke={colors.ink} strokeWidth={3} strokeLinecap="round" fill="none">
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
  level,
  ghost,
  maskColor,
}: {
  size: number;
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
        <Path d={SILHOUETTE} fill={colors.pinkPale} />
      </Svg>
      <View style={{ position: 'absolute', left: BOX.x * s, top: BOX.y * s }}>
        <Water width={BOX.w * s} height={BOX.h * s} level={level} ghost={ghost} />
      </View>
      <Svg width={size} height={size} viewBox="0 0 200 200" style={StyleSheet.absoluteFill}>
        <Path d={mask} fill={maskColor} fillRule="evenodd" />
        <Path d={SILHOUETTE} fill="none" stroke={colors.pinkLine} strokeWidth={3.5} strokeLinejoin="round" />
        <Path d="M54 70 C58 56 70 46 84 42" stroke="#fff" strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" fill="none" />
      </Svg>
    </>
  );
}
