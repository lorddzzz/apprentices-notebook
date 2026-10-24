import { type Coord, key } from '../grid';
import { coordOf, flood } from '../queries';
import { choicesAt, takeChoice } from '../trip/choices';
import { returnCheck } from '../trip/ret';
import type { BattleState, Trip } from '../types';
import type { CrossroadsChoice, ReturnCheck } from './types';

/**
 * Kit operations named in the plan's contracts (§4). The trip-shape ones (DK-5a) delegate to
 * `src/engine/trip/`; out of the room (DK-6) lives in `../outOfRoom`.
 */

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

/** P11: takes a unit off the board (fall, erase) and emits `outOfRoom` (DK-6). */
export { removeFromRoom } from '../outOfRoom';

/**
 * P10: the 4-connected groups of tiles matching `inside` (piers cut off, cloud networks). Groups
 * come in the reading order of their first tile; each lists its tiles in reading order.
 */
export function componentsOf(
  state: BattleState,
  inside: (at: Coord, state: BattleState) => boolean,
): Coord[][] {
  const seen = new Set<string>();
  const groups: Coord[][] = [];
  state.tiles.forEach((_, i) => {
    const at = coordOf(state, i);
    if (seen.has(key(at))) return;
    const group = flood(state, at, (c) => inside(c, state));
    for (const c of group) seen.add(key(c));
    if (group.length) groups.push(group);
  });
  return groups;
}
