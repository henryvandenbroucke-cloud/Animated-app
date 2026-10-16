import type { BottomTabBarProps } from 'expo-router/tabs';
import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { feedback } from '../../lib/feedback';
import { useApp } from '../../lib/store';
import { useReminderSync } from '../../lib/useReminderSync';
import { colors, fonts, shadow } from '../../theme';

export default function TabsLayout() {
  const session = useApp((s) => s.session);
  const authReady = useApp((s) => s.authReady);
  useReminderSync();
  if (authReady && !session) return <Redirect href="/" />;

  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="pool" options={{ title: 'Pool' }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges' }} />
    </Tabs>
  );
}

function Icon({ name, color }: { name: string; color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26">
      {name === 'index' && <Path d="M13 3 C13 3 5 12 5 17 a8 8 0 0 0 16 0 C21 12 13 3 13 3 Z" fill={color} />}
      {name === 'pool' && (
        <>
          <Circle cx={13} cy={13} r={8} fill="none" stroke={color} strokeWidth={5} />
          <Path d="M2 23 q3.5 -3 7 0 t7 0 t8 0" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </>
      )}
      {name === 'calendar' && (
        <>
          <Rect x={3} y={5} width={20} height={18} rx={5} fill="none" stroke={color} strokeWidth={2.6} />
          <Rect x={3} y={5} width={20} height={6} rx={3} fill={color} />
          <Circle cx={9} cy={16} r={2} fill={color} />
          <Circle cx={16} cy={16} r={2} fill={color} />
        </>
      )}
      {name === 'challenges' && (
        <>
          <Path d="M7 4 H19 V10 A6 6 0 0 1 7 10 Z" fill={color} />
          <Path d="M7 6 H3 Q3 12 8 12 M19 6 H23 Q23 12 18 12" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Rect x={11.5} y={15} width={3} height={5} fill={color} />
          <Rect x={8} y={20} width={10} height={3} rx={1.5} fill={color} />
        </>
      )}
    </Svg>
  );
}

function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const tabW = w / state.routes.length;

  useEffect(() => {
    x.value = withSpring(state.index * tabW, { damping: 15, stiffness: 160 });
  }, [state.index, tabW, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: tabW }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar} onLayout={(e) => setW(e.nativeEvent.layout.width - 12)}>
        {w > 0 && <Animated.View style={[styles.pill, pill]} />}
        {state.routes.map((route, i) => (
          <TabButton
            key={route.key}
            label={descriptors[route.key].options.title ?? route.name}
            name={route.name}
            focused={state.index === i}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (state.index !== i && !event.defaultPrevented) {
                feedback('tap', 'select');
                navigation.navigate(route.name);
              }
            }}
          />
        ))}
      </View>
    </View>
  );
}

function TabButton({ label, name, focused, onPress }: { label: string; name: string; focused: boolean; onPress: () => void }) {
  const bounce = useSharedValue(1);
  useEffect(() => {
    if (focused) bounce.value = withSequence(withTiming(0.8, { duration: 90 }), withSpring(1, { damping: 5, stiffness: 300 }));
  }, [focused, bounce]);
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));
  return (
    <Pressable style={styles.tab} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }} testID={`tab-${name}`}>
      <Animated.View style={icon}>
        <Icon name={name} color={focused ? '#fff' : colors.inkSoft} />
      </Animated.View>
      <Text style={[styles.label, focused && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 6,
    width: 360,
    maxWidth: '92%',
    ...shadow,
  },
  pill: { position: 'absolute', top: 6, bottom: 6, left: 6, borderRadius: 24, backgroundColor: colors.pinkDeep },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 1 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.inkSoft },
});
