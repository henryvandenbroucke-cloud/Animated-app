export type Unit = 'ml' | 'oz';

export const ML_PER_OZ = 29.5735;

export function toUnit(ml: number, unit: Unit) {
  return unit === 'oz' ? ml / ML_PER_OZ : ml;
}

export function fromUnit(value: number, unit: Unit) {
  return unit === 'oz' ? value * ML_PER_OZ : value;
}

export function formatAmount(ml: number, unit: Unit, withUnit = true) {
  const v = toUnit(ml, unit);
  const n = unit === 'oz' ? Math.round(v) : Math.round(v / 10) * 10;
  const s = n.toLocaleString('en-US');
  return withUnit ? `${s} ${unit}` : s;
}

/** Slider step in ml: 25 ml, or 1 oz. */
export function stepMl(unit: Unit) {
  return unit === 'oz' ? ML_PER_OZ : 25;
}
