import type { CompoundId, StateId } from '$data';
import { type Ctx, emit, withLine } from './ctx';
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

// ── The mender's refusals (EN-9b) ───────────────────────

/** The membership tests the nets use, so a refusal is read against the same rule. */
export const cloudPass =
  (s: BattleState, bankStops = false) =>
  (c: Coord): boolean =>
    isCloud(tileAt(s, c)) && !(bankStops && tileAt(s, c).state?.id === 'bank');
export const oilPass =
  (s: BattleState) =>
  (c: Coord): boolean => {
    const l = tileAt(s, c).state;
    return !!l && OIL.has(l.id);
  };
export const brassPass =
  (s: BattleState) =>
  (c: Coord): boolean =>
    isBrass(s, c);
export const statePass =
  (s: BattleState, id: StateId | CompoundId | undefined) =>
  (c: Coord): boolean =>
    id !== undefined && tileAt(s, c).state?.id === id;

/**
 * After a mender's net is read: says (as a miss under `mender:unit` / `mender:diagonal`) when
 * a member of the same kind stands out of it only because a unit sits in the gap or it lies
 * diagonal. `gap` 0 (everyone else) is silent.
 */
export function stampGap(
  ctx: Ctx,
  net: readonly Coord[],
  pass: (c: Coord) => boolean,
  gap: number,
  who: string,
): void {
  if (gap <= 0 || net.length === 0) return;
  const s = ctx.s;
  const inNet = new Set(net.map(key));
  const out = (c: Coord): boolean => inBoard(s, c) && pass(c) && !inNet.has(key(c));
  let unit = false;
  let diagonal = false;
  for (const c of net) {
    for (const d of DIRS) {
      const gapTile = { x: c.x + d.x, y: c.y + d.y };
      const beyond = { x: c.x + d.x * 2, y: c.y + d.y * 2 };
      if (inBoard(s, gapTile) && !pass(gapTile) && unitAt(s, gapTile) && out(beyond)) unit = true;
      const side = d.x === 0 ? { x: 1, y: 0 } : { x: 0, y: 1 };
      if (out({ x: gapTile.x + side.x, y: gapTile.y + side.y })) diagonal = true;
      if (out({ x: gapTile.x - side.x, y: gapTile.y - side.y })) diagonal = true;
    }
  }
  if (unit) withLine(ctx, 'mender:unit', () => emit(ctx, { type: 'miss', source: who }));
  if (diagonal) withLine(ctx, 'mender:diagonal', () => emit(ctx, { type: 'miss', source: who }));
}

/**
 * Round end: a fire the owner lit, with oil one empty tile beyond it in a straight line, does not
 * spread to it at dusk (the mender never reaches round end).
 */
export function stampDusk(ctx: Ctx, at: Coord): void {
  const s = ctx.s;
  const oil = oilPass(s);
  const empty = (c: Coord): boolean =>
    inBoard(s, c) && tileAt(s, c).state === null && !blocksUnits(tileAt(s, c)) && !unitAt(s, c);
  const jumps = DIRS.some((d) => {
    const mid = { x: at.x + d.x, y: at.y + d.y };
    const far = { x: at.x + d.x * 2, y: at.y + d.y * 2 };
    return empty(mid) && inBoard(s, far) && oil(far);
  });
  if (jumps) withLine(ctx, 'mender:dusk', () => emit(ctx, { type: 'miss', source: 'Fire' }));
}
