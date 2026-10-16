import type { DraftDef } from './types';

/**
 * The owner's drafts (M29): broken pages found in the Seam, in story order. Insides are lattice
 * ASCII in the Glyph's local frame (flow enters `entry` moving right); the engine shifts the entry
 * to (0,0). Fixes live in the tests only (tests/run/drafts.test.ts guards every page, board and goal).
 * Boards are 5 x 3 notation, the Draughtsman `D` at the left edge. Text fields: task D1 polishes them.
 */
export const DRAFTS: readonly DraftDef[] = [
  {
    id: 'lamplighter',
    order: 1,
    depth: 'shallow',
    name: 'The Lamplighter',
    kind: 'spell',
    inside: ['Bolt> Bend^', '.     Spark'].join('\n'),
    entry: 'A1',
    note: 'Bolt it where it stands in the oil, then strike a light. I like a corner. It gives the spark a moment to think.',
    hint: 'A corner can point the wrong way.',
    test: {
      board: ['. . .  . .', 'D . do . .', '. . .  . .'].join('\n'),
      aim: { dir: 'right' },
      goal: { all: [{ happens: 'ignite' }, { hurt: 'dummy-1', atLeast: 3 }] },
    },
    reaction: 'Down. It was always down. I drew it upside down on the tram.',
  },
  {
    id: 'collection',
    order: 2,
    depth: 'shallow',
    name: 'Collection',
    kind: 'spell',
    inside: 'Bolt> OnInked Ink Spark',
    entry: 'A1',
    note: 'Mark it and cash it in. Every time. It worked yesterday.',
    hint: 'A door has to come after the knock.',
    test: {
      board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
      aim: { dir: 'right' },
      goal: { happens: 'detonate' },
    },
    reaction: 'The door before the mark. Nobody was ever going to knock.',
  },
  {
    id: 'wet-work',
    order: 3,
    depth: 'deep',
    name: 'Wet Work',
    kind: 'payload',
    inside: ['.    Oil   .', 'Ink  Fork  .', '.    .     Spark'].join('\n'),
    entry: 'A2',
    host: ['. . . . .', 'Bolt> G:draft> . . .', '. . . . .'].join('\n'),
    note: 'Mark, soak, light. One hand each. The fork does the sharing.',
    hint: 'A rune that is never reached is not doing its job.',
    test: {
      board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
      aim: { dir: 'right' },
      goal: { all: [{ happens: 'ignite' }, { happens: 'detonate' }] },
    },
    reaction: 'One square. A whole evening, for one square.',
  },
  {
    id: 'left-hand-first',
    order: 4,
    depth: 'deep',
    name: 'Left Hand First',
    kind: 'spell',
    inside: ['.      Spark', 'Bolt>  Fork', '.      Oil'].join('\n'),
    entry: 'A2',
    note: 'Oil and the light together, so it never sees either coming.',
    hint: 'A Fork takes its left branch first.',
    test: {
      board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
      aim: { dir: 'right' },
      goal: { all: [{ happens: 'ignite' }, { hurt: 'dummy-1', atLeast: 3 }] },
    },
    reaction: 'Left first. It says so on the Fork. I wrote it there myself.',
  },
  {
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
    hint: 'An Amplify only helps what it touches.',
    test: {
      board: ['. . . . .', 'D . r r .', '. . . b .'].join('\n'),
      aim: { tile: 'C2' },
      goal: { all: [{ dies: 'rat-1' }, { dies: 'rat-2' }, { happens: 'detonate' }] },
    },
    reaction: 'Loud in the wrong place and pointing at the ceiling. That is me in one sentence.',
  },
];

export const DRAFT_IDS: readonly string[] = DRAFTS.map((d) => d.id);
