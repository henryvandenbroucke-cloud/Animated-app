import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import type { Drink } from '../lib/drinks';
import { colors } from '../theme';

const HOT = new Set(['tea', 'coffee', 'latte']);

/** A little glass filled with the drink's colour; hot drinks steam, fizzy ones bubble. */
export function DrinkIcon({ drink, size = 48 }: { drink: Drink; size?: number }) {
  const glass = 'M10 12 H38 L34.5 42 Q34 45 31 45 H17 Q14 45 13.5 42 Z';
  const id = `g-${drink.id}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <ClipPath id={id}>
          <Path d={glass} />
        </ClipPath>
      </Defs>
      {HOT.has(drink.id) && (
        <G stroke={colors.inkSoft} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" fill="none">
          <Path d="M19 9 q-2.5 -3 0 -6" />
          <Path d="M25 9 q-2.5 -3 0 -6" />
          <Path d="M31 9 q-2.5 -3 0 -6" />
        </G>
      )}
      <Path d={glass} fill="#FFFFFF" />
      <G clipPath={`url(#${id})`}>
        <Rect x={0} y={20} width={48} height={30} fill={drink.color} />
        {drink.accent && <Rect x={0} y={18} width={48} height={6} fill={drink.accent} />}
        {drink.id === 'sparkling' || drink.id === 'soda' ? (
          <G fill="#fff" opacity={0.8}>
            <Circle cx={20} cy={34} r={1.6} />
            <Circle cx={27} cy={29} r={1.3} />
            <Circle cx={24} cy={39} r={1.2} />
            <Circle cx={30} cy={36} r={1.5} />
          </G>
        ) : null}
        <Rect x={15} y={14} width={3.5} height={28} rx={1.75} fill="#fff" opacity={0.45} />
      </G>
      <Path d={glass} fill="none" stroke={colors.ink} strokeWidth={2.4} strokeLinejoin="round" />
    </Svg>
  );
}
