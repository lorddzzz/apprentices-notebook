import { APPRENTICE_IDS, ATTACKS, ENEMIES } from '$data';
import { type Ctx, emit, ref } from './ctx';
import { foeAct } from './foes';
import { byReadingOrder, type Coord, DIRS, type Dir, key, sameCoord, step } from './grid';
import { enemyWalk } from './movement';
import { distanceField, isAlive, members, reachable, travel, unitAt } from './queries';
import { rivalAct } from './rivals/resolve';
import type { BattleState, EnemyUnit, MemberUnit } from './types';

/**
 * Enemy planning. Fully deterministic and rng-free: BFS in DIRS order, ties broken by distance,
 * then path length, then reading order. Enemies plan, walk and telegraph one at a time in unit
 * order, so later enemies see earlier moves; that order is also the intent order.
 */

export interface EnemyPhaseOptions {
  move: boolean; // false in round 1: enemies telegraph without moving
}

/** A place to stand this phase. `path` excludes the start; an empty path means staying put. */
interface Candidate {
  at: Coord;
  path: Coord[];
}

export function candidatesOf(s: BattleState, e: EnemyUnit, move: boolean): Candidate[] {
  const stay: Candidate = { at: e.pos, path: [] };
  if (!move) return [stay];
  const walks = [...reachable(s, e, ENEMIES[e.def].move).values()].map((r) => ({
    at: r.path[r.path.length - 1] ?? e.pos,
    path: r.path,
  }));
  walks.sort((a, b) => a.path.length - b.path.length || byReadingOrder(a.at, b.at));
  return [stay, ...walks];
}

/** Registry order (HC P15): stable and seed-independent, whoever is in the party. */
const MEMBER_RANK = new Map(APPRENTICE_IDS.map((id, i) => [id, i]));

/** Nearest living member by walking distance; ties go to the one earlier in the registry. */
export function nearestMember(s: BattleState, e: EnemyUnit): MemberUnit | null {
  const living = members(s)
    .filter(isAlive)
    .sort((a, b) => (MEMBER_RANK.get(a.def) ?? 0) - (MEMBER_RANK.get(b.def) ?? 0));
  let best: { m: MemberUnit; d: number } | null = null;
  for (const m of living) {
    const d = distanceField(s, m.pos, e.id).get(key(e.pos)) ?? Number.POSITIVE_INFINITY;
    if (!best || d < best.d) best = { m, d };
  }
  return best?.m ?? null;
}

/** The candidate that gets closest to the target: (distance, path length, reading order). */
export function closestTo(s: BattleState, e: EnemyUnit, target: MemberUnit, cands: Candidate[]) {
  const field = distanceField(s, target.pos, e.id);
  const dist = (c: Candidate) => field.get(key(c.at)) ?? Number.POSITIVE_INFINITY;
  let best = cands[0];
  for (const c of cands) {
    if (!best) {
      best = c;
      continue;
    }
    const d = dist(c) - dist(best);
    if (d < 0 || (d === 0 && c.path.length < best.path.length)) best = c;
    else if (d === 0 && c.path.length === best.path.length && byReadingOrder(c.at, best.at) < 0) {
      best = c;
    }
  }
  return best;
}

/** First (candidate, direction) whose projectile stops on a living party member. */
function lineUp(
  s: BattleState,
  e: EnemyUnit,
  cands: Candidate[],
  range: number,
): { cand: Candidate; dir: Dir } | null {
  for (const cand of cands) {
    for (const dir of DIRS) {
      const r = travel(s, cand.at, dir, range, e.id);
      if (r.reason === 'unit' && r.unit.kind === 'member') return { cand, dir };
    }
  }
  return null;
}

/** Dominant axis toward the target; a tie shoots vertically. */
function axisToward(from: Coord, to: Coord): Dir {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dy) >= Math.abs(dx)) return dy < 0 ? 'up' : 'down';
  return dx < 0 ? 'left' : 'right';
}

/** Bite direction: toward the target if it is adjacent, else the first adjacent member. */
export function adjacentDir(s: BattleState, e: EnemyUnit, target: MemberUnit): Dir | null {
  const adjacent = DIRS.filter((d) => unitAt(s, step(e.pos, d))?.kind === 'member');
  return adjacent.find((d) => sameCoord(step(e.pos, d), target.pos)) ?? adjacent[0] ?? null;
}

/** The first direction (DIRS order) with a member beside the enemy. */
export function firstAdjacentMember(s: BattleState, e: EnemyUnit): Dir | null {
  return DIRS.find((d) => unitAt(s, step(e.pos, d))?.kind === 'member') ?? null;
}

function idle(ctx: Ctx, e: EnemyUnit): void {
  e.intent = null;
  emit(ctx, { type: 'idle', unit: ref(e) });
}

/** Plans, walks and telegraphs one enemy. Returns true if it telegraphed an attack. */
function act(ctx: Ctx, e: EnemyUnit, canMove: boolean, order: number): boolean {
  // A held or shackled foe can't move by itself (Hold, Shackle).
  const move = canMove && e.held === 0 && e.shackle === 0;
  if (e.rival) return rivalAct(ctx, e, order);
  const def = ENEMIES[e.def];
  const attack = def.attack;
  if (def.ai === 'lurker' || def.ai === 'moth' || def.ai === 'mother') {
    return foeAct(ctx, e, move, order);
  }
  const target = nearestMember(ctx.s, e);
  if (def.ai === 'idle' || !attack || !target) {
    idle(ctx, e);
    return false;
  }
  const cands = candidatesOf(ctx.s, e, move);
  let walk: Coord[];
  let dir: Dir | null = null;
  if (def.ai === 'chaser') {
    walk = closestTo(ctx.s, e, target, cands)?.path ?? [];
  } else {
    const hit = lineUp(ctx.s, e, cands, ATTACKS[attack].range);
    walk = hit ? hit.cand.path : (closestTo(ctx.s, e, target, cands)?.path ?? []);
    dir = hit?.dir ?? null;
  }
  enemyWalk(ctx, e, walk);
  if (!isAlive(e)) return false;
  if (def.ai === 'chaser') dir = adjacentDir(ctx.s, e, target);
  else if (!dir && isAlive(target)) dir = axisToward(e.pos, target.pos);
  if (!dir) {
    idle(ctx, e);
    return false;
  }
  const intent = { kind: 'attack', attack, dir, order } as const;
  e.intent = intent;
  emit(ctx, {
    type: 'telegraph',
    unit: ref(e),
    intent: { ...intent },
    verb: ATTACKS[attack].verb,
  });
  return true;
}

/** Every living enemy moves (unless `move` is false) and telegraphs, in unit order. */
export function enemyPhase(ctx: Ctx, opts: EnemyPhaseOptions): void {
  let order = 0;
  for (const e of ctx.s.units) {
    if (e.kind !== 'enemy' || !isAlive(e)) continue;
    e.intent = null;
    if (!members(ctx.s).some(isAlive)) return;
    if (e.stunned) {
      e.stunned = false; // a dropped elite loses its next action
      idle(ctx, e);
      continue;
    }
    if (act(ctx, e, opts.move, order + 1)) order++;
  }
}
