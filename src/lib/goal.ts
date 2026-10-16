export type Activity = 'chill' | 'active' | 'athlete';
export type Climate = 'cool' | 'mild' | 'hot';
export type Sex = 'female' | 'male' | 'pregnant' | 'breastfeeding' | 'other';

const ACTIVITY_ML: Record<Activity, number> = { chill: 0, active: 400, athlete: 800 };
const CLIMATE_ML: Record<Climate, number> = { cool: 0, mild: 200, hot: 500 };
// Extra fluid needs (EFSA: +300 ml in pregnancy, +700 ml when breastfeeding).
const SEX_ML: Record<Sex, number> = { female: 0, male: 250, pregnant: 300, breastfeeding: 700, other: 100 };

/** About 33 ml per kg of body weight, plus extra for exercise, heat, pregnancy or breastfeeding. */
export function computeGoalMl(weightKg: number, activity: Activity, climate: Climate, sex: Sex = 'other') {
  const raw = weightKg * 33 + ACTIVITY_ML[activity] + CLIMATE_ML[climate] + SEX_ML[sex];
  return clampGoal(Math.round(raw / 50) * 50);
}

export function clampGoal(ml: number) {
  return Math.min(5000, Math.max(1000, ml));
}

export const KG_PER_LB = 0.453592;
