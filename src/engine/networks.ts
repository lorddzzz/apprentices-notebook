import type { CompoundId, StateId } from '$data';
import { byReadingOrder, type Coord, neighbors4 } from './grid';
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

/** `grounded` (brass-plate-ground): a wall ends the net; the brass beyond it is not reached. */
export function brassNet(s: BattleState, at: Coord, grounded = false): Coord[] {
  if (!grounded) return flood(s, at, (c) => isBrass(s, c));
  const isWall = (c: Coord): boolean => tileAt(s, c).state?.id === 'wall';
  const first = flood(
    s,
    at,
    (c) => isBrass(s, c) && (!isWall(c) || (c.x === at.x && c.y === at.y)),
  );
  // The wall tiles touching the run are in the net, but nothing grows from them.
  const seen = new Set(first.map((c) => `${c.x},${c.y}`));
  const out = [...first];
  for (const c of first) {
    for (const n of neighbors4(c)) {
      const k = `${n.x},${n.y}`;
      if (inBoard(s, n) && !seen.has(k) && isBrass(s, n) && isWall(n)) {
        seen.add(k);
        out.push(n);
      }
    }
  }
  return out.sort(byReadingOrder);
}

/** Clouds of every kind join when they touch (design §4.1); `bankStops` ends it at a bank. */
export function cloudNet(s: BattleState, at: Coord, bankStops = false): Coord[] {
  return flood(
    s,
    at,
    (c) => isCloud(tileAt(s, c)) && !(bankStops && tileAt(s, c).state?.id === 'bank'),
  );
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
