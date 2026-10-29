import { arrive, hasTrait } from '../../arrival';
import { type Ctx, emit, ref, withOrigin } from '../../ctx';
import { who } from '../../events';
import { byReadingOrder, type Coord, label, sameCoord } from '../../grid';
import { applyMark } from '../../marks';
import { coordOf, findUnit, isAlive, isOpen, livingUnits, tileAt } from '../../queries';
import type { BattleState, Unit, UnitId } from '../../types';
import type {
  BoardRule,
  DistrictEvent,
  DistrictEventDef,
  PieceDef,
  PieceId,
  RuleId,
} from '../types';
import {
  ORDER_DEF,
  ORDER_PIECE,
  type OrderedEvent,
  RETURN_DEF,
  RETURN_PIECE,
  type SentBackEvent,
} from './types';

/**
 * Return to sender and the standing order (ink-quarter plan P2, P4; IQ-1). One piece-scoped rule,
 * `inkQuarter:writs`, runs in DK's `late` slot: the standing order marks first, then every living
 * unit's position is kept as its start tile of the round. A stamp landing reads that snapshot.
 */

export const WRITS_RULE_ID: RuleId = 'inkQuarter:writs';

/** Where each living unit stood at the end of the last dusk (or when the rule was listed). */
export type WritsState = { start: { [unit: string]: { x: number; y: number } } };

const snapshot = (s: BattleState): WritsState => ({
  start: Object.fromEntries(livingUnits(s).map((u) => [u.id, { x: u.pos.x, y: u.pos.y }])),
});

const writsState = (s: BattleState): WritsState | null => {
  const raw = s.rules?.[WRITS_RULE_ID] as WritsState | undefined;
  return raw && typeof raw === 'object' && raw.start ? raw : null;
};

const isPiece = (s: BattleState, at: Coord, id: PieceId): boolean => tileAt(s, at).piece?.id === id;

/** A tile the unit may be set down on: open, not the drop, not a stamp, and its own footing. */
function standable(s: BattleState, u: Unit, at: Coord): boolean {
  if (!isOpen(s, at) || isPiece(s, at, RETURN_PIECE)) return false;
  const t = tileAt(s, at);
  if (t.terrain.drop) return false;
  if (hasTrait(u, 'flies')) return true;
  return hasTrait(u, 'swims') ? t.terrain.water !== null : true;
}

/**
 * Where a unit landing on the stamp at `stamp` goes (P2): its start tile of the round, or when that
 * is taken the nearest standable tile to it (Manhattan, then reading order). Null = it stays: no
 * snapshot for it, it started the round on this stamp, or nowhere is free. Pure (previews read it).
 */
export function sendBackTarget(s: BattleState, unit: UnitId, stamp: Coord): Coord | null {
  const u = findUnit(s, unit);
  const start = u ? writsState(s)?.start[unit] : undefined;
  if (!u || !start || sameCoord(start, stamp)) return null;
  if (isOpen(s, start) && !tileAt(s, start).terrain.drop) return { ...start };
  let best: { at: Coord; d: number } | null = null;
  for (let i = 0; i < s.tiles.length; i++) {
    const at = coordOf(s, i);
    if (!standable(s, u, at)) continue;
    const d = Math.abs(at.x - start.x) + Math.abs(at.y - start.y);
    if (!best || d < best.d || (d === best.d && byReadingOrder(at, best.at) < 0)) best = { at, d };
  }
  return best ? best.at : null;
}

/**
 * The stamp answers a landing by any cause but `return` (no chains); `restore` and spawns are
 * placements and never reach it. The unit goes back through the pipeline with cause `return`, so
 * a walking member's move stays spent (the log grew, so its undo is gone).
 */
const RETURN_ARRIVAL: NonNullable<PieceDef['triggers']['onArrive']> = {
  answers: 'landing',
  subjects: ['unit'],
  exceptCauses: ['return'],
  run(ctx, a) {
    if (a.subject.kind !== 'unit') return 'go';
    const u = findUnit(ctx.s, a.subject.unit);
    if (!u || !isAlive(u)) return 'go';
    const to = sendBackTarget(ctx.s, u.id, a.at);
    if (!to) return 'go';
    const from = { ...a.at };
    withOrigin(ctx, a.origin, () => {
      const sent: SentBackEvent = {
        type: 'inkQuarter:sentBack',
        unit: ref(u),
        at: { ...from },
        data: { from: { ...from }, to: { ...to }, cause: a.cause },
      };
      emit(ctx, sent);
      emit(ctx, {
        type: 'moved',
        unit: ref(u),
        from: { ...from },
        to: { ...to },
        path: [{ ...to }],
        cause: 'return',
      });
      arrive(ctx, u.id, [to], { cause: 'return', origin: a.origin, landing: true });
    });
    return 'stop';
  },
};

/** P1, P2: the stamp with its trigger; foe planners never end a walk on it. */
export const RETURN_WRIT_DEF: PieceDef = {
  ...RETURN_DEF,
  triggers: { onArrive: RETURN_ARRIVAL },
  aiAvoid: true,
  rules: [WRITS_RULE_ID],
};
/** P4: the order acts through the writs rule at dusk. */
export const ORDER_WRIT_DEF: PieceDef = { ...ORDER_DEF, rules: [WRITS_RULE_ID] };

/** P4: a plain Ink mark (no owner) on each unmarked, unanchored unit standing on an order. */
function standingOrders(ctx: Ctx): void {
  const s = ctx.s;
  for (let i = 0; i < s.tiles.length; i++) {
    if (s.tiles[i]?.piece?.id !== ORDER_PIECE) continue;
    const at = coordOf(s, i);
    const u = livingUnits(s).find((v) => sameCoord(v.pos, at));
    if (!u || u.mark || hasTrait(u, 'anchored')) continue;
    const ordered: OrderedEvent = { type: 'inkQuarter:ordered', data: {}, unit: ref(u), at };
    emit(ctx, ordered);
    applyMark(ctx, u, { deep: false, bound: null, origin: null });
  }
}

/** The writs' round-end rule: orders mark, then the round's start tiles are kept. */
export const WRITS_RULE: BoardRule<WritsState> = {
  id: WRITS_RULE_ID,
  slot: 'late',
  order: 0,
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [RETURN_PIECE, ORDER_PIECE] },
  init: (s) => snapshot(s),
  step(ctx) {
    standingOrders(ctx);
    return snapshot(ctx.s);
  },
};

/** IQ-1's pieces by id, swapped in for the base defs. */
export const WRIT_PIECES: Readonly<Record<PieceId, PieceDef>> = {
  [RETURN_PIECE]: RETURN_WRIT_DEF,
  [ORDER_PIECE]: ORDER_WRIT_DEF,
};

const toCoord = (v: unknown): Coord | null => {
  const r = v as { x?: unknown; y?: unknown } | null;
  return r && typeof r.x === 'number' && typeof r.y === 'number' ? { x: r.x, y: r.y } : null;
};

/** The two events' log lines (the `moved` relocation that follows a send-back says where). */
export const WRIT_EVENT_LINES: Readonly<Record<string, DistrictEventDef>> = {
  'inkQuarter:sentBack': {
    type: 'inkQuarter:sentBack',
    describe: (e: DistrictEvent) => {
      const at = toCoord(e.at);
      const stamp = at ? ` at ${label(at)}` : '';
      return e.unit
        ? `the stamp${stamp} returns ${who(e.unit)} to sender`
        : `the stamp${stamp} returns to sender`;
    },
  },
  'inkQuarter:ordered': {
    type: 'inkQuarter:ordered',
    describe: (e: DistrictEvent) =>
      e.unit ? `the standing order marks ${who(e.unit)}` : 'the standing order marks',
  },
};
