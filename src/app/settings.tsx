import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { DrinkIcon } from '../components/DrinkIcon';
import { DrinkPicker } from '../components/DrinkPicker';
import { cupSizes } from '../lib/drinks';
import { feedback, play } from '../lib/feedback';
import { clampGoal, computeGoalMl, type Activity, type Climate, type Sex } from '../lib/goal';
import { REMINDER_SOUNDS, requestReminderPermission } from '../lib/reminders';
import { useApp } from '../lib/store';
import type { Profile } from '../lib/supabase';
import { formatAmount, ML_PER_OZ, type Unit } from '../lib/units';
import { Sippy } from '../mascot/Sippy';
import { findSkin } from '../mascot/skins';
import { colors, fonts, shadow } from '../theme';

const SEXES: { id: Sex; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'pregnant', label: 'Pregnant' },
  { id: 'breastfeeding', label: 'Breastfeeding' },
  { id: 'other', label: 'Rather not say' },
];
const ACTIVITY: { id: Activity; label: string }[] = [
  { id: 'chill', label: 'Chill' },
  { id: 'active', label: 'Active' },
  { id: 'athlete', label: 'Athlete' },
];
const CLIMATE: { id: Climate; label: string }[] = [
  { id: 'cool', label: 'Cool' },
  { id: 'mild', label: 'Mild' },
  { id: 'hot', label: 'Hot' },
];
const EVERY = [45, 60, 90, 120, 180];

const shiftTime = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};
const pretty = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

export default function Settings() {
  const { profile, session, soundOn, hapticsOn, remindersOn, customDrinks, updateProfile, set, removeCustomDrink, signOut } = useApp();
  const unit = profile?.unit ?? 'ml';
  const goal = profile?.daily_goal_ml ?? 2000;
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);

  const save = (patch: Partial<Profile>) => updateProfile(patch).catch((e) => setError(e.message));
  const recalc = (patch: Partial<Profile>) => {
    const next = { ...profile, ...patch } as Profile;
    const goalMl = computeGoalMl(next.weight_kg ?? 65, (next.activity as Activity) ?? 'active', (next.climate as Climate) ?? 'mild', (next.sex as Sex) ?? 'other');
    save({ ...patch, daily_goal_ml: goalMl });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable onPress={() => router.back()} style={styles.close} accessibilityLabel="Close" testID="close-settings">
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.buddy} onPress={() => { router.back(); router.push('/(tabs)/challenges'); }}>
          <Sippy size={70} skin={profile?.character} idle={false} />
          <View style={{ flex: 1 }}>
            <Text style={styles.buddyName}>{findSkin(profile?.character).name}</Text>
            <Text style={styles.buddySub}>Your water buddy. Tap to change or unlock more.</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>

        <Section title="Daily goal" delay={0}>
          <Stepper
            value={formatAmount(goal, unit)}
            onDec={() => save({ daily_goal_ml: clampGoal(Math.round(goal - (unit === 'oz' ? 4 * ML_PER_OZ : 100))) })}
            onInc={() => save({ daily_goal_ml: clampGoal(Math.round(goal + (unit === 'oz' ? 4 * ML_PER_OZ : 100))) })}
          />
          <Text style={styles.label}>Recalculate from</Text>
          <Stepper
            value={unit === 'oz' ? `${Math.round((profile?.weight_kg ?? 65) / 0.4536)} lb` : `${Math.round(profile?.weight_kg ?? 65)} kg`}
            onDec={() => recalc({ weight_kg: Math.max(30, (profile?.weight_kg ?? 65) - 2) })}
            onInc={() => recalc({ weight_kg: Math.min(200, (profile?.weight_kg ?? 65) + 2) })}
          />
          <Pills options={SEXES} value={profile?.sex ?? 'other'} onChange={(v) => recalc({ sex: v })} />
          <Pills options={ACTIVITY} value={(profile?.activity as Activity) ?? 'active'} onChange={(v) => recalc({ activity: v })} />
          <Pills options={CLIMATE} value={(profile?.climate as Climate) ?? 'mild'} onChange={(v) => recalc({ climate: v })} />
        </Section>

        <Section title="Reminders" delay={60}>
          <Row label="Smart reminders">
            <Toggle
              value={remindersOn}
              onChange={async (v) => {
                if (v) {
                  const ok = Platform.OS === 'web' || (await requestReminderPermission());
                  if (!ok) setError('Notifications are turned off for Sippy in your phone settings.');
                  set({ remindersOn: ok });
                } else set({ remindersOn: false });
              }}
            />
          </Row>
          <Text style={styles.note}>Sippy skips a nudge if you drank in the last 45 minutes, and stops for the day once you hit your goal.</Text>
          <Row label="Wake up">
            <Stepper small value={pretty(profile?.wake_time ?? '08:00')} onDec={() => save({ wake_time: shiftTime(profile?.wake_time ?? '08:00', -30) })} onInc={() => save({ wake_time: shiftTime(profile?.wake_time ?? '08:00', 30) })} />
          </Row>
          <Row label="Bedtime">
            <Stepper small value={pretty(profile?.sleep_time ?? '22:00')} onDec={() => save({ sleep_time: shiftTime(profile?.sleep_time ?? '22:00', -30) })} onInc={() => save({ sleep_time: shiftTime(profile?.sleep_time ?? '22:00', 30) })} />
          </Row>
          <Text style={styles.label}>Remind me every</Text>
          <Pills options={EVERY.map((m) => ({ id: m, label: m < 60 ? `${m} min` : `${m / 60} h` }))} value={profile?.reminder_every_min ?? 90} onChange={(v) => save({ reminder_every_min: v })} />
          <Text style={styles.label}>Reminder sound</Text>
          <Pills
            options={REMINDER_SOUNDS.map((s) => ({ id: s.id, label: s.label }))}
            value={profile?.reminder_sound ?? 'bubble'}
            silent
            onChange={(v) => {
              play(REMINDER_SOUNDS.find((s) => s.id === v)?.preview ?? 'tap');
              save({ reminder_sound: v });
            }}
          />
        </Section>

        <Section title="Units and cup" delay={120}>
          <Pills
            options={(['ml', 'oz'] as Unit[]).map((u) => ({ id: u, label: u === 'ml' ? 'Millilitres' : 'Ounces' }))}
            value={unit}
            onChange={(v) => save({ unit: v })}
          />
          <Text style={styles.label}>Default cup size</Text>
          <Pills
            options={cupSizes(unit).map((c) => ({ id: c.ml, label: `${c.label} · ${formatAmount(c.ml, unit)}` }))}
            value={cupSizes(unit).find((c) => Math.abs(c.ml - (profile?.cup_ml ?? 250)) < 2)?.ml ?? -1}
            onChange={(v) => save({ cup_ml: v })}
          />
        </Section>

        <Section title="Drinks" delay={180}>
          <Button title="Manage drinks" variant="soft" onPress={() => setPicker(true)} />
          {customDrinks.map((d) => (
            <Animated.View key={d.id} layout={LinearTransition} exiting={FadeOut} style={styles.drinkRow}>
              <DrinkIcon drink={d} size={34} />
              <Text style={styles.drinkName}>{d.name}</Text>
              <Text style={styles.drinkPct}>{Math.round(d.hydration * 100)}%</Text>
              <Pressable onPress={() => { feedback('tap', 'light'); removeCustomDrink(d.id); }} hitSlop={8} accessibilityLabel={`Remove ${d.name}`}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </Animated.View>
          ))}
        </Section>

        <Section title="Feel" delay={240}>
          <Row label="Sound effects">
            <Toggle value={soundOn} onChange={(v) => set({ soundOn: v })} />
          </Row>
          <Row label="Vibration">
            <Toggle value={hapticsOn} onChange={(v) => set({ hapticsOn: v })} />
          </Row>
        </Section>

        <Section title="Account" delay={300}>
          <Text style={styles.email}>{session?.user.email}</Text>
          <Button
            variant="soft"
            title="Replay the intro"
            onPress={() => {
              set({ onboardingDone: false });
              router.dismissAll();
              router.replace('/onboarding');
            }}
          />
          <Button
            variant="ghost"
            title="Sign out"
            onPress={async () => {
              await signOut();
              router.dismissAll();
              router.replace('/');
            }}
          />
          <Text style={styles.note}>Sounds: Kenney, rubberduck and BMacZero (CC0). Thank you!</Text>
        </Section>
      </ScrollView>
      <DrinkPicker open={picker} onClose={() => setPicker(false)} onPick={() => setPicker(false)} />
    </SafeAreaView>
  );
}

function Section({ title, children, delay }: { title: string; children: ReactNode; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 10 }}>{children}</View>
    </Animated.View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Stepper({ value, onDec, onInc, small }: { value: string; onDec: () => void; onInc: () => void; small?: boolean }) {
  const btn = (label: string, fn: () => void) => (
    <Pressable
      onPress={() => {
        feedback('tick', 'select');
        fn();
      }}
      style={[styles.round, small && styles.roundSmall]}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'More' : 'Less'}
    >
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={[styles.stepper, small && { gap: 8 }]}>
      {btn('−', onDec)}
      <Text style={[styles.stepValue, small && { fontSize: 16, minWidth: 80 }]}>{value}</Text>
      {btn('+', onInc)}
    </View>
  );
}

function Pills<T extends string | number>({ options, value, onChange, silent }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; silent?: boolean }) {
  return (
    <View style={styles.pills}>
      {options.map((o) => (
        <Pressable
          key={String(o.id)}
          onPress={() => {
            if (!silent) feedback('select', 'select');
            onChange(o.id);
          }}
          style={[styles.pill, value === o.id && styles.pillOn]}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === o.id }}
        >
          <Text style={[styles.pillText, value === o.id && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.set(withSpring(value ? 1 : 0, { damping: 13, stiffness: 220 }));
  }, [value, x]);
  // The knob squashes a little mid-travel, like a real switch.
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 22 }, { scaleX: 1 + Math.sin(x.value * Math.PI) * 0.22 }] }));
  const track = useAnimatedStyle(() => ({ backgroundColor: x.value > 0.5 ? colors.mint : colors.line }));
  return (
    <Pressable
      onPress={() => {
        feedback('toggle', 'select');
        onChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.toggle, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  title: { fontFamily: fonts.bold, fontSize: 30, color: colors.ink },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow },
  closeText: { fontSize: 26, color: colors.inkSoft, marginTop: -3 },
  scroll: { padding: 20, gap: 14, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  error: { fontFamily: fonts.medium, color: '#D9435F', textAlign: 'center' },
  buddy: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 24, padding: 10, ...shadow },
  buddyName: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  buddySub: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft },
  chev: { fontFamily: fonts.bold, fontSize: 24, color: colors.line, paddingRight: 6 },
  section: { backgroundColor: '#fff', borderRadius: 24, padding: 16, ...shadow },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 13, color: colors.inkSoft, marginTop: 4 },
  note: { fontFamily: fonts.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, textAlign: 'center' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  roundSmall: { width: 36, height: 36, borderRadius: 18 },
  roundText: { fontFamily: fonts.bold, fontSize: 22, color: colors.pinkDeep, marginTop: -2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: colors.bg },
  pillOn: { backgroundColor: colors.pinkDeep },
  pillText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  toggle: { width: 52, height: 30, borderRadius: 15, padding: 3 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  drinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drinkName: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  drinkPct: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  email: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkSoft },
});
