import { ATTACKS, ENEMIES } from '$data';
import { BATH_FOE_TUNING } from '$data/districts/bathhouses';
import { FEEDER_PIPS } from '$data/districts/bathhouses/types';
import { candidatesOf, closestTo, nearestMember } from '../../ai';
import { hasTrait } from '../../arrival';
import { type Ctx, emit, ref } from '../../ctx';
import { dealDamage } from '../../damage';
import {
  byReadingOrder,
  type Coord,
  DIRS,
  type Dir,
  key,
  label,
  sameCoord,
  step,
} from '../../grid';
import { enemyWalk } from '../../movement';
import { pieceBlocksUnits } from '../../pieces';
import { planPush, push } from '../../push';
import {
  blocksUnits,
  distanceField,
  findUnit,
  inBoard,
  isAlive,
  members,
  tileAt,
  unitAt,
} from '../../queries';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { FoeBehaviour, KitId, PreviewShape } from '../types';

/**
 * The steam's people, part one (bathhouses-plan P7, P9; BH-5): the attendant, whose shove is a
 * foe attack with a push (`AttackDef.push`) aimed at the nearest obstruction, and the boilerman,
 * who walks to an unguarded vent and feeds the gauge from beside it (the `feeds` trait, read by
 * the boil-over's fill and forecast). Both on the kit's behaviour registry (DK-IQ D2).
 */

export const ATTENDANT_BEHAVIOUR: KitId = 'bathhouses:attendant';
export const BOILERMAN_BEHAVIOUR: KitId = 'bathhouses:boilerman';

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const where = (c: Coord | undefined): string => (c ? label(c) : '?');
const dirTo = (from: Coord, to: Coord): Dir | null =>
  DIRS.find((d) => sameCoord(step(from, d), to)) ?? null;

/** Living apprentices beside `e`, in reading order. */
const besideMembers = (s: BattleState, e: EnemyUnit): Unit[] =>
  members(s)
    .filter((m) => isAlive(m) && manhattan(m.pos, e.pos) === 1)
    .sort((a, b) => byReadingOrder(a.pos, b.pos));

/** Walks toward the nearest apprentice by the shortest way (ties: path length, reading order). */
function approach(ctx: Ctx, e: EnemyUnit): void {
  const target = nearestMember(ctx.s, e);
  if (!target) return;
  const best = closestTo(ctx.s, e, target, candidatesOf(ctx.s, e, true));
  enemyWalk(ctx, e, best?.path ?? []);
}

/** A planning-only draft: `planPush` reads the state and footnotes and never writes. */
const planCtx = (s: BattleState): Ctx => ({ s, log: [], cast: null, meta: {}, footnotes: {} });

// ── The attendant (P9) ──────────────────────────────────

/**
 * Free tiles from `from` along `dir` before the first obstruction: the board's edge, a plate or
 * Wall (or a solid piece), or a unit. 0 when it is right beside it.
 */
export function obstructionDistance(s: BattleState, from: Coord, dir: Dir): number {
  let n = 0;
  for (let at = step(from, dir); ; at = step(at, dir)) {
    if (!inBoard(s, at)) return n;
    const t = tileAt(s, at);
    if (blocksUnits(t) || pieceBlocksUnits(t) || unitAt(s, at)) return n;
    n++;
  }
}

/** The shove the attendant aims this round: a victim and a heading. */
export interface ShoveAim {
  victim: Unit;
  dir: Dir;
  distance: number;
}

/**
 * P9's heading rule: among the apprentices beside the attendant (reading order) and the four
 * headings (`DIRS` order), the one whose first obstruction is nearest; ties keep the earlier.
 * The heading back into the attendant is never one (it would always be nearest).
 */
export function aimShove(s: BattleState, e: EnemyUnit): ShoveAim | null {
  let best: ShoveAim | null = null;
  for (const victim of besideMembers(s, e)) {
    for (const dir of DIRS) {
      if (sameCoord(step(victim.pos, dir), e.pos)) continue;
      const distance = obstructionDistance(s, victim.pos, dir);
      if (!best || distance < best.distance) best = { victim, dir, distance };
    }
  }
  return best;
}

const pushTiles = (e: EnemyUnit): number => {
  const id = ENEMIES[e.def].attack;
  return id ? (ATTACKS[id].push ?? 0) : 0;
};

/** The telegraph's heading: its label is `shove:<dir>`. */
const headingOf = (tg: Telegraph): Dir | null =>
  DIRS.find((d) => tg.label === `shove:${d}`) ?? null;

/** Where the shove ends as the board stands: the tiles moved through and the crush tile. */
function shoveLine(s: BattleState, victim: Unit, dir: Dir, tiles: number) {
  const plan = planPush(planCtx(s), victim, dir, tiles);
  const crush = plan.stop?.kind === 'crush' ? plan.stop.at : null;
  return { path: plan.path, crush: crush && inBoard(s, crush) ? crush : null };
}

export const ATTENDANT_FOE: FoeBehaviour = {
  id: ATTENDANT_BEHAVIOUR,
  move: approach,
  plan(s, e): Telegraph | null {
    const aim = aimShove(s, e);
    if (!aim) return null;
    const { path, crush } = shoveLine(s, aim.victim, aim.dir, pushTiles(e));
    return {
      label: `shove:${aim.dir}`,
      tiles: [{ ...aim.victim.pos }, ...path.map((c) => ({ ...c })), ...(crush ? [crush] : [])],
      units: [aim.victim.id],
    };
  },
  /** The telegraphed victim and heading, if the victim is still beside it; else a miss. */
  resolve(ctx, e, tg) {
    const victim = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    const dir = headingOf(tg);
    if (!victim || !isAlive(victim) || !dir || manhattan(victim.pos, e.pos) !== 1) {
      emit(ctx, { type: 'miss', source: 'Shove' });
      return;
    }
    const attack = ATTACKS[ENEMIES[e.def].attack ?? 'shove'];
    emit(ctx, { type: 'shove', by: ref(e), target: ref(victim), dir });
    if (attack.damage > 0) {
      dealDamage(ctx, victim, attack.damage, attack.name, [], { heading: dir, at: e.pos });
    }
    if (isAlive(victim)) push(ctx, victim, dir, attack.push ?? 0, null);
  },
  /** The line the victim is shoved along (a ghost) and the tile it is crushed against. */
  preview(s, e): readonly PreviewShape[] {
    const tg = e.intent?.kind === 'behaviour' ? e.intent.telegraph : null;
    const victim = tg?.units[0] ? findUnit(s, tg.units[0]) : null;
    const dir = tg ? headingOf(tg) : null;
    if (!victim || !isAlive(victim) || !dir || manhattan(victim.pos, e.pos) !== 1) return [];
    const { path, crush } = shoveLine(s, victim, dir, pushTiles(e));
    const end = path[path.length - 1];
    const out: PreviewShape[] = [];
    if (end) out.push({ kind: 'ghost', unit: victim.id, from: { ...victim.pos }, to: { ...end } });
    if (crush) out.push({ kind: 'tile', at: crush, tone: 'warn' });
    out.push({ kind: 'pulse', at: { ...(end ?? victim.pos) } });
    return out;
  },
  describe: (tg) => `shove ${where(tg.tiles[0])} ${headingOf(tg) ?? ''}`.trimEnd(),
};

// ── The boilerman (P7) ──────────────────────────────────

const ventTiles = (s: BattleState): Coord[] =>
  s.tiles.flatMap((t, i) =>
    t.terrain.vent ? [{ x: i % s.width, y: Math.floor(i / s.width) }] : [],
  );

/**
 * A vent is guarded for `e` when a living feeder earlier in unit order already stands beside it,
 * so two boilermen never share one while another goes unfed.
 */
function guardedFor(s: BattleState, e: EnemyUnit, vent: Coord): boolean {
  for (const u of s.units) {
    if (u.id === e.id) return false;
    if (isAlive(u) && hasTrait(u, 'feeds') && manhattan(u.pos, vent) === 1) return true;
  }
  return false;
}

/** The vent he feeds where he stands (reading order), or null. */
export function fedVent(s: BattleState, e: EnemyUnit): Coord | null {
  return ventTiles(s).find((v) => manhattan(v, e.pos) === 1 && !guardedFor(s, e, v)) ?? null;
}

/** The nearest unguarded vent by walking distance (ties in reading order), with its field. */
function nearestVent(s: BattleState, e: EnemyUnit) {
  let best: { vent: Coord; field: Map<string, number>; d: number } | null = null;
  for (const vent of ventTiles(s)) {
    if (guardedFor(s, e, vent)) continue;
    const field = distanceField(s, vent, e.id);
    const d = field.get(key(e.pos)) ?? Number.POSITIVE_INFINITY;
    if (d === Number.POSITIVE_INFINITY) continue;
    if (!best || d < best.d) best = { vent, field, d };
  }
  return best;
}

/** Stays at his vent; else walks to stand beside the nearest unguarded one; else at you. */
function boilermanMove(ctx: Ctx, e: EnemyUnit): void {
  if (fedVent(ctx.s, e)) return;
  const goal = nearestVent(ctx.s, e);
  if (!goal) {
    approach(ctx, e);
    return;
  }
  const score = (c: Coord): number =>
    manhattan(c, goal.vent) === 1
      ? 0
      : Math.max(1, goal.field.get(key(c)) ?? Number.POSITIVE_INFINITY);
  let best: { at: Coord; path: Coord[] } | null = null;
  for (const c of candidatesOf(ctx.s, e, true)) {
    if (!best) {
      best = c;
      continue;
    }
    const d = score(c.at) - score(best.at);
    if (d < 0 || (d === 0 && c.path.length < best.path.length)) best = c;
  }
  enemyWalk(ctx, e, best?.path ?? []);
}

export const BOILERMAN_FOE: FoeBehaviour = {
  id: BOILERMAN_BEHAVIOUR,
  move: boilermanMove,
  /** Bites an apprentice beside him (reading order); else, at his vent, telegraphs the feed. */
  plan(s, e): Telegraph | null {
    const victim = besideMembers(s, e)[0];
    if (victim) return { label: 'bite', tiles: [{ ...victim.pos }], units: [victim.id] };
    const vent = fedVent(s, e);
    return vent ? { label: 'feed', tiles: [vent], units: [] } : null;
  },
  /** The feed is passive (the gauge reads him at round end); the bite lands if they stayed. */
  resolve(ctx, e, tg) {
    if (tg.label !== 'bite') return;
    const victim = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    if (!victim || !isAlive(victim) || manhattan(victim.pos, e.pos) !== 1) {
      emit(ctx, { type: 'miss', source: 'Bite' });
      return;
    }
    dealDamage(ctx, victim, BATH_FOE_TUNING.boilermanBite, 'Bite', [], {
      heading: dirTo(e.pos, victim.pos),
      at: e.pos,
    });
  },
  /** The vent he feeds, tagged with his pips; or a pulse on the one he will bite. */
  preview(s, e): readonly PreviewShape[] {
    const tg = e.intent?.kind === 'behaviour' ? e.intent.telegraph : null;
    const at = tg?.tiles[0];
    if (!tg || !at) return [];
    if (tg.label === 'bite') return [{ kind: 'pulse', at: { ...at } }];
    const vent = fedVent(s, e);
    return vent ? [{ kind: 'outline', cells: [vent], label: `+${FEEDER_PIPS}` }] : [];
  },
  describe: (tg) =>
    tg.label === 'bite' ? `bite ${where(tg.tiles[0])}` : `feed the vent at ${where(tg.tiles[0])}`,
};

/** The bathhouse foes' behaviours, for the district module (BH-4 adds the bather's). */
export const BATH_FOES: readonly FoeBehaviour[] = [ATTENDANT_FOE, BOILERMAN_FOE];
