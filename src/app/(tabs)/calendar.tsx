import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedProps, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Button } from '../../components/Button';
import { DrinkIcon } from '../../components/DrinkIcon';
import { DrinkPicker } from '../../components/DrinkPicker';
import { LogEditor } from '../../components/LogEditor';
import { Sheet } from '../../components/Sheet';
import { findDrink } from '../../lib/drinks';
import { feedback } from '../../lib/feedback';
import { addDays, bestStreak, byDay, currentStreak, dayKey, startOfDay } from '../../lib/stats';
import { useApp } from '../../lib/store';
import type { DrinkLog } from '../../lib/supabase';
import { formatAmount } from '../../lib/units';
import { Sippy } from '../../mascot/Sippy';
import { colors, fonts, shadow } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Calendar() {
  const profile = useApp((s) => s.profile);
  const logs = useApp((s) => s.logs);
  const customDrinks = useApp((s) => s.customDrinks);
  const addLog = useApp((s) => s.addLog);
  const unit = profile?.unit ?? 'ml';
  const goal = profile?.daily_goal_ml ?? 2000;
  const days = useMemo(() => byDay(logs), [logs]);

  const [month, setMonth] = useState(() => {
    const d = startOfDay();
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = useState<Date | null>(null);
  const [editing, setEditing] = useState<DrinkLog | null>(null);
  const [picking, setPicking] = useState(false);
  // Replay the ring animation every time the tab is opened.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));

  const cells = useMemo(() => {
    const first = new Date(month);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const inMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: inMonth }, (_, i) => addDays(first, i))];
  }, [month]);

  const monthDays = cells.filter(Boolean) as Date[];
  const today = startOfDay();
  const past = monthDays.filter((d) => d <= today);
  const totals = past.map((d) => days.get(dayKey(d))?.water ?? 0);
  const logged = totals.filter((t) => t > 0);
  const hit = totals.filter((t) => t >= goal).length;
  const totalMonth = totals.reduce((a, b) => a + b, 0);
  const best = Math.max(0, ...totals);
  const favourite = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((l) => {
      const at = new Date(l.logged_at);
      if (at.getMonth() === month.getMonth() && at.getFullYear() === month.getFullYear()) counts.set(l.drink, (counts.get(l.drink) ?? 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? findDrink(top[0], customDrinks) : null;
  }, [logs, month, customDrinks]);
  const caffeineMonth = past.reduce((a, d) => a + (days.get(dayKey(d))?.caffeine ?? 0), 0);
  const streak = currentStreak(days, goal);
  const longest = bestStreak(days, goal);

  const dayLogs = selected ? logs.filter((l) => dayKey(new Date(l.logged_at)) === dayKey(selected)) : [];
  const dayTotal = dayLogs.reduce((a, l) => a + l.water_ml, 0);
  const canGoForward = month.getFullYear() < today.getFullYear() || month.getMonth() < today.getMonth();

  const shiftMonth = (n: number) => {
    feedback('tap', 'select');
    const m = new Date(month);
    m.setMonth(m.getMonth() + n);
    setMonth(m);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Calendar</Text>

        <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.streakCard}>
          <Sippy size={96} pose={streak > 0 ? 'cheer' : 'idle'} skin={profile?.character} idle={false} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakNum}>🔥 {streak} day{streak === 1 ? '' : 's'}</Text>
            <Text style={styles.streakLabel}>{streak > 0 ? 'Current streak. Keep it flowing!' : 'Reach your goal today to start a streak.'}</Text>
            <Text style={styles.streakBest}>Best: {longest} day{longest === 1 ? '' : 's'}</Text>
          </View>
        </Animated.View>

        <View style={styles.card}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn} accessibilityLabel="Previous month"><Text style={styles.navText}>‹</Text></Pressable>
            <Text style={styles.monthName}>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <Pressable onPress={() => canGoForward && shiftMonth(1)} style={[styles.navBtn, !canGoForward && { opacity: 0.3 }]} accessibilityLabel="Next month"><Text style={styles.navText}>›</Text></Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((d, i) =>
              d ? (
                <DayCell
                  key={`${visit}-${dayKey(d)}`}
                  date={d}
                  fill={(days.get(dayKey(d))?.water ?? 0) / goal}
                  isToday={dayKey(d) === dayKey(today)}
                  future={d > today}
                  index={i}
                  onPress={() => {
                    feedback('select', 'select');
                    setSelected(d);
                  }}
                />
              ) : (
                <View key={`e${i}`} style={styles.cell} />
              ),
            )}
          </View>
        </View>

        <Text style={styles.section}>{month.toLocaleDateString('en-US', { month: 'long' })} recap</Text>
        <Animated.View entering={FadeIn} style={styles.recapGrid}>
          <RecapTile label="Days on target" value={`${hit}/${past.length}`} />
          <RecapTile label="Daily average" value={formatAmount(logged.length ? totalMonth / logged.length : 0, unit)} />
          <RecapTile label="Total water" value={`${(totalMonth / 1000).toFixed(1)} L`} />
          <RecapTile label="Best day" value={formatAmount(best, unit)} />
          <RecapTile label="Caffeine" value={`${Math.round(caffeineMonth)} mg`} />
          <RecapTile label="Favourite" value={favourite?.name ?? '—'} icon={favourite ? <DrinkIcon drink={favourite} size={26} /> : null} />
        </Animated.View>
      </ScrollView>

      <Sheet open={!!selected && !picking && !editing} onClose={() => setSelected(null)} title={selected?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} height={0.75}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
          <Text style={styles.dayTotal}>
            {formatAmount(dayTotal, unit)} <Text style={styles.dayGoal}>of {formatAmount(goal, unit)}</Text>
          </Text>
          {dayLogs.length === 0 && <Text style={styles.empty}>No drinks logged this day.</Text>}
          {dayLogs.map((l) => {
            const d = findDrink(l.drink, customDrinks);
            return (
              <Pressable key={l.id} style={styles.logRow} onPress={() => setEditing(l)}>
                <DrinkIcon drink={d} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.logName}>{d.name}</Text>
                  <Text style={styles.logSub}>{formatAmount(l.volume_ml, unit)} · {new Date(l.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
                <Text style={styles.logWater}>+{formatAmount(l.water_ml, unit)}</Text>
              </Pressable>
            );
          })}
          {selected && selected <= today && <Button title="Add a drink to this day" variant="soft" onPress={() => setPicking(true)} style={{ marginTop: 8 }} />}
        </ScrollView>
      </Sheet>
      <DrinkPicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          if (!selected) return;
          const at = new Date(selected);
          at.setHours(12, 0, 0, 0);
          addLog(id, profile?.cup_ml ?? 250, at).catch(() => feedback('error', 'warning'));
          feedback('pour', 'medium');
          setPicking(false);
        }}
      />
      <LogEditor log={editing} onClose={() => setEditing(null)} />
    </SafeAreaView>
  );
}

function DayCell({ date, fill, isToday, future, index, onPress }: { date: Date; fill: number; isToday: boolean; future: boolean; index: number; onPress: () => void }) {
  const R = 15;
  const C = 2 * Math.PI * R;
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(80 + index * 18, withSpring(Math.min(1, fill), { damping: 14, stiffness: 70 })));
  }, [fill, index, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - p.value) }));
  const done = fill >= 1;
  return (
    <Pressable style={styles.cell} onPress={onPress} disabled={future} accessibilityLabel={`${date.toDateString()}, ${Math.round(fill * 100)} percent`}>
      <Svg width={38} height={38} viewBox="0 0 38 38">
        <Circle cx={19} cy={19} r={R} stroke={colors.line} strokeWidth={4} fill={done ? colors.waterPale : 'none'} />
        <AnimatedCircle cx={19} cy={19} r={R} stroke={done ? colors.waterDeep : colors.water} strokeWidth={4} fill="none" strokeDasharray={`${C} ${C}`} animatedProps={props} strokeLinecap="round" transform="rotate(-90 19 19)" />
      </Svg>
      <Text style={[styles.dayNum, isToday && styles.today, future && { opacity: 0.35 }]}>{date.getDate()}</Text>
    </Pressable>
  );
}

function RecapTile({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.tile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Text style={styles.tileValue} numberOfLines={1}>{value}</Text>
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 130, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 26, padding: 12, ...shadow },
  streakNum: { fontFamily: fonts.bold, fontSize: 26, color: colors.pinkDeep },
  streakLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  streakBest: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 26, padding: 14, ...shadow },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  monthName: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  navText: { fontFamily: fonts.bold, fontSize: 22, color: colors.inkSoft, marginTop: -2 },
  weekRow: { flexDirection: 'row' },
  weekday: { width: '14.28%', textAlign: 'center', fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  dayNum: { position: 'absolute', fontFamily: fonts.semibold, fontSize: 12, color: colors.ink },
  today: { color: colors.pinkDeep, fontFamily: fonts.bold },
  section: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, marginTop: 4 },
  recapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 20, padding: 14 },
  tileValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink, flexShrink: 1 },
  tileLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
  dayTotal: { fontFamily: fonts.bold, fontSize: 28, color: colors.waterDeep },
  dayGoal: { fontFamily: fonts.medium, fontSize: 16, color: colors.inkSoft },
  empty: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 15 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: '#fff' },
  logName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  logSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  logWater: { fontFamily: fonts.semibold, fontSize: 15, color: colors.waterDeep },
});
