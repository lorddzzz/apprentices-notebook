import { ENEMIES } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { type Coord, neighbors4, step } from './grid';
import { spreadFire } from './materials';
import { blocksUnits, inBoard, isAlive, tileAt, unitAt } from './queries';
import type { BattleState, Unit, UnitId } from './types';

/**
 * The current (K-6 to K-12): water lanes carry what floats one tile downstream at round end, and
 * wooden lock gates burn from adjacent fire.
 */

/** Where things will be after the next drift (U1's preview). `to` null = off the board. */
export interface DriftPreview {
  floats: { from: Coord; to: Coord | null }[];
  units: { unit: UnitId; from: Coord; to: Coord }[];
}

const coordOf = (s: BattleState, i: number): Coord => ({
  x: i % s.width,
  y: Math.floor(i / s.width),
});

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
    if (!t.water || !(t.oil || t.ink)) return;
    const from = coordOf(s, i);
    const to = step(from, t.water);
    // Onto land the float stays where it is; off the board it is gone.
    if (inBoard(s, to) && (!tileAt(s, to).water || tileAt(s, to).plate)) return;
    const j = inBoard(s, to) ? to.y * s.width + to.x : -1;
    moves.push({ from, to: j < 0 ? null : to, i, j });
  });
  // Lift everything first (snapshot), then set it down: no double moves.
  const lifted = moves.map((m) => {
    const t = s.tiles[m.i];
    if (!t) throw new Error('drift: no tile');
    const cargo = { oil: t.oil, fire: t.fire, stain: t.stain, ink: t.ink };
    t.oil = false;
    t.fire = 0;
    t.stain = false;
    t.ink = false;
    return cargo;
  });
  moves.forEach((m, n) => {
    const cargo = lifted[n];
    const dest = m.j < 0 ? undefined : s.tiles[m.j];
    if (!cargo || !dest) return;
    if (cargo.oil) {
      // Fire does not enter steam; a lit float joining unlit oil lights it.
      const fire = dest.steam > 0 ? 0 : Math.max(dest.fire, cargo.fire);
      dest.oil = true;
      dest.fire = fire;
      dest.stain = fire > 0 ? false : dest.stain || cargo.stain;
    }
    if (cargo.ink) dest.ink = true;
  });
  return moves.map((m) => ({ from: m.from, to: m.to }));
}

/** Units in water step downstream, downstream-most first (K-9). */
function driftUnits(s: BattleState): { unit: Unit; from: Coord; to: Coord }[] {
  const movers = s.units.filter((u) => isAlive(u) && carried(u) && tileAt(s, u.pos).water);
  const done = new Map<UnitId, Coord | null>();
  const busy = new Set<UnitId>();
  const starts = new Map(movers.map((u) => [u.id, { ...u.pos }]));
  const resolve = (u: Unit): void => {
    if (done.has(u.id)) return;
    busy.add(u.id);
    const dir = tileAt(s, u.pos).water;
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
  spreadFire(ctx);
}

/** Gates next to fire burn (K-11). Called after the burn step and after any `ignite`. */
export function burnGates(ctx: Ctx): void {
  const s = ctx.s;
  s.tiles.forEach((t, i) => {
    if (!t.gate) return;
    const at = coordOf(s, i);
    if (!neighbors4(at).some((n) => inBoard(s, n) && tileAt(s, n).fire > 0)) return;
    t.gate = false;
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
