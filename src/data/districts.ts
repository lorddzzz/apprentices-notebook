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
 * room stay the same across its variants. Rooms 1–2 loot `shallow`, 3–4 `deep`, the heart `heart`
 * (K-3).
 */

/** Room 1: an eel on the water beside a member (turn 1 shows a lunge) and two rats. */
const CANAL_1: readonly EncounterVariant[] = [
  {
    name: 'The towpath',
    layout: board([
      '. . wv . . r',
      '. . wv . . .',
      '. . wv o . .',
      '. . wv . . .',
      '. . wv . . .',
      '. . wv . . .',
      '. D ewv . S .',
      '. . wv . . .',
    ]),
  },
  {
    name: 'The coal wharf',
    layout: board([
      '. . . . . r',
      '. . . . . .',
      '. . . . . .',
      '. . . . . .',
      'w> ew> w> w> w> w>',
      '. D . . . .',
      '. . . . S .',
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
      '. . . . wv .',
      '. . . . wv .',
      '. D . S ewv .',
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
      '. . . . . .',
      'w> w> w> w> w> w>',
      'w> w> ew> w> w> w>',
      '. . . . . .',
      '. o . . . r',
      '. D . . S .',
      '. . . . . .',
    ]),
  },
  {
    name: 'The eel steps',
    layout: board([
      'm . wv wv . .',
      '. . wv wv . .',
      '. . wv wv . .',
      '. . wv wv . .',
      '. . ewv wv . r',
      '. o wv wv . .',
      '. D wv wv S .',
      '. . wv wv . .',
    ]),
  },
  {
    name: 'The lock cottage',
    layout: board([
      '. . . . . .',
      'm . . . . .',
      '. . . . . r',
      'w< w< w< w< w< w<',
      'w< w< w< ew< w< w<',
      '. . o . . .',
      '. D . . S .',
      '. . . . . .',
    ]),
  },
];

/** Room 3: two lanes and a bridge; an eel, a Snuffer, a moth and a rat. */
const CANAL_3: readonly EncounterVariant[] = [
  {
    name: 'The sluice',
    layout: board([
      '. . wv . n .',
      '. . wv . . .',
      'w> w> wv w< w< w<',
      '. . ewv . . .',
      '. . . . m .',
      '. . wv . . .',
      '. D wv . S .',
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
      '. . . ewv . .',
      '. . . . . .',
      '. D . wv S .',
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
      '. ewv . . . .',
      'w> wv w> w> w> w>',
      '. wv . D . S',
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
      '. . . ew^ . .',
      '. r . w^ . .',
      '. . . w^ . m',
      '. D . w^ S .',
      '. . . w^ . .',
    ]),
  },
  {
    name: 'The lamp market',
    layout: board([
      '. w^ . n . .',
      '. w^ . . . .',
      '. w^ . . r .',
      '. ew^ . . . .',
      '. w^ . . m .',
      '. w^ w< w< w< w<',
      '. w^ D . S .',
      '. w^ . . . .',
    ]),
  },
  {
    name: 'The siphon',
    layout: board([
      '. . . . w^ .',
      'n . . . w^ .',
      '. . . . w^ .',
      'w> w> w> w> w^ .',
      '. r . . ew^ .',
      '. . . m . .',
      '. D . . w^ S',
      '. . . . w^ .',
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
      '. w^ m Mw> wv .',
      '. w^ w> nwv wv .',
      '. w^ w< w< w< .',
      '. . . . . .',
      '. D . . S .',
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
      '. wv wv wv wv .',
      '. . . . . .',
      '. D . . S .',
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
      '. w> w> w> w> .',
      '. . . . . .',
      '. D . . S .',
      'l . . . . l',
    ]),
  },
];

const CANAL_ROOMS: readonly EncounterDef[] = [
  room('canal-towpath', 'The towpath', 1, CANAL_1, 'shallow'),
  room('canal-arcade', 'The drowned arcade', 2, CANAL_2, 'shallow'),
  room('canal-sluice', 'The sluice', 3, CANAL_3, 'deep'),
  room('canal-reach', 'The uphill reach', 4, CANAL_4, 'deep'),
  room('canal-pool', "The lamp-mother's pool", 5, CANAL_HEART, 'heart', true),
];

/** The city, district by district (K-1). The Seam's rooms are `ENCOUNTERS`, unchanged. */
export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  seam: {
    id: 'seam',
    name: 'The Seam',
    material: 'ink',
    guild: 'The Notaries',
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
    encounters: CANAL_ROOMS,
    landings: [0, 2, 4],
    hear: [{ kind: 'ignite', atLeast: 3, district: 'seam', voice: 'owner' }],
    gate: {
      kind: 'threshold',
      room: {
        name: 'The canal lock',
        // W0 placeholder; C2 draws the real board and proves it.
        board: board([
          '. . wv . D .',
          '. . wv . . .',
          '. . wv . S .',
          '= = wv = = =',
          '. = wvh = . .',
          '. = g = . .',
        ]),
        goal: { happens: 'gateBurns' },
        note: 'The lock gate is wood. Wood burns.',
      },
    },
    map: { x: 30, y: 70 },
    line: 'the black water climbs when lit',
    barred: 'A wooden lock gate bars the canal.',
  },
};

export const DISTRICT_IDS: readonly DistrictId[] = ['seam', 'canals'];

/** A district's rooms in order (K-2). */
export function encountersOf(district: DistrictId): readonly EncounterDef[] {
  return DISTRICTS[district].encounters;
}
