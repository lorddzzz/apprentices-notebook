import { CLOCK_TUNING } from '$data/districts/inkQuarter/enemies';
import { type Ctx, emit, ref } from '../../ctx';
import { dealDamage, kill } from '../../damage';
import { makeEnemy } from '../../foes';
import { type Coord, label, sameCoord } from '../../grid';
import { spendMark } from '../../marks';
import { makePiece } from '../../pieces';
import { findUnit, inBoard, isAlive, isOpen, livingUnits, tileAt } from '../../queries';
import type { BattleState, Unit, UnitId } from '../../types';
import type {
  BoardRule,
  DistrictEvent,
  DistrictEventDef,
  FoeBehaviour,
  KitId,
  PieceDef,
  PieceId,
  RuleId,
} from '../types';
import {
  CLOCK_STAMP_DEF,
  CLOCK_STAMP_PIECE,
  type ClockCollectedEvent,
  type ClockLiftedEvent,
  type ClockServedEvent,
} from './types';

/**
 * The postmaster's clock writ (ink-quarter plan P9; IQ-6). One module for the stand-in (IQ-7) and
 * the rival (IQ-22). `serveClock` places his seal (an anchored, inert 3-HP unit) and his stamp (a
 * piece); the deadline is the serve round + 3. Breaking the seal, or an apprentice landing on the
 * stamp by any cause but `return`, lifts the writ and he loses his next action (`clockStaggered`,
 * `spendStagger`). Unanswered at the deadline's dusk (`late` slot), every mark on the board
 * collects: 3 to its bearer, spent unreleased, on both sides. He may serve again 2 rounds after
 * the writ ends (`canServe`). The state is a rule state (`BattleState.rules`), saved like any.
 */

export const CLOCK_RULE_ID: RuleId = 'inkQuarter:clock';
export const CLOCK_SEAL_BEHAVIOUR: KitId = 'inkQuarter:clockSeal';

type At = { x: number; y: number };
/** A served writ: who served it, his seal's unit id, the stamp's tile, serve and deadline rounds. */
export type ClockWrit = { by: string; seal: string; stamp: At; served: number; deadline: number };
/**
 * `writ`: the open writ (one at a time); `stagger`: servers who lose their next action;
 * `ready`: the round from which each server may serve again.
 */
export type ClockState = {
  writ: ClockWrit | null;
  stagger: string[];
  ready: { [by: string]: number };
};

const initClock = (): ClockState => ({ writ: null, stagger: [], ready: {} });

const isAt = (v: unknown): v is At => {
  const r = v as { x?: unknown; y?: unknown } | null;
  return !!r && typeof r.x === 'number' && typeof r.y === 'number';
};

/** The forgiving reader: anything malformed reads as no writ, no stagger, no cooldown. */
export function parseClock(raw: unknown): ClockState {
  const r = raw as Partial<Record<keyof ClockState, unknown>> | null;
  if (!r || typeof r !== 'object') return initClock();
  const w = r.writ as Partial<Record<keyof ClockWrit, unknown>> | null | undefined;
  const writ: ClockWrit | null =
    w &&
    typeof w.by === 'string' &&
    typeof w.seal === 'string' &&
    isAt(w.stamp) &&
    typeof w.served === 'number' &&
    typeof w.deadline === 'number'
      ? {
          by: w.by,
          seal: w.seal,
          stamp: { x: w.stamp.x, y: w.stamp.y },
          served: w.served,
          deadline: w.deadline,
        }
      : null;
  const stagger = Array.isArray(r.stagger)
    ? r.stagger.filter((v): v is string => typeof v === 'string')
    : [];
  const ready: Record<string, number> = {};
  if (r.ready && typeof r.ready === 'object') {
    for (const [k, v] of Object.entries(r.ready)) if (typeof v === 'number') ready[k] = v;
  }
  return { writ, stagger, ready };
}

/** The clock's state on a battle (none listed: the empty state). */
export const clockState = (s: BattleState): ClockState => parseClock(s.rules?.[CLOCK_RULE_ID]);

const save = (s: BattleState, st: ClockState): void => {
  s.rules = { ...s.rules, [CLOCK_RULE_ID]: st };
};

/** The open writ, if any. */
export const openClock = (s: BattleState): ClockWrit | null => clockState(s).writ;

/** Rounds left before the writ collects (0 = it collects at this round's dusk); null = no writ. */
export function clockRoundsLeft(s: BattleState): number | null {
  const w = openClock(s);
  return w ? Math.max(0, w.deadline - s.round) : null;
}

/** May `by` serve now: no writ open and his cooldown over. */
export function canServe(s: BattleState, by: UnitId): boolean {
  const st = clockState(s);
  return !st.writ && s.round >= (st.ready[by] ?? 0);
}

/** Answered: `by` loses his next action (IQ-7 and IQ-22 read this before he acts). */
export const clockStaggered = (s: BattleState, by: UnitId): boolean =>
  clockState(s).stagger.includes(by);

/** Spends the stagger: true when `by` was staggered (his action is skipped). */
export function spendStagger(s: BattleState, by: UnitId): boolean {
  const st = clockState(s);
  if (!st.stagger.includes(by)) return false;
  save(s, { ...st, stagger: st.stagger.filter((v) => v !== by) });
  return true;
}

/** A tile the stamp can go on: on the board, not the drop, a gate, a grate, or under a piece. */
export function canStamp(s: BattleState, at: Coord): boolean {
  if (!inBoard(s, at)) return false;
  const t = tileAt(s, at);
  return !t.terrain.drop && !t.terrain.gate && !t.terrain.grate && !t.piece;
}

/** A tile the seal can go on: open (no unit, nothing solid), not the drop. */
export const canPlaceSeal = (s: BattleState, at: Coord): boolean =>
  isOpen(s, at) && !tileAt(s, at).terrain.drop;

/**
 * Serves the writ (P9): his seal summoned on `sealAt`, his stamp on `stampAt`, deadline = this
 * round + 3. False (nothing done) when he may not serve, is not alive, or either tile is unfit.
 */
export function serveClock(ctx: Ctx, by: UnitId, sealAt: Coord, stampAt: Coord): boolean {
  const s = ctx.s;
  const server = findUnit(s, by);
  if (!server || !isAlive(server) || !canServe(s, by)) return false;
  if (sameCoord(sealAt, stampAt) || !canPlaceSeal(s, sealAt) || !canStamp(s, stampAt)) {
    return false;
  }
  const seal = makeEnemy(s, 'clockSeal', sealAt);
  s.units.push(seal);
  emit(ctx, { type: 'summon', by: ref(server), unit: ref(seal), at: { ...sealAt } });
  tileAt(s, stampAt).piece = makePiece(CLOCK_STAMP_PIECE);
  const deadline = s.round + CLOCK_TUNING.deadlineAfter;
  const st = clockState(s);
  save(s, {
    ...st,
    writ: { by, seal: seal.id, stamp: { ...stampAt }, served: s.round, deadline },
  });
  const ev: ClockServedEvent = {
    type: 'inkQuarter:clockServed',
    unit: ref(server),
    at: { ...stampAt },
    data: { seal: seal.id, stamp: { ...stampAt }, deadline },
  };
  emit(ctx, ev);
  return true;
}

/** Ends the open writ: state cleared, cooldown set, stamp taken up; returns the seal still standing. */
function endWrit(ctx: Ctx, w: ClockWrit, staggered: boolean): Unit | null {
  const st = clockState(ctx.s);
  save(ctx.s, {
    writ: null,
    stagger: staggered && !st.stagger.includes(w.by) ? [...st.stagger, w.by] : st.stagger,
    ready: { ...st.ready, [w.by]: ctx.s.round + CLOCK_TUNING.cooldown },
  });
  if (inBoard(ctx.s, w.stamp) && tileAt(ctx.s, w.stamp).piece?.id === CLOCK_STAMP_PIECE) {
    tileAt(ctx.s, w.stamp).piece = null;
  }
  const seal = findUnit(ctx.s, w.seal);
  return seal && isAlive(seal) ? seal : null;
}

/** The seal is broken off the board (it was killed: its `died` is already logged). */
const breakSeal = (ctx: Ctx, seal: Unit | null): void => {
  if (!seal) return;
  seal.hp = 0;
  kill(ctx, seal, false);
};

/** Answered (P9): the writ lifts, he loses his next action; a stamp answer also breaks the seal. */
function lift(ctx: Ctx, how: 'seal' | 'stamp'): void {
  const w = openClock(ctx.s);
  if (!w) return;
  const seal = endWrit(ctx, w, true);
  const server = findUnit(ctx.s, w.by);
  const ev: ClockLiftedEvent = {
    type: 'inkQuarter:clockLifted',
    ...(server ? { unit: ref(server) } : {}),
    data: { by: how },
  };
  emit(ctx, ev);
  breakSeal(ctx, seal);
}

/**
 * Takes the writ off the board with no answer and no collection (its server fell or left).
 * IQ-7/IQ-22 call it when the postmaster dies, before the room's end is checked, so his seal
 * never holds the room open. No-op without an open writ by `by`.
 */
export function withdrawClock(ctx: Ctx, by: UnitId): void {
  const w = openClock(ctx.s);
  if (!w || w.by !== by) return;
  breakSeal(ctx, endWrit(ctx, w, false));
}

/** Unanswered at the deadline's dusk: every mark on the board collects (both sides, bound too). */
function collect(ctx: Ctx, w: ClockWrit): void {
  const seal = endWrit(ctx, w, false);
  const marked = livingUnits(ctx.s).filter((u) => u.mark);
  const ev: ClockCollectedEvent = {
    type: 'inkQuarter:clockCollected',
    data: { marks: marked.length },
  };
  emit(ctx, ev);
  for (const u of marked) {
    if (!isAlive(u) || !u.mark) continue;
    spendMark(ctx, u); // spent first: a bound mark is never released by the collection's hit
    dealDamage(ctx, u, CLOCK_TUNING.collect, 'Clock');
  }
  breakSeal(ctx, seal && isAlive(seal) ? seal : null);
}

/**
 * The clock's round-end step (`late`, after the writs and forwards, so a standing order's dusk
 * mark is collected too): a seal gone without a kill (out of the room) answers; a fallen server
 * withdraws; at the deadline the marks collect.
 */
function clockStep(ctx: Ctx): void {
  const w = openClock(ctx.s);
  if (!w) return;
  const seal = findUnit(ctx.s, w.seal);
  if (!seal || !isAlive(seal)) {
    lift(ctx, 'seal');
    return;
  }
  const server = findUnit(ctx.s, w.by);
  if (!server || !isAlive(server)) {
    withdrawClock(ctx, w.by);
    return;
  }
  if (ctx.s.round >= w.deadline) collect(ctx, w);
}

export const CLOCK_RULE: BoardRule<ClockState> = {
  id: CLOCK_RULE_ID,
  slot: 'late',
  order: 10,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: () => initClock(),
  step(ctx) {
    clockStep(ctx);
    return clockState(ctx.s);
  },
  preview(s, own) {
    const w = parseClock(own).writ;
    if (!w) return [];
    return [
      {
        kind: 'meter',
        label: 'Clock',
        value: Math.max(0, w.deadline - s.round),
        max: CLOCK_TUNING.deadlineAfter,
      },
      { kind: 'pulse', at: { ...w.stamp } },
    ];
  },
};

/** An apprentice landing on the open writ's stamp answers it; a `return` never does. */
const STAMP_ARRIVAL: NonNullable<PieceDef['triggers']['onArrive']> = {
  answers: 'landing',
  subjects: ['unit'],
  exceptCauses: ['return'],
  run(ctx, a) {
    if (a.subject.kind !== 'unit') return 'go';
    const u = findUnit(ctx.s, a.subject.unit);
    const w = openClock(ctx.s);
    if (u?.kind === 'member' && isAlive(u) && w && sameCoord(w.stamp, a.at)) lift(ctx, 'stamp');
    return 'go';
  },
};

/** The stamp with its trigger; foes never end a walk on it. */
export const CLOCK_STAMP_WRIT_DEF: PieceDef = {
  ...CLOCK_STAMP_DEF,
  triggers: { onArrive: STAMP_ARRIVAL },
  aiAvoid: true,
};

export const CLOCK_PIECES: Readonly<Record<PieceId, PieceDef>> = {
  [CLOCK_STAMP_PIECE]: CLOCK_STAMP_WRIT_DEF,
};

/** The seal never acts (`ai: 'none'`); its death answers the writ. */
export const CLOCK_SEAL_FOE: FoeBehaviour = {
  id: CLOCK_SEAL_BEHAVIOUR,
  plan: () => null,
  resolve: () => {},
  onDeath(ctx, e) {
    if (openClock(ctx.s)?.seal === e.id) lift(ctx, 'seal');
  },
};

const dataOf = (e: DistrictEvent): Record<string, unknown> =>
  (e.data && typeof e.data === 'object' && !Array.isArray(e.data) ? e.data : {}) as Record<
    string,
    unknown
  >;

/** The clock's three log lines. */
export const CLOCK_EVENT_LINES: Readonly<Record<string, DistrictEventDef>> = {
  'inkQuarter:clockServed': {
    type: 'inkQuarter:clockServed',
    describe: (e) => {
      const d = dataOf(e);
      const stamp = isAt(d.stamp) ? ` (stamp at ${label(d.stamp)})` : '';
      const by = typeof d.deadline === 'number' ? ` due by round ${d.deadline}` : '';
      return `a clock writ is served${by}${stamp}`;
    },
  },
  'inkQuarter:clockLifted': {
    type: 'inkQuarter:clockLifted',
    describe: (e) =>
      dataOf(e).by === 'stamp'
        ? 'the clock writ is answered on the stamp and lifts'
        : 'the seal is broken: the clock writ lifts',
  },
  'inkQuarter:clockCollected': {
    type: 'inkQuarter:clockCollected',
    describe: (e) => {
      const n = dataOf(e).marks;
      return typeof n === 'number' && n > 0
        ? `the clock runs out: ${n} mark${n === 1 ? '' : 's'} collect`
        : 'the clock runs out: no marks to collect';
    },
  },
};
