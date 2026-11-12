import type { CompoundId, StateId } from '$data';
import { byReadingOrder, type Coord, key, neighbors4 } from './grid';
import { blocksUnits, flood, inBoard, isCloud, isPlate, tileAt, unitAt } from './queries';
import type { BattleState } from './types';

/**
 * Connected tiles (design §4.4, E2). Each returns the network containing `at` in reading order
 * (orthogonal neighbours), or [] when `at` is not part of one.
 */

/** Oil in any form: a slick, a pool or a stain. Fire runs along it. */
const OIL: ReadonlySet<StateId | CompoundId> = new Set(['slick', 'pool', 'stain']);

/**
 * `flood` that also hops straight across up to `gap` empty tiles (the owner's mender, P19): a
 * tile with no state, no unit and nothing solid on it. The hopped tiles are not in the result,
 * and nothing joins diagonally. `gap` 0 is `flood`.
 */
function floodGap(s: BattleState, start: Coord, pass: (c: Coord) => boolean, gap: number): Coord[] {
  if (gap <= 0) return flood(s, start, pass);
  if (!inBoard(s, start) || !pass(start)) return [];
  const empty = (c: Coord): boolean =>
    inBoard(s, c) && tileAt(s, c).state === null && !blocksUnits(tileAt(s, c)) && !unitAt(s, c);
  const seen = new Set([key(start)]);
  const queue: Coord[] = [{ ...start }];
  const out: Coord[] = [];
  for (let c = queue.shift(); c; c = queue.shift()) {
    out.push(c);
    for (const d of DIRS) {
      for (let k = 1; k <= gap + 1; k++) {
        const n = { x: c.x + d.x * k, y: c.y + d.y * k };
        if (!inBoard(s, n)) break;
        if (pass(n)) {
          if (!seen.has(key(n))) {
            seen.add(key(n));
            queue.push(n);
          }
          break;
        }
        if (!empty(n)) break;
      }
    }
  }
  return out.sort(byReadingOrder);
}
const DIRS: readonly Coord[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

/** Brass: a plate (or any compound with a plate in it), or a collared unit standing there. */
export function isBrass(s: BattleState, at: Coord): boolean {
  if (!inBoard(s, at)) return false;
  if (isPlate(tileAt(s, at))) return true;
  const u = unitAt(s, at);
  return u !== null && u.collar !== false;
}

/** `grounded` (brass-plate-ground): a wall ends the net; the brass beyond it is not reached. */
export function brassNet(s: BattleState, at: Coord, grounded = false, gap = 0): Coord[] {
  if (!grounded) return floodGap(s, at, (c) => isBrass(s, c), gap);
  const isWall = (c: Coord): boolean => tileAt(s, c).state?.id === 'wall';
  const first = floodGap(
    s,
    at,
    (c) => isBrass(s, c) && (!isWall(c) || (c.x === at.x && c.y === at.y)),
    gap,
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
export function cloudNet(s: BattleState, at: Coord, bankStops = false, gap = 0): Coord[] {
  return floodGap(
    s,
    at,
    (c) => isCloud(tileAt(s, c)) && !(bankStops && tileAt(s, c).state?.id === 'bank'),
    gap,
  );
}

export function oilNet(s: BattleState, at: Coord, gap = 0): Coord[] {
  return floodGap(
    s,
    at,
    (c) => {
      const l = tileAt(s, c).state;
      return !!l && OIL.has(l.id);
    },
    gap,
  );
}

/** Toll: every tile connected to `at` by the same state or compound. */
export function sameStateNet(s: BattleState, at: Coord, gap = 0): Coord[] {
  if (!inBoard(s, at)) return [];
  const id = tileAt(s, at).state?.id;
  if (!id) return [];
  return floodGap(s, at, (c) => tileAt(s, c).state?.id === id, gap);
}
