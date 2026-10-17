import type { DraftDef } from '../types';

/** Placeholder (W0): today's draft as page 1. C1/C2 rewrite it as a folio (plan §4). */
export const LEFT_HAND_FIRST: DraftDef = {
  id: 'left-hand-first',
  order: 4,
  depth: 'deep',
  name: 'Left Hand First',
  kind: 'spell',
  inside: ['.      Spark', 'Bolt>  Fork', '.      Oil'].join('\n'),
  entry: 'A2',
  note: 'Oil and the light together, so it never sees either coming.',
  pages: [
    {
      note: 'Oil and the light together, so it never sees either coming.',
      hint: 'Forks have a favourite side. Ask which one goes first.',
      test: {
        board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        goal: { all: [{ happens: 'ignite' }, { hurt: 'dummy-1', atLeast: 3 }] },
      },
      scraps: {},
    },
  ],
  decoys: [],
  reaction: 'Left first. It says so on the Fork. I wrote it there myself.',
  lore: "TODO: the owner's page (D1).",
};
