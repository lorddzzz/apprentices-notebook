import { ENEMIES } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { type Coord, neighbors4, step } from './grid';
import { blocksUnits, coordOf, inBoard, isAlive, isFire, isPlate, tileAt, unitAt } from './queries';
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

/** Eels swim, moths fly, the lamp-mother is anchored: none of them is carried (K-9). */
function carried(u: Unit): boolean {
  if (u.kind !== 'enemy') return true;
  const def = ENEMIES[u.def];
  return def.habitat !== 'water' && !def.flies && !def.anchored;
}

/** Moves the floats of `s` one tile; returns what moved (reading order of the sources). */
function driftFloats(s: BattleState): DriftPreview['floats'] {
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
  moves.forEach((m, n) => {
    const cargo = lifted[n];
    const dest = m.j < 0 ? undefined : s.tiles[m.j];
    if (!cargo || !dest) return;
    // A float joins what floats there (fire wins); it never displaces a cloud or another state.
    if (dest.state === null) dest.state = cargo;
    else if (floats(dest.state) && cargo.id === 'fire') dest.state = cargo;
  });
  return moves.map((m) => ({ from: m.from, to: m.to }));
}

/** Units in water step downstream, downstream-most first (K-9). */
function driftUnits(s: BattleState): { unit: Unit; from: Coord; to: Coord }[] {
  const movers = s.units.filter((u) => isAlive(u) && carried(u) && tileAt(s, u.pos).terrain.water);
  const done = new Map<UnitId, Coord | null>();
  const busy = new Set<UnitId>();
  const starts = new Map(movers.map((u) => [u.id, { ...u.pos }]));
  const resolve = (u: Unit): void => {
    if (done.has(u.id)) return;
    busy.add(u.id);
    const dir = tileAt(s, u.pos).terrain.water;
    const to = dir ? step(u.pos, dir) : u.pos;
    let target: Coord | null = null;
    if (inBoard(s, to) && !blocksUnits(tileAt(s, to))) {
      const blocker = unitAt(s, to);
      // Whoever stands in the way goes first; a cycle (a swap) stays put.
      if (blocker && movers.includes(blocker) && !busy.has(blocker.id)) resolve(blocker);
      if (!unitAt(s, to)) target = to;
    }
    if (target) u.pos = { ...target };
    done.set(u.id, target);
    busy.delete(u.id);
  };
  for (const u of movers) resolve(u);
  return movers.flatMap((u) => {
    const to = done.get(u.id);
    const from = starts.get(u.id);
    return to && from ? [{ unit: u, from, to: { ...to } }] : [];
  });
}

/** The drift step, first in `hazards` (K-8, K-9): floats, then units in water. */
export function drift(ctx: Ctx): void {
  const s = ctx.s;
  const floats = driftFloats(s);
  const units = driftUnits(s);
  for (const m of units) if (m.unit.kind === 'member') m.unit.undo = null;
  if (floats.length || units.length) {
    emit(ctx, {
      type: 'drift',
      floats: floats.map((f) => ({ from: { ...f.from }, to: f.to && { ...f.to } })),
      units: units.map((m) => ({ unit: ref(m.unit, m.from), from: m.from, to: m.to })),
    });
  }
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
  const s = structuredClone(state);
  const floats = driftFloats(s);
  const units = driftUnits(s).map((m) => ({ unit: m.unit.id, from: m.from, to: m.to }));
  return { floats, units };
}
