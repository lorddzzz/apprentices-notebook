import { ENCOUNTERS } from './encounters';
import type { DistrictDef, DistrictId, EncounterDef, EncounterVariant } from './types';

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

const CANAL_ROOMS: readonly EncounterDef[] = [
  room('canal-towpath', 'The towpath', 1, CANAL_1, 'canalShallow'),
  room('canal-arcade', 'The drowned arcade', 2, CANAL_2, 'canalShallow'),
  room('canal-sluice', 'The sluice', 3, CANAL_3, 'canalDeep'),
  room('canal-reach', 'The uphill reach', 4, CANAL_4, 'canalDeep'),
  room('canal-pool', "The lamp-mother's pool", 5, CANAL_HEART, 'canalHeart', true),
];

/**
 * A district on the map that is heard of but still being drawn (P2): no rooms, never opens. Its
 * runes, methods and solvents are reachable only in the Lab. R1 writes their lines.
 */
function drawn(
  id: DistrictId,
  name: string,
  material: DistrictDef['material'],
  guild: string,
  map: DistrictDef['map'],
  line: string,
  hear: DistrictDef['hear'],
): Partial<Record<DistrictId, DistrictDef>> {
  return {
    [id]: {
      id,
      name,
      material,
      guild,
      edge: 'wall',
      encounters: [],
      landings: 'all',
      hear,
      gate: { kind: 'drawing' },
      map,
      line,
      barred: 'The page is still being drawn.',
    },
  };
}

/** The city, district by district (K-1). The Seam's rooms are `ENCOUNTERS`, unchanged. */
export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  seam: {
    id: 'seam',
    name: 'The Seam',
    material: 'ink',
    guild: "No guild: the owner's drawing",
    edge: 'wall',
    encounters: ENCOUNTERS,
    landings: 'all',
    hear: [],
    gate: { kind: 'none' },
    map: { x: 50, y: 50 },
    line: 'Where the notebook was found.',
    barred: '',
  },
  canals: {
    id: 'canals',
    name: 'The oil-lit canals',
    material: 'oil',
    guild: 'The Lamplighters',
    edge: 'wall',
    encounters: CANAL_ROOMS,
    landings: [0, 2, 4],
    hear: [{ kind: 'burst', burst: 'fire', atLeast: 3, district: 'seam', voice: 'owner' }],
    gate: {
      kind: 'threshold',
      room: {
        name: 'The canal lock',
        // The lock-keeper's rat sits on the sill with plates either side and the canal at its back
        // (P10). Four `P`: three along the row, one a step above it. A shove along the row drops it in the water; a fire or a strike only kills it,
        // so the goal asks for the drop as well. `Bolt> Oil Shove` is the intended page.
        board: board([
          '. . . . wv .',
          '. . . . wv .',
          '. P . = wv .',
          'P P P r wv .',
          '. . . = wv .',
          '. . . . wv .',
          '. . . . wv .',
          '. . . . wv .',
        ]),
        goal: { all: [{ dies: 'rat-1' }, { happens: 'dropped' }] },
        note: 'The rat on the sill keeps the lock shut. The water takes whatever is pushed into it.',
      },
    },
    map: { x: 30, y: 70 },
    line: 'the black water climbs when lit',
    barred: "The lock-keeper's rat holds the lock.",
  },
  // Heard of, being drawn (P2): each is heard once, from a named result or from the city's talk.
  ...drawn(
    'inkQuarter',
    "The ink-makers' quarter",
    'ink',
    'The Notaries',
    { x: 70, y: 30 },
    'marks that keep what they are owed',
    [
      { kind: 'named', id: 'compound:deepMark', voice: 'owner' },
      { kind: 'trips', atLeast: 3, voice: 'rumour' },
    ],
  ),
  ...drawn(
    'bathhouses',
    'The bathhouses',
    'steam',
    'The bath-keepers',
    { x: 75, y: 65 },
    'one fog over the whole house',
    [
      { kind: 'named', id: 'compound:greaseFog', voice: 'owner' },
      { kind: 'trips', atLeast: 4, voice: 'rumour' },
    ],
  ),
  ...drawn(
    'bridges',
    'The bridges',
    'brass',
    'The bridge-wardens',
    { x: 20, y: 35 },
    'the edge is a door too',
    [
      { kind: 'named', id: 'idiom:theWall', voice: 'owner' },
      { kind: 'trips', atLeast: 5, voice: 'rumour' },
    ],
  ),
  ...drawn(
    'foundry',
    'The bell foundry',
    'spark',
    'The founders',
    { x: 55, y: 15 },
    'one bang, heard three tiles away',
    [
      { kind: 'named', id: 'burst:conduct', voice: 'owner' },
      { kind: 'trips', atLeast: 6, voice: 'rumour' },
    ],
  ),
  ...drawn(
    'cartographers',
    "The Cartographers' hall",
    'ink',
    'The Cartographers',
    { x: 85, y: 45 },
    'the paper keeps changing under the pen',
    [
      { kind: 'heart', district: 'canals', voice: 'rumour' },
      { kind: 'trips', atLeast: 8, voice: 'rumour' },
    ],
  ),
} as Record<DistrictId, DistrictDef>;

export const DISTRICT_IDS: readonly DistrictId[] = [
  'seam',
  'canals',
  'inkQuarter',
  'bathhouses',
  'bridges',
  'foundry',
  'cartographers',
];
/** The districts with rooms this build (P2). */
export const PLAYABLE_DISTRICTS: readonly DistrictId[] = ['seam', 'canals'];

/** A district's rooms in order (K-2). */
export function encountersOf(district: DistrictId): readonly EncounterDef[] {
  return DISTRICTS[district].encounters;
}
