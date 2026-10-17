import type { DraftDef } from '../types';

/** Placeholder (W0): today's draft as page 1. C1/C2 rewrite it as a folio (plan §4). */
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
      scraps: {},
    },
  ],
  decoys: [],
  reaction: 'Down. It was always down. I drew it upside down on the tram.',
  lore: "TODO: the owner's page (D1).",
};
