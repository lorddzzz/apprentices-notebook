import type { DraftDef } from '../types';

/**
 * Wet Work (deep, Payload in `Bolt> G:draft>`, 3 pages, no decoys; folios plan §4.3). The fixes
 * live in tests/run/folios-deep.test.ts. Page 1 wires the stranded Spark in, page 2 follows the
 * fire with a second Spark (On Ignite), page 3 needs more on the target without boosting the
 * finishing Spark, which would also kill the bystander standing in the burning pool.
 */
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
      scraps: { bend: 1 },
    },
    {
      note: 'If it runs off into a puddle, follow it. Whoever is standing in the puddle had it coming.',
      hint: 'Fire runs along the oil on its own, and something can ride after it.',
      test: {
        board: ['. . . . . .', 'D . d o do do', '. . . . . .'].join('\n'),
        aim: { dir: 'right' },
        hp: { E2: 2, F2: 3 },
        goal: { all: [{ happens: 'ignite' }, { dies: 'dummy-2' }, { spared: 'dummy-3' }] },
      },
      scraps: { onIgnite: 1, spark: 1 },
    },
    {
      note: 'The big one first, and hard. The puddle gets the same as before, no more.',
      hint: 'Whatever rides behind the fire hits everyone in the puddle, so the strength has to go into the first hand.',
      test: {
        board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        hp: { C2: 10 },
        goal: { all: [{ happens: 'detonate' }, { dies: 'dummy-1' }] },
      },
      scraps: { amplify: 2 },
    },
  ],
  decoys: [],
  reaction:
    'One square, then a puddle, then a whole evening. The first hand was always the heavy one.',
  lore: 'Wet Work paid by the job, not by the hour, and for a while that was the only argument I needed. The guild called the jobs untidy. I called them thrift, and we were both a little right. Every canal job ended in a puddle, and every puddle had a witness. Somebody down by the locks has been keeping count of who went in, and I have a feeling the count reaches back to the guild.',
};
