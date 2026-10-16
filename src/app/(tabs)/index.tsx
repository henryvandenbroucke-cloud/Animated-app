import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Confetti } from '../../components/Confetti';
import { DrinkCarousel } from '../../components/DrinkCarousel';
import { DrinkIcon } from '../../components/DrinkIcon';
import { DrinkPicker } from '../../components/DrinkPicker';
import { LogEditor } from '../../components/LogEditor';
import { Sheet } from '../../components/Sheet';
import { Splash } from '../../components/Splash';
import { useCountUp } from '../../components/useCountUp';
import { VolumeSlider } from '../../components/VolumeSlider';
import { allDrinks, caffeineOf, CUP_SIZES, findDrink, kcalOf, waterContent } from '../../lib/drinks';
import { feedback, play } from '../../lib/feedback';
import { byDay, currentStreak, dayKey } from '../../lib/stats';
import { todaysLogs, totalWater, useApp } from '../../lib/store';
import type { DrinkLog } from '../../lib/supabase';
import { tipFor } from '../../lib/tips';
import { formatAmount } from '../../lib/units';
import { Sippy, type Action, type Mood, type Pose } from '../../mascot/Sippy';
import { colors, fonts, shadow } from '../../theme';

const LIGHT = new Set(['milk', 'coconut', 'sparkling', 'oat-milk', 'almond-milk', 'kefir', 'lemon-water', 'electrolyte', 'mineral']);
const MAX_ML = 1000;

export default function Home() {
  const { width } = useWindowDimensions();
  const profile = useApp((s) => s.profile);
  const logs = useApp((s) => s.logs);
  const customDrinks = useApp((s) => s.customDrinks);
  const addLog = useApp((s) => s.addLog);
  const recapsSeen = useApp((s) => s.recapsSeen);
  const setApp = useApp((s) => s.set);

  const unit = profile?.unit ?? 'ml';
  const goal = profile?.daily_goal_ml ?? 2000;
  const today = useMemo(() => todaysLogs(logs), [logs]);
  const total = totalWater(today);
  const progress = total / goal;
  const caffeine = today.reduce((a, l) => a + (l.caffeine_mg ?? 0), 0);
  const kcal = today.reduce((a, l) => a + (l.kcal ?? 0), 0);
  const streak = useMemo(() => currentStreak(byDay(logs), goal), [logs, goal]);

  // Favourites first, then everything else you've used recently.
  const favs = useMemo(() => profile?.favorite_drinks ?? ['water', 'tea', 'coffee', 'juice', 'sparkling'], [profile?.favorite_drinks]);
  const recent = useMemo(() => [...new Set(logs.slice(0, 40).map((l) => l.drink))], [logs]);
  const carousel = useMemo(() => {
    const ids = [...new Set(['water', ...favs, ...recent])];
    return ids.map((id) => allDrinks(customDrinks).find((d) => d.id === id)).filter(Boolean).slice(0, 12) as ReturnType<typeof findDrink>[];
  }, [favs, recent, customDrinks]);

  const [drinkId, setDrinkId] = useState('water');
  const [amount, setAmount] = useState(profile?.cup_ml ?? 250);
  const drink = findDrink(drinkId, customDrinks);
  const preview = waterContent(drink, amount);

  // Water level and the dashed "what if" preview line.
  const level = useSharedValue(0);
  const ghost = useSharedValue(0);
  useEffect(() => {
    level.set(withSpring(Math.min(1, progress), { damping: 11, stiffness: 55 }));
  }, [progress, level]);
  useEffect(() => {
    ghost.set(withSpring(Math.min(1, (total + preview) / goal), { damping: 16 }));
  }, [total, preview, goal, ghost]);

  // Sippy glances at the slider while you pick an amount, then looks back at you.
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const look = useDerivedValue(() => ({ x: lookX.value, y: lookY.value }));
  const firstAmount = useRef(true);
  useEffect(() => {
    if (firstAmount.current) {
      firstAmount.current = false;
      return;
    }
    lookX.set(withSequence(withSpring((amount / MAX_ML - 0.5) * 1.6, { damping: 14 }), withDelay(1100, withSpring(0, { damping: 14 }))));
    lookY.set(withSequence(withSpring(0.8, { damping: 14 }), withDelay(1100, withSpring(0, { damping: 14 }))));
  }, [amount, lookX, lookY]);

  const [action, setAction] = useState<Action>();
  const act = (type: Action['type']) => setAction((a) => ({ type, key: (a?.key ?? 0) + 1 }));
  const [splash, setSplash] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<DrinkLog | null>(null);
  const [recap, setRecap] = useState(false);
  const [tipOffset, setTipOffset] = useState(0);

  const hour = new Date().getHours();
  const pose: Pose = progress >= 1 ? 'cheer' : 'idle';
  const mood: Mood | undefined = progress < 0.25 && hour >= 13 ? 'worried' : undefined;
  const shownTotal = useCountUp(total, 900);
  const tankSize = Math.min(width - 110, 270);

  const add = async () => {
    setError(null);
    feedback('pour', 'medium');
    setSplash((n) => n + 1);
    act('gulp');
    setTimeout(() => act('hop'), 420);
    const todayKey = dayKey(new Date());
    const crossing = total < goal && total + preview >= goal && !recapsSeen.includes(todayKey);
    if (crossing) {
      setTimeout(() => {
        setConfetti((n) => n + 1);
        play('celebrate');
        act('jump');
      }, 650);
      setTimeout(() => {
        setRecap(true);
        setApp({ recapsSeen: [...recapsSeen, todayKey] });
      }, 1900);
    }
    try {
      await addLog(drink.id, amount);
    } catch (e) {
      play('error');
      setError(e instanceof Error ? e.message : 'Could not save that drink.');
    }
  };

  const poke = () => {
    play('boop');
    act('flinch');
  };

  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const btnColor = LIGHT.has(drink.id) || drink.custom ? colors.waterDeep : drink.color;
  const remaining = goal - total;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{greeting}{profile?.name ? `, ${profile.name}` : ''}</Text>
            <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
          </View>
          <StreakBadge streak={streak} />
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
          {progress >= 1 ? 'Goal reached! Sippy is so happy 🎉' : total === 0 ? 'Sippy is thirsty… log your first drink!' : `${formatAmount(remaining, unit)} to go`}
        </Text>

        <Pressable onPress={poke} style={styles.tankWrap} accessibilityLabel="Sippy, tap to play" testID="sippy">
          <Sippy size={tankSize} pose={pose} mood={mood} action={action} skin={profile?.character} look={look} tank={{ level, ghost, maskColor: colors.bg }} />
          <Splash burst={splash} color={drink.color === '#F4F1EA' ? colors.water : drink.color} y={-tankSize * 0.1} />
          <Confetti burst={confetti} count={36} spread={200} />
        </Pressable>

        <DrinkCarousel drinks={carousel} selected={drinkId} onSelect={setDrinkId} onMore={() => setPicker(true)} />

        <View style={styles.panel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cups}>
            {CUP_SIZES.map((c) => {
              const on = Math.abs(amount - c.ml) < 1;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    feedback('select', 'select');
                    setAmount(c.ml);
                  }}
                  style={[styles.cup, on && { backgroundColor: btnColor }]}
                  testID={`cup-${c.id}`}
                >
                  <Text style={[styles.cupText, on && { color: '#fff' }]}>{c.label}</Text>
                  <Text style={[styles.cupMl, on && { color: '#fff' }]}>{formatAmount(c.ml, unit)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <VolumeSlider value={amount} onChange={setAmount} unit={unit} color={btnColor} max={MAX_ML} />
          <Text style={styles.waterNote}>
            {drink.hydration < 1 ? `≈ ${formatAmount(preview, unit)} of water (${Math.round(drink.hydration * 100)}%)` : 'Counts fully as water'}
            {drink.caffeine ? ` · ${caffeineOf(drink, amount)} mg caffeine` : ''}
            {drink.kcal ? ` · ${kcalOf(drink, amount)} kcal` : ''}
          </Text>
          <Button testID="home-add" title={`Add ${drink.name.toLowerCase()}`} color={btnColor} sound={null} onPress={add} style={{ marginTop: 10 }} />
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Drinks" value={String(today.length)} />
          <Stat label="Caffeine" value={`${caffeine} mg`} warn={caffeine > 400} />
          <Stat label="Calories" value={`${kcal}`} />
        </View>

        <TipCard text={tipFor(new Date(), tipOffset)} onNext={() => setTipOffset((n) => n + 1)} />

        <Text style={styles.section}>Today</Text>
        {today.length === 0 ? (
          <Text style={styles.empty}>Nothing yet. Your drinks will show up here. Tap one to edit it.</Text>
        ) : (
          today.map((l) => {
            const d = findDrink(l.drink, customDrinks);
            return (
              <Animated.View key={l.id} entering={FadeInDown.springify().damping(16)} exiting={FadeOutLeft.duration(200)} layout={LinearTransition.springify().damping(18)}>
                <Pressable
                  style={styles.logRow}
                  onPress={() => {
                    feedback('tap', 'light');
                    setEditing(l);
                  }}
                  accessibilityLabel={`${d.name}, ${formatAmount(l.volume_ml, unit)}. Tap to edit.`}
                >
                  <DrinkIcon drink={d} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logName}>{d.name}</Text>
                    <Text style={styles.logSub}>
                      {formatAmount(l.volume_ml, unit)} · {new Date(l.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      {l.caffeine_mg ? ` · ${l.caffeine_mg} mg caffeine` : ''}
                    </Text>
                  </View>
                  <Text style={styles.logWater}>+{formatAmount(l.water_ml, unit)}</Text>
                  <Text style={styles.chev}>›</Text>
                </Pressable>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <DrinkPicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(id) => {
          setDrinkId(id);
          setPicker(false);
        }}
      />
      <LogEditor log={editing} onClose={() => setEditing(null)} />
      <Sheet open={recap} onClose={() => setRecap(false)} title="Goal reached!" height={0.75}>
        <View style={styles.recap}>
          <Sippy size={170} pose="cheer" skin={profile?.character} />
          <Text style={styles.recapBig}>{formatAmount(total + 0, unit)}</Text>
          <Text style={styles.recapText}>
            You drank {today.length} {today.length === 1 ? 'drink' : 'drinks'} today
            {streak > 1 ? ` and you're on a ${streak}-day streak` : ''}. Sippy is full and happy.
          </Text>
          <Button title="Yay!" onPress={() => setRecap(false)} />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  const s = useSharedValue(1);
  useEffect(() => {
    if (streak > 0) s.set(withSequence(withTiming(1.25, { duration: 140 }), withSpring(1, { damping: 6 })));
  }, [streak, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable onPress={() => router.push('/(tabs)/calendar')} accessibilityLabel={`${streak} day streak. Open calendar.`}>
      <Animated.View style={[styles.streak, streak === 0 && { opacity: 0.55 }, style]}>
        <Text style={styles.streakIcon}>🔥</Text>
        <Text style={styles.streakNum}>{streak}</Text>
      </Animated.View>
    </Pressable>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, warn && { color: '#D9435F' }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TipCard({ text, onNext }: { text: string; onNext: () => void }) {
  const flip = useSharedValue(1);
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (text === shown) return;
    // Card turns over: squash to nothing, swap the text, spring back open.
    flip.set(withTiming(0, { duration: 140 }));
    const t = setTimeout(() => {
      setShown(text);
      flip.set(withSpring(1, { damping: 12, stiffness: 180 }));
    }, 150);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: 0.2 + flip.value * 0.8 }], opacity: flip.value }));
  return (
    <Pressable
      onPress={() => {
        feedback('tap', 'light');
        onNext();
      }}
      accessibilityLabel={`Hydration tip: ${shown}. Tap for another tip.`}
    >
      <Animated.View style={[styles.tip, style]}>
        <Text style={styles.tipLabel}>💡 Tip of the day</Text>
        <Text style={styles.tipText}>{shown}</Text>
        <Text style={styles.tipMore}>Tap for another</Text>
      </Animated.View>
    </Pressable>
  );
}

function Gear() {
  const spin = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  return (
    <Pressable
      testID="open-settings"
      onPress={() => {
        feedback('tap', 'light');
        spin.set(withSequence(withTiming(spin.value + 120, { duration: 260 }), withSpring(spin.value + 90)));
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingTop: 8 },
  hello: { fontFamily: fonts.bold, fontSize: 23, color: colors.ink },
  date: { fontFamily: fonts.regular, fontSize: 15, color: colors.inkSoft },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 10, height: 40, ...shadow },
  streakIcon: { fontSize: 16 },
  streakNum: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  gear: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  gearText: { fontSize: 24, color: colors.inkSoft },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 },
  total: { fontFamily: fonts.bold, fontSize: 40, color: colors.waterDeep },
  goal: { fontFamily: fonts.medium, fontSize: 20, color: colors.inkSoft },
  pctPill: { backgroundColor: colors.pinkPale, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  pct: { fontFamily: fonts.semibold, color: colors.ink, fontSize: 15 },
  hint: { fontFamily: fonts.medium, color: colors.inkSoft, fontSize: 15, textAlign: 'center', marginTop: 2 },
  tankWrap: { alignItems: 'center', marginTop: 8 },
  panel: { marginHorizontal: 20, marginTop: 4, padding: 16, paddingTop: 12, borderRadius: 26, backgroundColor: '#fff', ...shadow },
  cups: { gap: 8, paddingBottom: 10 },
  cup: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.bg, alignItems: 'center' },
  cupText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  cupMl: { fontFamily: fonts.regular, fontSize: 11, color: colors.inkSoft },
  waterNote: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginTop: 2 },
  error: { fontFamily: fonts.medium, color: '#D9435F', textAlign: 'center', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 14 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 10, alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
  tip: { marginHorizontal: 20, marginTop: 14, padding: 16, borderRadius: 22, backgroundColor: colors.waterPale },
  tipLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.waterDeep, marginBottom: 4 },
  tipText: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, lineHeight: 22 },
  tipMore: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 6 },
  section: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, marginHorizontal: 22, marginTop: 22, marginBottom: 8 },
  empty: { fontFamily: fonts.regular, color: colors.inkSoft, marginHorizontal: 22, fontSize: 15 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 8, padding: 10, paddingRight: 12, borderRadius: 20, backgroundColor: '#fff' },
  logName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  logSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  logWater: { fontFamily: fonts.semibold, fontSize: 15, color: colors.waterDeep },
  chev: { fontFamily: fonts.bold, fontSize: 22, color: colors.line },
  recap: { alignItems: 'center', padding: 20, gap: 10 },
  recapBig: { fontFamily: fonts.bold, fontSize: 40, color: colors.waterDeep },
  recapText: { fontFamily: fonts.medium, fontSize: 16, color: colors.inkSoft, textAlign: 'center', lineHeight: 22, marginBottom: 6 },
});
