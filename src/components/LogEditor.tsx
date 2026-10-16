import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { findDrink } from '../lib/drinks';
import { feedback } from '../lib/feedback';
import { useApp } from '../lib/store';
import type { DrinkLog } from '../lib/supabase';
import { formatAmount } from '../lib/units';
import { colors, fonts } from '../theme';
import { Button } from './Button';
import { DrinkIcon } from './DrinkIcon';
import { Sheet } from './Sheet';
import { VolumeSlider } from './VolumeSlider';

/** Edit a past entry: change the amount or the time, or delete it. */
export function LogEditor({ log, onClose }: { log: DrinkLog | null; onClose: () => void }) {
  // Keep showing the last entry while the sheet slides away.
  const [shown, setShown] = useState(log);
  if (log && log !== shown) setShown(log);
  return (
    <Sheet open={!!log} onClose={onClose} title="Edit drink" height={0.7}>
      {shown && <Editor key={shown.id} log={shown} onClose={onClose} />}
    </Sheet>
  );
}

function Editor({ log, onClose }: { log: DrinkLog; onClose: () => void }) {
  const profile = useApp((s) => s.profile);
  const customDrinks = useApp((s) => s.customDrinks);
  const updateLog = useApp((s) => s.updateLog);
  const deleteLog = useApp((s) => s.deleteLog);
  const unit = profile?.unit ?? 'ml';
  const [amount, setAmount] = useState(log.volume_ml);
  const [minutes, setMinutes] = useState(() => {
    const at = new Date(log.logged_at);
    return at.getHours() * 60 + at.getMinutes();
  });
  const [error, setError] = useState<string | null>(null);
  const drink = findDrink(log.drink, customDrinks);
  const time = `${Math.floor(minutes / 60) % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'am' : 'pm'}`;

  const save = async () => {
    const at = new Date(log.logged_at);
    at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    try {
      await updateLog(log.id, { volume_ml: amount, logged_at: at.toISOString() });
      feedback('success', 'success');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the change.');
    }
  };

  return (
        <View style={styles.body}>
          <View style={styles.head}>
            <DrinkIcon drink={drink} size={52} />
            <View>
              <Text style={styles.name}>{drink.name}</Text>
              <Text style={styles.sub}>{new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
            </View>
          </View>
          <VolumeSlider value={amount} onChange={setAmount} unit={unit} max={1500} color={drink.color} />
          <View style={styles.timeRow}>
            <Text style={styles.label}>Time</Text>
            <View style={styles.timeCtrls}>
              <Pressable style={styles.round} onPress={() => { feedback('tick', 'select'); setMinutes((m) => Math.max(0, m - 15)); }} accessibilityLabel="15 minutes earlier"><Text style={styles.roundText}>−</Text></Pressable>
              <Text style={styles.time}>{time}</Text>
              <Pressable style={styles.round} onPress={() => { feedback('tick', 'select'); setMinutes((m) => Math.min(1439, m + 15)); }} accessibilityLabel="15 minutes later"><Text style={styles.roundText}>+</Text></Pressable>
            </View>
          </View>
          <Text style={styles.sub}>Counts as {formatAmount(Math.round(amount * drink.hydration), unit)} of water</Text>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Save changes" onPress={save} />
          <Button
            title="Delete this drink"
            variant="ghost"
            sound="error"
            onPress={() => {
              deleteLog(log.id).catch((e) => setError(e.message));
              onClose();
            }}
          />
        </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.inkSoft },
  label: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeCtrls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  time: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, minWidth: 90, textAlign: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.bold, fontSize: 22, color: colors.pinkDeep, marginTop: -2 },
  error: { fontFamily: fonts.medium, color: '#D9435F', textAlign: 'center' },
});
