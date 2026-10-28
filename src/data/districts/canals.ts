import type { DistrictKitData, ThresholdSpec } from './index';

/**
 * The canals' threshold room (BL-94, P15): the lock. Its rat sits on the sill with plates either
 * side and the canal at its back (P10). Four `P` start points: three along the row, one a step
 * above it. A shove along the row drops it in the water; a fire or a strike only kills it, so the
 * goal asks for the drop as well. `Bolt> Oil Shove` is the intended page.
 */
export const CANALS_THRESHOLD: ThresholdSpec = {
  name: 'The canal lock',
  board: [
    '. . . . wv .',
    '. . . . wv .',
    '. P . = wv .',
    'P P P r wv .',
    '. . . = wv .',
    '. . . . wv .',
    '. . . . wv .',
    '. . . . wv .',
  ].join('\n'),
  goal: { all: [{ dies: 'rat-1' }, { happens: 'dropped' }] },
  note: 'The rat on the sill keeps the lock shut. The water takes whatever is pushed into it.',
  goalText: 'Drop the rat in the canal.',
  solvedArt: 'canal-gate',
};

/**
 * The canals' kit data. Their rooms and hearing still live in `src/data/districts.ts` until DK-17
 * moves them here. Landings after rooms 1, 3 and the heart (K-4, kept as built).
 */
export const CANALS_KIT: DistrictKitData = {
  id: 'canals',
  lean: { lean: 'oil', text: 'Oil and water' },
  // The first tier above the Seam (DK-16): captions face away from the trunk, branches run level.
  map: { x: 25, y: 70, label: 'above' },
  ret: { kind: 'landings', after: [0, 2, 4] },
  threshold: CANALS_THRESHOLD, // RC-5 (P8, city-and-districts §5b): the runaway at the second landing (room 3, 0-based 2);
  // Fuse is guaranteed in rooms 1-3, so every trip to her landmark can have it in hand.
  recruit: [{ apprentice: 'runaway', room: 2 }],
  recruitPages: [{ for: 'runaway', runes: ['fuse'], rooms: [0, 1, 2] }],
};
