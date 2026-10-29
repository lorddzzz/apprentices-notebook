import type { RivalId } from '../rivals/types';
import type { EncounterDef, EncounterVariant, EnemyDef, EnemyId } from '../types';
import type {
  BonusObjective,
  DistrictData,
  KitGate,
  KitRoomDef,
  PaperDef,
  ThresholdSpec,
} from './index';

/**
 * CN P6: which rivals play their room. While `lamplighter` is off, room 4's `L` reads as its
 * stand-in (today's Snuffer). CN-7 flips it after RV-G1.
 */
export const RIVALS_LIVE: Readonly<Record<RivalId, boolean>> = { lamplighter: false };
/** CN P6: the foe a rival's token spawns as while that rival is not live. */
export const RIVAL_STAND_INS: Readonly<Record<RivalId, EnemyId>> = { lamplighter: 'snuffer' };

const board = (rows: readonly string[]): string => rows.join('\n');

/** One room of a district from its variants; `layout` is the first variant's board. */
function room(
  id: string,
  title: string,
  depth: number,
  variants: readonly EncounterVariant[],
  loot: EncounterDef['loot'],
  heart = false,
  bonus?: BonusObjective,
): KitRoomDef {
  return {
    id,
    title,
    depth,
    layout: variants[0]?.layout ?? '',
    variants,
    loot,
    picks: heart ? 2 : 1,
    heart,
    ...(bonus ? { bonus } : {}),
  };
}

/**
 * The oil-lit canals (design §5.5): three named boards for each of rooms 1–4 and three heart
 * variants (same name), as in the Seam. Water grows with depth: one lane by a long quay, a wider
 * lane, two lanes with a bridge, two lanes and little quay (room 4 climbs), then a pool. Foes per
 * room stay the same across its variants. Rooms 1–2 loot `canalShallow`, 3–4 `canalDeep`, the
 * heart `canalHeart` (K-3, P35).
 */

/**
 * Room 1 (CN-3, P1/P2): 5 wide, 9 tall; a long quay with one lane. An eel on the water with two
 * start points beside it (turn 1 may show a lunge, HC P9) and two rats well away.
 */
const CANAL_1: readonly EncounterVariant[] = [
  {
    name: 'The towpath',
    layout: board([
      'r . wv . .',
      '. . wv . .',
      '. . wv o .',
      '. . wv . r',
      '. . wv . .',
      '. . wv . .',
      '. P ewv P .',
      '. . wv . .',
      'P . wv . P',
    ]),
  },
  {
    name: 'The coal wharf',
    layout: board([
      '. . . . r',
      '. r . . .',
      '. . o . .',
      '. . P . .',
      'w> w> ew> w> w>',
      '. . P . .',
      '. . . . .',
      'P . . . P',
      '. . o . .',
    ]),
  },
  {
    name: 'The lamplit quay',
    layout: board([
      'r . . wv .',
      '. . . wv .',
      '. o . wv .',
      '. . . wv r',
      '. . . wv .',
      '. . . wv .',
      '. . P ewv P',
      '. . . wv .',
      'P P . wv .',
    ]),
  },
];

/**
 * Room 2 (CN-3, P1/P2/P5): 6 wide, 9 tall; a two-wide lane, the barge's run. An eel, a rat, a
 * moth and the crate; the mooring sits on the crate's lane downstream, so the current alone brings
 * it in a couple of rounds after a typical win.
 */
const CANAL_2: readonly EncounterVariant[] = [
  {
    name: 'The drowned arcade',
    layout: board([
      'm . wv wv . .',
      '. . wv wv . r',
      '. . wv kwv . .',
      '. . wv wv . .',
      '. o ewv wv . .',
      '. . wv wv . .',
      '. . wv wv . .',
      '. . wv wv{moor} . .',
      'P P wv wv P P',
    ]),
  },
  {
    name: 'The eel steps',
    layout: board([
      '. . . . . m',
      'r . . . . .',
      '. . w^{moor} w^ . .',
      '. . w^ w^ . .',
      '. . w^ ew^ . .',
      '. . w^ w^ . .',
      '. . kw^ w^ . o',
      '. . w^ w^ . .',
      'P P w^ w^ P P',
    ]),
  },
  {
    name: 'The lock cottage',
    layout: board([
      '. . . . . .',
      'm . . . . r',
      '. . . . . .',
      'w<{moor} w< w< w< w< kw<',
      'w< w< ew< w< w< w<',
      '. . . o . .',
      '. . . . . .',
      '. P . . P .',
      '. . P P . .',
    ]),
  },
];

/**
 * Room 3 (CN-4, P1/P2): 7×7, five start points. Two lanes cross; an eel on the water, a Snuffer,
 * a moth and a rat on the banks. No start point beside a foe.
 */
const CANAL_3: readonly EncounterVariant[] = [
  {
    name: 'The sluice',
    layout: board([
      '. . . wv . n .',
      '. P . wv . . .',
      'w> w> w> wv w< w< w<',
      '. . . ewv . . .',
      '. r . wv . m .',
      'P . P wv . . P',
      '. . . wv . P .',
    ]),
  },
  {
    name: 'The crossing',
    layout: board([
      'n . wv . . . .',
      '. . wv . . m .',
      '. . wv . . . .',
      'w< w< w< w< ew< w< w<',
      '. P . . . P .',
      '. . . r . . .',
      'P . P . . P .',
    ]),
  },
  {
    name: "The tanners' cut",
    layout: board([
      '. wv . . . n .',
      '. wv . . . . m',
      '. wv . . . . .',
      '. wv . P . . .',
      'w> w> w> w> ew> w> w>',
      '. P . r . . P',
      'P . . . . P .',
    ]),
  },
];

/**
 * The Lamplighter's slot (CN P6): room 4 layouts carry `L`; while `RIVALS_LIVE.lamplighter` is
 * off the data reads it as its stand-in, today's Snuffer token (`n`, `RIVAL_STAND_INS`).
 */
export const layRival = (layout: string, live: boolean): string =>
  layout.replace(/L/g, live ? 'L' : 'n');

/**
 * Room 4 (CN-4, P1/P2/P5/P6): 6×9, five start points. Two lanes, little quay, the water climbs
 * up the screen. The Lamplighter (the Snuffer for now), an eel, one moth, a rat and the crate;
 * the mooring sits upstream of the crate. The eel never starts beside a start point.
 */
const CANAL_4: readonly EncounterVariant[] = [
  {
    name: 'The uphill reach',
    layout: board([
      '. w^ L . w^ .',
      '. w^ . . w^ m',
      '. w^ . . w^{moor} .',
      'P w^ . . w^ .',
      '. ew^ . . w^ P',
      '. w^ r . w^ .',
      '. w^ . . kw^ .',
      'P w^ . P w^ P',
      '. w^ . . w^ .',
    ]),
  },
  {
    name: 'The lamp market',
    layout: board([
      '. . . . w^ .',
      '. . . L w^ m',
      'P . . . ew^ .',
      '. . r . w^ .',
      '. . . . w^{moor} P',
      '. . . . w^ .',
      '. . . . w^ .',
      'w> kw> w> w> w^ .',
      'P . . P . P',
    ]),
  },
  {
    name: 'The siphon',
    layout: board([
      '. . w^ . L .',
      '. m w^ . . .',
      '. . ew^ . . .',
      'P . w^ . . r',
      '. . w^{moor} . . .',
      '. . w^ . P .',
      '. . w^ w< w< kw<',
      'P . w^ . P .',
      '. . w^ . . P',
    ]),
  },
].map((v) => ({ ...v, layout: layRival(v.layout, RIVALS_LIVE.lamplighter) }));

/**
 * The heart (CN-5, P1/P2): 7 wide, 8 tall, five start points, five or six lamps on the rim. The
 * lamp-mother on the water, a Snuffer and a moth. Three pools: a ring clockwise, a ring against
 * the clock, and a lane down the middle. At least two lamps are far from every start point and
 * foe, so her every-round call has somewhere to land.
 */
const CANAL_HEART: readonly EncounterVariant[] = [
  {
    name: "The lamp-mother's pool",
    layout: board([
      'l . . l . . l',
      '. w> w> w> w> wv .',
      '. w^ . m . Mwv .',
      'P w^ . . . wv .',
      '. w^ . . . wv P',
      'P w^ w< w< w< w< .',
      '. . . n . . .',
      'l P . . . P l',
    ]),
  },
  {
    name: "The lamp-mother's pool",
    layout: board([
      'l . . l . . l',
      '. wv w< w< w< w< .',
      '. Mwv . m . w^ .',
      '. wv . . . w^ P',
      'P wv . . . w^ .',
      '. w> w> w> w> w^ P',
      '. . . n . . .',
      'l P . . . P l',
    ]),
  },
  {
    name: "The lamp-mother's pool",
    layout: board([
      'l . . l . . l',
      '. w> w> wv w< w< .',
      '. . m wv . . .',
      'P . . Mwv . n .',
      '. . . wv . . P',
      '. . . wv . . .',
      '. P . wv . P .',
      'l . P wv . . l',
    ]),
  },
];

/**
 * CN P5 (DK-5b): the barge rooms' bonus, one more pick from the same offers when the crate is
 * moored. CN-3/CN-4 put it on rooms 2 and 4; the crate is the room's first barge.
 */
export const MOORING_BONUS: BonusObjective = {
  goal: { happens: 'moored', unit: 'barge-1' },
  text: 'Moor the crate before the room is won.',
  reward: { kind: 'pick' },
};

export const CANAL_ROOMS: readonly KitRoomDef[] = [
  room('canal-towpath', 'The towpath', 1, CANAL_1, 'canalShallow'),
  room('canal-arcade', 'The drowned arcade', 2, CANAL_2, 'canalShallow', false, MOORING_BONUS),
  room('canal-sluice', 'The sluice', 3, CANAL_3, 'canalDeep'),
  room('canal-reach', 'The uphill reach', 4, CANAL_4, 'canalDeep', false, MOORING_BONUS),
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
