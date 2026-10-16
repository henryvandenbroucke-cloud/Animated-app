export type Drink = {
  id: string;
  name: string;
  /** Share of the drink that counts as water, 0..1. */
  hydration: number;
  color: string;
  /** Optional topping colour (foam, fizz, pulp) drawn on the cup icon. */
  accent?: string;
  custom?: boolean;
};

export const BUILTIN_DRINKS: Drink[] = [
  { id: 'water', name: 'Water', hydration: 1, color: '#5EC2F7' },
  { id: 'sparkling', name: 'Sparkling', hydration: 1, color: '#9EDCFA', accent: '#FFFFFF' },
  { id: 'tea', name: 'Tea', hydration: 0.95, color: '#E2A65A' },
  { id: 'coffee', name: 'Coffee', hydration: 0.8, color: '#8A5A3C' },
  { id: 'latte', name: 'Latte', hydration: 0.85, color: '#C9976B', accent: '#FFF3E4' },
  { id: 'juice', name: 'Juice', hydration: 0.85, color: '#FFAA33' },
  { id: 'milk', name: 'Milk', hydration: 0.88, color: '#F4F1EA' },
  { id: 'smoothie', name: 'Smoothie', hydration: 0.75, color: '#FF7FA8' },
  { id: 'coconut', name: 'Coconut', hydration: 0.95, color: '#EDE6D6' },
  { id: 'soda', name: 'Soda', hydration: 0.6, color: '#B5523B', accent: '#F7D6C9' },
];

export function findDrink(id: string, custom: Drink[] = []): Drink {
  return [...BUILTIN_DRINKS, ...custom].find((d) => d.id === id) ?? BUILTIN_DRINKS[0];
}

export function waterContent(drink: Drink, volumeMl: number) {
  return Math.round(volumeMl * drink.hydration);
}
