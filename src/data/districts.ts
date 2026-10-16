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
 * The oil-lit canals (design §5). W0 placeholders: one board per room; C1 draws the real three
 * per room. Rooms 1–2 loot `shallow`, 3–4 `deep`, the heart `heart` (K-3).
 */
const CANAL_ROOMS: readonly EncounterDef[] = [
  room(
    'canal-towpath',
    'The towpath',
    1,
    [
      {
        name: 'The towpath',
        layout: board([
          '. . wv . . .',
          '. r wv . . .',
          '. . ewv . . .',
          '. . wv . . .',
          '. . wv . r .',
          '. . wv . . .',
          '. D wv S . .',
          '. . wv . . .',
        ]),
      },
    ],
    'shallow',
  ),
  room(
    'canal-arcade',
    'The drowned arcade',
    2,
    [
      {
        name: 'The drowned arcade',
        layout: board([
          '. m . . . .',
          'w> w> w> w> w> w>',
          'w> w> ew> w> w> w>',
          '. . . . r .',
          '. o . . . .',
          '. . . . m .',
          '. D . . S .',
          '. . . . . .',
        ]),
      },
    ],
    'shallow',
  ),
  room(
    'canal-sluice',
    'The sluice',
    3,
    [
      {
        name: 'The sluice',
        layout: board([
          '. . wv . n .',
          '. . wv . . .',
          'w> w> w> w> w> w>',
          '. . ewv . . .',
          '. r wv . m .',
          '. . wv . . .',
          '. D wv . S .',
          '. . wv . . .',
        ]),
      },
    ],
    'deep',
  ),
  room(
    'canal-reach',
    'The uphill reach',
    4,
    [
      {
        name: 'The uphill reach',
        layout: board([
          '. n . w^ . .',
          '. . . w^ m .',
          'w< w< w< w^ w< w<',
          '. . . ew^ . .',
          '. r . w^ . .',
          '. . . w^ . m',
          '. D . w^ S .',
          '. . . w^ . .',
        ]),
      },
    ],
    'deep',
  ),
  room(
    'canal-pool',
    "The lamp-mother's pool",
    5,
    [
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
    ],
    'heart',
    true,
  ),
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
