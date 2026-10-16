import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import type { Drink } from '../lib/drinks';
import { feedback } from '../lib/feedback';
import { colors, fonts } from '../theme';
import { DrinkIcon } from './DrinkIcon';

const CARD = 86;
const GAP = 10;

export function DrinkCarousel({ drinks, selected, onSelect, onMore }: { drinks: Drink[]; selected: string; onSelect: (id: string) => void; onMore?: () => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD + GAP}
      decelerationRate="fast"
      contentContainerStyle={styles.row}
    >
      {drinks.map((d, i) => (
        <DrinkCard key={d.id} drink={d} index={i} selected={d.id === selected} onPress={() => onSelect(d.id)} />
      ))}
      {onMore && (
        <Pressable onPress={onMore} style={[styles.card, styles.addCard]} accessibilityLabel="See all drinks" testID="more-drinks">
          <Text style={styles.plus}>•••</Text>
          <Text style={styles.name}>All drinks</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function DrinkCard({ drink, index, selected, onPress }: { drink: Drink; index: number; selected: boolean; onPress: () => void }) {
  const enter = useSharedValue(0);
  const scale = useSharedValue(1);
  const lift = useSharedValue(0);

  useEffect(() => {
    enter.value = withTiming(0, { duration: 0 });
    enter.value = withSpring(1, { damping: 10, stiffness: 120 });
  }, [enter]);
  useEffect(() => {
    lift.value = withSpring(selected ? 1 : 0, { damping: 9 });
    if (selected) scale.value = withSequence(withTiming(1.12, { duration: 100 }), withSpring(1, { damping: 5 }));
  }, [selected, lift, scale]);

  const anim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * (30 + index * 6) - lift.value * 6 },
      { scale: scale.value * (1 + lift.value * 0.04) },
    ],
  }));

  return (
    <Pressable
      onPress={() => {
        feedback('select', 'select');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${drink.name}, ${Math.round(drink.hydration * 100)} percent water`}
      testID={`drink-${drink.id}`}
    >
      <Animated.View style={[styles.card, selected && { borderColor: drink.color === '#F4F1EA' ? colors.inkSoft : drink.color, backgroundColor: '#fff' }, anim]}>
        <DrinkIcon drink={drink} size={44} />
        <Text style={styles.name} numberOfLines={1}>
          {drink.name}
        </Text>
        <View style={[styles.pill, { backgroundColor: selected ? colors.pinkPale : colors.bg }]}>
          <Text style={styles.pct}>{Math.round(drink.hydration * 100)}%</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 20, gap: GAP, paddingVertical: 10 },
  card: {
    width: CARD,
    paddingVertical: 10,
    borderRadius: 22,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.65)',
    gap: 2,
  },
  addCard: { justifyContent: 'center', borderStyle: 'dashed', borderColor: colors.line },
  plus: { fontFamily: fonts.bold, fontSize: 20, color: colors.pinkDeep, marginVertical: 8 },
  name: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  pill: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: 10 },
  pct: { fontFamily: fonts.medium, fontSize: 12, color: colors.inkSoft },
});
