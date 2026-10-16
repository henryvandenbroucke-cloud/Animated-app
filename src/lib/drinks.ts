export type Vessel = 'glass' | 'mug' | 'bottle' | 'can' | 'wine' | 'tall';

export type Category = 'Water' | 'Hot' | 'Cold' | 'Juice & smoothies' | 'Milk' | 'Sport' | 'Soda' | 'Alcohol';

export type Drink = {
  id: string;
  name: string;
  /** Share of the drink that counts as water, 0..1. */
  hydration: number;
  /** Caffeine per 250 ml. */
  caffeine: number;
  /** Calories per 250 ml. */
  kcal: number;
  category: Category;
  vessel: Vessel;
  color: string;
  /** Optional topping colour (foam, fizz, pulp) drawn on the icon. */
  accent?: string;
  custom?: boolean;
};

const d = (
  id: string,
  name: string,
  category: Category,
  vessel: Vessel,
  color: string,
  hydration: number,
  caffeine = 0,
  kcal = 0,
  accent?: string,
): Drink => ({ id, name, category, vessel, color, hydration, caffeine, kcal, accent });

// Hydration ratios follow the beverage hydration index research (Maughan et al., 2016) loosely,
// rounded for a friendly app; caffeine and calories are typical values per 250 ml.
export const BUILTIN_DRINKS: Drink[] = [
  d('water', 'Water', 'Water', 'glass', '#5EC2F7', 1),
  d('sparkling', 'Sparkling', 'Water', 'glass', '#9EDCFA', 1, 0, 0, '#FFFFFF'),
  d('lemon-water', 'Lemon water', 'Water', 'glass', '#E8F29A', 1, 0, 5),
  d('coconut', 'Coconut water', 'Water', 'bottle', '#EDE6D6', 0.95, 0, 45),
  d('mineral', 'Mineral water', 'Water', 'bottle', '#7FD0F7', 1),
  d('infused', 'Fruit infused', 'Water', 'tall', '#FFC1CF', 1, 0, 5),

  d('tea', 'Black tea', 'Hot', 'mug', '#C47A3A', 0.95, 47, 2),
  d('green-tea', 'Green tea', 'Hot', 'mug', '#A9C46B', 0.97, 28, 2),
  d('herbal', 'Herbal tea', 'Hot', 'mug', '#E2B35A', 1, 0, 2),
  d('coffee', 'Coffee', 'Hot', 'mug', '#6F4529', 0.85, 95, 5),
  d('espresso', 'Espresso', 'Hot', 'mug', '#4A2C1A', 0.8, 160, 5, '#C08A55'),
  d('latte', 'Latte', 'Hot', 'mug', '#C9976B', 0.88, 75, 120, '#FFF3E4'),
  d('cappuccino', 'Cappuccino', 'Hot', 'mug', '#B9875E', 0.88, 75, 90, '#FFF3E4'),
  d('hot-chocolate', 'Hot chocolate', 'Hot', 'mug', '#7B4A35', 0.85, 5, 190, '#F7E1D0'),
  d('chai', 'Chai latte', 'Hot', 'mug', '#C99A6A', 0.88, 40, 140, '#FFF3E4'),
  d('matcha', 'Matcha latte', 'Hot', 'mug', '#9BC46E', 0.9, 60, 130, '#F2F7E4'),

  d('iced-coffee', 'Iced coffee', 'Cold', 'tall', '#9C6B48', 0.88, 90, 60, '#F0E0D0'),
  d('iced-tea', 'Iced tea', 'Cold', 'tall', '#D98E43', 0.92, 30, 70),
  d('lemonade', 'Lemonade', 'Cold', 'tall', '#F6E27A', 0.88, 0, 100),
  d('bubble-tea', 'Bubble tea', 'Cold', 'tall', '#D9B38C', 0.8, 30, 230, '#3B2F3A'),
  d('kombucha', 'Kombucha', 'Cold', 'bottle', '#E8B86A', 0.95, 10, 30),

  d('juice', 'Orange juice', 'Juice & smoothies', 'glass', '#FFAA33', 0.88, 0, 112),
  d('apple-juice', 'Apple juice', 'Juice & smoothies', 'glass', '#F2C14E', 0.88, 0, 115),
  d('tomato-juice', 'Tomato juice', 'Juice & smoothies', 'glass', '#E2533B', 0.92, 0, 45),
  d('smoothie', 'Smoothie', 'Juice & smoothies', 'tall', '#FF7FA8', 0.75, 0, 150),
  d('green-smoothie', 'Green smoothie', 'Juice & smoothies', 'tall', '#8CC56B', 0.8, 0, 120),

  d('milk', 'Milk', 'Milk', 'glass', '#F4F1EA', 0.9, 0, 150),
  d('oat-milk', 'Oat milk', 'Milk', 'glass', '#EFE3CC', 0.88, 0, 120),
  d('almond-milk', 'Almond milk', 'Milk', 'glass', '#EEE6DA', 0.9, 0, 40),
  d('chocolate-milk', 'Chocolate milk', 'Milk', 'glass', '#8B5A3C', 0.85, 5, 210),
  d('kefir', 'Kefir', 'Milk', 'bottle', '#F7F3EF', 0.88, 0, 150),
  d('protein', 'Protein shake', 'Milk', 'tall', '#E9D7C4', 0.8, 0, 200),

  d('sports', 'Sports drink', 'Sport', 'bottle', '#7FD8F2', 1, 0, 60),
  d('electrolyte', 'Electrolytes', 'Sport', 'glass', '#B5E8A0', 1, 0, 10),
  d('energy', 'Energy drink', 'Sport', 'can', '#F2E35A', 0.8, 80, 110),

  d('soda', 'Cola', 'Soda', 'can', '#6B2E22', 0.85, 24, 105, '#F7D6C9'),
  d('diet-soda', 'Diet cola', 'Soda', 'can', '#7A3A2A', 0.9, 30, 1, '#F7D6C9'),
  d('lemon-soda', 'Lemon soda', 'Soda', 'can', '#D9F07A', 0.88, 0, 100, '#FFFFFF'),
  d('ginger-ale', 'Ginger ale', 'Soda', 'can', '#E9C46A', 0.88, 0, 90, '#FFFFFF'),

  d('beer', 'Beer', 'Alcohol', 'bottle', '#E8B33A', 0.5, 0, 110, '#FFFFFF'),
  d('wine', 'Wine', 'Alcohol', 'wine', '#9E2B48', 0.3, 0, 210),
  d('cocktail', 'Cocktail', 'Alcohol', 'tall', '#FF9E7A', 0.3, 0, 230),
];

export const CATEGORIES: Category[] = ['Water', 'Hot', 'Cold', 'Juice & smoothies', 'Milk', 'Sport', 'Soda', 'Alcohol'];

const ML_PER_OZ = 29.5735;
const sizes = (values: number[], toMl: (v: number) => number) =>
  ['Sip', 'Cup', 'Glass', 'Mug', 'Bottle', 'Big'].map((label, i) => ({ id: label.toLowerCase(), label, ml: Math.round(toMl(values[i])) }));

/** Quick-pick sizes in round numbers for each unit (no "17 oz" bottles). */
export function cupSizes(unit: 'ml' | 'oz') {
  return unit === 'oz' ? sizes([4, 8, 12, 16, 20, 24], (v) => v * ML_PER_OZ) : sizes([100, 200, 250, 350, 500, 750], (v) => v);
}

/** Snap an amount to the unit's natural step, e.g. 250 ml becomes 8 oz exactly. */
export function roundForUnit(ml: number, unit: 'ml' | 'oz') {
  return unit === 'oz' ? Math.round(ml / ML_PER_OZ) * ML_PER_OZ : Math.round(ml / 10) * 10;
}

export const CUP_SIZES = cupSizes('ml');

export function allDrinks(custom: Drink[] = []) {
  return [...BUILTIN_DRINKS, ...custom];
}

export function findDrink(id: string, custom: Drink[] = []): Drink {
  return allDrinks(custom).find((x) => x.id === id) ?? BUILTIN_DRINKS[0];
}

export function waterContent(drink: Drink, volumeMl: number) {
  return Math.max(0, Math.round(volumeMl * drink.hydration));
}

export function caffeineOf(drink: Drink, volumeMl: number) {
  return Math.round((drink.caffeine * volumeMl) / 250);
}

export function kcalOf(drink: Drink, volumeMl: number) {
  return Math.round((drink.kcal * volumeMl) / 250);
}
