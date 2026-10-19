import { ATTACKS, ENEMIES, TUNING } from '$data';
import { adjacentDir, candidatesOf, closestTo, firstAdjacentMember, nearestMember } from './ai';
import { type Ctx, emit, ref } from './ctx';
import { burnGates } from './current';
import { dealDamage, kill } from './damage';
import { byReadingOrder, type Coord, DIRS, type Dir, key, neighbors4, step } from './grid';
import { enemyWalk } from './movement';
import {
  coordOf,
  enemies,
  flood,
  inBoard,
  isAlive,
  isFire,
  isPlate,
  members,
  tileAt,
  unitAt,
} from './queries';
import type { BattleState, EnemyUnit, Intent, SpecialIntent, Unit } from './types';

/**
 * The canal foes (K-13 to K-17): the eel's lurking, the moth's flight and burst, snuffing and the
 * lamp-mother's summon and flare. `ai.ts` dispatches the new AIs to `foeAct`.
 */

const MOTHS_AT_MOST = 4;
const FLARE_EVERY = 3;

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** A fresh enemy unit (mirrors `spawnEnemy` in battle.ts) with the next free id for its def. */
export function makeEnemy(s: BattleState, defId: EnemyUnit['def'], at: Coord): EnemyUnit {
  const def = ENEMIES[defId];
  const taken = s.units
    .filter((u) => u.def === defId)
    .map((u) => Number(u.id.slice(u.id.lastIndexOf('-') + 1)));
  return {
    kind: 'enemy',
    id: `${def.id}-${Math.max(0, ...taken) + 1}`,
    def: def.id,
    name: def.name,
    pos: { ...at },
    hp: def.hp,
    maxHp: def.hp,
    shield: 0,
    guardUntil: null,
    mark: null,
    collar: def.brass ? null : false,
    shackle: 0,
    held: 0,
    stunned: false,
    elite: def.elite,
    lastMove: null,
    intent: null,
  };
}

// ── Snuffing ────────────────────────────────────────────

/** Snuffers and the lamp-mother put out the fire in their 3×3, last in `hazards` (K-15). */
export function snuffStep(ctx: Ctx): void {
  const s = ctx.s;
  for (const e of enemies(s)) {
    if (!isAlive(e) || !ENEMIES[e.def].snuffs) continue;
    const tiles: Coord[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = { x: e.pos.x + dx, y: e.pos.y + dy };
        if (inBoard(s, c) && isFire(tileAt(s, c))) tiles.push(c);
      }
    }
    if (!tiles.length) continue;
    tiles.sort(byReadingOrder);
    for (const c of tiles) tileAt(s, c).state = null;
    emit(ctx, { type: 'snuff', by: ref(e), tiles });
  }
}

// ── Bursting ────────────────────────────────────────────

/** A moth's flame lights the slick it bursts on, and the slick connected to it. */
function lightSlick(ctx: Ctx, at: Coord): void {
  const s = ctx.s;
  const slick = flood(s, at, (c) => tileAt(s, c).state?.id === 'slick');
  if (!slick.length) return;
  for (const c of slick) {
    tileAt(s, c).state = { id: 'fire', rounds: TUNING.fireRounds, origin: null };
  }
  const burning = slick.flatMap((c) => unitAt(s, c) ?? []);
  emit(ctx, {
    type: 'burst',
    burst: 'fire',
    at: { ...at },
    tiles: slick,
    units: burning.map((u) => ref(u)),
  });
  burnGates(ctx);
  for (const u of burning) dealDamage(ctx, u, TUNING.fireDamage, 'Fire');
}

/**
 * A moth bursts: lights the slick on its tile, 1 to each orthogonal neighbour, dies; bursts chain
 * (K-16). Called by `kill` when a moth dies (it is already dead then) and for a burst on purpose.
 */
export function foeBurst(ctx: Ctx, unit: Unit): void {
  emit(ctx, { type: 'foeBursts', unit: ref(unit), at: { ...unit.pos } });
  if (unit.hp > 0) {
    unit.hp = 0;
    kill(ctx, unit, false);
  }
  lightSlick(ctx, unit.pos);
  for (const n of neighbors4(unit.pos).sort(byReadingOrder)) {
    const victim = inBoard(ctx.s, n) ? unitAt(ctx.s, n) : null;
    if (victim) dealDamage(ctx, victim, ATTACKS.burst.damage, ATTACKS.burst.name);
  }
}

// ── The lamp-mother ─────────────────────────────────────

const livingMoths = (s: BattleState): EnemyUnit[] =>
  enemies(s).filter((e) => isAlive(e) && ENEMIES[e.def].bursts);

/** The lamp nearest a member (ties: reading order). Null if the board has none. */
function summonLamp(s: BattleState): Coord | null {
  const living = members(s).filter(isAlive);
  let best: { at: Coord; d: number } | null = null;
  s.tiles.forEach((t, i) => {
    if (!t.terrain.lamp) return;
    const at = coordOf(s, i);
    const d = Math.min(...living.map((m) => manhattan(at, m.pos)));
    if (!best || d < best.d) best = { at, d };
  });
  return (best as { at: Coord } | null)?.at ?? null;
}

const canSummonAt = (s: BattleState, at: Coord): boolean =>
  unitAt(s, at) === null && livingMoths(s).length < MOTHS_AT_MOST;

const flareRound = (s: BattleState): boolean => s.round % FLARE_EVERY === 0;

/** Resolves a telegraphed summon or flare (K-17): the moth comes at the lamp she lit. */
export function resolveSpecial(ctx: Ctx, e: EnemyUnit, intent: SpecialIntent): void {
  if (!isAlive(e)) return;
  if (intent.kind === 'flare') {
    emit(ctx, { type: 'flare', by: ref(e) });
    const moths = livingMoths(ctx.s).sort((a, b) => byReadingOrder(a.pos, b.pos));
    for (const m of moths) if (isAlive(m)) foeBurst(ctx, m);
    return;
  }
  const at = intent.at;
  if (!canSummonAt(ctx.s, at)) return;
  const moth = makeEnemy(ctx.s, 'moth', at);
  ctx.s.units.push(moth);
  emit(ctx, { type: 'summon', by: ref(e), unit: ref(moth), at: { ...at } });
}

// ── Planning ────────────────────────────────────────────

function telegraph(ctx: Ctx, e: EnemyUnit, intent: Intent, verb: string): true {
  e.intent = intent;
  emit(ctx, { type: 'telegraph', unit: ref(e), intent: { ...intent }, verb });
  return true;
}

function idle(ctx: Ctx, e: EnemyUnit): false {
  e.intent = null;
  emit(ctx, { type: 'idle', unit: ref(e) });
  return false;
}

/** Telegraphs the foe's attack at an adjacent member (`prefer` first), if there is one. */
function strikeAdjacent(ctx: Ctx, e: EnemyUnit, order: number, prefer: Unit | null): boolean {
  const attack = ENEMIES[e.def].attack;
  const dir: Dir | null =
    prefer && prefer.kind === 'member'
      ? adjacentDir(ctx.s, e, prefer)
      : firstAdjacentMember(ctx.s, e);
  if (!attack || !dir) return idle(ctx, e);
  return telegraph(ctx, e, { kind: 'attack', attack, dir, order }, ATTACKS[attack].verb);
}

/** Water the eel may swim: a lane tile with no plate, grate, gate or other unit on it. */
function swimmable(s: BattleState, c: Coord, self: string): boolean {
  if (!inBoard(s, c)) return false;
  const t = tileAt(s, c);
  if (!t.terrain.water || t.terrain.grate || t.terrain.gate || isPlate(t)) return false;
  const u = unitAt(s, c);
  return u === null || u.id === self;
}

/** BFS over swimmable water (DIRS order), the whole lane: tile key to the path from `e` to it. */
function swimPaths(s: BattleState, e: EnemyUnit): Map<string, Coord[]> {
  const paths = new Map<string, Coord[]>([[key(e.pos), []]]);
  const queue: Coord[] = [e.pos];
  for (let c = queue.shift(); c; c = queue.shift()) {
    const here = paths.get(key(c)) ?? [];
    for (const d of DIRS) {
      const n = step(c, d);
      if (paths.has(key(n)) || !swimmable(s, n, e.id)) continue;
      paths.set(key(n), [...here, n]);
      queue.push(n);
    }
  }
  return paths;
}

/** Swims toward the water tile beside the nearest reachable member, then lunges if one is beside it. */
function planEel(ctx: Ctx, e: EnemyUnit, move: boolean, order: number): boolean {
  const s = ctx.s;
  const paths = swimPaths(s, e);
  let best: { len: number; at: Coord; m: Unit } | null = null;
  for (const m of members(s).filter(isAlive)) {
    for (const n of neighbors4(m.pos)) {
      const len = paths.get(key(n))?.length;
      if (len === undefined) continue;
      if (
        !best ||
        len < best.len ||
        (len === best.len && m === best.m && byReadingOrder(n, best.at) < 0)
      ) {
        best = { len, at: n, m };
      }
    }
  }
  if (best && move) {
    const walk = (paths.get(key(best.at)) ?? []).slice(0, ENEMIES[e.def].move);
    enemyWalk(ctx, e, walk);
    if (!isAlive(e)) return false;
  }
  return strikeAdjacent(ctx, e, order, best?.m ?? null);
}

/** Nearest fire by distance (ties: reading order), or null. */
function nearestFire(s: BattleState, from: Coord): Coord | null {
  let best: { at: Coord; d: number } | null = null;
  s.tiles.forEach((t, i) => {
    if (!isFire(t)) return;
    const at = coordOf(s, i);
    const d = manhattan(at, from);
    if (!best || d < best.d) best = { at, d };
  });
  return (best as { at: Coord } | null)?.at ?? null;
}

/** Flies toward the nearest fire, else the nearest member; telegraphs Burst on an adjacent member. */
function planMoth(ctx: Ctx, e: EnemyUnit, move: boolean, order: number): boolean {
  const s = ctx.s;
  const target = nearestMember(s, e);
  const fire = nearestFire(s, e.pos);
  if (move && fire) {
    const cands = candidatesOf(s, e, true);
    let pick = cands[0];
    for (const c of cands) {
      if (!pick) break;
      const d = manhattan(c.at, fire) - manhattan(pick.at, fire);
      const shorter = c.path.length - pick.path.length;
      if (
        d < 0 ||
        (d === 0 && (shorter < 0 || (shorter === 0 && byReadingOrder(c.at, pick.at) < 0)))
      ) {
        pick = c;
      }
    }
    enemyWalk(ctx, e, pick?.path ?? []);
  } else if (move && target) {
    enemyWalk(ctx, e, closestTo(s, e, target, candidatesOf(s, e, true))?.path ?? []);
  }
  if (!isAlive(e)) return false;
  return strikeAdjacent(ctx, e, order, target);
}

/** Flares every third round, else calls a moth at the lamp nearest a member (unless blocked). */
function planMother(ctx: Ctx, e: EnemyUnit, order: number): boolean {
  const s = ctx.s;
  if (flareRound(s)) return telegraph(ctx, e, { kind: 'flare', order }, 'flare');
  const at = summonLamp(s);
  if (!at || !canSummonAt(s, at)) return idle(ctx, e);
  return telegraph(ctx, e, { kind: 'summon', at, order }, 'call a moth');
}

/**
 * Plans, moves and telegraphs a foe with a canal AI (`lurker`, `moth`, `mother`). Returns true if it
 * telegraphed (it then takes intent `order`).
 */
export function foeAct(ctx: Ctx, e: EnemyUnit, move: boolean, order: number): boolean {
  e.intent = null;
  switch (ENEMIES[e.def].ai) {
    case 'lurker':
      return planEel(ctx, e, move, order);
    case 'moth':
      return planMoth(ctx, e, move, order);
    case 'mother':
      return planMother(ctx, e, order);
    default:
      return idle(ctx, e);
  }
}
