import type { AttackDef, EnemyDef, LootEntry, LootTableDef, RuneId, SolventId } from '../types';
import {
  BATH_FOE_TOKENS,
  BATH_TABLE_IDS,
  BATH_TOKENS,
  type BathTableId,
  type HeatLevel,
} from './bathhouses/types';
import type { DistrictData } from './index';

/**
 * The bathhouses (district-bathhouses.md; bathhouses-plan). BH-0: still drawing and roomless, with
 * free return (P5), the steam lean and the foes' tokens. Hearing (DK-8): one Storm reaching three
 * units in the Seam; the rumour of four trips stays. BH-2: the heat per room and the offer tables.
 */
export const BATHHOUSES_KIT: DistrictData = {
  id: 'bathhouses',
  name: 'The bathhouses',
  guild: 'The bath-keepers',
  edge: 'wall',
  rooms: [],
  ret: { kind: 'any' },
  tokens: BATH_TOKENS,
  tables: BATH_TABLE_IDS,
  gate: { kind: 'drawing' },
  line: 'one fog over the whole house',
  barred: 'The page is still being drawn.',
  lean: { lean: 'steam', text: 'Steam' },
  map: { x: 75, y: 70, label: 'above' },
  hear: [
    {
      kind: 'burstUnits',
      burst: 'storm',
      atLeast: 3,
      district: 'seam',
      voice: 'owner',
      text: 'Steam remembers who stood in it. The owner inks in the thermae.',
    },
    { kind: 'trips', atLeast: 4, voice: 'rumour' },
  ],
};

// ── Heat per room (P5) ──────────────────────────────────
/** P5: rooms 1–4 run at base heat 1–4; the heart (the last room) always at 4. */
export const HEAT_BY_ROOM: readonly HeatLevel[] = [1, 2, 3, 4];
export const HEART_HEAT: HeatLevel = 4;
/** Design "Offers by heat": a second pick from heat 4 (room 4 and the heart). */
export const PICKS_BY_HEAT: Readonly<Record<HeatLevel, number>> = { 1: 1, 2: 1, 3: 1, 4: 2 };

// ── Offer tables by heat (P6; design "Offers by heat") ──
const rune = (r: RuneId, weight: number): LootEntry => ({
  spec: { kind: 'rune', rune: r },
  weight,
});
const solvent = (s: SolventId, weight: number): LootEntry => ({
  spec: { kind: 'solvent', solvent: s },
  weight,
});
const ink = (weight: number): LootEntry => ({ spec: { kind: 'ink' }, weight });
const vellum = (weight: number): LootEntry => ({ spec: { kind: 'vellum', amount: 1 }, weight });
const doorway = (weight: number): LootEntry => ({ spec: { kind: 'doorway' }, weight });

/**
 * Richer as the heat climbs: the school's runes (Vat, Seep, Steep) from heat 1, its solvents
 * (Bath salt, Fog jar) only from heat 3, vellum from heat 2, the quiet doorway once at heat 3
 * (like every district's deep table; never at the heart), ink thinning as the rest fills in.
 * Only the district's own pages; the Seam's basics stay the Seam's. Weights are *tune by playing*.
 */
export const BATH_LOOT_TABLES: Readonly<Record<BathTableId, LootTableDef>> = {
  'bathhouses:h1': {
    id: 'bathhouses:h1',
    entries: [rune('vat', 3), rune('seep', 3), rune('steep', 2), ink(3)],
  },
  'bathhouses:h2': {
    id: 'bathhouses:h2',
    entries: [rune('vat', 2), rune('seep', 2), rune('steep', 3), ink(3), vellum(1)],
  },
  'bathhouses:h3': {
    id: 'bathhouses:h3',
    entries: [
      solvent('bathSalt', 3),
      solvent('fogJar', 3),
      rune('steep', 2),
      rune('vat', 1),
      rune('seep', 1),
      ink(2),
      vellum(1),
      doorway(1),
    ],
  },
  'bathhouses:h4': {
    id: 'bathhouses:h4',
    entries: [
      solvent('bathSalt', 3),
      solvent('fogJar', 3),
      rune('steep', 2),
      rune('vat', 1),
      rune('seep', 1),
      ink(2),
      vellum(2),
    ],
  },
};

/** The school's rune pages: rooms 1–2 guarantee one while the household has none (BH-2). */
export const AREAS_RUNES: readonly RuneId[] = ['vat', 'seep', 'steep'];
/** The rooms (0-based) whose offers carry the Areas guarantee. */
export const AREAS_GUARANTEE_ROOMS: readonly number[] = [0, 1];

/** The table a room of this heat offers from. */
export const tableForHeat = (h: HeatLevel): BathTableId => `bathhouses:h${h}`;

/** The cold plunge (P5, P6): a fixed extra card, not rolled from a table. */
export const PLUNGE_KIND = 'bathhouses:plunge' as const;
/** The rooms (0-based) after which it is offered: rooms 1–3; never after room 4, never at the heart. */
export const PLUNGE_ROOMS: readonly number[] = [0, 1, 2];
/** Its card copy: the cost is the pick it uses, the gain is one heat off the next room. */
export const PLUNGE_CARD = {
  title: 'Cold plunge',
  blurb: 'Costs a pick. The next hall runs one heat cooler (never below 1); its loot is unchanged.',
} as const;

// ── The steam's people: the attendant and the boilerman (P7, P9; BH-5) ──
/**
 * The attendant's shove (P9): no damage of its own, a 2-tile push the attendant aims; the harm is
 * the crush (1 + 1 per tile moved, 1 to what it hits), as for a player's Shove.
 */
export const BATH_SHOVE: AttackDef = {
  id: 'shove',
  name: 'Shove',
  verb: 'shove',
  verbs: 'shoves',
  kind: 'adjacent',
  range: 1,
  damage: 0,
  inks: false,
  push: 2,
};

/** Numbers the foes' behaviours read (*tune by playing*). The feeder's pips are `FEEDER_PIPS`. */
export const BATH_FOE_TUNING = {
  /** The boilerman's bite when an apprentice stands beside him. */
  boilermanBite: 1,
} as const;

const BATH_PLAIN = {
  brass: false,
  oilTrail: false,
  habitat: 'any',
  flies: false,
  anchored: false,
  snuffs: false,
  bursts: false,
  boss: false,
} as const;

/**
 * Sized against the canals' foes (eel 3 HP, snuffer 4 HP elite): the attendant is the snuffer's
 * weight with twice its pace; the boilerman a rat's bite on a body one tougher, a minion so the
 * priority target dies to a drop.
 */
export const ATTENDANT: EnemyDef = {
  id: 'attendant',
  name: 'attendant',
  token: BATH_FOE_TOKENS.attendant,
  hp: 4,
  move: 2,
  attack: 'shove',
  ai: 'idle',
  behaviour: 'bathhouses:attendant',
  elite: true,
  blurb:
    'An attendant in white. Shoves one of you two tiles toward the nearest wall, edge or body, and the crush does the rest.',
  ...BATH_PLAIN,
};

export const BOILERMAN: EnemyDef = {
  id: 'boilerman',
  name: 'boilerman',
  token: BATH_FOE_TOKENS.boilerman,
  hp: 3,
  move: 2,
  attack: 'bite',
  ai: 'idle',
  behaviour: 'bathhouses:boilerman',
  elite: false,
  blurb:
    'Stokes the house. Beside a vent he feeds the gauge 2 pips a round; kill him first or it boils.',
  traits: ['feeds'],
  ...BATH_PLAIN,
};

// ── The dissolved bather (P8; BH-4) ─────────────────────
/**
 * Dissolved while its tile is a cloud tile: single hits, pushes, holds and swaps pass through it,
 * area bursts do not. It drifts through connected cloud for free and bites only from an open tile
 * at an apprentice on one. A rat's bite and body, sized under the snuffer.
 */
export const DISSOLVED_BATHER: EnemyDef = {
  id: 'dissolvedBather',
  name: 'bather',
  token: BATH_FOE_TOKENS.dissolvedBather,
  hp: 3,
  move: 2,
  attack: 'bite',
  ai: 'idle',
  behaviour: 'bathhouses:bather',
  elite: false,
  blurb:
    'A bather who stayed too long. In a cloud it is steam: only a burst of the cloud hurts it. It must step out to bite, and is solid there.',
  traits: ['dissolves'],
  ...BATH_PLAIN,
};

/** The bather's bite (*tune by playing*). */
export const BATHER_BITE = 1;

/**
 * The hits that reach a dissolved bather (P8): bursts of the cloud and around it. Anything else
 * (a Bolt, a Spark's arc, a crush, Conduct, a bite) passes through.
 */
export const BATHER_AREA_SOURCES: readonly string[] = [
  'Storm',
  'Brand storm',
  'Thunderhead',
  'Flashover',
  'Kettle',
  'Boil-over',
];

/** The district's foes for `ENEMIES` (BH-8 adds the Steward). */
export const BATH_ENEMIES = {
  attendant: ATTENDANT,
  boilerman: BOILERMAN,
  dissolvedBather: DISSOLVED_BATHER,
} as const;
