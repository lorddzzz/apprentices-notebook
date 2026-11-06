import type { TokenEntry } from '../index';

/**
 * The bridges' data contracts (BR-0; bridges-plan §2, §4). Ids, board tokens, the staff's
 * placeholder stats and the tuning block. Every number is *tune by playing*; nothing reads them yet.
 */

/** An id this district owns. */
export type BridgeId = `bridges:${string}`;

// ── Foes (P8, P16) ──────────────────────────────────────
/**
 * The wardens' staff and the heart's stand-in, as they will join `EnemyId` (BR-4, BR-5, BR-9): plain
 * words like the other districts'. Not in `ENEMIES` yet, so no roster test or Lab list changes.
 */
export const BRIDGE_FOE_IDS = ['warden', 'gargoyle', 'mason', 'chiefWarden'] as const;
export type BridgeFoeId = (typeof BRIDGE_FOE_IDS)[number];

/**
 * Board tokens. The plan proposed `k y a K`, but `k` is the canals' barge and `a` the quarter's
 * letter; `j y J K` are free (checked against foes, roster, rivals, districts and board chars).
 */
export const BRIDGE_FOE_TOKENS: Readonly<Record<BridgeFoeId, string>> = {
  warden: 'j',
  gargoyle: 'y',
  mason: 'J',
  chiefWarden: 'K',
};

/** Piece names inside braces: `{span}`, `{span:1}`, `{pier}`, `{keystone}` (P2). */
export const BRIDGE_PIECE_TOKENS = ['span', 'pier', 'keystone'] as const;
export type BridgePieceToken = (typeof BRIDGE_PIECE_TOKENS)[number];

export const BRIDGE_TOKENS: readonly TokenEntry[] = [
  ...BRIDGE_FOE_IDS.map(
    (id): TokenEntry => ({
      token: BRIDGE_FOE_TOKENS[id],
      kind: 'foe',
      id,
      district: 'bridges',
    }),
  ),
  ...BRIDGE_PIECE_TOKENS.map(
    (id): TokenEntry => ({ token: id, kind: 'piece', id: `bridges:${id}`, district: 'bridges' }),
  ),
];

// ── Spans and tables (P1, P10, P11) ─────────────────────
/** The two spans offered after every room (P11); the recorded kind picks the variant pool. */
export const SPAN_KINDS = ['sound', 'crumbling'] as const;
export type SpanKind = (typeof SPAN_KINDS)[number];

/** Offer tables: one per span kind (P11), more per depth later. */
export const BRIDGE_TABLE_IDS = ['bridges:sound', 'bridges:crumbling'] as const;
export type BridgeTableId = (typeof BRIDGE_TABLE_IDS)[number];

// ── Tuning (P1, P3, P7, P8, P10; design §1) ─────────────
export interface BridgeFoeStats {
  hp: number;
  move: number;
  elite: boolean;
  flies: boolean;
}

export const BRIDGE_TUNING = {
  /** P1: rooms 1–4 plus the heart are five encounters; four span choices. */
  rooms: 4,
  choices: 4,
  /** P3: stone on each span tile, by span kind. */
  stone: { sound: 2, crumbling: 1 } as Readonly<Record<SpanKind, number>>,
  /** P3: a crush wears this much off the tile it rests on; a burst, off each tile it covers. */
  crushWear: 1,
  burstWear: 1,
  /** P7: the keystone's HP and the Chief Warden's own (the stand-in keeps the same body). */
  keystoneHp: 6,
  chiefHp: 10,
  /** P5: an elite that falls with its span takes this (the built drop's 4) and loses its action. */
  eliteFall: 4,
  /** P8: the Warden's chalk circle reach (straight line, tiles) and the Gargoyle's carry (steps). */
  chalkRange: 3,
  carrySteps: 2,
  /** P10: layouts per depth, by span kind, and the minimum `P` start points per board. */
  layouts: {
    room1: { sound: 3, crumbling: 0 },
    mid: { sound: 2, crumbling: 2 },
    heart: { sound: 1, crumbling: 1 },
  },
  minStarts: 4,
  /** P8: foes as placeholders sized with the canals' (eel 3 HP, snuffer 4 HP elite). */
  foes: {
    warden: { hp: 4, move: 2, elite: true, flies: false },
    gargoyle: { hp: 3, move: 3, elite: false, flies: true },
    mason: { hp: 3, move: 2, elite: false, flies: false },
    chiefWarden: { hp: 10, move: 0, elite: true, flies: false },
  } as Readonly<Record<BridgeFoeId, BridgeFoeStats>>,
} as const;
