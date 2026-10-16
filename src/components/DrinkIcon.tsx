import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import type { Drink, Vessel } from '../lib/drinks';
import { colors } from '../theme';

// Each vessel: outline path and the y where the liquid starts (in a 48×48 box).
const VESSELS: Record<Vessel, { path: string; fill: number; handle?: string; cap?: string }> = {
  glass: { path: 'M11 12 H37 L34 42 Q33.6 45 30.5 45 H17.5 Q14.4 45 14 42 Z', fill: 20 },
  tall: { path: 'M14 6 H34 L32 43 Q31.8 45.5 29 45.5 H19 Q16.2 45.5 16 43 Z', fill: 15 },
  mug: { path: 'M9 15 H33 V38 Q33 45 26 45 H16 Q9 45 9 38 Z', fill: 21, handle: 'M33 20 Q41 20 41 27 Q41 34 33 34' },
  bottle: { path: 'M20 4 H28 V11 Q35 15 35 22 V42 Q35 45.5 31.5 45.5 H16.5 Q13 45.5 13 42 V22 Q13 15 20 11 Z', fill: 22, cap: 'M19 2 H29 V6 H19 Z' },
  can: { path: 'M13 8 Q13 6 15 6 H33 Q35 6 35 8 V43 Q35 45.5 32.5 45.5 H15.5 Q13 45.5 13 43 Z', fill: 6 },
  wine: { path: 'M12 5 H36 Q37 20 24 27 Q11 20 12 5 Z', fill: 12 },
};

const HOT = new Set(['tea', 'green-tea', 'herbal', 'coffee', 'espresso', 'latte', 'cappuccino', 'hot-chocolate', 'chai', 'matcha']);
const FIZZY = new Set(['sparkling', 'soda', 'diet-soda', 'lemon-soda', 'ginger-ale', 'beer', 'kombucha', 'mineral']);

/** A little vessel filled with the drink's colour; hot drinks steam, fizzy ones bubble. */
export function DrinkIcon({ drink, size = 48 }: { drink: Drink; size?: number }) {
  const v = VESSELS[drink.vessel ?? 'glass'];
  const id = `v-${drink.id}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <ClipPath id={id}>
          <Path d={v.path} />
        </ClipPath>
      </Defs>
      {HOT.has(drink.id) && (
        <G stroke={colors.inkSoft} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" fill="none">
          <Path d="M16 11 q-2.5 -3 0 -6" />
          <Path d="M22 11 q-2.5 -3 0 -6" />
          <Path d="M28 11 q-2.5 -3 0 -6" />
        </G>
      )}
      {v.handle && <Path d={v.handle} stroke={colors.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" />}
      {drink.vessel === 'wine' && <Path d="M24 27 V42 M17 44 H31" stroke={colors.ink} strokeWidth={2.4} strokeLinecap="round" />}
      <Path d={v.path} fill="#FFFFFF" />
      <G clipPath={`url(#${id})`}>
        {drink.vessel === 'can' ? (
          <>
            <Rect x={0} y={0} width={48} height={48} fill={drink.color} />
            <Rect x={0} y={18} width={48} height={12} fill={drink.accent ?? '#FFFFFF'} opacity={0.85} />
          </>
        ) : (
          <>
            <Rect x={0} y={v.fill} width={48} height={48} fill={drink.color} />
            {drink.accent && <Rect x={0} y={v.fill - 2} width={48} height={5} fill={drink.accent} />}
          </>
        )}
        {FIZZY.has(drink.id) && drink.vessel !== 'can' ? (
          <G fill="#fff" opacity={0.8}>
            <Circle cx={20} cy={34} r={1.6} />
            <Circle cx={27} cy={29} r={1.3} />
            <Circle cx={24} cy={39} r={1.2} />
            <Circle cx={30} cy={36} r={1.5} />
          </G>
        ) : null}
        <Rect x={16} y={4} width={3.5} height={40} rx={1.75} fill="#fff" opacity={0.4} />
      </G>
      <Path d={v.path} fill="none" stroke={colors.ink} strokeWidth={2.4} strokeLinejoin="round" />
      {v.cap && <Path d={v.cap} fill={colors.inkSoft} />}
    </Svg>
  );
}
