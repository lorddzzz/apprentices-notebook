import { ATTACKS, TUNING } from '$data';
import {
  byReadingOrder,
  type Coord,
  chebyshev,
  DIRS,
  type Dir,
  inBounds,
  key,
  neighbors4,
  parseKey,
  sameCoord,
  square,
  step,
} from './grid';
import type {
  Aim,
  BattleState,
  CellKey,
  EnemyUnit,
  MemberUnit,
  Spell,
  SpellKey,
  Tile,
  Unit,
  UnitId,
} from './types';

/**
 * Pure reads on a BattleState. Nothing here mutates; lookups return the objects inside the state,
 * which only the engine's draft code (ctx.ts) is allowed to change.
 */

// ── Lookup ──────────────────────────────────────────────

export function inBoard(s: BattleState, c: Coord): boolean {
  return inBounds(c, s.width, s.height);
}

export function tileAt(s: BattleState, c: Coord): Tile {
  const t = inBoard(s, c) ? s.tiles[c.y * s.width + c.x] : undefined;
  if (!t) throw new Error(`No tile at ${c.x},${c.y}`);
  return t;
}

export function isAlive(u: Unit): boolean {
  return u.hp > 0;
}

export function livingUnits(s: BattleState): Unit[] {
  return s.units.filter(isAlive);
}

/** All party members, including downed ones (hp 0). */
export function members(s: BattleState): MemberUnit[] {
  return s.units.filter((u): u is MemberUnit => u.kind === 'member');
}

/** All enemies, including dead ones (hp 0). */
export function enemies(s: BattleState): EnemyUnit[] {
  return s.units.filter((u): u is EnemyUnit => u.kind === 'enemy');
}

/** The living unit standing on `c`, if any. */
export function unitAt(s: BattleState, c: Coord): Unit | null {
  return s.units.find((u) => isAlive(u) && sameCoord(u.pos, c)) ?? null;
}

export function findUnit(s: BattleState, id: UnitId): Unit | null {
  return s.units.find((u) => u.id === id) ?? null;
}

export function unitById(s: BattleState, id: UnitId): Unit {
  const u = findUnit(s, id);
  if (!u) throw new Error(`No unit ${id}`);
  return u;
}

export function memberById(s: BattleState, id: UnitId): MemberUnit {
  const u = unitById(s, id);
  if (u.kind !== 'member') throw new Error(`${id} is not a party member`);
  return u;
}

/** Free to walk or be pushed onto: on the board, no plate, no living unit. */
export function isOpen(s: BattleState, c: Coord, ignore?: UnitId): boolean {
  if (!inBoard(s, c) || tileAt(s, c).plate) return false;
  const u = unitAt(s, c);
  return u === null || u.id === ignore;
}

/** A plate, or a tile holding a living brass unit (sentry or brass-coated). */
export function isBrassTile(s: BattleState, c: Coord): boolean {
  return tileAt(s, c).plate || unitAt(s, c)?.brass === true;
}

const sorted = (cs: Coord[]): Coord[] => [...cs].sort(byReadingOrder);

/** Tiles in reading order, clipped to the board, deduplicated. */
export function clip(s: BattleState, cs: readonly Coord[]): Coord[] {
  const seen = new Map<CellKey, Coord>();
  for (const c of cs) if (inBoard(s, c) && !seen.has(key(c))) seen.set(key(c), { ...c });
  return sorted([...seen.values()]);
}

/** Material footprint: union of Chebyshev squares of radius magnitude − 1 around each target. */
export function footprint(s: BattleState, targets: readonly Coord[], magnitude: number): Coord[] {
  const r = Math.max(0, magnitude - 1);
  return clip(
    s,
    targets.flatMap((t) => square(t, r)),
  );
}

// ── Floods ──────────────────────────────────────────────

/** Orthogonal flood from `start` over tiles matching `pass`; reading order. */
export function flood(s: BattleState, start: Coord, pass: (c: Coord) => boolean): Coord[] {
  if (!inBoard(s, start) || !pass(start)) return [];
  const seen = new Set<CellKey>([key(start)]);
  const queue: Coord[] = [{ ...start }];
  const out: Coord[] = [];
  for (let c = queue.shift(); c; c = queue.shift()) {
    out.push(c);
    for (const n of neighbors4(c)) {
      if (inBoard(s, n) && !seen.has(key(n)) && pass(n)) {
        seen.add(key(n));
        queue.push(n);
      }
    }
  }
  return sorted(out);
}

export function steamCloud(s: BattleState, start: Coord): Coord[] {
  return flood(s, start, (c) => tileAt(s, c).steam > 0);
}

export function brassNet(s: BattleState, start: Coord): Coord[] {
  return flood(s, start, (c) => isBrassTile(s, c));
}

/** Unlit, steam-free oil connected to `start`: what one ignition sets on fire. */
export function oilRegion(s: BattleState, start: Coord): Coord[] {
  return flood(s, start, (c) => {
    const t = tileAt(s, c);
    return t.oil && t.fire === 0 && t.steam === 0;
  });
}

// ── Projectiles ─────────────────────────────────────────

export type Travel =
  | { reason: 'none'; path: Coord[]; stop: null }
  | { reason: 'steam' | 'brass' | 'end'; path: Coord[]; stop: Coord }
  | { reason: 'unit'; path: Coord[]; stop: Coord; unit: Unit };

/** A projectile's flight. Steam is checked first: a unit inside a cloud is shielded. */
export function travel(
  s: BattleState,
  from: Coord,
  dir: Dir,
  range: number,
  ignore?: UnitId,
): Travel {
  const path: Coord[] = [];
  let cur = from;
  for (let i = 0; i < range; i++) {
    const nxt = step(cur, dir);
    if (!inBoard(s, nxt)) break;
    path.push(nxt);
    cur = nxt;
    if (tileAt(s, nxt).steam > 0) return { reason: 'steam', path, stop: nxt };
    const u = unitAt(s, nxt);
    if (u && u.id !== ignore) return { reason: 'unit', path, stop: nxt, unit: u };
    if (tileAt(s, nxt).plate) return { reason: 'brass', path, stop: nxt };
  }
  const last = path[path.length - 1];
  return last ? { reason: 'end', path, stop: last } : { reason: 'none', path: [], stop: null };
}

export function boltRange(s: BattleState): number {
  return Math.max(s.width, s.height);
}

// ── Movement ────────────────────────────────────────────

export interface Reach {
  dist: number;
  path: Coord[]; // excludes the start tile
}

/** BFS (DIRS order) up to `move` steps through open tiles. Destinations exclude the start. */
export function reachable(s: BattleState, unit: Unit, move: number): Map<CellKey, Reach> {
  const out = new Map<CellKey, Reach>();
  const seen = new Set<CellKey>([key(unit.pos)]);
  let frontier: Reach[] = [{ dist: 0, path: [] }];
  const at = (r: Reach): Coord => r.path[r.path.length - 1] ?? unit.pos;
  for (let d = 1; d <= move; d++) {
    const next: Reach[] = [];
    for (const r of frontier) {
      for (const dir of DIRS) {
        const n = step(at(r), dir);
        if (seen.has(key(n)) || !isOpen(s, n)) continue;
        seen.add(key(n));
        const reach = { dist: d, path: [...r.path, n] };
        out.set(key(n), reach);
        next.push(reach);
      }
    }
    frontier = next;
  }
  return out;
}

/** BFS distances from `target` over open tiles (`self`'s own tile counts as open). */
export function distanceField(s: BattleState, target: Coord, self?: UnitId): Map<CellKey, number> {
  const dist = new Map<CellKey, number>([[key(target), 0]]);
  const queue: Coord[] = [target];
  for (let c = queue.shift(); c; c = queue.shift()) {
    const d = dist.get(key(c)) ?? 0;
    for (const n of neighbors4(c)) {
      if (dist.has(key(n)) || !isOpen(s, n, self)) continue;
      dist.set(key(n), d + 1);
      queue.push(n);
    }
  }
  return dist;
}

const playerTurn = (s: BattleState): boolean => s.phase === 'player';

function activeMember(s: BattleState, id: UnitId): MemberUnit | null {
  const u = findUnit(s, id);
  return u && u.kind === 'member' && isAlive(u) && playerTurn(s) ? u : null;
}

/** Tiles the member can move to now, reading order. [] if it already moved. */
export function legalMoves(s: BattleState, id: UnitId): Coord[] {
  const m = activeMember(s, id);
  if (!m || m.moved) return [];
  return sorted([...reachable(s, m, m.move).keys()].map(parseKey));
}

export function canUndoMove(s: BattleState, id: UnitId): boolean {
  const m = activeMember(s, id);
  return !!m?.undo && isOpen(s, m.undo.from);
}

export function shoveDirs(s: BattleState, id: UnitId): Dir[] {
  const m = activeMember(s, id);
  if (!m || m.acted) return [];
  return DIRS.filter((d) => unitAt(s, step(m.pos, d)) !== null);
}

// ── Casting ─────────────────────────────────────────────

export function spellOf(m: MemberUnit, key: SpellKey): Spell | null {
  return m.spells.find((sp) => sp.key === key) ?? null;
}

export function castableSpells(
  s: BattleState,
  id: UnitId,
): { spell: Spell; charges: number; usable: boolean }[] {
  const u = findUnit(s, id);
  if (u?.kind !== 'member') return [];
  const ready = activeMember(s, id) !== null && !u.acted;
  return u.spells.map((spell) => {
    const charges = u.charges[spell.key] ?? 0;
    return { spell, charges, usable: ready && (s.lab || charges > 0) };
  });
}

/** Every aim the spell accepts from the member's current tile. */
export function legalAims(s: BattleState, id: UnitId, spellKey: SpellKey): Aim[] {
  const m = findUnit(s, id);
  if (m?.kind !== 'member' || !isAlive(m)) return [];
  const spell = spellOf(m, spellKey);
  if (!spell) return [];
  switch (spell.source) {
    case 'bolt':
    case 'quill':
      return DIRS.filter((d) => inBoard(s, step(m.pos, d))).map((dir) => ({ kind: 'dir', dir }));
    case 'splash':
      return s.tiles
        .map((_, i) => ({ x: i % s.width, y: Math.floor(i / s.width) }))
        .filter((c) => chebyshev(m.pos, c) <= TUNING.splashRange)
        .map((at) => ({ kind: 'tile', at }));
    case 'ward': {
      const allies = DIRS.map((d) => unitAt(s, step(m.pos, d))).filter(
        (u): u is Unit => u?.kind === 'member',
      );
      return [m, ...allies].map((u) => ({ kind: 'ally', unit: u.id }));
    }
  }
}

export function sameAim(a: Aim, b: Aim): boolean {
  switch (a.kind) {
    case 'dir':
      return b.kind === 'dir' && a.dir === b.dir;
    case 'tile':
      return b.kind === 'tile' && sameCoord(a.at, b.at);
    case 'ally':
      return b.kind === 'ally' && a.unit === b.unit;
  }
}

/** Projectile path and the tiles the source effect lands on (what later runes apply to). */
export function aimPreview(
  s: BattleState,
  id: UnitId,
  spellKey: SpellKey,
  aim: Aim,
): { path: Coord[]; targets: Coord[] } {
  const m = findUnit(s, id);
  const spell = m?.kind === 'member' ? spellOf(m, spellKey) : null;
  if (!m || !spell) return { path: [], targets: [] };
  if ((spell.source === 'bolt' || spell.source === 'quill') && aim.kind === 'dir') {
    const r = travel(s, m.pos, aim.dir, boltRange(s), m.id);
    return { path: r.path, targets: r.stop ? [r.stop] : [] };
  }
  if (spell.source === 'splash' && aim.kind === 'tile') {
    return { path: [], targets: clip(s, square(aim.at, TUNING.splashRadius)) };
  }
  if (spell.source === 'ward' && aim.kind === 'ally') {
    const ally = findUnit(s, aim.unit);
    return { path: [], targets: ally && isAlive(ally) ? [{ ...ally.pos }] : [] };
  }
  return { path: [], targets: [] };
}

/** Danger overlay: where a telegraphed attack travels and which tile it would hit now. */
export function intentPreview(
  s: BattleState,
  enemy: EnemyUnit,
): { path: Coord[]; hit: Coord | null } | null {
  if (!enemy.intent || !isAlive(enemy)) return null;
  const att = ATTACKS[enemy.intent.attack];
  if (att.kind === 'adjacent') {
    const t = step(enemy.pos, enemy.intent.dir);
    if (!inBoard(s, t)) return { path: [], hit: null };
    return { path: [t], hit: unitAt(s, t) ? t : null };
  }
  const r = travel(s, enemy.pos, enemy.intent.dir, att.range, enemy.id);
  return { path: r.path, hit: r.reason === 'unit' ? r.stop : null };
}
