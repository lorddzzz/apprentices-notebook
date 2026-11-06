import { BRIDGE_FOE_TUNING } from '$data/districts/bridges/enemies';
import { BRIDGE_TUNING } from '$data/districts/bridges/types';
import { candidatesOf, closestTo, nearestMember } from '../../ai';
import { arrive } from '../../arrival';
import { type Ctx, emit, ref } from '../../ctx';
import { byReadingOrder, type Coord, DIRS, key, label, sameCoord, step } from '../../grid';
import { guardCancels } from '../../harm';
import { enemyWalk } from '../../movement';
import { makePiece, pieceBlocksUnits } from '../../pieces';
import {
  blocksUnits,
  findUnit,
  inBoard,
  isAlive,
  isOpen,
  members,
  tileAt,
  unitAt,
} from '../../queries';
import { trickResists } from '../../rivals/tricks';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { FoeBehaviour, KitId, PreviewShape } from '../types';
import { crackedSet } from './preview';
import { cracksOf } from './support';
import {
  type BridgesState,
  COLLAPSE_RULE_ID,
  KEYSTONE_PIECE,
  type MendedEvent,
  PIER_PIECE,
  type PierLaidEvent,
  parseBridges,
  SPAN_PIECE,
  tileKey,
} from './types';

/**
 * The wardens' staff, part one (bridges-plan P8; BR-5): the Warden's chalk circle and the
 * Gargoyle's carry, both on the kit's behaviour registry. Both read the cracked set
 * (`crackedSet`, BR-4): the Warden draws on the unit standing where the span is about to fall,
 * the Gargoyle sets its victim down on a cracked tile when it can. Nothing here deals damage; the
 * threat is the floor.
 */

export const WARDEN_BEHAVIOUR: KitId = 'bridges:warden';
export const GARGOYLE_BEHAVIOUR: KitId = 'bridges:gargoyle';
export const MASON_BEHAVIOUR: KitId = 'bridges:mason';

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const where = (c: Coord | undefined): string => (c ? label(c) : '?');
const telegraphOf = (e: EnemyUnit): Telegraph | null =>
  e.intent?.kind === 'behaviour' ? e.intent.telegraph : null;

/** The tiles of the cracked set as a lookup (the foe AI's view of the floor). */
const crackedKeys = (s: BattleState): Set<string> => new Set(crackedSet(s).map(key));

function approach(ctx: Ctx, e: EnemyUnit): void {
  const target = nearestMember(ctx.s, e);
  if (!target) return;
  const best = closestTo(ctx.s, e, target, candidatesOf(ctx.s, e, true));
  enemyWalk(ctx, e, best?.path ?? []);
}

// ── The Warden: the chalk circle ────────────────────────

interface ChalkAim {
  victim: Unit;
  cracked: boolean;
  distance: number;
}

/** Apprentices in a straight line from `from` within the chalk's reach; chalk stops at walls. */
function chalkTargets(s: BattleState, from: Coord, cracked: ReadonlySet<string>): ChalkAim[] {
  const out: ChalkAim[] = [];
  for (const dir of DIRS) {
    let at = from;
    for (let n = 1; n <= BRIDGE_TUNING.chalkRange; n++) {
      at = step(at, dir);
      if (!inBoard(s, at)) break;
      const t = tileAt(s, at);
      if (blocksUnits(t) || pieceBlocksUnits(t)) break;
      const u = unitAt(s, at);
      if (u?.kind === 'member' && isAlive(u)) {
        out.push({ victim: u, cracked: cracked.has(key(at)), distance: n });
      }
    }
  }
  return out;
}

/** On a cracked tile first, then nearest, then reading order. */
const byChalk = (a: ChalkAim, b: ChalkAim): number =>
  Number(b.cracked) - Number(a.cracked) ||
  a.distance - b.distance ||
  byReadingOrder(a.victim.pos, b.victim.pos);

/** The unit the Warden would chalk from `from`, or null. */
export function chalkAim(s: BattleState, from: Coord): ChalkAim | null {
  return chalkTargets(s, from, crackedKeys(s)).sort(byChalk)[0] ?? null;
}

/** Stays when it already has a target in line; else the tile (fewest steps) with the best one. */
function wardenMove(ctx: Ctx, e: EnemyUnit): void {
  const cracked = crackedKeys(ctx.s);
  if (chalkTargets(ctx.s, e.pos, cracked).length) return;
  let best: { path: Coord[]; aim: ChalkAim } | null = null;
  for (const c of candidatesOf(ctx.s, e, true)) {
    const aim = chalkTargets(ctx.s, c.at, cracked).sort(byChalk)[0];
    if (!aim) continue;
    const better =
      !best ||
      Number(aim.cracked) > Number(best.aim.cracked) ||
      (aim.cracked === best.aim.cracked && c.path.length < best.path.length);
    if (better) best = { path: c.path, aim };
  }
  if (best) enemyWalk(ctx, e, best.path);
  else approach(ctx, e);
}

export const WARDEN_FOE: FoeBehaviour = {
  id: WARDEN_BEHAVIOUR,
  move: wardenMove,
  plan(s, e): Telegraph | null {
    const aim = chalkAim(s, e.pos);
    if (!aim) return null;
    return { label: 'chalk', tiles: [{ ...aim.victim.pos }], units: [aim.victim.id] };
  },
  /** The unit still standing in the circle is held through the party's next turn; else a miss. */
  resolve(ctx, _e, tg) {
    const victim = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    const at = tg.tiles[0];
    if (!victim || !isAlive(victim) || !at || !sameCoord(victim.pos, at)) {
      emit(ctx, { type: 'miss', source: 'Chalk circle' });
      return;
    }
    if (trickResists(ctx, victim, 'hold')) return;
    if (guardCancels(ctx, victim, { kind: 'hold', unit: victim.id, harm: null }, 'Hold')) return;
    victim.held = Math.max(victim.held, BRIDGE_FOE_TUNING.chalkRounds);
    emit(ctx, { type: 'held', unit: ref(victim), rounds: victim.held });
  },
  /** The circle on the tile, and a pulse on it: she is held if she stays. */
  preview(_s, e): readonly PreviewShape[] {
    const tg = telegraphOf(e);
    const at = tg?.tiles[0];
    if (!tg || !at) return [];
    return [
      { kind: 'outline', cells: [{ ...at }], label: 'held' },
      { kind: 'pulse', at: { ...at } },
    ];
  },
  describe: (tg) => `chalk circle on ${where(tg.tiles[0])}`,
};

// ── The Gargoyle: the carry ─────────────────────────────

interface CarryAim {
  victim: Unit;
  to: Coord;
  cracked: boolean;
  fogDistance: number;
}

const fogTiles = (s: BattleState): Coord[] =>
  s.tiles.flatMap((t, i) =>
    t.terrain.drop ? [{ x: i % s.width, y: Math.floor(i / s.width) }] : [],
  );

const distanceToFog = (fog: readonly Coord[], c: Coord): number =>
  fog.reduce((d, f) => Math.min(d, manhattan(f, c)), Number.POSITIVE_INFINITY);

/**
 * Where it would set `victim` down: a standing, empty tile up to `carrySteps` away that is cracked
 * or nearer the nearest fog than she is; cracked first, then nearest the fog, then reading order.
 */
function carryTo(s: BattleState, victim: Unit, cracked: ReadonlySet<string>): CarryAim | null {
  const fog = fogTiles(s);
  const here = distanceToFog(fog, victim.pos);
  const reach = BRIDGE_TUNING.carrySteps;
  let best: CarryAim | null = null;
  for (let y = victim.pos.y - reach; y <= victim.pos.y + reach; y++) {
    for (let x = victim.pos.x - reach; x <= victim.pos.x + reach; x++) {
      const to = { x, y };
      const d = manhattan(to, victim.pos);
      if (d < 1 || d > reach || !isOpen(s, to)) continue;
      const t = tileAt(s, to);
      if (t.terrain.drop || t.terrain.water || pieceBlocksUnits(t)) continue;
      const isCracked = cracked.has(key(to));
      const fogDistance = distanceToFog(fog, to);
      if (!isCracked && !(fogDistance < here)) continue;
      const better =
        !best ||
        Number(isCracked) > Number(best.cracked) ||
        (isCracked === best.cracked &&
          (fogDistance < best.fogDistance ||
            (fogDistance === best.fogDistance && byReadingOrder(to, best.to) < 0)));
      if (better) best = { victim, to, cracked: isCracked, fogDistance };
    }
  }
  return best;
}

/** The apprentice the Gargoyle takes this round: beside it, not held, the best set-down tile. */
export function carryAim(s: BattleState, e: EnemyUnit): CarryAim | null {
  const cracked = crackedKeys(s);
  const aims = members(s)
    .filter((m) => isAlive(m) && m.held === 0 && manhattan(m.pos, e.pos) === 1)
    .flatMap((m) => carryTo(s, m, cracked) ?? []);
  aims.sort(
    (a, b) =>
      Number(b.cracked) - Number(a.cracked) ||
      a.fogDistance - b.fogDistance ||
      byReadingOrder(a.victim.pos, b.victim.pos),
  );
  return aims[0] ?? null;
}

export const GARGOYLE_FOE: FoeBehaviour = {
  id: GARGOYLE_BEHAVIOUR,
  move(ctx, e) {
    if (!carryAim(ctx.s, e)) approach(ctx, e);
  },
  plan(s, e): Telegraph | null {
    const aim = carryAim(s, e);
    if (!aim) return null;
    return {
      label: 'carry',
      tiles: [{ ...aim.victim.pos }, { ...aim.to }],
      units: [aim.victim.id],
    };
  },
  /**
   * The named apprentice, if still beside it and not held, is set on the telegraphed tile (FD's
   * `carry` arrival: hooks fire on the landing). A held apprentice refuses; a moved one is missed.
   */
  resolve(ctx, e, tg) {
    const victim = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    const [from, to] = tg.tiles;
    if (!victim || !isAlive(victim) || !from || !to || !sameCoord(victim.pos, from)) {
      emit(ctx, { type: 'miss', source: 'Carry' });
      return;
    }
    if (victim.held > 0) {
      emit(ctx, { type: 'held', unit: ref(victim), rounds: victim.held });
      return;
    }
    const t = tileAt(ctx.s, to);
    if (manhattan(victim.pos, e.pos) !== 1 || !isOpen(ctx.s, to) || t.terrain.drop) {
      emit(ctx, { type: 'miss', source: 'Carry' });
      return;
    }
    emit(ctx, {
      type: 'moved',
      unit: ref(victim),
      from: { ...victim.pos },
      to: { ...to },
      path: [{ ...to }],
      cause: 'carry',
    });
    arrive(ctx, victim.id, [{ ...to }], { cause: 'carry', origin: null, landing: true });
  },
  /** The apprentice's ghost on the set-down tile; the tile warns when it is a cracked one. */
  preview(s, e): readonly PreviewShape[] {
    const tg = telegraphOf(e);
    const victim = tg?.units[0] ? findUnit(s, tg.units[0]) : null;
    const to = tg?.tiles[1];
    if (!victim || !isAlive(victim) || !to) return [];
    const out: PreviewShape[] = [
      { kind: 'ghost', unit: victim.id, from: { ...victim.pos }, to: { ...to } },
    ];
    if (crackedKeys(s).has(key(to))) out.push({ kind: 'tile', at: { ...to }, tone: 'warn' });
    out.push({ kind: 'pulse', at: { ...to } });
    return out;
  },
  describe: (tg) => `carry ${where(tg.tiles[0])} to ${where(tg.tiles[1])}`,
};

// ── The Mason: mend and lay pier ────────────────────────

export interface MasonAim {
  kind: 'mend' | 'pier';
  at: Coord;
  /** Cracked tiles that stand again if it works (the span tile itself does not count). */
  rescues: number;
}

const tileKeyOf = (c: Coord) => tileKey(c.x, c.y);
const pieceOf = (s: BattleState, c: Coord) => tileAt(s, c).piece?.id ?? null;

/** The board after the work, for asking `cracksOf` what it would save; the real tiles are untouched. */
function withWork(
  s: BattleState,
  own: BridgesState,
  aim: Pick<MasonAim, 'kind' | 'at'>,
): { s: BattleState; own: BridgesState } {
  const i = aim.at.y * s.width + aim.at.x;
  const k = tileKeyOf(aim.at);
  const tiles = s.tiles.map((t, n) => {
    if (n !== i) return t;
    return aim.kind === 'mend'
      ? { ...t, terrain: { ...t.terrain, drop: false }, piece: makePiece(SPAN_PIECE) }
      : { ...t, piece: makePiece(PIER_PIECE) };
  });
  const stone = { ...own.stone };
  if (aim.kind === 'mend') stone[k] = BRIDGE_FOE_TUNING.mendStone;
  else delete stone[k];
  return { s: { ...s, tiles }, own: { ...own, stone } };
}

function rescuesOf(s: BattleState, own: BridgesState, aim: Pick<MasonAim, 'kind' | 'at'>): number {
  const before = cracksOf(s, own).map(tileKeyOf);
  const w = withWork(s, own, aim);
  const after = new Set(cracksOf(w.s, w.own).map(tileKeyOf));
  return before.filter((k) => !after.has(k)).length;
}

/** Distance from `c` to the nearest pier or standing keystone (infinite when there is none). */
function pierDistance(s: BattleState, own: BridgesState, c: Coord): number {
  let d = Number.POSITIVE_INFINITY;
  s.tiles.forEach((t, i) => {
    const id = t.piece?.id;
    const at = { x: i % s.width, y: Math.floor(i / s.width) };
    const footing =
      id === PIER_PIECE || (id === KEYSTONE_PIECE && (own.stone[tileKeyOf(at)] ?? 1) > 0);
    if (footing) d = Math.min(d, manhattan(at, c));
  });
  return d;
}

/** Mend (rescuing) first, then a far pier, then any mend; more rescued, then reading order. */
const RANK = { rescueMend: 0, pier: 1, mend: 2 } as const;
const rankOf = (a: MasonAim): number =>
  a.kind === 'pier' ? RANK.pier : a.rescues > 0 ? RANK.rescueMend : RANK.mend;

/**
 * What a Mason standing on `from` would do: an adjacent fog tile that was original span and has
 * nobody on it is mended; a span tile beside it with nobody on it, `pierGap` or more from every
 * footing, takes a pier. Null when nothing qualifies.
 */
export function masonAim(s: BattleState, from: Coord, ignore?: string): MasonAim | null {
  const own = parseBridges(s.rules?.[COLLAPSE_RULE_ID]);
  const originals = new Set(own.originals);
  const aims: MasonAim[] = [];
  for (const dir of DIRS) {
    const at = step(from, dir);
    if (!inBoard(s, at)) continue;
    const occupant = unitAt(s, at);
    if (occupant && occupant.id !== ignore) continue;
    const t = tileAt(s, at);
    if (t.terrain.drop && originals.has(tileKeyOf(at)) && !t.piece) {
      aims.push({ kind: 'mend', at, rescues: rescuesOf(s, own, { kind: 'mend', at }) });
    } else if (
      pieceOf(s, at) === SPAN_PIECE &&
      pierDistance(s, own, at) >= BRIDGE_FOE_TUNING.pierGap
    ) {
      aims.push({ kind: 'pier', at, rescues: rescuesOf(s, own, { kind: 'pier', at }) });
    }
  }
  aims.sort((a, b) => rankOf(a) - rankOf(b) || b.rescues - a.rescues || byReadingOrder(a.at, b.at));
  return aims[0] ?? null;
}

function masonMove(ctx: Ctx, e: EnemyUnit): void {
  if (masonAim(ctx.s, e.pos, e.id)) return;
  let best: { path: Coord[]; aim: MasonAim } | null = null;
  for (const c of candidatesOf(ctx.s, e, true)) {
    const aim = masonAim(ctx.s, c.at, e.id);
    if (!aim) continue;
    if (
      !best ||
      rankOf(aim) < rankOf(best.aim) ||
      (rankOf(aim) === rankOf(best.aim) &&
        (aim.rescues > best.aim.rescues ||
          (aim.rescues === best.aim.rescues && c.path.length < best.path.length)))
    ) {
      best = { path: c.path, aim };
    }
  }
  if (best) enemyWalk(ctx, e, best.path);
  else approach(ctx, e);
}

const kindOf = (tg: Telegraph): 'mend' | 'pier' => (tg.label === 'mend' ? 'mend' : 'pier');

export const MASON_FOE: FoeBehaviour = {
  id: MASON_BEHAVIOUR,
  move: masonMove,
  plan(s, e): Telegraph | null {
    const aim = masonAim(s, e.pos, e.id);
    if (!aim) return null;
    return { label: aim.kind === 'mend' ? 'mend' : 'lay pier', tiles: [{ ...aim.at }], units: [] };
  },
  /**
   * Builds on the telegraphed tile if it is still as planned and still empty: a fallen original
   * becomes thin span, or a span tile becomes a pier. Cracks are derived, so a reconnected
   * section is saved with no further bookkeeping; the collapse at dusk finds nothing to drop.
   */
  resolve(ctx, e, tg) {
    const at = tg.tiles[0];
    const kind = kindOf(tg);
    const t = at && inBoard(ctx.s, at) ? tileAt(ctx.s, at) : null;
    const own = parseBridges(ctx.s.rules?.[COLLAPSE_RULE_ID]);
    const ready =
      at &&
      t &&
      manhattan(at, e.pos) === 1 &&
      !unitAt(ctx.s, at) &&
      (kind === 'mend'
        ? t.terrain.drop && !t.piece && own.originals.includes(tileKeyOf(at))
        : t.piece?.id === SPAN_PIECE);
    if (!at || !t || !ready) {
      emit(ctx, { type: 'miss', source: kind === 'mend' ? 'Mend' : 'Pier' });
      return;
    }
    const rescued = rescuesOf(ctx.s, own, { kind, at });
    const k = tileKeyOf(at);
    const next: BridgesState = { ...own, stone: { ...own.stone }, cuts: { ...own.cuts } };
    delete next.cuts[k];
    if (kind === 'mend') {
      t.terrain = { ...t.terrain, drop: false };
      t.piece = makePiece(SPAN_PIECE, { stone: BRIDGE_FOE_TUNING.mendStone });
      next.stone[k] = BRIDGE_FOE_TUNING.mendStone;
      const ev: MendedEvent = {
        type: 'bridges:mended',
        at: { ...at },
        data: { stone: BRIDGE_FOE_TUNING.mendStone, rescued },
      };
      ctx.s.rules = { ...ctx.s.rules, [COLLAPSE_RULE_ID]: next };
      emit(ctx, ev);
    } else {
      t.piece = makePiece(PIER_PIECE);
      delete next.stone[k];
      const ev: PierLaidEvent = { type: 'bridges:pierLaid', at: { ...at }, data: { rescued } };
      ctx.s.rules = { ...ctx.s.rules, [COLLAPSE_RULE_ID]: next };
      emit(ctx, ev);
    }
  },
  /** The tile to be built, outlined; it warns when the work will be undone by a unit stepping on it. */
  preview(_s, e): readonly PreviewShape[] {
    const tg = telegraphOf(e);
    const at = tg?.tiles[0];
    if (!tg || !at) return [];
    return [
      { kind: 'outline', cells: [{ ...at }], label: kindOf(tg) === 'mend' ? 'mended' : 'pier' },
      { kind: 'pulse', at: { ...at } },
    ];
  },
  describe: (tg) =>
    tg.label === 'mend' ? `mend ${where(tg.tiles[0])}` : `lay a pier on ${where(tg.tiles[0])}`,
};

/** The staff's behaviours, for the district module. */
export const BRIDGE_FOES: readonly FoeBehaviour[] = [WARDEN_FOE, GARGOYLE_FOE, MASON_FOE];
