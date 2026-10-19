import type { CompoundId, StateId } from '$data';
import type { Coord } from './grid';
import { flood, inBoard, isCloud, isPlate, tileAt, unitAt } from './queries';
import type { BattleState } from './types';

/**
 * Connected tiles (design §4.4, E2). Each returns the network containing `at` in reading order
 * (orthogonal neighbours), or [] when `at` is not part of one.
 */

/** Oil in any form: a slick, a pool or a stain. Fire runs along it. */
const OIL: ReadonlySet<StateId | CompoundId> = new Set(['slick', 'pool', 'stain']);

/** Brass: a plate (or any compound with a plate in it), or a collared unit standing there. */
export function isBrass(s: BattleState, at: Coord): boolean {
  if (!inBoard(s, at)) return false;
  if (isPlate(tileAt(s, at))) return true;
  const u = unitAt(s, at);
  return u !== null && u.collar !== false;
}

export function brassNet(s: BattleState, at: Coord): Coord[] {
  return flood(s, at, (c) => isBrass(s, c));
}

/** Clouds of every kind join when they touch (design §4.1). */
export function cloudNet(s: BattleState, at: Coord): Coord[] {
  return flood(s, at, (c) => isCloud(tileAt(s, c)));
}

export function oilNet(s: BattleState, at: Coord): Coord[] {
  return flood(s, at, (c) => {
    const l = tileAt(s, c).state;
    return !!l && OIL.has(l.id);
  });
}

/** Toll: every tile connected to `at` by the same state or compound. */
export function sameStateNet(s: BattleState, at: Coord): Coord[] {
  if (!inBoard(s, at)) return [];
  const id = tileAt(s, at).state?.id;
  if (!id) return [];
  return flood(s, at, (c) => tileAt(s, c).state?.id === id);
}
