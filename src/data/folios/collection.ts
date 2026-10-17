import type { DraftDef } from '../types';

/** Folio 2 (plan §4): the door comes after the knock, then the knock has to reach everyone. */
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
      note: 'Mark it and cash it in. Every time.',
      hint: 'A door has to come after the knock.',
      test: {
        board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        goal: { happens: 'detonate' },
      },
      scraps: { pierce: 1 },
    },
    {
      note: 'Every one of them, mind. Yesterday there was only the one.',
      hint: 'A bolt stops at the first thing it meets. Make it go on, and lay the mark before the rest of the chain. A bit more force in the right place pays twice.',
      test: {
        board: ['. . . . .', 'D . d d .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        goal: {
          all: [
            { happens: 'detonate', atLeast: 2 },
            { hurt: 'dummy-2', atLeast: 7 },
          ],
        },
      },
      scraps: { amplify: 1 },
    },
  ],
  decoys: [],
  reaction: 'The door before the mark. Nobody was ever going to knock.',
  lore: 'Collection was my first honest trade: mark the debtor, then collect, in that order and never the other way round. It worked on one man at a time, which is how I learned that a bolt stops at the first door it finds. The guild called it bailiff work, not magic. I called it rent. They put their view in writing, and I took mine down to the canals.',
};
