import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useLoop } from '../lib/anim';
import { colors } from '../theme';

type Props = {
  width: number;
  height: number;
  /** 0..1 fill level. */
  level: SharedValue<number>;
  /** Optional preview level drawn as translucent water (while choosing an amount). */
  ghost?: SharedValue<number>;
  color?: string;
  deep?: string;
};

const WAVE_H = 14;

/** Build a sine-ish strip two widths long so it can scroll seamlessly by one width. */
function wavePath(width: number, periods: number, amp: number) {
  const P = width / periods;
  let d = `M0 ${WAVE_H / 2}`;
  for (let x = 0; x < width * 2; x += P) {
    d += ` Q${x + P / 4} ${WAVE_H / 2 - amp} ${x + P / 2} ${WAVE_H / 2} T${x + P} ${WAVE_H / 2}`;
  }
  return `${d} V${WAVE_H} H0 Z`;
}

export function Water({ width, height, level, ghost, color = colors.water, deep = colors.waterDeep }: Props) {
  const front = useMemo(() => wavePath(width, 2, 4.5), [width]);
  const back = useMemo(() => wavePath(width, 3, 3.5), [width]);
  const t1 = useLoop(2600);
  const t2 = useLoop(3900);

  const waterStyle = useAnimatedStyle(() => ({
    height: Math.max(0, Math.min(1, level.value)) * height,
    opacity: level.value > 0.004 ? 1 : 0,
  }));
  const ghostStyle = useAnimatedStyle(() => {
    const g = ghost ? Math.max(ghost.value, level.value) : 0;
    return { height: Math.min(1, g) * height, opacity: ghost && g - level.value > 0.004 ? 1 : 0 };
  });
  const frontStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -t1.value * width }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -(1 - t2.value) * width }] }));

  return (
    <View style={{ width, height, overflow: 'hidden' }} pointerEvents="none">
      {ghost && (
        <Animated.View style={[styles.bottom, { backgroundColor: color, opacity: 0.3 }, ghostStyle]}>
          <View style={[styles.ghostLine, { borderColor: deep }]} />
        </Animated.View>
      )}
      <Animated.View style={[styles.bottom, waterStyle]}>
        <Animated.View style={[styles.wave, { width: width * 2 }, backStyle]}>
          <Svg width={width * 2} height={WAVE_H}>
            <Path d={back} fill={deep} opacity={0.55} />
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.wave, { width: width * 2, top: -WAVE_H + 4 }, frontStyle]}>
          <Svg width={width * 2} height={WAVE_H}>
            <Path d={front} fill={color} />
          </Svg>
        </Animated.View>
        <View style={[StyleSheet.absoluteFill, { top: 3, backgroundColor: color }]} />
        <View style={[styles.shine, { width: width * 0.1, left: width * 0.16 }]} />
        {BUBBLES.map((b, i) => (
          <Bubble key={i} {...b} width={width} height={height} level={level} />
        ))}
      </Animated.View>
    </View>
  );
}

const BUBBLES = [
  { x: 0.2, r: 5, speed: 3100, offset: 0 },
  { x: 0.42, r: 3.5, speed: 2400, offset: 0.4 },
  { x: 0.6, r: 6, speed: 3600, offset: 0.7 },
  { x: 0.78, r: 4, speed: 2800, offset: 0.2 },
  { x: 0.33, r: 2.5, speed: 2000, offset: 0.55 },
];

function Bubble({
  x,
  r,
  speed,
  offset,
  width,
  height,
  level,
}: {
  x: number;
  r: number;
  speed: number;
  offset: number;
  width: number;
  height: number;
  level: SharedValue<number>;
}) {
  const t = useLoop(speed);
  const style = useAnimatedStyle(() => {
    const p = (t.value + offset) % 1;
    const h = Math.min(1, level.value) * height;
    return {
      opacity: h > 30 ? Math.sin(p * Math.PI) * 0.8 : 0,
      transform: [{ translateY: -p * Math.max(0, h - 10) }, { translateX: Math.sin(p * 12) * 3 }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', bottom: 4, left: x * width, width: r * 2, height: r * 2, borderRadius: r, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.25)' },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  wave: { position: 'absolute', left: 0, top: -WAVE_H + 2, height: WAVE_H },
  ghostLine: { position: 'absolute', top: 0, left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  shine: { position: 'absolute', top: 10, bottom: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
});
