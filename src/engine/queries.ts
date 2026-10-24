import { ATTACKS, type CompoundId, RUNES, type StateId, TUNING } from '$data';
import type { DraftOptions } from './ctx';
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
  step,
} from './grid';
import { habitRule } from './habits';
import { pieceBlocksShots, pieceBlocksUnits } from './pieces';
import { aimTargets, boltTravel, whereIs } from './resolve';
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

export function coordOf(s: BattleState, i: number): Coord {
  return { x: i % s.width, y: Math.floor(i / s.width) };
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

// ── Tile states ─────────────────────────────────────────

type LayerId = StateId | CompoundId;
/** States and compounds that stand up like a plate: they block units, walks and lines. */
const PLATES: ReadonlySet<LayerId> = new Set(['plate', 'skidPlate', 'kettle', 'wall']);
/** States and compounds that are a cloud: they block sight and lines (design §4.1). */
const CLOUDS: ReadonlySet<LayerId> = new Set(['cloud', 'brandCloud', 'greaseFog', 'bank']);

export const hasState = (t: Tile, id: LayerId): boolean => t.state?.id === id;
export const isPlate = (t: Tile): boolean => !!t.state && PLATES.has(t.state.id);
export const isCloud = (t: Tile): boolean => !!t.state && CLOUDS.has(t.state.id);
export const isFire = (t: Tile): boolean => t.state?.id === 'fire';

const standsUp = (t: Tile): boolean => isPlate(t) || t.terrain.gate || t.terrain.grate;
/**
 * Plates, wooden gates, grates and solid board pieces stop units and walks (K-10, K-11, DK-4).
 * Pushes, placement and spreading states treat a solid piece like a plate.
 */
export const blocksUnits = (t: Tile): boolean => standsUp(t) || pieceBlocksUnits(t);
/** What stops a projectile or a line: the same, but only `unitsAndShots` pieces (P10). */
export const blocksShots = (t: Tile): boolean => standsUp(t) || pieceBlocksShots(t);

export type Blocker = 'brass plate' | 'lock gate' | 'grate' | 'piece';
/** What a projectile stopped at on a `blocksShots` tile, for the log. */
export const blockerName = (t: Tile): Blocker =>
  t.terrain.gate
    ? 'lock gate'
    : t.terrain.grate
      ? 'grate'
      : isPlate(t) || !t.piece
        ? 'brass plate'
        : 'piece';

/** Free to walk or be pushed onto: on the board, no plate, gate or grate, no living unit. */
export function isOpen(s: BattleState, c: Coord, ignore?: UnitId): boolean {
  if (!inBoard(s, c) || blocksUnits(tileAt(s, c))) return false;
  const u = unitAt(s, c);
  return u === null || u.id === ignore;
}

const sorted = (cs: Coord[]): Coord[] => [...cs].sort(byReadingOrder);

/** Tiles in reading order, clipped to the board, deduplicated. */
export function clip(s: BattleState, cs: readonly Coord[]): Coord[] {
  const seen = new Map<CellKey, Coord>();
  for (const c of cs) if (inBoard(s, c) && !seen.has(key(c))) seen.set(key(c), { ...c });
  return sorted([...seen.values()]);
}

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

// ── Projectiles ─────────────────────────────────────────

export type Travel =
  | { reason: 'none'; path: Coord[]; stop: null }
  | { reason: 'cloud' | 'blocked' | 'end'; path: Coord[]; stop: Coord }
  | { reason: 'unit'; path: Coord[]; stop: Coord; unit: Unit };

/** A line's flight. A cloud is checked first: a unit inside a cloud is hidden. */
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
    if (isCloud(tileAt(s, nxt))) return { reason: 'cloud', path, stop: nxt };
    const u = unitAt(s, nxt);
    if (u && u.id !== ignore) return { reason: 'unit', path, stop: nxt, unit: u };
    if (blocksShots(tileAt(s, nxt))) return { reason: 'blocked', path, stop: nxt };
  }
  const last = path[path.length - 1];
  return last ? { reason: 'end', path, stop: last } : { reason: 'none', path: [], stop: null };
}

/** The caster is gifted in a rune's school: its gift applies (design §9, P36). */
export function giftedIn(u: Unit, rune: keyof typeof RUNES): boolean {
  return u.kind === 'member' && u.lean.gifted === RUNES[rune].school;
}

/** Bolt's range for this caster: 4, +1 when gifted (P21, P36). */
export function boltRange(u: Unit): number {
  return TUNING.boltRange + (giftedIn(u, 'bolt') ? 1 : 0);
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

/** Can this member move by itself now? A Shackle or a Hold keeps it in place. */
const canWalk = (m: MemberUnit): boolean => m.shackle === 0 && m.held === 0;

/** Tiles the member can move to now, reading order. [] if it already moved. */
export function legalMoves(s: BattleState, id: UnitId): Coord[] {
  const m = activeMember(s, id);
  if (!m || m.moved || !canWalk(m)) return [];
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

const allTiles = (s: BattleState): Coord[] => s.tiles.map((_, i) => coordOf(s, i));

/** Splash and Vat range for this caster: +1 when gifted (P36). */
function areaRange(u: Unit, source: 'splash' | 'vat'): number {
  const base = source === 'splash' ? TUNING.splashRange : TUNING.vatRange;
  return base + (giftedIn(u, source) ? 1 : 0);
}

/** Every aim the spell accepts from the member's current tile. */
export function legalAims(s: BattleState, id: UnitId, spellKey: SpellKey): Aim[] {
  const m = findUnit(s, id);
  if (m?.kind !== 'member' || !isAlive(m)) return [];
  const spell = spellOf(m, spellKey);
  if (!spell) return [];
  switch (spell.source) {
    case 'bolt':
      return DIRS.filter((d) => inBoard(s, step(m.pos, d))).map((dir) => ({ kind: 'dir', dir }));
    case 'splash':
    case 'vat': {
      const range = areaRange(m, spell.source);
      return allTiles(s)
        .filter((c) => chebyshev(m.pos, c) <= range)
        .map((at) => ({ kind: 'tile', at }));
    }
    case 'touch':
      return [
        { kind: 'self' },
        ...touchTiles(s, m)
          .sort(byReadingOrder)
          .map((at): Aim => ({ kind: 'tile', at })),
      ];
  }
}

/** The tiles a Touch aims: the four beside the caster, and with `touchReach` 2 (AH P17) those two away. */
function touchTiles(s: BattleState, m: Unit): Coord[] {
  const near = DIRS.map((d) => step(m.pos, d));
  const far =
    (habitRule(m).touchReach ?? 1) >= 2
      ? DIRS.filter((d) => reachOver(s, m.pos, d)).map((d) => step(step(m.pos, d), d))
      : [];
  return [...near, ...far].filter((c) => inBoard(s, c));
}

/**
 * The reach rule (AH P3, Hop and long Touch): passing over the tile next to `from` toward `dir` is
 * allowed over a unit, jar, cloud, lingering state, water, a drop or a cut, but not over a tile
 * that blocks units (plates, Walls, kettles, skid plates, lock gates, grates).
 */
export function reachOver(s: BattleState, from: Coord, dir: Dir): boolean {
  const mid = step(from, dir);
  return inBoard(s, mid) && !blocksUnits(tileAt(s, mid));
}

/**
 * A long Touch (AH P17): the tile it passed over when `at` is two tiles from the caster in a
 * straight line, else null (an ordinary Touch).
 */
export function longTouchOver(from: Coord, at: Coord): Coord | null {
  const dx = at.x - from.x;
  const dy = at.y - from.y;
  const straight = (dx === 0 && Math.abs(dy) === 2) || (dy === 0 && Math.abs(dx) === 2);
  return straight ? { x: from.x + dx / 2, y: from.y + dy / 2 } : null;
}

export function sameAim(a: Aim, b: Aim): boolean {
  switch (a.kind) {
    case 'dir':
      return b.kind === 'dir' && a.dir === b.dir;
    case 'tile':
      return b.kind === 'tile' && sameCoord(a.at, b.at);
    case 'self':
      return b.kind === 'self';
  }
}

/** Where the spell aims from here: the line's path and the tiles of its targets (for the overlay). */
export function aimPreview(
  s: BattleState,
  id: UnitId,
  spellKey: SpellKey,
  aim: Aim,
  footnotes: NonNullable<DraftOptions['footnotes']> = {},
): { path: Coord[]; targets: Coord[] } {
  const m = findUnit(s, id);
  const spell = m?.kind === 'member' ? spellOf(m, spellKey) : null;
  if (!m || !spell) return { path: [], targets: [] };
  const path =
    spell.source === 'bolt' && aim.kind === 'dir'
      ? boltTravel(s, m, aim.dir, giftedIn(m, spell.source), footnotes).path
      : [];
  const aimed = aimTargets(s, m, spell.source, aim, giftedIn(m, spell.source), footnotes);
  const targets = aimed.targets.flatMap((t) => {
    const at = whereIs(s, t);
    return at ? [{ ...at }] : [];
  });
  return { path, targets };
}

/** Danger overlay: where a telegraphed attack travels and which tile it would hit now. */
export function intentPreview(
  s: BattleState,
  enemy: EnemyUnit,
): { path: Coord[]; hit: Coord | null } | null {
  if (enemy.intent?.kind !== 'attack' || !isAlive(enemy)) return null;
  const att = ATTACKS[enemy.intent.attack];
  if (att.kind === 'adjacent') {
    const t = step(enemy.pos, enemy.intent.dir);
    if (!inBoard(s, t)) return { path: [], hit: null };
    return { path: [t], hit: unitAt(s, t) ? t : null };
  }
  const r = travel(s, enemy.pos, enemy.intent.dir, att.range, enemy.id);
  return { path: r.path, hit: r.reason === 'unit' ? r.stop : null };
}
