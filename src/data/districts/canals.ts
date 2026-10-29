import type { RivalId } from '../rivals/types';
import type { EncounterDef, EncounterVariant, EnemyDef, EnemyId } from '../types';
import type { BonusObjective, DistrictData, KitGate, PaperDef, ThresholdSpec } from './index';

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

// ── Canals revisit contracts (CN-0, canals-revisit plan §4) ─────────────────────────────
// Declared here, wired by later CN tasks: nothing below changes a canal room or trip yet.

/**
 * CN P3: the barge's crate, a bystander unit (not a board piece). 1 HP, no attack, never
 * telegraphs; it floats on the current and any harm ruins it (`cargoLost`). `ENEMIES.barge` is
 * this object, spawned with `Unit.bystander` and the silent AI `none` (CN-2).
 */
export const BARGE: EnemyDef = {
  id: 'barge',
  name: 'crate',
  token: 'k',
  hp: 1,
  move: 0,
  attack: null,
  ai: 'none',
  brass: false,
  oilTrail: false,
  elite: false,
  blurb: 'A barge crate adrift on the current. Moor it before the room is won for a bonus pick.',
  habitat: 'any',
  flies: false,
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
  floats: true,
  bystander: true,
};

/** CN P4: the mooring piece (`{moor}`, non-solid, on water). Its def is the canal module's. */
export const MOOR_PIECE = 'canals:moor' as const;
export const MOOR_TOKEN = 'moor';

/**
 * CN P5 (DK-5b): the barge rooms' bonus, one more pick from the same offers when the crate is
 * moored. CN-3/CN-4 put it on rooms 2 and 4; the crate is the room's first barge.
 */
export const MOORING_BONUS: BonusObjective = {
  goal: { happens: 'moored', unit: 'barge-1' },
  text: 'Moor the crate before the room is won.',
  reward: { kind: 'pick' },
};

/**
 * CN P6: which rivals play their room. While `lamplighter` is off, room 4's `L` reads as its
 * stand-in (today's Snuffer). CN-7 flips it after RV-G1.
 */
export const RIVALS_LIVE: Readonly<Record<RivalId, boolean>> = { lamplighter: false };
/** CN P6: the foe a rival's token spawns as while that rival is not live. */
export const RIVAL_STAND_INS: Readonly<Record<RivalId, EnemyId>> = { lamplighter: 'snuffer' };

/**
 * CN P7 (DK R3, BR): the wardens' pass as the bridges' key gate: offered after room 4 (0-based 3)
 * of a canal trip, guaranteed while the bridges are heard and not open, one per trip, lost on a
 * wipe. BR sets `BRIDGES_KIT.gate` to this; `table`/`weight` keep `keyOffer` typed until DK-7
 * reads `afterRoom` (weight 0: never drawn by the weighted pool).
 */
export const WARDENS_PASS: Extract<KitGate, { kind: 'key' }> = {
  kind: 'key',
  from: 'canals',
  table: 'canalDeep',
  weight: 0,
  afterRoom: 3,
  guaranteed: true,
};

/**
 * CN P9: the five lamp-ledger leaves, in the Lamplighters' hand. Texts come from CN-F2 after
 * CN-G1; CN-9 adds them to `CANALS_KIT.papers` and delivers the first unread leaf at each landing
 * reached (after rooms 1, 3, 5), so `found` names the landing a fresh profile meets each at.
 */
const leaf = (n: number, title: string, after: number): PaperDef => ({
  id: `canals:ledger-${n}`,
  district: 'canals',
  title,
  hand: 'The Lamplighters',
  text: '',
  group: 'Lamp-ledgers',
  found: { kind: 'landing', after },
});
export const CANAL_LEDGERS: readonly PaperDef[] = [
  leaf(1, 'The route', 0),
  leaf(2, 'Lamp counts', 2),
  leaf(3, 'A lamp found dark', 4),
  leaf(4, 'Never the Seam', 0),
  leaf(5, 'A page that ends', 2),
];
