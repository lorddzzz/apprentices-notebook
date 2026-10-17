import { ENEMIES, TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { dealDamage } from './damage';
import { who } from './events';
import { type Coord, type Dir, key, step } from './grid';
import { applyOil } from './materials';
import { blocksUnits, inBoard, reachable, tileAt, unitAt } from './queries';
import type { BattleState, EnemyUnit, MemberUnit, Unit } from './types';

/**
 * An ink puddle marks whoever ends a move on it (if not already inked) and is consumed. Stained
 * oil marks too, and stays. Returns what inked the unit, if anything.
 */
export function settle(ctx: Ctx, unit: Unit): 'puddle' | 'stain' | null {
  const tile = tileAt(ctx.s, unit.pos);
  if (unit.inked) return null;
  if (tile.ink) {
    unit.inked = true;
    tile.ink = false;
    emit(ctx, { type: 'inked', unit: ref(unit), via: 'puddle' });
    return 'puddle';
  }
  if (tile.stain) {
    unit.inked = true;
    emit(ctx, { type: 'inked', unit: ref(unit), via: 'stain' });
    return 'stain';
  }
  return null;
}

/** Member move action (legality checked by the caller). */
export function moveMember(ctx: Ctx, m: MemberUnit, to: Coord): void {
  const reach = reachable(ctx.s, m, m.move).get(key(to));
  if (!reach) throw new Error(`${m.name} can't reach ${to.x},${to.y}`);
  const from = m.pos;
  emit(ctx, { type: 'moved', unit: ref(m), to: { ...to }, path: reach.path });
  m.pos = { ...to };
  m.moved = true;
  const inkedBy = settle(ctx, m);
  m.undo = { from, puddle: inkedBy === 'puddle', stain: inkedBy === 'stain' };
}

export function undoMove(ctx: Ctx, m: MemberUnit): void {
  const undo = m.undo;
  if (!undo) throw new Error(`${m.name} has no move to undo`);
  if (undo.puddle) {
    m.inked = false;
    tileAt(ctx.s, m.pos).ink = true;
  } else if (undo.stain) {
    m.inked = false;
  }
  emit(ctx, { type: 'moveUndone', unit: ref(m), to: { ...undo.from } });
  m.pos = { ...undo.from };
  m.moved = false;
  m.undo = null;
}

/** Shove action: uses the member's action, then pushes the adjacent unit. */
export function shove(ctx: Ctx, m: MemberUnit, dir: Dir): void {
  const target = unitAt(ctx.s, step(m.pos, dir));
  if (!target) throw new Error(`Nothing to shove ${dir}`);
  m.acted = true;
  m.undo = null;
  emit(ctx, { type: 'shove', by: ref(m), target: ref(target), dir });
  pushUnit(ctx, target, dir);
}

/** Where a foe may not be moved to: an anchored one nowhere, a swimmer only along water (K-13). */
function heldBack(s: BattleState, u: Unit, to: Coord): string | null {
  if (u.kind !== 'enemy') return null;
  const def = ENEMIES[u.def];
  if (def.anchored) return 'its moorings';
  if (def.habitat === 'water' && inBoard(s, to) && !tileAt(s, to).water) return 'the bank';
  return null;
}

/** One tile away; a blocked push bumps (pushed unit and a blocking unit each take damage). */
export function pushUnit(ctx: Ctx, u: Unit, dir: Dir): void {
  const s = ctx.s;
  const dest = step(u.pos, dir);
  const blocker = inBoard(s, dest) ? unitAt(s, dest) : null;
  const into = !inBoard(s, dest)
    ? 'the edge'
    : heldBack(s, u, dest) !== null
      ? heldBack(s, u, dest)
      : blocksUnits(tileAt(s, dest))
        ? tileAt(s, dest).gate
          ? 'a lock gate'
          : tileAt(s, dest).grate
            ? 'a grate'
            : 'a brass plate'
        : blocker
          ? who(ref(blocker))
          : null;
  if (into !== null) {
    emit(ctx, { type: 'bump', unit: ref(u), into });
    dealDamage(ctx, u, TUNING.bumpDamage, 'Bump');
    if (blocker) dealDamage(ctx, blocker, TUNING.bumpDamage, 'Bump');
    return;
  }
  emit(ctx, { type: 'pushed', unit: ref(u), to: { ...dest } });
  u.pos = dest;
  if (u.kind === 'member') u.undo = null;
  slide(ctx, u, dir);
  settle(ctx, u);
}

/** A unit on oil keeps going until it leaves the oil or something blocks it. No bump damage. */
export function slide(ctx: Ctx, u: Unit, dir: Dir): void {
  const s = ctx.s;
  // Fliers don't touch the oil (K-16).
  if (u.kind === 'enemy' && ENEMIES[u.def].flies) return;
  const start = u.pos;
  const path: Coord[] = [];
  while (tileAt(s, u.pos).oil) {
    const nxt = step(u.pos, dir);
    if (!inBoard(s, nxt) || blocksUnits(tileAt(s, nxt)) || unitAt(s, nxt)) break;
    if (heldBack(s, u, nxt) !== null) break;
    u.pos = nxt;
    path.push({ ...nxt });
  }
  if (path.length) emit(ctx, { type: 'slide', unit: ref(u, start), to: { ...u.pos }, path });
}

/** An enemy walks a BFS path; rats leave oil on every tile they cross (start included). */
export function enemyWalk(ctx: Ctx, e: EnemyUnit, path: readonly Coord[]): void {
  const end = path[path.length - 1];
  if (!end) return;
  const start = e.pos;
  emit(ctx, { type: 'moved', unit: ref(e), to: { ...end }, path: path.map((c) => ({ ...c })) });
  e.pos = { ...end };
  if (ENEMIES[e.def].oilTrail) applyOil(ctx, [start, ...path]);
  if (e.hp > 0) settle(ctx, e);
}
