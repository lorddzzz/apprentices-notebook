import type { GameEvent } from '../events';
import type { BattleState, UnitId } from '../types';

/**
 * What a rival's cast credits (rivals §3, RV-16). Credit follows the cast that made an effect (its
 * `origin`), through delayed effects: an apprentice stepping into his jar, or him opening his own,
 * is his; his wick opening a jar an apprentice laid is theirs. A jar moved by Draw keeps its origin.
 *
 * - Reveals: the lines it fires are witnessed, and compounds and bursts it makes are named
 *   (knowledge, whoever cast).
 * - Earns the household nothing: no idiom, no proof mask, no Glyph record or elegance, no
 *   footnote point (`footnotes.pointLines`, `proof.masksFrom` and `tripStats` already key on
 *   apprentice casters or origins). Only `idioms.ts` matched patterns without looking at origin.
 */

/** The rival units of a battle. */
export function rivalIds(b: Pick<BattleState, 'units'>): ReadonlySet<UnitId> {
  return new Set(b.units.filter((u) => u.kind === 'enemy' && u.rival).map((u) => u.id));
}

/** Whether an event belongs to a rival's cast (by origin; a cast or trace by its caster). */
export function isRivalEvent(e: GameEvent, rivals: ReadonlySet<UnitId>): boolean {
  if (rivals.size === 0) return false;
  if (e.origin) return rivals.has(e.origin.caster);
  return (e.type === 'cast' || e.type === 'trace') && rivals.has(e.caster.id);
}

/** The events the household can be credited for: a log without the rivals' casts and their effects. */
export function householdLog(log: readonly GameEvent[], rivals: ReadonlySet<UnitId>): GameEvent[] {
  return rivals.size === 0 ? [...log] : log.filter((e) => !isRivalEvent(e, rivals));
}
