import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCountUp } from '../../components/useCountUp';
import { startOfDay, useApp } from '../../lib/store';
import { formatAmount } from '../../lib/units';
import { Sippy } from '../../mascot/Sippy';
import { colors, fonts, shadow } from '../../theme';

const CHART_H = 180;

export default function History() {
  const profile = useApp((s) => s.profile);
  const logs = useApp((s) => s.logs);
  const unit = profile?.unit ?? 'ml';
  const goal = profile?.daily_goal_ml ?? 2000;
  // Re-run the grow animation every time the tab is opened.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((v) => v + 1), []));

  const days = useMemo(() => {
    const out: { label: string; total: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const start = startOfDay();
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const total = logs
        .filter((l) => {
          const t = new Date(l.logged_at).getTime();
          return t >= start.getTime() && t < end.getTime();
        })
        .reduce((s, l) => s + l.water_ml, 0);
      out.push({ label: start.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), total, isToday: i === 0 });
    }
    return out;
  }, [logs]);

  const max = Math.max(goal * 1.15, ...days.map((d) => d.total));
  const hit = days.filter((d) => d.total >= goal).length;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total >= goal) streak++;
    else if (!days[i].isToday) break;
  }
  const logged = days.filter((d) => d.total > 0);
  const avg = logged.length ? logged.reduce((s, d) => s + d.total, 0) / logged.length : 0;
  const streakShown = useCountUp(streak, 900);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your week</Text>

        <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.streakCard}>
          <Sippy size={110} pose={streak > 0 ? 'cheer' : 'idle'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakNum}>
              {Math.round(streakShown)} day{streak === 1 ? '' : 's'}
            </Text>
            <Text style={styles.streakLabel}>{streak > 0 ? 'goal streak. Keep it flowing!' : 'Hit your goal today to start a streak.'}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify().damping(14)} style={styles.card}>
          <View style={[styles.goalLine, { bottom: 40 + (goal / max) * CHART_H }]}>
            <Text style={styles.goalTag}>goal</Text>
          </View>
          <View style={styles.bars}>
            {days.map((d, i) => (
              <Bar key={`${visit}-${i}`} index={i} height={(d.total / max) * CHART_H} reached={d.total >= goal} isToday={d.isToday} label={d.label} />
            ))}
          </View>
        </Animated.View>

        <View style={styles.statsRow}>
          <Stat label="Days on target" value={`${hit}/7`} delay={200} />
          <Stat label="Daily average" value={formatAmount(avg, unit)} delay={280} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bar({ index, height, reached, isToday, label }: { index: number; height: number; reached: boolean; isToday: boolean; label: string }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(150 + index * 80, withSpring(Math.max(6, height), { damping: 11, stiffness: 90 }));
  }, [height, index, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  return (
    <View style={styles.barCol}>
      <View style={{ height: CHART_H, justifyContent: 'flex-end' }}>
        <Animated.View style={[styles.bar, { backgroundColor: reached ? colors.water : colors.pink }, isToday && styles.today, style]} />
      </View>
      <Text style={[styles.barLabel, isToday && { color: colors.pinkDeep }]}>{label}</Text>
    </View>
  );
}

function Stat({ label, value, delay }: { label: string; value: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(14)} style={[styles.card, styles.stat]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 130, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 26, padding: 12, ...shadow },
  streakNum: { fontFamily: fonts.bold, fontSize: 30, color: colors.pinkDeep },
  streakLabel: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkSoft },
  card: { backgroundColor: '#fff', borderRadius: 26, padding: 16, ...shadow },
  bars: { flexDirection: 'row', justifyContent: 'space-between' },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 26, borderRadius: 13 },
  today: { borderWidth: 3, borderColor: colors.pinkDeep },
  barLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft, marginTop: 6 },
  goalLine: { position: 'absolute', left: 16, right: 16, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.waterDeep },
  goalTag: { position: 'absolute', right: 0, top: -20, fontFamily: fonts.semibold, fontSize: 12, color: colors.waterDeep },
  statsRow: { flexDirection: 'row', gap: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 24, color: colors.ink },
  statLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkSoft },
});
