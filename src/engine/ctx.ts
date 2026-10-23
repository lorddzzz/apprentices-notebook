import type { FootnoteKey, HabitId, LineId, VariantDef } from '$data';
import { objectiveMet } from './city';
import { cloneData } from './clone';
import type { GameEvent, UnitRef } from './events';
import type { Coord } from './grid';
import { enemies, isAlive, members } from './queries';
import type { ActionResult, BattleState, EventMeta, Origin, Unit } from './types';

/**
 * Engine internals mutate one draft per action. `runDraft` clones the input once, effect helpers
 * change `ctx.s` and append to `ctx.log` through `emit`, and the public API returns the draft as
 * the new state.
 */

/** Effects one cast may cause before the rest fizzles (plan §4: chains stay finite). */
export const CAST_EVENT_CAP = 500;

/** A footnote variant's stable id (`VariantDef.id`), what the profile stores (P13). */
export type FootnoteVariantId = VariantDef['id'];
/**
 * The footnote context: slot or capstone key (`footnoteKeyOf`) → written variant id, so a line can
 * hold a level I and a level II variant and a variant's text can change freely (P13, FN-0).
 */
export type FootnoteIds = Readonly<Partial<Record<FootnoteKey, FootnoteVariantId>>>;

export interface CastScope {
  events: number; // effects emitted in this cast so far
  capped: boolean;
}
/**
 * One action's draft: the state, the log, and the meta every emitted event is stamped with.
 * `meta` is set only through `withLine` / `withOrigin`, never assigned directly.
 */
export interface Ctx {
  s: BattleState;
  log: GameEvent[];
  cast: CastScope | null;
  meta: EventMeta;
  /** Footnote variants written for lines: read by the handlers that own those lines (F1). */
  footnotes: FootnoteIds;
  /** Events one cast may emit before it fizzles; absent = `CAST_EVENT_CAP` (P11: tests cut chains). */
  eventCap?: number;
}

export interface DraftOptions {
  footnotes?: FootnoteIds;
  /** Overrides `CAST_EVENT_CAP` for this draft (tests only). */
  eventCap?: number;
}

export function runDraft(
  state: BattleState,
  fn: (ctx: Ctx) => void,
  opts: DraftOptions = {},
): ActionResult {
  const ctx: Ctx = {
    s: cloneData(state),
    log: [],
    cast: null,
    meta: {},
    footnotes: opts.footnotes ?? {},
    ...(opts.eventCap !== undefined ? { eventCap: opts.eventCap } : {}),
  };
  fn(ctx);
  return { state: ctx.s, events: ctx.log };
}

/** Appends an event stamped with the current line and origin; inside a cast, counts toward the cap. */
export function emit(ctx: Ctx, e: GameEvent): void {
  const c = ctx.cast;
  if (c) {
    if (c.capped) return;
    if (c.events >= (ctx.eventCap ?? CAST_EVENT_CAP)) {
      c.capped = true;
      ctx.log.push({ type: 'fizzles', reason: 'cap' });
      return;
    }
    c.events++;
  }
  const line = e.line ?? ctx.meta.line;
  const origin = e.origin ?? ctx.meta.origin;
  const habit = e.habit ?? ctx.meta.habit;
  ctx.log.push({
    ...e,
    ...(line ? { line } : {}),
    ...(origin ? { origin } : {}),
    ...(habit ? { habit } : {}),
  });
}

/** True once the cast hit the cap: callers stop walking the chain. */
export const fizzled = (ctx: Ctx): boolean => ctx.cast?.capped ?? false;

function withMeta<T>(ctx: Ctx, patch: EventMeta, fn: () => T): T {
  const prev = ctx.meta;
  ctx.meta = { ...prev, ...patch };
  try {
    return fn();
  } finally {
    ctx.meta = prev;
  }
}

/** Every non-headline behaviour runs inside one: its events carry the line (D1, D8). */
export const withLine = <T>(ctx: Ctx, line: LineId, fn: () => T): T => withMeta(ctx, { line }, fn);
/** A habit's headline effect runs inside one: its events carry the habit (AH P11). */
export const withHabit = <T>(ctx: Ctx, habit: HabitId, fn: () => T): T =>
  withMeta(ctx, { habit }, fn);
/** Events caused by a board object carry the cast that made it (P8). */
export const withOrigin = <T>(ctx: Ctx, origin: Origin | null, fn: () => T): T =>
  origin ? withMeta(ctx, { origin }, fn) : fn();

/** Snapshot for an event; `at` defaults to the unit's current tile. */
export function ref(u: Unit, at: Coord = u.pos): UnitRef {
  return { id: u.id, name: u.name, at: { ...at }, member: u.kind === 'member' };
}

/** Ends the battle when one side is gone (or the objective is met). Returns true if it is (now) over. */
export function checkEnd(ctx: Ctx): boolean {
  if (ctx.s.phase !== 'player') return true;
  // A threshold room is won by its objective, never by an empty board (K-22).
  if (ctx.s.objective ? objectiveMet(ctx.s, ctx.log) : !enemies(ctx.s).some(isAlive)) {
    ctx.s.phase = 'won';
    emit(ctx, { type: 'won' });
    return true;
  }
  if (!members(ctx.s).some(isAlive)) {
    ctx.s.phase = 'lost';
    emit(ctx, { type: 'lost' });
    return true;
  }
  return false;
}
