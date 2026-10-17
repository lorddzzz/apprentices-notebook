import type { DraftDef } from '../types';

/** Folio 1 (plan §4): a corner that points the wrong way, then fire that needs something to catch. */
export const LAMPLIGHTER: DraftDef = {
  id: 'lamplighter',
  order: 1,
  depth: 'shallow',
  name: 'The Lamplighter',
  kind: 'spell',
  inside: ['Bolt> Bend^', '.     Spark'].join('\n'),
  entry: 'A1',
  note: 'Bolt it where it stands in the oil, then strike a light. I like a corner. It gives the spark a moment to think.',
  pages: [
    {
      note: 'Bolt it where it stands in the oil, then strike a light. I like a corner. It gives the spark a moment to think.',
      hint: 'A corner can point the wrong way.',
      test: {
        board: ['. . .  . .', 'D . do . .', '. . .  . .'].join('\n'),
        aim: { dir: 'right' },
        goal: { all: [{ happens: 'ignite' }, { hurt: 'dummy-1', atLeast: 3 }] },
      },
      scraps: { oil: 1 },
    },
    {
      note: 'And if the street is dry, bring your own. Lay it down first. Fire first is no fire.',
      hint: 'Fire can only run where something was laid down for it before the spark came.',
      test: {
        board: ['. . . . .', 'D . . . d', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        hp: { E2: 9 },
        goal: { all: [{ happens: 'ignite' }, { hurt: 'dummy-1', atLeast: 5 }] },
      },
      scraps: { amplify: 1 },
    },
  ],
  decoys: [],
  reaction: 'Down. It was always down. I drew it upside down on the tram.',
  lore: 'The Lamplighters kept the canal lamps going, and nobody paid them for the part where the lamps stayed lit. I learned my first useful trick beside one of them, a woman who carried her own oil in a flask and called it good manners. She said a spell that needs the street to be wet has a very short career. I drew this one on the tram, upside down, which tells you what sort of week it was. Keep the flask.',
};
