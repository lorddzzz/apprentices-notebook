import type { EncounterDef, EncounterVariant } from '../types';
import type { DistrictData, ThresholdSpec } from './index';

const board = (rows: readonly string[]): string => rows.join('\n');

/** One room of a district from its variants; `layout` is the first variant's board. */
function room(
  id: string,
  title: string,
  depth: number,
  variants: readonly EncounterVariant[],
  loot: EncounterDef['loot'],
  heart = false,
): EncounterDef {
  return {
    id,
    title,
    depth,
    layout: variants[0]?.layout ?? '',
    variants,
    loot,
    picks: heart ? 2 : 1,
    heart,
  };
}

/**
 * The oil-lit canals (design §5.5): three named boards for each of rooms 1–4 and three heart
 * variants (same name), as in the Seam. Water grows with depth: one lane by a long quay, a wider
 * lane, two lanes with a bridge, two lanes and little quay (room 4 climbs), then a pool. Foes per
 * room stay the same across its variants. Rooms 1–2 loot `canalShallow`, 3–4 `canalDeep`, the
 * heart `canalHeart` (K-3, P35).
 */

/** Room 1: an eel on the water beside a start point (turn 1 may show a lunge, HC P9) and two rats. */
const CANAL_1: readonly EncounterVariant[] = [
  {
    name: 'The towpath',
    layout: board([
      '. r wv . . .',
      '. . wv . . .',
      '. . wv o . .',
      '. . wv . . .',
      '. P wv P . .',
      '. . wv . . .',
      '. P ewv . P .',
      '. . wv . . .',
    ]),
  },
  {
    name: 'The coal wharf',
    layout: board([
      '. . . . . r',
      '. . . . . .',
      '. . . . . .',
      '. . . P . P',
      'w> ew> w> w> w> w>',
      '. P . . . .',
      '. . . . P .',
      '. o o . . .',
    ]),
  },
  {
    name: 'The lamplit quay',
    layout: board([
      'r . . . wv .',
      '. . . . wv .',
      '. . . o wv .',
      '. . . . wv .',
      'P . P . wv .',
      '. . . . wv .',
      '. P . P ewv .',
      '. . . . wv .',
    ]),
  },
];

/** Room 2: a wider lane; an eel, a rat and a moth. */
const CANAL_2: readonly EncounterVariant[] = [
  {
    name: 'The drowned arcade',
    layout: board([
      '. m . . . .',
      '. . . P . r',
      'w> w> w> w> w> w>',
      'w> w> ew> w> w> w>',
      '. . . . P .',
      '. o . . . .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The eel steps',
    layout: board([
      'm . wv wv . .',
      '. . wv wv . .',
      '. . wv wv P .',
      'P . wv wv . .',
      '. . ewv wv . r',
      '. o wv wv . .',
      '. P wv wv P .',
      '. . wv wv . .',
    ]),
  },
  {
    name: 'The lock cottage',
    layout: board([
      '. . P . . .',
      'm . . . . .',
      '. . P . . r',
      'w< w< w< w< w< w<',
      'w< w< w< ew< w< w<',
      '. . o . . .',
      '. P . . P .',
      '. . . . . .',
    ]),
  },
];

/** Room 3: two lanes and a bridge; an eel, a Snuffer, a moth and a rat. */
const CANAL_3: readonly EncounterVariant[] = [
  {
    name: 'The sluice',
    layout: board([
      '. . wv n . .',
      '. P wv . . .',
      'w> w> wv w< w< w<',
      '. . ewv . . .',
      'P . . . m .',
      '. . wv . . .',
      '. P wv . P .',
      '. . wv . . .',
    ]),
  },
  {
    name: 'The crossing',
    layout: board([
      '. . . wv . .',
      'n . . wv . .',
      '. . . wv . m',
      'w< w< w< wv w< w<',
      '. P . ewv . P',
      '. . . . . .',
      '. P . wv P .',
      '. . . wv . .',
    ]),
  },
  {
    name: "The tanners' cut",
    layout: board([
      '. . . . n .',
      '. wv . . . .',
      '. wv . . . m',
      '. wv . . . .',
      '. ewv . . P .',
      'w> wv w> w> w> w>',
      'P wv . P . P',
      '. wv . . . .',
    ]),
  },
];

/** Room 4: two lanes, little quay, the water climbs; an eel, a Snuffer, two moths and a rat. */
const CANAL_4: readonly EncounterVariant[] = [
  {
    name: 'The uphill reach',
    layout: board([
      '. n . w^ . .',
      '. . . w^ . .',
      'w< w< w< w^ w< w<',
      '. . . ew^ . P',
      'P . r w^ . .',
      '. . . w^ . m',
      '. P . w^ P .',
      '. . . w^ . .',
    ]),
  },
  {
    name: 'The lamp market',
    layout: board([
      '. w^ . n . .',
      'P w^ . . . .',
      '. w^ . . r .',
      '. ew^ . . . .',
      '. w^ . . m .',
      '. w^ w< w< w< w<',
      'P w^ P . P .',
      '. w^ . . . .',
    ]),
  },
  {
    name: 'The siphon',
    layout: board([
      '. . . . w^ .',
      'n . . . w^ .',
      '. . . P w^ .',
      'w> w> w> w> w^ .',
      '. r . . ew^ .',
      '. . . m . .',
      '. P . . w^ P',
      '. . . P w^ .',
    ]),
  },
];

/** The heart: the lamp-mother on the water, a Snuffer, two moths, lamps around the pool. */
const CANAL_HEART: readonly EncounterVariant[] = [
  {
    name: "The lamp-mother's pool",
    layout: board([
      'l . . . . l',
      '. w> w> w> wv .',
      '. w^ m Mw> wv P',
      'n w^ w> wv wv .',
      '. w^ w< w< w< P',
      '. . . . . .',
      '. P . . P .',
      'l . . . . l',
    ]),
  },
  {
    name: "The lamp-mother's pool",
    layout: board([
      'l . . . . l',
      '. wv wv wv wv .',
      '. wv m Mwv wv .',
      '. wv wv nwv wv .',
      'P wv wv wv wv P',
      '. . . . . .',
      '. P . . P .',
      'l . . . . l',
    ]),
  },
  {
    name: "The lamp-mother's pool",
    layout: board([
      'l . . . . l',
      '. w> w> wv w> .',
      '. w> m Mw> w> .',
      '. w> nw> w> w> .',
      'P w> w> w> w> P',
      '. . . . . .',
      '. P . . P .',
      'l . . . . l',
    ]),
  },
];

export const CANAL_ROOMS: readonly EncounterDef[] = [
  room('canal-towpath', 'The towpath', 1, CANAL_1, 'canalShallow'),
  room('canal-arcade', 'The drowned arcade', 2, CANAL_2, 'canalShallow'),
  room('canal-sluice', 'The sluice', 3, CANAL_3, 'canalDeep'),
  room('canal-reach', 'The uphill reach', 4, CANAL_4, 'canalDeep'),
  room('canal-pool', "The lamp-mother's pool", 5, CANAL_HEART, 'canalHeart', true),
];

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
 * The canals' data (K-1): rooms, hearing, gate and map. Landings after rooms 1, 3 and the heart (K-4, kept as built).
 */
export const CANALS_KIT: DistrictData = {
  id: 'canals',
  name: 'The oil-lit canals',
  guild: 'The Lamplighters',
  edge: 'wall',
  rooms: CANAL_ROOMS,
  hear: [{ kind: 'burst', burst: 'fire', atLeast: 3, district: 'seam', voice: 'owner' }],
  // The lock's room is the canals' kit data (P15, BL-94): copy, start points and goal live here.
  gate: { kind: 'threshold', room: CANALS_THRESHOLD },
  line: 'the black water climbs when lit',
  barred: "The lock-keeper's rat holds the lock.",
  lean: { lean: 'oil', text: 'Oil and water' },
  // The first tier above the Seam (DK-16): captions face away from the trunk, branches run level.
  map: { x: 25, y: 70, label: 'above' },
  ret: { kind: 'landings', after: [0, 2, 4] },
  threshold: CANALS_THRESHOLD,
  // RC-5 (P8, city-and-districts §5b): the runaway at the second landing (room 3, 0-based 2);
  // Fuse is guaranteed in rooms 1-3, so every trip to her landmark can have it in hand.
  recruit: [{ apprentice: 'runaway', room: 2 }],
  recruitPages: [{ for: 'runaway', runes: ['fuse'], rooms: [0, 1, 2] }],
};
