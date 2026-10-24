import type { Ctx } from '../ctx';
import type { Coord } from '../grid';
import { choicesAt, takeChoice } from '../trip/choices';
import { returnCheck } from '../trip/ret';
import type { BattleState, Trip, UnitId } from '../types';
import type { CrossroadsChoice, OutCause, ReturnCheck } from './types';

/**
 * Kit operations named in the plan's contracts (§4). The trip-shape ones (DK-5a) delegate to
 * `src/engine/trip/`; the rest are DK-1 stubs the named tasks fill.
 */

const stub = (name: string, task: string): never => {
  throw new Error(`${name} is a DK-1 stub (${task} builds it)`);
};

/** P3: may the party go home after the current room? Policy first, then the module's blocks. */
export function returnPolicy(trip: Trip): ReturnCheck {
  return returnCheck(trip);
}

/** P4: the Crossroads' choices; `[push, return]` unless the module replaces push. */
export function crossroadsChoices(trip: Trip): readonly CrossroadsChoice[] {
  return choicesAt(trip);
}

/**
 * P4: takes a way on: records the choice on the trip (it decides the next room's variant pool)
 * and the next room becomes current. A return choice throws: home goes through `returnHome`.
 */
export function chooseAt(trip: Trip, choice: string): Trip {
  return takeChoice(trip, choice);
}

/** P11: takes a unit off the board (fall, erase) and emits `outOfRoom`. */
export function removeFromRoom(ctx: Ctx, unit: UnitId, cause: OutCause): void {
  stub(`removeFromRoom(${ctx.s.title}, ${unit}, ${cause})`, 'DK-6');
}

/** P10: the 4-connected groups of tiles matching `inside` (piers cut off, cloud networks). */
export function componentsOf(
  state: BattleState,
  inside: (at: Coord, state: BattleState) => boolean,
): Coord[][] {
  return stub(`componentsOf(${state.width}x${state.height}, ${inside.length})`, 'DK-4');
}
