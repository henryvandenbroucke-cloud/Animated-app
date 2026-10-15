import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Confetti } from '../../components/Confetti';
import { DrinkCarousel } from '../../components/DrinkCarousel';
import { DrinkIcon } from '../../components/DrinkIcon';
import { Splash } from '../../components/Splash';
import { useCountUp } from '../../components/useCountUp';
import { VolumeSlider } from '../../components/VolumeSlider';
import { BUILTIN_DRINKS, findDrink, waterContent } from '../../lib/drinks';
import { feedback, play } from '../../lib/feedback';
import { todaysLogs, totalWater, useApp } from '../../lib/store';
import { formatAmount } from '../../lib/units';
import { Sippy, type Action, type Pose } from '../../mascot/Sippy';
import { colors, fonts, shadow } from '../../theme';

const LIGHT = new Set(['milk', 'coconut', 'sparkling']);

export default function Home() {
  const { width } = useWindowDimensions();
  const profile = useApp((s) => s.profile);
  const logs = useApp((s) => s.logs);
  const customDrinks = useApp((s) => s.customDrinks);
  const addLog = useApp((s) => s.addLog);
  const deleteLog = useApp((s) => s.deleteLog);

  const unit = profile?.unit ?? 'ml';
  const goal = profile?.daily_goal_ml ?? 2000;
  const today = useMemo(() => todaysLogs(logs), [logs]);
  const total = totalWater(today);
  const progress = total / goal;

  const drinks = useMemo(() => [...BUILTIN_DRINKS, ...customDrinks], [customDrinks]);
  const [drinkId, setDrinkId] = useState('water');
  const [amount, setAmount] = useState(250);
  const drink = findDrink(drinkId, customDrinks);
  const preview = waterContent(drink, amount);

  const level = useSharedValue(0);
  const ghost = useSharedValue(0);
  useEffect(() => {
    level.value = withSpring(Math.min(1, progress), { damping: 10, stiffness: 60 });
  }, [progress, level]);
  useEffect(() => {
    ghost.value = withSpring(Math.min(1, (total + preview) / goal), { damping: 14 });
  }, [total, preview, goal, ghost]);

  const [action, setAction] = useState<Action>();
  const [splash, setSplash] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const celebrated = useRef(progress >= 1);

  const pose: Pose = progress >= 1 ? 'cheer' : total === 0 ? 'sleep' : 'idle';
  const shownTotal = useCountUp(total, 800);
  const tankSize = Math.min(width - 90, 290);

  const add = async () => {
    setError(null);
    feedback('splash', 'medium');
    setSplash((n) => n + 1);
    setAction((a) => ({ type: 'jump', key: (a?.key ?? 0) + 1 }));
    const crossing = !celebrated.current && total + preview >= goal;
    if (crossing) {
      celebrated.current = true;
      setTimeout(() => {
        setConfetti((n) => n + 1);
        play('success');
      }, 450);
    }
    try {
      await addLog(drink.id, amount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that drink.');
    }
  };

  const poke = () => {
    play('bloop');
    const types: Action['type'][] = ['jump', 'spin', 'wiggle', 'nod'];
    setAction((a) => ({ type: types[((a?.key ?? 0) * 7 + 3) % types.length], key: (a?.key ?? 0) + 1 }));
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const btnColor = LIGHT.has(drink.id) ? colors.waterDeep : drink.color;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.hello}>{greeting}{profile?.name ? `, ${profile.name}` : ''}</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </View>
          <Gear />
        </View>

        <Animated.View entering={FadeIn.duration(500)} style={styles.counter}>
          <Text style={styles.total} testID="today-total">
            {formatAmount(shownTotal, unit, false)}
            <Text style={styles.goal}> / {formatAmount(goal, unit)}</Text>
          </Text>
          <View style={[styles.pctPill, progress >= 1 && { backgroundColor: colors.mint }]}>
            <Text style={styles.pct}>{Math.round(progress * 100)}%</Text>
          </View>
        </Animated.View>
        <Text style={styles.hint}>
          {progress >= 1 ? 'Goal reached! Sippy is so happy 🎉' : total === 0 ? 'Sippy is thirsty… log your first drink!' : `${formatAmount(goal - total, unit)} to go`}
        </Text>

        <Pressable onPress={poke} style={styles.tankWrap} accessibilityLabel="Sippy, tap to play">
          <Sippy size={tankSize} pose={pose} action={action} tank={{ level, ghost, maskColor: colors.bg }} />
          <Splash burst={splash} color={drink.color === '#F4F1EA' ? colors.water : drink.color} y={-tankSize * 0.1} />
          <Confetti burst={confetti} count={36} spread={200} />
        </Pressable>

        <DrinkCarousel drinks={drinks} selected={drinkId} onSelect={setDrinkId} onAdd={() => router.push('/settings')} />

        <View style={styles.panel}>
          <VolumeSlider value={amount} onChange={setAmount} unit={unit} color={btnColor} max={1000} />
          {drink.hydration < 1 && (
            <Text style={styles.waterNote}>
              ≈ {formatAmount(preview, unit)} of water ({Math.round(drink.hydration * 100)}%)
            </Text>
          )}
          <Button testID="home-add" title={`Add ${drink.name.toLowerCase()}`} color={btnColor} sound="bloop" onPress={add} style={{ marginTop: 10 }} />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Text style={styles.section}>Today</Text>
        {today.length === 0 ? (
          <Text style={styles.empty}>Nothing yet. Your drinks will show up here.</Text>
        ) : (
          today.map((l) => {
            const d = findDrink(l.drink, customDrinks);
            return (
              <Animated.View key={l.id} entering={FadeInDown.springify().damping(14)} exiting={FadeOutLeft.duration(200)} layout={LinearTransition.springify()} style={styles.logRow}>
                <DrinkIcon drink={d} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logName}>{d.name}</Text>
                  <Text style={styles.logSub}>
                    {formatAmount(l.volume_ml, unit)} · {new Date(l.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.logWater}>+{formatAmount(l.water_ml, unit)}</Text>
                <Pressable
                  onPress={() => {
                    feedback('pop', 'light');
                    deleteLog(l.id).catch((e) => setError(e.message));
                  }}
                  style={styles.del}
                  accessibilityLabel={`Remove ${d.name}`}
                  hitSlop={8}
                >
                  <Text style={styles.delText}>×</Text>
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Gear() {
  const spin = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  return (
    <Pressable
      testID="open-settings"
      onPress={() => {
        feedback('pop', 'light');
        spin.value = withSequence(withTiming(spin.value + 120, { duration: 260 }), withSpring(spin.value + 90));
        router.push('/settings');
      }}
      style={styles.gear}
      accessibilityLabel="Settings"
    >
      <Animated.Text style={[styles.gearText, style]}>⚙︎</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 130, maxWidth: 520, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 8 },
  hello: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  date: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft },
  gear: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  gearText: { fontSize: 24, color: colors.inkSoft },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 },
  total: { fontFamily: fonts.bold, fontSize: 40, color: colors.waterDeep },
  goal: { fontFamily: fonts.medium, fontSize: 20, color: colors.inkSoft },
  pctPill: { backgroundColor: colors.pinkPale, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  pct: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 15 },
  hint: { fontFamily: fonts.medium, color: colors.inkSoft, fontSize: 15, textAlign: 'center', marginTop: 2 },
  tankWrap: { alignItems: 'center', marginTop: 10 },
  panel: { marginHorizontal: 20, marginTop: 4, padding: 16, borderRadius: 26, backgroundColor: '#fff', ...shadow },
  waterNote: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginTop: 2 },
  error: { fontFamily: fonts.medium, color: '#D9435F', textAlign: 'center', marginTop: 8 },
  section: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, marginHorizontal: 22, marginTop: 24, marginBottom: 8 },
  empty: { fontFamily: fonts.regular, color: colors.inkSoft, marginHorizontal: 22, fontSize: 15 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 8, padding: 10, paddingRight: 8, borderRadius: 20, backgroundColor: '#fff' },
  logName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  logSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  logWater: { fontFamily: fonts.semibold, fontSize: 15, color: colors.waterDeep },
  del: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  delText: { fontSize: 20, color: colors.inkSoft, marginTop: -2 },
});
