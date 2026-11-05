import { ENEMIES, TUNING } from '$data';
import { arrive, relocateAll, stainsAlong } from './arrival';
import { type Ctx, emit, ref } from './ctx';
import { type Coord, DIRS, type Dir, key, sameCoord, step } from './grid';
import { slipInFog } from './mix';
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

/** Tiles at the end of a walk taken in one direction (`touch-member-runup`). */
function straightRun(from: Coord, path: readonly Coord[]): number {
  const dir = lastStepDir(from, path);
  let run = 0;
  for (let i = path.length - 1; i >= 0 && dir; i--) {
    const before = path[i - 1] ?? from;
    const here = path[i] as Coord;
    if (!sameCoord(step(before, dir), here)) break;
    run++;
  }
  return run;
}

/** Member move action (legality checked by the caller). A walk enters only its landing (P2). */
export function moveMember(ctx: Ctx, m: MemberUnit, to: Coord): void {
  const reach = reachable(ctx.s, m, m.move).get(key(to));
  if (!reach) throw new Error(`${m.name} can't reach ${to.x},${to.y}`);
  const from = m.pos;
  emit(ctx, {
    type: 'moved',
    unit: ref(m),
    from: { ...from },
    to: { ...to },
    path: reach.path,
    cause: 'walk',
  });
  m.moved = true;
  m.lastMove = lastStepDir(from, reach.path);
  m.run = straightRun(from, reach.path);
  m.undo = { from };
  const seen = ctx.log.length;
  stainsAlong(ctx, m.id, reach.path);
  const r = arrive(ctx, m.id, reach.path, { cause: 'walk', origin: null, landing: true });
  if (!r.interrupted) slipInFog(ctx, m, m.lastMove);
  if (ctx.log.length > seen) m.undo = null; // a jar or a stain answered: the step is final
}

/** Takes a walk back: a placement, not an arrival (it is only possible when nothing answered). */
export function undoMove(ctx: Ctx, m: MemberUnit): void {
  const undo = m.undo;
  if (!undo) throw new Error(`${m.name} has no move to undo`);
  emit(ctx, { type: 'moveUndone', unit: ref(m), to: { ...undo.from } });
  relocateAll(
    ctx,
    [{ unit: m.id, from: { ...m.pos }, to: { ...undo.from }, path: [{ ...undo.from }] }],
    'restore',
    null,
  );
  m.moved = false;
  m.lastMove = null;
  m.run = 0;
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
    emit(ctx, { type: 'landed', kind: 'oil', at: { ...c }, makes: 'slick' });
    t.state = { id: 'slick', rounds: 0, origin: null };
  }
}

/** An enemy walks a BFS path; rats leave a slick on every tile they cross (start included). */
export function enemyWalk(ctx: Ctx, e: EnemyUnit, path: readonly Coord[]): void {
  const end = path[path.length - 1];
  if (!end) return;
  const start = { ...e.pos };
  emit(ctx, {
    type: 'moved',
    unit: ref(e),
    from: start,
    to: { ...end },
    path: path.map((c) => ({ ...c })),
    cause: 'walk',
  });
  e.lastMove = lastStepDir(start, path);
  if (ENEMIES[e.def].oilTrail) leaveSlick(ctx, [start, ...path]);
  stainsAlong(ctx, e.id, path);
  const r = arrive(ctx, e.id, path, { cause: 'walk', origin: null, landing: true });
  if (!r.interrupted) slipInFog(ctx, e, e.lastMove);
}
