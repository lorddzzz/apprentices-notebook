import { BRIDGE_TUNING } from '$data/districts/bridges/types';
import type {
  DistrictEvent,
  Json,
  PieceDef,
  PieceId,
  PieceTriggers,
  RuleId,
  TripShapeId,
} from '../types';
import { wearStruck } from './wear';

/**
 * The bridges' engine contracts (BR-0; bridges-plan §2, §4): the three pieces, the collapse rule's
 * state and its reader, the events, and the trip state's reader. Plain JSON throughout (saved and
 * cloned as is). The pieces have no triggers and the rule's step is a no-op until BR-1..BR-3.
 *
 * Invariant (P2): the cracked set is DERIVED from the board (`cracksOf`, BR-1) whenever asked,
 * never stored; nothing here has a `cracked` field and `parseBridges` drops one if a save has it.
 */

// ── Pieces (P2) ─────────────────────────────────────────
export const SPAN_PIECE: PieceId = 'bridges:span';
export const PIER_PIECE: PieceId = 'bridges:pier';
export const KEYSTONE_PIECE: PieceId = 'bridges:keystone';
/** The collapse rule (P4): slot `late`, brought by any of the three pieces. */
export const COLLAPSE_RULE_ID: RuleId = 'bridges:collapse';

/** `{span:1}` reads as one stone at room start; `{span}` is the sound default. */
export type SpanData = { stone: number };
/** The keystone's HP at room start (`{keystone:3}`); the wear itself lives in the rule state. */
export type KeystoneData = { hp: number };

// ── The collapse rule's state (P3, P4, P5, P6, P7) ──────
/** A tile key, `"x,y"`. Plain strings so the state is JSON (no Coord keys). */
export type TileKey = `${number},${number}`;
export const tileKey = (x: number, y: number): TileKey => `${x},${y}`;

/** Who cut a tile: the credit the Long Drop reads (P6). `by` is a unit id, `null` for the room. */
export type CutOrigin = { by: string | null; cause: 'crush' | 'burst' | 'shatter' };

/**
 * `BattleState.rules['bridges:collapse']`.
 * - `stone`: stone left on each span tile and keystone HP, by key; set at room start from the
 *   pieces' data. A tile at 0 is broken (P3). Piers never appear.
 * - `originals`: every tile that was span at room start (the Mason mends only these, P8).
 * - `cuts`: broken tile → the origin of the cut, kept until the tile falls (P6).
 */
export type BridgesState = {
  stone: { [key: string]: number };
  originals: string[];
  cuts: { [key: string]: CutOrigin };
};

export const initBridges = (): BridgesState => ({ stone: {}, originals: [], cuts: {} });

const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const KEY = /^-?\d+,-?\d+$/;
const CAUSES: readonly string[] = ['crush', 'burst', 'shatter'];

/**
 * The forgiving reader (kit convention): malformed entries are dropped, a negative or fractional
 * stone reads as 0 (broken), anything else (incl. a stored `cracked` set) is ignored.
 */
export function parseBridges(raw: unknown): BridgesState {
  const r = rec(raw);
  if (!r) return initBridges();
  const stone: BridgesState['stone'] = {};
  for (const [k, v] of Object.entries(rec(r.stone) ?? {})) {
    if (KEY.test(k) && typeof v === 'number' && Number.isFinite(v)) {
      stone[k] = Math.max(0, Math.floor(v));
    }
  }
  const originals = Array.isArray(r.originals)
    ? [...new Set(r.originals.filter((k): k is string => typeof k === 'string' && KEY.test(k)))]
    : [];
  const cuts: BridgesState['cuts'] = {};
  for (const [k, v] of Object.entries(rec(r.cuts) ?? {})) {
    const c = rec(v);
    if (!KEY.test(k) || !c) continue;
    if (typeof c.cause !== 'string' || !CAUSES.includes(c.cause)) continue;
    if (c.by !== null && typeof c.by !== 'string') continue;
    cuts[k] = { by: c.by, cause: c.cause as CutOrigin['cause'] };
  }
  return { stone, originals, cuts };
}

// ── Events (P3, P4, P5, P7) ─────────────────────────────
type Ev<T extends string, D extends { readonly [k: string]: Json }> = DistrictEvent & {
  type: `bridges:${T}`;
  data: D;
};
type At = { x: number; y: number };
/** A span tile or the keystone lost stone: `from` → `to` (0 = broken). `at` is the tile. */
export type StoneWornEvent = Ev<
  'stoneWorn',
  { from: number; to: number; cause: CutOrigin['cause']; by: string | null }
>;
/** Sections cut off from every pier: drawn cracked at once (P4). */
export type CrackedEvent = Ev<'cracked', { tiles: At[] }>;
/** Dusk: these cracked tiles fall with whatever stands on them; `epilogue` = after the win (P7). */
export type CollapseEvent = Ev<'collapse', { tiles: At[]; units: string[]; epilogue: boolean }>;
/** The keystone shattered: the tile is fog and the chief's right of way is gone (P7). */
export type KeystoneBreaksEvent = Ev<'keystoneBreaks', { by: string | null }>;

/** The Mason rebuilt a fallen original span tile; `rescued` cracked tiles are standing again (P8). */
export type MendedEvent = Ev<'mended', { stone: number; rescued: number }>;
/** The Mason laid a pier on a span tile; `rescued` cracked tiles are held up by it (P8). */
export type PierLaidEvent = Ev<'pierLaid', { rescued: number }>;

export type BridgeEvent =
  | StoneWornEvent
  | CrackedEvent
  | CollapseEvent
  | KeystoneBreaksEvent
  | MendedEvent
  | PierLaidEvent;
export type BridgeEventType = BridgeEvent['type'];
export const BRIDGE_EVENT_TYPES = [
  'bridges:stoneWorn',
  'bridges:cracked',
  'bridges:collapse',
  'bridges:keystoneBreaks',
  'bridges:mended',
  'bridges:pierLaid',
] as const satisfies readonly BridgeEventType[];

// ── Trip state (P1, P11) ────────────────────────────────
/**
 * `Trip.kit.state`: the bridges keep nothing of their own; the span picked after each room is the
 * kit's own choice record (`kit.choices`), which the trip hooks read.
 */
export type BridgeTripState = Record<string, never>;
export const BRIDGE_SHAPE: TripShapeId = 'bridges:span';
export const initBridgeState = (): BridgeTripState => ({});
/** Anything reads as the empty state. */
export const parseBridgeState = (_raw: unknown): BridgeTripState => ({});

/** BR-2: crushes and non-fire bursts wear span stone and the keystone (`wear.ts`). */
const WEARS: PieceTriggers = { onStruck: wearStruck };

/** The pieces' shared shape: walkable footing, no triggers until BR-1..BR-3. */
const footing = (id: PieceId, token: string, triggers: PieceTriggers = {}): PieceDef => ({
  id,
  token,
  solid: 'none',
  triggers,
  rules: [COLLAPSE_RULE_ID],
  art: id,
});

export const SPAN_DEF: PieceDef<SpanData> = {
  ...footing(SPAN_PIECE, 'span', WEARS),
  // BR-16 (P20): on the Bench once the household has met a span.
  palette: { label: 'Span', lab: true },
  bench: { met: 'span', label: 'Span' },
  data: {
    init: { stone: BRIDGE_TUNING.stone.sound },
    parse: (s) => (/^[1-9]$/.test(s) ? { stone: Number(s) } : null),
    write: (d) => String(d.stone),
  },
};
export const PIER_DEF: PieceDef = {
  ...footing(PIER_PIECE, 'pier'),
  palette: { label: 'Pier', lab: true },
  bench: { met: 'pier', label: 'Pier' },
};
export const KEYSTONE_DEF: PieceDef<KeystoneData> = {
  ...footing(KEYSTONE_PIECE, 'keystone', WEARS),
  data: {
    init: { hp: BRIDGE_TUNING.keystoneHp },
    parse: (s) => (/^[1-9]$/.test(s) ? { hp: Number(s) } : null),
    write: (d) => String(d.hp),
  },
};
export const BRIDGE_PIECES: readonly PieceDef[] = [
  SPAN_DEF,
  PIER_DEF,
  KEYSTONE_DEF,
] as readonly PieceDef[];
