import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { DrinkIcon } from '../components/DrinkIcon';
import { feedback } from '../lib/feedback';
import { clampGoal } from '../lib/goal';
import { disableReminders, enableReminders } from '../lib/reminders';
import { useApp } from '../lib/store';
import { formatAmount, ML_PER_OZ, type Unit } from '../lib/units';
import { colors, fonts, shadow } from '../theme';

const SWATCHES = ['#5EC2F7', '#FF7FA8', '#FFAA33', '#5FD9A6', '#B99CFF', '#8A5A3C'];

export default function Settings() {
  const { profile, session, soundOn, remindersOn, customDrinks, updateProfile, set, addCustomDrink, removeCustomDrink, signOut } = useApp();
  const unit = profile?.unit ?? 'ml';
  const goal = profile?.daily_goal_ml ?? 2000;
  const [error, setError] = useState<string | null>(null);

  const save = (patch: Parameters<typeof updateProfile>[0]) => updateProfile(patch).catch((e) => setError(e.message));

  const [newName, setNewName] = useState('');
  const [newPct, setNewPct] = useState(90);
  const [newColor, setNewColor] = useState(SWATCHES[0]);

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

        <Section title="Units" delay={0}>
          <View style={styles.segment}>
            {(['ml', 'oz'] as Unit[]).map((u) => (
              <Pressable
                key={u}
                onPress={() => {
                  feedback('pop', 'select');
                  save({ unit: u });
                }}
                style={[styles.segBtn, unit === u && styles.segOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: unit === u }}
              >
                <Text style={[styles.segText, unit === u && { color: '#fff' }]}>{u === 'ml' ? 'Millilitres' : 'Ounces'}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section title="Daily goal" delay={60}>
          <View style={styles.stepper}>
            <Round label="−" onPress={() => save({ daily_goal_ml: clampGoal(Math.round(goal - (unit === 'oz' ? 4 * ML_PER_OZ : 100))) })} />
            <Text style={styles.goal}>{formatAmount(goal, unit)}</Text>
            <Round label="+" onPress={() => save({ daily_goal_ml: clampGoal(Math.round(goal + (unit === 'oz' ? 4 * ML_PER_OZ : 100))) })} />
          </View>
        </Section>

        <Section title="Feel" delay={120}>
          <Row label="Sound effects">
            <Toggle value={soundOn} onChange={(v) => set({ soundOn: v })} />
          </Row>
          <Row label="Daily reminders">
            <Toggle
              value={remindersOn}
              onChange={async (v) => {
                if (v) set({ remindersOn: await enableReminders() });
                else {
                  await disableReminders();
                  set({ remindersOn: false });
                }
              }}
            />
          </Row>
        </Section>

        <Section title="Custom drinks" delay={180}>
          {customDrinks.map((d) => (
            <Animated.View key={d.id} layout={LinearTransition} exiting={FadeOut} style={styles.drinkRow}>
              <DrinkIcon drink={d} size={34} />
              <Text style={styles.drinkName}>{d.name}</Text>
              <Text style={styles.drinkPct}>{Math.round(d.hydration * 100)}%</Text>
              <Pressable onPress={() => removeCustomDrink(d.id)} hitSlop={8} accessibilityLabel={`Remove ${d.name}`}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </Animated.View>
          ))}
          <TextInput style={styles.input} placeholder="Drink name, e.g. Iced matcha" placeholderTextColor={colors.inkSoft} value={newName} onChangeText={setNewName} maxLength={18} />
          <View style={styles.stepper}>
            <Round label="−" onPress={() => setNewPct((p) => Math.max(10, p - 5))} />
            <Text style={styles.goal}>{newPct}% water</Text>
            <Round label="+" onPress={() => setNewPct((p) => Math.min(100, p + 5))} />
          </View>
          <View style={styles.swatches}>
            {SWATCHES.map((c) => (
              <Pressable key={c} onPress={() => setNewColor(c)} style={[styles.swatch, { backgroundColor: c }, newColor === c && styles.swatchOn]} accessibilityLabel={`Colour ${c}`} />
            ))}
          </View>
          <Button
            title="Add drink"
            variant="soft"
            disabled={!newName.trim()}
            onPress={() => {
              addCustomDrink({ name: newName.trim(), hydration: newPct / 100, color: newColor });
              setNewName('');
            }}
          />
        </Section>

        <Section title="Account" delay={240}>
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
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, delay }: { title: string; children: ReactNode; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(14)} style={styles.section}>
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

function Round({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        feedback('tick', 'select');
        onPress();
      }}
      style={styles.round}
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'More' : 'Less'}
    >
      <Text style={styles.roundText}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const x = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    x.value = withSpring(value ? 1 : 0, { damping: 12, stiffness: 200 });
  }, [value, x]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 22 }, { scale: 1 + Math.sin(x.value * Math.PI) * 0.15 }] }));
  const track = useAnimatedStyle(() => ({ backgroundColor: x.value > 0.5 ? colors.mint : colors.line }));
  return (
    <Pressable
      onPress={() => {
        feedback('pop', 'select');
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
  section: { backgroundColor: '#fff', borderRadius: 24, padding: 16, ...shadow },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 18, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  segOn: { backgroundColor: colors.pinkDeep },
  segText: { fontFamily: fonts.semibold, color: colors.inkSoft, fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goal: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.bold, fontSize: 24, color: colors.pinkDeep, marginTop: -2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  toggle: { width: 52, height: 30, borderRadius: 15, padding: 3 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' },
  drinkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  drinkName: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  drinkPct: { fontFamily: fonts.medium, fontSize: 14, color: colors.inkSoft },
  input: { height: 50, borderRadius: 16, borderWidth: 2, borderColor: colors.line, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  swatches: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchOn: { borderWidth: 4, borderColor: colors.ink },
  email: { fontFamily: fonts.medium, fontSize: 15, color: colors.inkSoft },
});
