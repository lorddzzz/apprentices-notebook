import type { DraftDef } from '../types';

/**
 * Left Hand First (deep, Spell, 3 pages, 1 decoy: Steam; folios plan §4.4). The fixes live in
 * tests/run/folios-deep.test.ts. Page 1 puts the oil and the mark on the Fork's first side,
 * page 2 guards the light with On Inked so a miss burns nothing, page 3 needs one Amplify on
 * both the Oil and the Ink, which a Bend can fold together. A fold that also touches the Bolt
 * kills page 1's target before its mark can pay.
 */
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
      note: 'Oil and the light together, so it never sees either coming. Mark it as well, so it pays.',
      hint: 'Forks have a favourite side. Ask which one goes first.',
      test: {
        board: ['. . . . .', 'D . d . .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        hp: { C2: 5 },
        goal: { all: [{ happens: 'ignite' }, { happens: 'detonate' }] },
      },
      scraps: { ink: 1 },
    },
    {
      note: 'And if I miss, the street stays dry. Never light what you have not marked.',
      hint: 'A bolt that hits nobody still lands somewhere, and the rest of the page happens there.',
      test: {
        board: ['. . . ro .', 'D . . o  .', '. . . ro .'].join('\n'),
        aim: { dir: 'right' },
        goal: { all: [{ spared: 'rat-1' }, { spared: 'rat-2' }] },
      },
      scraps: { onInked: 1, bend: 1 },
    },
    {
      note: 'Anyone standing in the puddle is in on it. Mark them and soak them, both.',
      hint: 'One strengthening can feed two runes at once, if both touch it.',
      test: {
        board: ['. . . . .', '. . . . .', 'D . d . do', '. . . . .', '. . . . .'].join('\n'),
        aim: { dir: 'right' },
        hp: { E3: 3 },
        goal: { all: [{ happens: 'ignite' }, { dies: 'dummy-2' }] },
      },
      scraps: { amplify: 1, steam: 1 },
    },
  ],
  decoys: ['steam'],
  reaction:
    'Left first. It says so on the Fork. I wrote it there myself, and then I folded it wrong.',
  lore: 'I write left-handed, and the guild spent two years trying to make me copy with the right. Every page I drafted for the examiners came out mirrored, and they took that as a sign of moral weakness. One examiner kept my papers anyway, folded very small, and never said why. I never learned which of us was the fool. It is a bad habit to have, and it is the only thing I brought out of the guild that they did not ask me to hand back.',
};
