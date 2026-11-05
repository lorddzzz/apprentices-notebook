import type { LootEntry, LootTableDef, RuneId, SolventId } from '../types';
import { BATH_TABLE_IDS, BATH_TOKENS, type BathTableId, type HeatLevel } from './bathhouses/types';
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
