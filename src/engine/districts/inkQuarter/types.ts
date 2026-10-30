import type { TermId } from '$data/districts/inkQuarter/types';
import type { UnitRef } from '../../events';
import type { Coord } from '../../grid';
import type { DistrictEvent, Json, PieceDef, PieceId, TripShapeId } from '../types';

/**
 * The ink-makers' quarter's engine contracts (IQ-W0; ink-quarter-plan §2, §4): trip state and its
 * reader, the writ pieces' base defs (no triggers yet: IQ-1, IQ-2, IQ-6 add them), and the events.
 * Plain JSON throughout (saved and cloned as is).
 */

// ── Terms in the trip (P5; IQ-3) ────────────────────────
export type TermStatus = 'open' | 'paid' | 'broken';
/** A signed term. `def` names its `TermDef`; `signedAt` is the 0-based room whose loot signed it. */
export type Term = { id: string; def: TermId; signedAt: number; status: TermStatus };
/** `Trip.kit.state` for this district: every term signed this trip, in signing order. */
export type InkTripState = { terms: Term[] };

export const INK_SHAPE: TripShapeId = 'inkQuarter:terms';
export const initInkState = (): InkTripState => ({ terms: [] });

const STATUSES: readonly string[] = ['open', 'paid', 'broken'];
const rec = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** One term, or null when any field is malformed. */
export function parseTerm(raw: unknown): Term | null {
  const r = rec(raw);
  if (!r) return null;
  const { id, def, signedAt, status } = r;
  if (typeof id !== 'string' || id === '') return null;
  if (typeof def !== 'string' || !def.startsWith('inkQuarter:') || def.length <= 11) return null;
  if (typeof signedAt !== 'number' || !Number.isInteger(signedAt) || signedAt < 0) return null;
  if (typeof status !== 'string' || !STATUSES.includes(status)) return null;
  return { id, def: def as TermId, signedAt, status: status as TermStatus };
}

/**
 * The forgiving reader (kit convention): anything not an object reads as no terms; a malformed
 * term, a repeated id, or a second open term is dropped. So at most one term is open (P5).
 */
export function parseInkState(raw: unknown): InkTripState {
  const list = rec(raw)?.terms;
  if (!Array.isArray(list)) return initInkState();
  const terms: Term[] = [];
  for (const item of list) {
    const t = parseTerm(item);
    if (!t || terms.some((u) => u.id === t.id)) continue;
    if (t.status === 'open' && terms.some((u) => u.status === 'open')) continue;
    terms.push(t);
  }
  return { terms };
}

/** The open term, if any (P5: at most one). */
export const openTerm = (s: InkTripState): Term | null =>
  s.terms.find((t) => t.status === 'open') ?? null;

// ── Pieces (P1; IQ-1, IQ-2, IQ-5b, IQ-6) ────────────────
export const RETURN_PIECE: PieceId = 'inkQuarter:return';
export const ORDER_PIECE: PieceId = 'inkQuarter:order';
export const FORWARD_PIECE: PieceId = 'inkQuarter:forward';
export const ADDRESS_PIECE: PieceId = 'inkQuarter:address';
/** The Sealer's wax seal (P8): holds whoever stands on it, melts in fire. */
export const WAX_PIECE: PieceId = 'inkQuarter:wax';
/** The postmaster's stamp (P9): answers the clock writ when an apprentice lands on it. */
export const CLOCK_STAMP_PIECE: PieceId = 'inkQuarter:clockStamp';

/** A forwarding stamp and its address share one letter: `{forward:a}` sends to `{address:a}`. */
export type PairData = { pair: string };
/** Rounds the wax seal has left, and the Sealer that placed it ('' = none: a stake's or the clock's). */
export type WaxData = { rounds: number; by: string };

const PAIR = /^[a-z]$/;
const pairData = {
  init: { pair: 'a' },
  parse: (s: string): PairData | null => (PAIR.test(s) ? { pair: s } : null),
  write: (d: PairData) => d.pair,
};

/** Writs are walkable, never block shots, read fliers too; only anchored units are exempt (P1). */
const writ = (id: PieceId, token: string, label: string): PieceDef => ({
  id,
  token,
  solid: 'none',
  exempt: ['anchored'],
  triggers: {},
  palette: { label, lab: true },
  bench: { met: token, label },
  art: id,
});

export const RETURN_DEF: PieceDef = writ(RETURN_PIECE, 'return', 'Return to sender');
export const ORDER_DEF: PieceDef = writ(ORDER_PIECE, 'order', 'Standing order');
export const FORWARD_DEF: PieceDef<PairData> = {
  ...writ(FORWARD_PIECE, 'forward', 'Forwarding'),
  data: pairData,
};
export const ADDRESS_DEF: PieceDef<PairData> = {
  ...writ(ADDRESS_PIECE, 'address', 'Address'),
  data: pairData,
};
export const WAX_DEF: PieceDef<WaxData> = {
  id: WAX_PIECE,
  token: 'wax',
  solid: 'none',
  data: {
    init: { rounds: 2, by: '' },
    parse: (s) => {
      const m = /^([1-9])(?::([a-z][a-z0-9-]*))?$/.exec(s);
      return m ? { rounds: Number(m[1]), by: m[2] ?? '' } : null;
    },
    write: (d) => (d.by ? `${d.rounds}:${d.by}` : String(d.rounds)),
  },
  triggers: {},
  palette: { label: 'Wax seal', lab: true },
  bench: { met: 'wax', label: 'Wax seal' },
  art: WAX_PIECE,
};
export const CLOCK_STAMP_DEF: PieceDef = writ(CLOCK_STAMP_PIECE, 'stamp', "Postmaster's stamp");

/** Base defs, registered now so boards parse; each owner task swaps in its def with triggers. */
export const INK_BASE_PIECES = [
  RETURN_DEF,
  ORDER_DEF,
  FORWARD_DEF,
  ADDRESS_DEF,
  WAX_DEF,
  CLOCK_STAMP_DEF,
] as readonly PieceDef[];

// ── Events (P2, P3, P4, P5, P8, P9) ─────────────────────
type Ev<T extends string, D extends { readonly [k: string]: Json }> = DistrictEvent & {
  type: `inkQuarter:${T}`;
  data: D;
};
type At = { x: number; y: number };
/** A writ's tile and the unit it acted on (`unit`); `at` on the event is where it acted. */
export type SentBackEvent = Ev<'sentBack', { from: At; to: At; cause: string }> & {
  unit: UnitRef;
  at: Coord;
};
/** The hit (or mark) aimed at `unit` on the stamp went to `to` instead (P3). */
export type ForwardedEvent = Ev<
  'forwarded',
  { to: string; stamp: At; harm: 'hit' | 'mark'; amount: number }
> & { unit: UnitRef };
/** A standing order marked `unit` at round end (P4). */
export type OrderedEvent = Ev<'ordered', Record<string, never>> & { unit: UnitRef; at: Coord };
type TermData = { term: string; def: string; room: number };
export type TermSignedEvent = Ev<'termSigned', TermData>;
export type TermPaidEvent = Ev<'termPaid', TermData>;
export type TermBrokenEvent = Ev<'termBroken', TermData>;
/** The clock writ served: the seal's unit id, the stamp's tile, the deadline round (P9). */
export type ClockServedEvent = Ev<'clockServed', { seal: string; stamp: At; deadline: number }>;
export type ClockLiftedEvent = Ev<'clockLifted', { by: 'seal' | 'stamp' }>;
/** Deadline passed: every mark on the board collected (`marks` of them). */
export type ClockCollectedEvent = Ev<'clockCollected', { marks: number }>;
/** A wax seal landed on `at` for `rounds` rounds (P8). */
export type SealedEvent = Ev<'sealed', { rounds: number }> & { at: Coord };
/** A wax seal at `at` ended early: it `melted` in fire, or its Sealer fell (IQ-5b). Wearing out is silent. */
export type UnsealedEvent = Ev<'unsealed', { why: 'melted' | 'sealer' }> & { at: Coord };

export type InkEvent =
  | SentBackEvent
  | ForwardedEvent
  | OrderedEvent
  | TermSignedEvent
  | TermPaidEvent
  | TermBrokenEvent
  | ClockServedEvent
  | ClockLiftedEvent
  | ClockCollectedEvent
  | SealedEvent
  | UnsealedEvent;
export type InkEventType = InkEvent['type'];

export const INK_EVENT_TYPES = [
  'inkQuarter:sentBack',
  'inkQuarter:forwarded',
  'inkQuarter:ordered',
  'inkQuarter:termSigned',
  'inkQuarter:termPaid',
  'inkQuarter:termBroken',
  'inkQuarter:clockServed',
  'inkQuarter:clockLifted',
  'inkQuarter:clockCollected',
  'inkQuarter:sealed',
  'inkQuarter:unsealed',
] as const satisfies readonly InkEventType[];
