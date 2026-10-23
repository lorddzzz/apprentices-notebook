import { objectArrives, relocateAll, unitTraits } from './arrival';
import { cloneData } from './clone';
import { type Ctx, emit, ref } from './ctx';
import { type Coord, neighbors4, sameCoord, step } from './grid';
import { blocksUnits, coordOf, inBoard, isAlive, isFire, isPlate, tileAt } from './queries';
import type { BattleState, Layer, Unit, UnitId } from './types';

/**
 * The current (K-6 to K-12): water lanes carry what floats one tile downstream at round end, and
 * wooden lock gates burn from adjacent fire.
 */

/** Where things will be after the next drift (U1's preview). `to` null = off the board. */
export interface DriftPreview {
  floats: { from: Coord; to: Coord | null }[];
  units: { unit: UnitId; from: Coord; to: Coord }[];
}

/** What floats on a lane and drifts with it: slicks, fire on them, blots and stains. */
const FLOATS: ReadonlySet<Layer['id']> = new Set(['slick', 'fire', 'blot', 'stain']);
const floats = (l: Layer | null): l is Layer => !!l && FLOATS.has(l.id);

/** Eels swim, moths fly, the lamp-mother is anchored: none of them is carried (K-9, P5). */
const carried = (u: Unit): boolean =>
  !unitTraits(u).some((t) => t === 'flies' || t === 'swims' || t === 'anchored');

/** A float that moved; `placed` is the state that came to rest on `to` (it may be lost). */
type FloatMove = DriftPreview['floats'][number] & { placed: Layer['id'] | null };

/** Moves the floats of `s` one tile; returns what moved (reading order of the sources). */
function driftFloats(s: BattleState): FloatMove[] {
  const moves: { from: Coord; to: Coord | null; i: number; j: number }[] = [];
  s.tiles.forEach((t, i) => {
    if (!t.terrain.water || !floats(t.state)) return;
    const from = coordOf(s, i);
    const to = step(from, t.terrain.water);
    // Onto land the float stays where it is; off the board it is gone.
    if (inBoard(s, to) && (!tileAt(s, to).terrain.water || isPlate(tileAt(s, to)))) return;
    // A float never displaces a cloud or another state that doesn't drift.
    const there = inBoard(s, to) ? tileAt(s, to).state : null;
    if (there && !floats(there)) return;
    const j = inBoard(s, to) ? to.y * s.width + to.x : -1;
    moves.push({ from, to: j < 0 ? null : to, i, j });
  });
  // Lift everything first (snapshot), then set it down: no double moves.
  const lifted = moves.map((m) => {
    const t = s.tiles[m.i];
    if (!t) throw new Error('drift: no tile');
    const cargo = t.state;
    t.state = null;
    return cargo;
  });
  return moves.map((m, n) => {
    const cargo = lifted[n];
    const dest = m.j < 0 ? undefined : s.tiles[m.j];
    let placed: Layer['id'] | null = null;
    // A float joins what floats there (fire wins); it never displaces a cloud or another state.
    if (cargo && dest && (dest.state === null || (floats(dest.state) && cargo.id === 'fire'))) {
      dest.state = cargo;
      placed = cargo.id;
    }
    return { from: m.from, to: m.to, placed };
  });
}

/** A unit the current carries one tile. */
interface UnitDrift {
  unit: Unit;
  from: Coord;
  to: Coord;
}

/**
 * Plans the units in water stepping downstream, downstream-most first (K-9); moves nothing.
 * Returns the moves in the order they resolve (who was in the way goes first) and in unit order.
 */
function driftUnits(s: BattleState): { resolved: UnitDrift[]; ordered: UnitDrift[] } {
  const movers = s.units.filter((u) => isAlive(u) && carried(u) && tileAt(s, u.pos).terrain.water);
  const planned = new Map<UnitId, Coord>(movers.map((u) => [u.id, { ...u.pos }]));
  const occupied = (c: Coord): Unit | null =>
    s.units.find((u) => isAlive(u) && sameCoord(planned.get(u.id) ?? u.pos, c)) ?? null;
  const done = new Map<UnitId, Coord | null>();
  const busy = new Set<UnitId>();
  const resolved: UnitDrift[] = [];
  const resolve = (u: Unit): void => {
    if (done.has(u.id)) return;
    busy.add(u.id);
    const dir = tileAt(s, u.pos).terrain.water;
    const to = dir ? step(u.pos, dir) : u.pos;
    let target: Coord | null = null;
    if (inBoard(s, to) && !blocksUnits(tileAt(s, to))) {
      const blocker = occupied(to);
      // Whoever stands in the way goes first; a cycle (a swap) stays put.
      if (blocker && movers.includes(blocker) && !busy.has(blocker.id)) resolve(blocker);
      if (!occupied(to)) target = to;
    }
    if (target) {
      planned.set(u.id, { ...target });
      resolved.push({ unit: u, from: { ...u.pos }, to: { ...target } });
    }
    done.set(u.id, target);
    busy.delete(u.id);
  };
  for (const u of movers) resolve(u);
  const ordered = movers.flatMap((u) => resolved.filter((m) => m.unit.id === u.id));
  return { resolved, ordered };
}

/**
 * The drift step, first in `hazards` (K-8, K-9): floats, then units in water. Floats arrive as
 * objects; carried units are lifted and set down together, then arrive in the order the drift
 * resolved (P4, P7): a step-jar, a cloud or Bind *enters* answers, a stain does not (city §5).
 */
export function drift(ctx: Ctx): void {
  const s = ctx.s;
  const floats = driftFloats(s);
  const { resolved, ordered } = driftUnits(s);
  for (const m of ordered) if (m.unit.kind === 'member') m.unit.undo = null;
  if (floats.length || ordered.length) {
    emit(ctx, {
      type: 'drift',
      floats: floats.map((f) => ({ from: { ...f.from }, to: f.to && { ...f.to } })),
      units: ordered.map((m) => ({ unit: ref(m.unit, m.from), from: m.from, to: m.to })),
    });
  }
  for (const f of floats) {
    if (f.to && f.placed) {
      objectArrives(ctx, { kind: 'state', state: f.placed }, f.to, {
        cause: 'drift',
        origin: null,
      });
    }
  }
  const moves = resolved.map((m) => ({ unit: m.unit.id, from: m.from, to: m.to, path: [m.to] }));
  if (moves.length) relocateAll(ctx, moves, 'drift', null);
}

/** Gates next to fire burn (K-11). Called after the burn step and after any `ignite`. */
export function burnGates(ctx: Ctx): void {
  const s = ctx.s;
  s.tiles.forEach((t, i) => {
    if (!t.terrain.gate) return;
    const at = coordOf(s, i);
    if (!neighbors4(at).some((n) => inBoard(s, n) && isFire(tileAt(s, n)))) return;
    t.terrain.gate = false;
    emit(ctx, { type: 'gateBurns', at });
  });
}

/** What the next `drift` would move, without moving it. */
export function driftPreview(state: BattleState): DriftPreview {
  const s = cloneData(state);
  const floats = driftFloats(s).map((f) => ({ from: f.from, to: f.to }));
  const units = driftUnits(s).ordered.map((m) => ({ unit: m.unit.id, from: m.from, to: m.to }));
  return { floats, units };
}
