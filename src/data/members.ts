import type { MemberDef, MemberId } from './types';

export const MEMBER_IDS: readonly MemberId[] = ['draughtsman', 'stoker'];

export const MEMBERS: Record<MemberId, MemberDef> = {
  draughtsman: {
    id: 'draughtsman',
    name: 'Draughtsman',
    token: 'D',
    hp: 6,
    move: 3,
    lean: { trained: 'timing', gifted: 'contracts', habit: 'twoJars' },
    shape: '. . . . .\n. . . . .\nx . . . x',
    startLattice: ['.     .   .      . .', 'Bolt> Ink Strike . .', 'x     .   .      . x'].join(
      '\n',
    ),
    blurb: 'Marks his targets in ink before anything else touches them.',
  },
  stoker: {
    id: 'stoker',
    name: 'Stoker',
    token: 'S',
    hp: 8,
    move: 3,
    lean: { trained: 'seam', gifted: 'seam', habit: 'forkAhead' },
    shape: 'x . x\n. . .\n. . .\n. . .\n. . .\nx . x',
    startLattice: [
      'x Boltv x',
      '. Oil   .',
      '. Spark .',
      '. .     .',
      '. .     .',
      'x .     x',
    ].join('\n'),
    blurb: 'Keeps the furnace lit and trusts a good fire to settle most arguments.',
  },
};
