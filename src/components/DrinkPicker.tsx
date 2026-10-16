import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { allDrinks, CATEGORIES, type Category, type Drink } from '../lib/drinks';
import { feedback } from '../lib/feedback';
import { useApp } from '../lib/store';
import { colors, fonts } from '../theme';
import { Button } from './Button';
import { DrinkIcon } from './DrinkIcon';
import { Sheet } from './Sheet';

const SWATCHES = ['#5EC2F7', '#FF7FA8', '#FFAA33', '#5FD9A6', '#B99CFF', '#8A5A3C', '#E2533B', '#F2E35A'];

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
};

/** Every drink, searchable and grouped, with favourites (they show up first on the home screen). */
export function DrinkPicker({ open, onClose, onPick }: Props) {
  const customDrinks = useApp((s) => s.customDrinks);
  const addCustomDrink = useApp((s) => s.addCustomDrink);
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const favs = profile?.favorite_drinks ?? [];
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | 'All' | 'Mine'>('All');
  const [making, setMaking] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allDrinks(customDrinks).filter(
      (d) =>
        (!q || d.name.toLowerCase().includes(q)) &&
        (cat === 'All' || (cat === 'Mine' ? d.custom : d.category === cat)),
    );
  }, [customDrinks, query, cat]);

  const toggleFav = (id: string) => {
    feedback('select', 'select');
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
    updateProfile({ favorite_drinks: next }).catch(() => {});
  };

  return (
    <Sheet open={open} onClose={onClose} title={making ? 'New drink' : 'All drinks'} height={0.88}>
      {making ? (
        <CustomDrinkForm
          onCancel={() => setMaking(false)}
          onSave={(d) => {
            const id = addCustomDrink(d);
            updateProfile({ favorite_drinks: [...favs, id] }).catch(() => {});
            setMaking(false);
            onPick(id);
          }}
        />
      ) : (
        <View style={{ flexShrink: 1 }}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.search}
              placeholder={`Search ${allDrinks(customDrinks).length} drinks`}
              placeholderTextColor={colors.inkSoft}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catsBar} contentContainerStyle={styles.cats}>
            {(['All', ...CATEGORIES, 'Mine'] as const).map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  feedback('tap', 'select');
                  setCat(c);
                }}
                style={[styles.cat, cat === c && styles.catOn]}
              >
                <Text style={[styles.catText, cat === c && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
            {list.map((d) => (
              <Animated.View key={d.id} entering={FadeIn.duration(180)} layout={LinearTransition.springify().damping(18)} style={styles.cell}>
                <Pressable
                  style={styles.card}
                  onPress={() => {
                    feedback('select', 'select');
                    onPick(d.id);
                  }}
                  accessibilityLabel={`${d.name}, ${Math.round(d.hydration * 100)} percent water`}
                  testID={`pick-${d.id}`}
                >
                  <DrinkIcon drink={d} size={42} />
                  <Text style={styles.name} numberOfLines={1}>
                    {d.name}
                  </Text>
                  <Text style={styles.meta}>
                    {Math.round(d.hydration * 100)}% water{d.caffeine ? ' · ☕' : ''}
                  </Text>
                </Pressable>
                <Pressable onPress={() => toggleFav(d.id)} style={styles.star} hitSlop={8} accessibilityLabel={favs.includes(d.id) ? `Remove ${d.name} from favourites` : `Add ${d.name} to favourites`}>
                  <Text style={[styles.starText, favs.includes(d.id) && { color: colors.sun }]}>{favs.includes(d.id) ? '★' : '☆'}</Text>
                </Pressable>
              </Animated.View>
            ))}
            <View style={styles.cell}>
              <Pressable style={[styles.card, styles.newCard]} onPress={() => setMaking(true)}>
                <Text style={styles.plus}>+</Text>
                <Text style={styles.name}>Create drink</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </Sheet>
  );
}

function CustomDrinkForm({ onSave, onCancel }: { onSave: (d: Omit<Drink, 'id' | 'custom'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [pct, setPct] = useState(90);
  const [caffeine, setCaffeine] = useState(0);
  const [color, setColor] = useState(SWATCHES[0]);
  const preview: Drink = { id: 'preview', name: name || 'My drink', hydration: pct / 100, caffeine, kcal: 0, category: 'Water', vessel: 'glass', color, custom: true };
  const step = (label: string, value: string, dec: () => void, inc: () => void) => (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>{label}</Text>
      <View style={styles.stepCtrls}>
        <Pressable style={styles.round} onPress={() => { feedback('tick', 'select'); dec(); }}><Text style={styles.roundText}>−</Text></Pressable>
        <Text style={styles.stepValue}>{value}</Text>
        <Pressable style={styles.round} onPress={() => { feedback('tick', 'select'); inc(); }}><Text style={styles.roundText}>+</Text></Pressable>
      </View>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center' }}>
        <DrinkIcon drink={preview} size={72} />
      </View>
      <TextInput style={styles.search} placeholder="Name, e.g. Iced matcha" placeholderTextColor={colors.inkSoft} value={name} onChangeText={setName} maxLength={20} />
      {step('Water content', `${pct}%`, () => setPct((p) => Math.max(10, p - 5)), () => setPct((p) => Math.min(100, p + 5)))}
      {step('Caffeine per glass', `${caffeine} mg`, () => setCaffeine((c) => Math.max(0, c - 10)), () => setCaffeine((c) => Math.min(300, c + 10)))}
      <View style={styles.swatches}>
        {SWATCHES.map((c) => (
          <Pressable key={c} onPress={() => { feedback('select', 'select'); setColor(c); }} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]} accessibilityLabel={`Colour ${c}`} />
        ))}
      </View>
      <Button title="Save drink" disabled={!name.trim()} onPress={() => onSave({ name: name.trim(), hydration: pct / 100, caffeine, kcal: 0, category: 'Water', vessel: 'glass', color })} />
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  searchRow: { paddingHorizontal: 20, paddingTop: 8 },
  search: { height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: '#fff', paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  catsBar: { flexGrow: 0, flexShrink: 0 },
  cats: { paddingHorizontal: 20, paddingVertical: 12, gap: 8, alignItems: 'center' },
  cat: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: '#fff' },
  catOn: { backgroundColor: colors.pinkDeep },
  catText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingBottom: 20 },
  cell: { width: '33.33%', padding: 5 },
  card: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 2 },
  newCard: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: 'transparent', minHeight: 104, justifyContent: 'center' },
  plus: { fontFamily: fonts.bold, fontSize: 28, color: colors.pinkDeep },
  name: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft },
  star: { position: 'absolute', top: 8, right: 10 },
  starText: { fontSize: 18, color: colors.line },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  stepCtrls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, minWidth: 70, textAlign: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pinkPale, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.bold, fontSize: 22, color: colors.pinkDeep, marginTop: -2 },
  swatches: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchOn: { borderWidth: 4, borderColor: colors.ink },
});
