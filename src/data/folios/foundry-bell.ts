import type { DraftDef } from '../types';

/**
 * The Foundry Bell (heart, Spell, 4 pages, 2 decoys: Brand, Echo; folios plan §4.5). The fixes
 * live in tests/run/folios-deep.test.ts. Page 1 loudens the Splash, page 2 reroutes On Kill to
 * the Spark so brass carries it on, page 3 trades the broad Ink for Smear so only marked units
 * pay, page 4 fits Etch in so the whole brass line rings.
 */
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
      note: 'Ring it once.',
      hint: 'An Amplify only helps what it touches.',
      test: {
        board: ['. . . . .', 'D . r r .', '. . . . .'].join('\n'),
        aim: { tile: 'C2' },
        goal: { all: [{ dies: 'rat-1' }, { dies: 'rat-2' }] },
      },
      scraps: { amplify: 1 },
    },
    {
      note: 'Every one that drops passes the spark along, and brass carries it further.',
      hint: 'A Bend only turns what runs into it. The spark wants to be loud where it lands.',
      test: {
        board: ['. . . . .', 'D . r b b', '. . . . .'].join('\n'),
        aim: { tile: 'C2' },
        hp: { D2: 12 },
        goal: { all: [{ dies: 'rat-1' }, { dies: 'sentry-2' }] },
      },
      scraps: { bend: 1, amplify: 1 },
    },
    {
      note: 'Only the marked ones, mind. The ones watching keep their ears.',
      hint: 'A mark that spreads by touch is choosier than a mark that spreads by ink.',
      test: {
        board: ['. d . . .', 'D . r r d', '. . . b b', '. . . . .'].join('\n'),
        aim: { tile: 'C2' },
        hp: { B1: 5, E2: 5, D3: 12, E3: 4 },
        goal: { all: [{ dies: 'sentry-2' }, { spared: 'dummy-1' }, { spared: 'dummy-2' }] },
      },
      scraps: { smear: 1, brand: 1 },
    },
    {
      note: 'Then the whole foundry hears it, down every rail.',
      hint: 'Brass carries a spark anywhere. It carries a mark only if someone cut one into it.',
      test: {
        board: ['. d . . . . .', 'D . r r . d r!', '. . . b = = =', '. . . . . . .'].join('\n'),
        aim: { tile: 'C2' },
        hp: { B1: 5, D2: 3, F2: 3, D3: 12 },
        goal: { all: [{ dies: 'rat-3' }, { spared: 'dummy-1' }, { spared: 'dummy-2' }] },
      },
      scraps: { etch: 1, echo: 1 },
    },
  ],
  decoys: ['brand', 'echo'],
  reaction: 'Loud in the wrong place and pointing at the ceiling. That is me in one sentence.',
  lore: "Placeholder (D1): the owner's page for The Foundry Bell. The guild rang a bell in the foundry for every expulsion. The owner heard it once from the inside of the hall. They spent a year learning to ring it back. This page is the year.",
};
