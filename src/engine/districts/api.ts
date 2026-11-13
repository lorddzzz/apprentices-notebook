import type { Ctx } from '../ctx';
import { type Coord, key } from '../grid';
import { coordOf, flood } from '../queries';
import { choicesAt, takeChoice } from '../trip/choices';
import { returnCheck } from '../trip/ret';
import type { BattleState, Origin, Trip } from '../types';
import { KIT } from './kit';
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

/**
 * The foundry's bells, for the footnotes that bend them (BF-F2, BF-F3): tones, the strike queue
 * and its flags, retune and its lock, and the bell state the rules read. Re-exported so core files
 * need no import into `districts/foundry/`.
 */
export { clapperTone, ropeTone, toneGroups, toneOfPiece } from './foundry/pieces';
export { lockBell, retune, ringTone, tagQueued, withStrikeFlags } from './foundry/ring';
export { BELL_PIECE, BELLS_RULE_ID, parseBells, ROPE_PIECE } from './foundry/types';

/** The bot's district terms, summed over modules in registry order; each is 0 on a board without its rule. */
export function botValue(state: BattleState): number {
  let v = 0;
  for (const m of Object.values(KIT.modules)) v += m?.bot?.value?.(state) ?? 0;
  return v;
}

/** Every tile whose support has failed, the union over modules in registry order (no duplicates). */
export function crackedTiles(state: BattleState): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const m of Object.values(KIT.modules)) {
    for (const c of m?.unsupported?.(state) ?? []) {
      if (seen.has(key(c))) continue;
      seen.add(key(c));
      out.push(c);
    }
  }
  return out;
}

/** `chalk-network-ring`: the brass tiles a fall took that are still fog, the union over modules (no duplicates). */
export function fallenBrassTiles(state: BattleState): Coord[] {
  const seen = new Set<string>();
  const out: Coord[] = [];
  for (const m of Object.values(KIT.modules)) {
    for (const c of m?.fallenBrass?.(state) ?? []) {
      if (seen.has(key(c))) continue;
      seen.add(key(c));
      out.push(c);
    }
  }
  return out;
}

/** Forgets remembered fallen brass a Chalk conduct used: every module's hook, in registry order. */
export function spendFallenBrass(ctx: Ctx, tiles: readonly Coord[]): void {
  for (const m of Object.values(KIT.modules)) m?.spendFallenBrass?.(ctx, tiles);
}

/** An Erase landed on `at`: every module's hook for non-piece objects, in registry order (CG-3). */
export function eraseTouches(ctx: Ctx, at: Coord, origin: Origin | null): void {
  for (const m of Object.values(KIT.modules)) m?.eraseAt?.(ctx, at, origin);
}
