import { ENEMIES, TUNING } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { type Coord, DIRS, type Dir, key, sameCoord, step } from './grid';
import { notify } from './hooks';
import { push } from './push';
import { reachable, tileAt, unitAt } from './queries';
import type { EnemyUnit, MemberUnit } from './types';

/** The direction of the last step of a walk (P22: Touch on yourself takes it). */
function lastStepDir(from: Coord, path: readonly Coord[]): Dir | null {
  const end = path[path.length - 1];
  if (!end) return null;
  const before = path[path.length - 2] ?? from;
  return DIRS.find((d) => sameCoord(step(before, d), end)) ?? null;
}

/** Member move action (legality checked by the caller). */
export function moveMember(ctx: Ctx, m: MemberUnit, to: Coord): void {
  const reach = reachable(ctx.s, m, m.move).get(key(to));
  if (!reach) throw new Error(`${m.name} can't reach ${to.x},${to.y}`);
  const from = m.pos;
  emit(ctx, { type: 'moved', unit: ref(m), to: { ...to }, path: reach.path });
  m.pos = { ...to };
  m.moved = true;
  m.lastMove = lastStepDir(from, reach.path);
  m.undo = { from };
  notify(ctx, { kind: 'entered', unit: m.id, at: { ...to } });
}

export function undoMove(ctx: Ctx, m: MemberUnit): void {
  const undo = m.undo;
  if (!undo) throw new Error(`${m.name} has no move to undo`);
  emit(ctx, { type: 'moveUndone', unit: ref(m), to: { ...undo.from } });
  m.pos = { ...undo.from };
  m.moved = false;
  m.lastMove = null;
  m.undo = null;
}

/** Shove action (P12): uses the member's action, then pushes the adjacent unit one tile. */
export function shove(ctx: Ctx, m: MemberUnit, dir: Dir): void {
  const target = unitAt(ctx.s, step(m.pos, dir));
  if (!target) throw new Error(`Nothing to shove ${dir}`);
  m.acted = true;
  m.undo = null;
  emit(ctx, { type: 'shove', by: ref(m), target: ref(target), dir });
  push(ctx, target, dir, TUNING.shoveTiles, null);
}

/** Lays a slick on the tiles a rat ran over, where nothing else lies (W0b; E2 may route it through `landKind`). */
function leaveSlick(ctx: Ctx, tiles: readonly Coord[]): void {
  for (const c of tiles) {
    const t = tileAt(ctx.s, c);
    if (t.state !== null) continue;
    t.state = { id: 'slick', rounds: 0, origin: null };
    emit(ctx, { type: 'landed', kind: 'oil', at: { ...c }, makes: 'slick' });
  }
}

/** An enemy walks a BFS path; rats leave a slick on every tile they cross (start included). */
export function enemyWalk(ctx: Ctx, e: EnemyUnit, path: readonly Coord[]): void {
  const end = path[path.length - 1];
  if (!end) return;
  const start = e.pos;
  emit(ctx, { type: 'moved', unit: ref(e), to: { ...end }, path: path.map((c) => ({ ...c })) });
  e.pos = { ...end };
  e.lastMove = lastStepDir(start, path);
  if (ENEMIES[e.def].oilTrail) leaveSlick(ctx, [start, ...path]);
  if (e.hp > 0) notify(ctx, { kind: 'entered', unit: e.id, at: { ...end } });
}
