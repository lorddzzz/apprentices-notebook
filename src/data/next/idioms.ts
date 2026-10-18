import type { IdiomDef } from './types';

/** Design §11's signature idioms, one or two per district. Matched on the log by `engine/idioms.ts` (L1). */
export const IDIOMS: readonly IdiomDef[] = [
  {
    id: 'cashingIn',
    name: 'Cashing In',
    district: 'seam',
    rule: 'A mark set on an earlier turn is burst by a Spark.',
    ownerNote: 'Mark it, then collect. Patience is the only interest the ink pays.',
  },
  {
    id: 'bonfire',
    name: 'Bonfire',
    district: 'seam',
    rule: 'One fire runs along 4 or more tiles of oil.',
    ownerNote: 'Wide, then wet, then lit. In that order or not at all.',
  },
  {
    id: 'theWall',
    name: 'The Wall',
    district: 'seam',
    rule: 'A unit slides over oil and is crushed at the end of it.',
    ownerNote: 'The floor does the pushing. The wall does the rest.',
  },
  {
    id: 'lanternWalk',
    name: 'Lantern Walk',
    district: 'canals',
    rule: 'A jar holding Spark drifts downstream and opens on a foe.',
    ownerNote: 'Set it on the water and let the canal deliver it.',
  },
  {
    id: 'debtCollection',
    name: 'Debt Collection',
    district: 'inkQuarter',
    rule: "A bound mark is released by another apprentice's hit.",
    ownerNote: 'One signs, another collects. The debt was always there.',
  },
  {
    id: 'steamRoom',
    name: 'Steam Room',
    district: 'bathhouses',
    rule: 'One compound covers 6 or more tiles.',
    ownerNote: 'Fill the room first. Ask questions in the fog.',
  },
  {
    id: 'longDrop',
    name: 'The Long Drop',
    district: 'bridges',
    rule: 'A foe is pushed off an edge or into a canal.',
    ownerNote: 'The quickest way across a bridge is down.',
  },
  {
    id: 'peal',
    name: 'Peal',
    district: 'foundry',
    rule: 'One burst is tolled across 3 or more tiles.',
    ownerNote: 'Strike the bell once. Let the metal remember.',
  },
  {
    id: 'redraft',
    name: 'Redraft',
    district: 'cartographers',
    rule: 'Draw or Swap moves something into a compound that then goes off.',
    ownerNote: 'Move the map, and the map moves the world.',
  },
];
