import type { DraftDef } from '../types';

/** Placeholder (W0): today's draft as page 1. C1/C2 rewrite it as a folio (plan §4). */
export const WET_WORK: DraftDef = {
  id: 'wet-work',
  order: 3,
  depth: 'deep',
  name: 'Wet Work',
  kind: 'payload',
  inside: ['.    Oil   .', 'Ink  Fork  .', '.    .     Spark'].join('\n'),
  entry: 'A2',
  host: ['. . . . .', 'Bolt> G:draft> . . .', '. . . . .'].join('\n'),
  note: 'Mark, soak, light. One hand each. The fork does the sharing.',
  pages: [
    {
      note: 'Mark, soak, light. One hand each. The fork does the sharing.',
      hint: 'A rune the flow never reaches is only decoration.',
      test: {
        board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        goal: { all: [{ happens: 'ignite' }, { happens: 'detonate' }] },
      },
      scraps: {},
    },
  ],
  decoys: [],
  reaction: 'One square. A whole evening, for one square.',
  lore: "TODO: the owner's page (D1).",
};
