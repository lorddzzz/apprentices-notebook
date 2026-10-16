import type { Ctx } from './ctx';
import type { Coord } from './grid';
import type { BattleState, UnitId } from './types';

/**
 * The current (K-6 to K-12): water lanes carry what floats one tile downstream at round end, and
 * wooden lock gates burn from adjacent fire. W0 stubs; E1 fills them.
 */

/** Where things will be after the next drift (U1's preview). `to` null = off the board. */
export interface DriftPreview {
  floats: { from: Coord; to: Coord | null }[];
  units: { unit: UnitId; from: Coord; to: Coord }[];
}

/** The drift step, first in `hazards` (K-8, K-9): floats, then units in water. */
export function drift(_ctx: Ctx): void {}

/** Gates next to fire burn (K-11). Called after the burn step and after any `ignite`. */
export function burnGates(_ctx: Ctx): void {}

/** What the next `drift` would move, without moving it. */
export function driftPreview(_state: BattleState): DriftPreview {
  return { floats: [], units: [] };
}
