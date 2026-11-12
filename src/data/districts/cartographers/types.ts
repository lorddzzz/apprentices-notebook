import type { TokenEntry } from '../index';

/**
 * The Cartographers' hall's data contracts (CG-W0; cartographers-plan §2, §4). Ids, board tokens,
 * the loot tables' ids and the room pencil config's shape. Nothing reads them yet: the district
 * stays `gate: 'drawing'` with no rooms. Every number is *tune by playing*.
 */

// ── Ids ─────────────────────────────────────────────────
/** The guild's hands (P7–P9): plain words like the other districts' foes. Not in `ENEMIES` yet (CG-5, CG-6). */
export const CARTOGRAPHERS_FOE_IDS = ['surveyor', 'eraser', 'tracer'] as const;
export type CartographersFoeId = (typeof CARTOGRAPHERS_FOE_IDS)[number];

/**
 * Board tokens: `A F I` are free (checked against foes, roster, rivals, districts and board chars).
 * The Registrar's token belongs to his `RivalDef` (CG-7), claimed in `RIVAL_TOKENS`.
 */
export const CARTOGRAPHERS_FOE_TOKENS: Readonly<Record<CartographersFoeId, string>> = {
  surveyor: 'A',
  eraser: 'F',
  tracer: 'I',
};

/** Piece names inside braces: `{pencil}`, `{pencil:rub@2}`, `{blank}`, `{outline:<foe>}` (P1, P6). */
export const CARTOGRAPHERS_PIECE_TOKENS = ['pencil', 'blank', 'outline'] as const;
export type CartographersPieceToken = (typeof CARTOGRAPHERS_PIECE_TOKENS)[number];

export const CARTOGRAPHERS_TOKENS: readonly TokenEntry[] = [
  ...CARTOGRAPHERS_FOE_IDS.map(
    (id): TokenEntry => ({
      token: CARTOGRAPHERS_FOE_TOKENS[id],
      kind: 'foe',
      id,
      district: 'cartographers',
    }),
  ),
  ...CARTOGRAPHERS_PIECE_TOKENS.map(
    (id): TokenEntry => ({
      token: id,
      kind: 'piece',
      id: `cartographers:${id}`,
      district: 'cartographers',
    }),
  ),
];

/**
 * Loot tables (P13, P14), one per encounter: rooms 1–3 carry the Board treasures through
 * `offersFor`, rooms 4–5 and the heart ordinary deep loot (CG-8 writes them; the ids are DK P2's
 * namespaced ones, outside the closed core union).
 */
export const CARTOGRAPHERS_TABLE_IDS = [
  'cartographers:room1',
  'cartographers:room2',
  'cartographers:room3',
  'cartographers:room4',
  'cartographers:room5',
  'cartographers:heart',
] as const;
export type CartographersTableId = (typeof CARTOGRAPHERS_TABLE_IDS)[number];

// ── The hearing (P17; CG-14 swaps the `except` filter for DK-8's set) ──
/**
 * The five rivals whose recovered pages open the hall: the Lamplighter and the four masters. The
 * Registrar's own page never counts toward it.
 */
export const HEARING_RIVALS = [
  'lamplighter',
  'postmaster',
  'bathSteward',
  'chiefWarden',
  'carillonneur',
] as const;

// ── The room pencil config (P4) ─────────────────────────
/**
 * One room's pencil, as data (CG-9, CG-10 fill it per room): `share` the fraction of the room's
 * tiles pencilled at the start, `perRound` the fraction of the remaining pencil the hand resolves
 * each round end, `inkBias` the chance a resolved tile is inked (the rest are rubbed out), and
 * `redraw` how many new pencil tiles the hand adds beside inked paper each round (rooms 4–6).
 * The strand guard (never rub out a tile that leaves a member without a standable neighbour) is
 * a rule, not a field.
 */
export type PencilConfig = {
  share: number;
  perRound: number;
  inkBias: number;
  redraw: number;
};

/** P4's defaults: about a third pencilled, about a third resolved each round, half inked, no redraw. */
export const DEFAULT_PENCIL: PencilConfig = {
  share: 1 / 3,
  perRound: 1 / 3,
  inkBias: 0.5,
  redraw: 0,
};
