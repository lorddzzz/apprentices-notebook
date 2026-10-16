import type { DraftDef } from './types';

/**
 * The owner's drafts (M29): broken pages found in the Seam, in story order. Insides are lattice
 * ASCII in the Glyph's local frame (flow enters `entry` moving right). Fixes live in the tests only.
 * W0 stubs: task E4 sets the insides, boards and goals of the whole set, task D1 the text.
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
    note: 'Bolt it where it stands in the oil, then strike a light.',
    hint: 'A corner can point the wrong way.',
    test: {
      board: ['. . .  . .', 'D . do . .', '. . .  . .'].join('\n'),
      aim: { dir: 'right' },
      goal: { all: [{ happens: 'ignite' }, { hurt: 'dummy-1', atLeast: 3 }] },
    },
    reaction: 'Down. It was always down.',
  },
  {
    id: 'collection',
    order: 2,
    depth: 'shallow',
    name: 'Collection',
    kind: 'spell',
    inside: 'Bolt> OnInked Ink Spark',
    entry: 'A1',
    note: 'Mark it and cash it in. Every time.',
    hint: 'A door has to come after the knock.',
    test: {
      board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
      aim: { dir: 'right' },
      goal: { happens: 'detonate' },
    },
    reaction: 'The door before the mark.',
  },
];

export const DRAFT_IDS: readonly string[] = DRAFTS.map((d) => d.id);
