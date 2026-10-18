import type { LineId } from '$data/next/types';
import type { GameEvent as OldEvent } from '../events';
import type { NewEvent } from './events';
import type { BattleState, EventMeta, Origin } from './model';

/** Effects one cast may cause before the rest fizzles (plan §4: chains stay finite). */
export const CAST_EVENT_CAP = 500;

/** W0b replaces this with the assembled `GameEvent` (kept + new variants, all with meta). */
export type AnyEvent = (OldEvent | NewEvent) & EventMeta;

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
  log: AnyEvent[];
  cast: CastScope | null;
  meta: EventMeta;
  /** Footnote variants written for lines: read by the handlers that own those lines (F1). */
  footnotes: Readonly<Partial<Record<LineId, string>>>;
}

export function emit(ctx: Ctx, e: AnyEvent): void {
  const c = ctx.cast;
  if (c) {
    if (c.capped) return;
    if (c.events >= CAST_EVENT_CAP) {
      c.capped = true;
      ctx.log.push({ type: 'fizzles', reason: 'cap' });
      return;
    }
    c.events++;
  }
  const line = e.line ?? ctx.meta.line;
  const origin = e.origin ?? ctx.meta.origin;
  ctx.log.push({
    ...e,
    ...(line ? { line } : {}),
    ...(origin ? { origin } : {}),
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
/** Events caused by a board object carry the cast that made it (P8). */
export const withOrigin = <T>(ctx: Ctx, origin: Origin | null, fn: () => T): T =>
  origin ? withMeta(ctx, { origin }, fn) : fn();
