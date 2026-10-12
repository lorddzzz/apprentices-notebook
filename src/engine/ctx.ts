import type { GameEvent, UnitRef } from './events';
import type { Coord } from './grid';
import { enemies, isAlive, members } from './queries';
import type { ActionResult, BattleState, Unit, UnitId } from './types';

/**
 * Engine internals mutate one draft per action. `runDraft` clones the input once, effect helpers
 * change `ctx.s` and append to `ctx.log`, and the public API returns the draft as the new state.
 */

export interface Kill {
  unit: UnitId;
  at: Coord;
}
/** Per-cast scratch: deaths so far (On Kill reads it). */
export interface CastScope {
  kills: Kill[];
}
export interface Ctx {
  s: BattleState;
  log: GameEvent[];
  cast: CastScope | null;
}

export function runDraft(state: BattleState, fn: (ctx: Ctx) => void): ActionResult {
  const ctx: Ctx = { s: structuredClone(state), log: [], cast: null };
  fn(ctx);
  return { state: ctx.s, events: ctx.log };
}

export function emit(ctx: Ctx, e: GameEvent): void {
  ctx.log.push(e);
}

/** Snapshot for an event; `at` defaults to the unit's current tile. */
export function ref(u: Unit, at: Coord = u.pos): UnitRef {
  return { id: u.id, name: u.name, at: { ...at }, member: u.kind === 'member' };
}

/** Ends the battle when one side is gone. Returns true if the battle is (now) over. */
export function checkEnd(ctx: Ctx): boolean {
  if (ctx.s.phase !== 'player') return true;
  if (!enemies(ctx.s).some(isAlive)) {
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
