import type { KitRoomDef, TokenEntry } from '../index';

/**
 * The bathhouses' data contracts (BH-0; bathhouses-plan §2, §4). Types, ids and the heat table:
 * the tasks named on each block fill them in. Every number is *tune by playing*.
 */

// ── Ids ─────────────────────────────────────────────────
/** An id this district owns. */
export type BathId = `bathhouses:${string}`;

/**
 * The steam's people and the heart (P7–P10), as they will join `EnemyId` (BH-4, BH-5, BH-6):
 * plain words like the canals' and the quarter's foes. Not in `ENEMIES` yet.
 */
export const BATH_FOE_IDS = ['dissolvedBather', 'attendant', 'boilerman', 'bathSteward'] as const;
export type BathFoeId = (typeof BATH_FOE_IDS)[number];

/**
 * Board tokens (§4 Requests, orchestrator). The plan proposed `h a k H`, but `h` is board notation,
 * `a` the quarter's letter and `k` the canals' barge; these are free letters.
 */
export const BATH_FOE_TOKENS: Readonly<Record<BathFoeId, string>> = {
  dissolvedBather: 's',
  attendant: 't',
  boilerman: 'c',
  bathSteward: 'H',
};
export const BATH_TOKENS: readonly TokenEntry[] = BATH_FOE_IDS.map((id) => ({
  token: BATH_FOE_TOKENS[id],
  kind: 'foe',
  id,
  district: 'bathhouses',
}));

/** Offer tables by heat (P6; BH-2 fills them). */
export const BATH_TABLE_IDS = [
  'bathhouses:h1',
  'bathhouses:h2',
  'bathhouses:h3',
  'bathhouses:h4',
] as const;
export type BathTableId = (typeof BATH_TABLE_IDS)[number];

// ── Heat (P1, P5) ───────────────────────────────────────
export type HeatLevel = 1 | 2 | 3 | 4;
/**
 * One heat's weights for the boil-over gauge, in quarter-pips (pressure is stored in quarters, the
 * HUD shows whole pips): each cloud tile adds `tileQuarters`, each vent `ventQuarters`.
 */
export interface HeatRow {
  tileQuarters: number;
  ventQuarters: number;
}
/** P1 starting values: tiles 0.5/0.75/1/1.25 pips, vents 1/2/2/3 pips. */
export const HEAT: Readonly<Record<HeatLevel, HeatRow>> = {
  1: { tileQuarters: 2, ventQuarters: 4 },
  2: { tileQuarters: 3, ventQuarters: 8 },
  3: { tileQuarters: 4, ventQuarters: 8 },
  4: { tileQuarters: 5, ventQuarters: 12 },
};
/** P1: the gauge holds 12 whole pips. */
export const BOIL_CAPACITY_PIPS = 12;
/** P7: a boilerman beside a vent adds this many whole pips a round. */
export const FEEDER_PIPS = 2;

/** A room of the thermae: rooms 1–4 base heat 1–4, the heart 4 (P5; BH-7, BH-8). */
export type BathRoomDef = KitRoomDef & { heatBase: HeatLevel };
