import type { DraftDef } from '../types';

/** Placeholder (W0): today's draft as page 1. C1/C2 rewrite it as a folio (plan §4). */
export const FOUNDRY_BELL: DraftDef = {
  id: 'foundry-bell',
  order: 5,
  depth: 'heart',
  name: 'The Foundry Bell',
  kind: 'spell',
  inside: [
    '.        Amp   .       .',
    'Splash>  Ink   OnKill  Bend^',
    '.        .     .       Spark',
  ].join('\n'),
  entry: 'A2',
  note: 'Ring it once and the whole foundry hears. Every one that drops passes the spark along.',
  pages: [
    {
      note: 'Ring it once and the whole foundry hears. Every one that drops passes the spark along.',
      hint: 'An Amplify only helps what it touches. A Bend only turns what runs into it.',
      test: {
        board: ['. . . . .', 'D . r r .', '. . . b .'].join('\n'),
        aim: { tile: 'C2' },
        goal: { all: [{ dies: 'rat-1' }, { dies: 'rat-2' }, { happens: 'detonate' }] },
      },
      scraps: {},
    },
  ],
  decoys: [],
  reaction: 'Loud in the wrong place and pointing at the ceiling. That is me in one sentence.',
  lore: "TODO: the owner's page (D1).",
};
