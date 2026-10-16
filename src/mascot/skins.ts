/** Colour morphs for Sippy. Real axolotls come in all of these, which is what makes them collectable. */
export type Skin = {
  id: string;
  name: string;
  /** Short real-world note shown on the collection screen. */
  blurb: string;
  body: string;
  line: string;
  belly: string;
  gill: string;
  gillDot: string;
  blush: string;
  spots: string;
  eye: string;
  shine: string;
};

export const SKINS: Skin[] = [
  { id: 'leucistic', name: 'Sippy', blurb: 'Leucistic: the classic pink with dark eyes.', body: '#FFB7CB', line: '#E8789B', belly: '#FFE3EB', gill: '#FF6F9A', gillDot: '#FF9DBB', blush: '#FF8FB0', spots: '#E8789B', eye: '#3B2F3A', shine: '#FFFFFF' },
  { id: 'golden', name: 'Goldie', blurb: 'Golden albino: sunny yellow with blush gills.', body: '#FFDC7A', line: '#E0A93A', belly: '#FFF1C7', gill: '#FF9F6B', gillDot: '#FFC59B', blush: '#FFAE7A', spots: '#E0A93A', eye: '#8C3B3B', shine: '#FFFFFF' },
  { id: 'wild', name: 'Moss', blurb: 'Wild type: speckled olive, like in Lake Xochimilco.', body: '#A7A174', line: '#6F6A44', belly: '#D9D3A6', gill: '#7D6F4A', gillDot: '#B3A578', blush: '#C99A7C', spots: '#5C5838', eye: '#2B2620', shine: '#F4F1DD' },
  { id: 'lavender', name: 'Lilac', blurb: 'Lavender: a soft silver-purple morph.', body: '#CDBBF2', line: '#9C84D6', belly: '#EEE6FF', gill: '#A884F0', gillDot: '#C9B2FF', blush: '#E59BD0', spots: '#9C84D6', eye: '#3A2F4A', shine: '#FFFFFF' },
  { id: 'melanoid', name: 'Inky', blurb: 'Melanoid: deep charcoal with no shiny spots.', body: '#565067', line: '#2F2B3A', belly: '#6E6882', gill: '#3E3950', gillDot: '#7A7392', blush: '#9A7F98', spots: '#3E3950', eye: '#16131C', shine: '#CFCADB' },
  { id: 'mint', name: 'Minty', blurb: 'Glow morph: glows green under blue light.', body: '#A6E9C8', line: '#58BE8C', belly: '#DDF8EA', gill: '#3FCF8E', gillDot: '#8FF0C0', blush: '#7FD8A8', spots: '#58BE8C', eye: '#1F3A2E', shine: '#FFFFFF' },
  { id: 'copper', name: 'Penny', blurb: 'Copper: warm orange with darker freckles.', body: '#EFA987', line: '#C47052', belly: '#FBDCCB', gill: '#D9694A', gillDot: '#F2A285', blush: '#E88A73', spots: '#B5603F', eye: '#3B2620', shine: '#FFFFFF' },
  { id: 'galaxy', name: 'Nova', blurb: 'Speckled melanoid: dark with starry flecks.', body: '#3A3F6B', line: '#23264A', belly: '#4C527F', gill: '#5B4FA8', gillDot: '#9E95F0', blush: '#8D7AD8', spots: '#E7E3FF', eye: '#0D0E1F', shine: '#E7E3FF' },
];

export function findSkin(id?: string | null) {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
