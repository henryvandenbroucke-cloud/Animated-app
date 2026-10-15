import { useEffect } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

/** Each letter drops in on a spring, one after another. */
export function BouncyText({ text, style, delay = 0, stagger = 45 }: { text: string; style?: TextStyle; delay?: number; stagger?: number }) {
  const words = text.split(' ');
  let index = 0;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }} accessible accessibilityLabel={text}>
      {words.map((word, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {[...word, ...(w < words.length - 1 ? [' '] : [])].map((ch) => {
            const i = index++;
            return <Letter key={i} ch={ch} delay={delay + i * stagger} style={style} />;
          })}
        </View>
      ))}
    </View>
  );
}

function Letter({ ch, delay, style }: { ch: string; delay: number; style?: TextStyle }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withSpring(1, { damping: 7, stiffness: 160 }));
  }, [delay, p]);
  const anim = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 2),
    transform: [{ translateY: (1 - p.value) * -40 }, { scale: 0.4 + 0.6 * p.value }, { rotate: `${(1 - p.value) * -25}deg` }],
  }));
  return (
    <Animated.View style={anim}>
      <Text style={style}>{ch === ' ' ? ' ' : ch}</Text>
    </Animated.View>
  );
}
