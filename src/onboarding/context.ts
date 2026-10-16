import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { Action, Pose } from '../mascot/Sippy';

export type StageMode = 'normal' | 'rise' | 'tank' | 'swim';

export type StageState = {
  mode: StageMode;
  pose: Pose;
  action?: Action;
  bubble?: string;
  /** Shrink Sippy so a step with lots of options fits without hidden content. */
  compact?: boolean;
};

export type Onboarding = {
  next: () => void;
  stage: (patch: Partial<StageState>) => void;
  /** Fire a one-shot mascot action (jump, nod, wiggle, spin). */
  act: (type: Action['type']) => void;
  level: SharedValue<number>;
  ghost: SharedValue<number>;
};

export const OnboardingContext = createContext<Onboarding | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside the onboarding screen');
  return ctx;
}
