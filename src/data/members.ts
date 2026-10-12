import type { MemberDef, MemberId } from './types';

export const MEMBER_IDS: readonly MemberId[] = ['draughtsman', 'stoker'];

export const MEMBERS: Record<MemberId, MemberDef> = {
  draughtsman: {
    id: 'draughtsman',
    name: 'Draughtsman',
    token: 'D',
    hp: 6,
    move: 3,
    affinity: ['ink'],
    shape: '. . . . .\n. . . . .\nx . . . x',
    startLattice: ['.     .   . . .', 'Bolt> Ink . . .', 'x     .   . . x'].join('\n'),
    blurb: 'Marks his targets in ink before anything else touches them.',
  },
  stoker: {
    id: 'stoker',
    name: 'Stoker',
    token: 'S',
    hp: 8,
    move: 3,
    affinity: ['spark', 'oil'],
    shape: 'x . x\n. . .\n. . .\n. . .\n. . .\nx . x',
    startLattice: [
      'x Boltv x',
      '. Spark .',
      '. .     .',
      '. .     .',
      '. .     .',
      'x .     x',
    ].join('\n'),
    blurb: 'Keeps the furnace lit and trusts a good fire to settle most arguments.',
  },
};
