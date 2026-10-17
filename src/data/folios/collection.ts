import type { DraftDef } from '../types';

/** Placeholder (W0): today's draft as page 1. C1/C2 rewrite it as a folio (plan §4). */
export const COLLECTION: DraftDef = {
  id: 'collection',
  order: 2,
  depth: 'shallow',
  name: 'Collection',
  kind: 'spell',
  inside: 'Bolt> OnInked Ink Spark',
  entry: 'A1',
  note: 'Mark it and cash it in. Every time. It worked yesterday.',
  pages: [
    {
      note: 'Mark it and cash it in. Every time. It worked yesterday.',
      hint: 'A door has to come after the knock.',
      test: {
        board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        goal: { happens: 'detonate' },
      },
      scraps: {},
    },
  ],
  decoys: [],
  reaction: 'The door before the mark. Nobody was ever going to knock.',
  lore: "TODO: the owner's page (D1).",
};
