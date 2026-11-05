import { ATTACKS } from '$data';
import { BATHER_AREA_SOURCES, STEWARD_TUNING } from '$data/districts/bathhouses';
import { arrive, hasTrait } from '../../arrival';
import { type Ctx, emit, ref } from '../../ctx';
import { who } from '../../events';
import { byReadingOrder, type Coord, DIRS, key, label, sameCoord, step } from '../../grid';
import type { HarmGuard, HarmVerdict } from '../../harm';
import { landKindFree } from '../../mix';
import { cloudNet } from '../../networks';
import { planPush, push } from '../../push';
import { distanceField, findUnit, isAlive, isCloud, isOpen, tileAt, unitAt } from '../../queries';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import { nearestApprentice } from '../seam';
import type { DistrictEvent, DistrictEventDef, ScriptStep } from '../types';
import { parseBoilOver } from './boilOver';
import { aimShove } from './foes';
import { BOIL_OVER_RULE_ID, STEAM_CAUSE } from './types';

/**
 * The Bath-Steward, stand-in heart (bathhouses-plan P10; BH-8). A DK-9 script of three steps by
 * round: lay steam toward the nearest apprentice, re-form within his cloud to shove one out of it,
 * stoke the gauge. His trick rides on a trait through the harm guard (the bather's hook): hit on a
 * cloud tile by anything but a burst of the cloud, he re-forms on the free tile of that connected
 * cloud farthest from where he stood (ties in reading order) and the hit does not land; with no
 * free tile he takes it. BH-17b re-expresses this as the real rival's `beforeHarm`.
 */

export const STEWARD_GUARD_ID = 'bathhouses:steward';
export const STEAMS_AWAY = 'bathhouses:steamsAway';
export const STOKE = 'bathhouses:stoke';
const QUARTERS = 4;

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const copy = (c: Coord): Coord => ({ x: c.x, y: c.y });
const where = (c: Coord | undefined): string => (c ? label(c) : '?');

/** Free tiles of the cloud he stands in (not his own), where he can re-form. */
function freeCloud(s: BattleState, u: Unit): Coord[] {
  if (!isCloud(tileAt(s, u.pos))) return [];
  return cloudNet(s, u.pos).filter(
    (c) => !sameCoord(c, u.pos) && !unitAt(s, c) && isOpen(s, c, u.id),
  );
}

/** P10: the free tile of his cloud farthest from where he stands (ties: reading order), or null. */
export function reformSpot(s: BattleState, u: Unit): Coord | null {
  const free = freeCloud(s, u).sort(
    (a, b) => manhattan(b, u.pos) - manhattan(a, u.pos) || byReadingOrder(a, b),
  );
  return free[0] ?? null;
}

/** He drifts through his own steam (the `steam` cause: only the landing is entered). */
function reform(ctx: Ctx, u: Unit, to: Coord): void {
  const from = copy(u.pos);
  emit(ctx, {
    type: 'moved',
    unit: ref(u, from),
    from,
    to: copy(to),
    path: [copy(to)],
    cause: STEAM_CAUSE,
  });
  arrive(ctx, u.id, [copy(to)], { cause: STEAM_CAUSE, origin: null, landing: true });
}

// ── Steams away (the trait, through the harm guard) ─────

export const STEWARD_GUARD: HarmGuard = {
  id: STEWARD_GUARD_ID,
  kinds: ['hit'],
  run(ctx, harm): HarmVerdict {
    if (harm.kind !== 'hit' || BATHER_AREA_SOURCES.includes(harm.source)) return { kind: 'pass' };
    const u = findUnit(ctx.s, harm.unit);
    if (!u || !isAlive(u) || !hasTrait(u, 'steamsAway')) return { kind: 'pass' };
    const to = reformSpot(ctx.s, u);
    if (!to) return { kind: 'pass' };
    const ev: DistrictEvent = {
      type: STEAMS_AWAY,
      unit: ref(u),
      at: copy(to),
      data: { source: harm.source, from: { x: u.pos.x, y: u.pos.y } },
    };
    emit(ctx, ev);
    reform(ctx, u, to);
    return { kind: 'cancel' };
  },
};

// ── Step 1: lay a cloud near the party ──────────────────

/**
 * The tiles a lay covers: his own tile, then the shortest way toward the nearest apprentice up to
 * the tile beside them, skipping tiles already in steam, `layTiles` at most. With no way there,
 * the free tiles around that apprentice. Never an apprentice's own tile.
 */
export function layTiles(s: BattleState, e: EnemyUnit): Coord[] {
  const target = nearestApprentice(s, e.pos);
  if (!target) return [];
  const field = distanceField(s, target.pos, e.id);
  const way: Coord[] = [copy(e.pos)];
  let at = e.pos;
  for (let d = field.get(key(at)); d !== undefined && d > 1; d = field.get(key(at))) {
    const next = DIRS.map((dir) => step(at, dir)).find((n) => field.get(key(n)) === d - 1);
    if (!next) break;
    way.push(next);
    at = next;
  }
  const reached = field.has(key(e.pos));
  const pool = reached
    ? way
    : DIRS.map((dir) => step(target.pos, dir)).filter((c) => isOpen(s, c, e.id));
  return pool
    .filter((c) => !isCloud(tileAt(s, c)) && !sameCoord(c, target.pos))
    .slice(0, STEWARD_TUNING.layTiles);
}

export const STEWARD_LAY: ScriptStep = {
  id: 'bathhouses:steward:lay',
  plan(s, e): Telegraph | null {
    const tiles = layTiles(s, e);
    return tiles.length ? { label: 'lay steam', tiles, units: [] } : null;
  },
  act(ctx, _e, tg) {
    for (const at of tg.tiles) landKindFree(ctx, 'steam', { kind: 'tile', at: copy(at) });
  },
  describe: (tg) => `lay steam on ${tg.tiles.map((c) => label(c)).join(' ')}`,
};

// ── Step 2: shove from within ───────────────────────────

/** Where he shoves from this round: a tile of his cloud beside an apprentice, and the aim. */
export interface StewardShove {
  from: Coord;
  victim: Unit;
  dir: (typeof DIRS)[number];
}

/**
 * The shove he can make from inside his cloud: from where he stands if that is beside an
 * apprentice, else from the free tile of his cloud beside one nearest him (reading order), aimed
 * by the attendant's rule (P9). Null out of the cloud or with no apprentice by it.
 */
export function aimFromWithin(s: BattleState, e: EnemyUnit): StewardShove | null {
  if (!isCloud(tileAt(s, e.pos))) return null;
  const spots = [
    copy(e.pos),
    ...freeCloud(s, e).sort(
      (a, b) => manhattan(a, e.pos) - manhattan(b, e.pos) || byReadingOrder(a, b),
    ),
  ];
  for (const from of spots) {
    const aim = aimShove(s, { ...e, pos: from });
    if (aim) return { from, victim: aim.victim, dir: aim.dir };
  }
  return null;
}

const shoveTiles = (): number => ATTACKS.shove.push ?? 0;
const planCtx = (s: BattleState): Ctx => ({ s, log: [], cast: null, meta: {}, footnotes: {} });
const headingOf = (tg: Telegraph) => DIRS.find((d) => tg.label === `shove:${d}`) ?? null;

export const STEWARD_SHOVE: ScriptStep = {
  id: 'bathhouses:steward:shove',
  /** Tiles: where he shoves from, the victim, the line it is shoved along. */
  plan(s, e): Telegraph | null {
    const aim = aimFromWithin(s, e);
    if (!aim) return null;
    const path = planPush(planCtx(s), aim.victim, aim.dir, shoveTiles()).path;
    return {
      label: `shove:${aim.dir}`,
      tiles: [copy(aim.from), copy(aim.victim.pos), ...path.map(copy)],
      units: [aim.victim.id],
    };
  },
  /** Re-forms on the telegraphed tile if it is still free steam of his, then shoves; else a miss. */
  act(ctx, e, tg) {
    const from = tg.tiles[0];
    const victim = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    const dir = headingOf(tg);
    const reachable =
      !!from && (sameCoord(from, e.pos) || freeCloud(ctx.s, e).some((c) => sameCoord(c, from)));
    if (!from || !victim || !isAlive(victim) || !dir || !reachable) {
      emit(ctx, { type: 'miss', source: 'Shove' });
      return;
    }
    if (!sameCoord(from, e.pos)) reform(ctx, e, from);
    if (!isAlive(e) || !sameCoord(e.pos, from) || manhattan(victim.pos, e.pos) !== 1) {
      emit(ctx, { type: 'miss', source: 'Shove' });
      return;
    }
    emit(ctx, { type: 'shove', by: ref(e), target: ref(victim), dir });
    push(ctx, victim, dir, shoveTiles(), null);
  },
  describe: (tg) => `shove ${where(tg.tiles[1])} ${headingOf(tg) ?? ''}`.trimEnd(),
};

// ── Step 3: stoke the gauge ─────────────────────────────

export const STEWARD_STOKE: ScriptStep = {
  id: 'bathhouses:steward:stoke',
  /** Only on a board with the gauge. */
  plan(s): Telegraph | null {
    if (!s.rules || !Object.hasOwn(s.rules, BOIL_OVER_RULE_ID)) return null;
    return { label: 'stoke', tiles: [], units: [] };
  },
  /** Adds `stokePips` to the gauge, capped at its capacity (the round end then boils it). */
  act(ctx, e) {
    const rules = ctx.s.rules;
    if (!rules || !Object.hasOwn(rules, BOIL_OVER_RULE_ID)) return;
    const own = parseBoilOver(rules[BOIL_OVER_RULE_ID]);
    const to = Math.min(own.capacity, own.pressure + STEWARD_TUNING.stokePips * QUARTERS);
    const ev: DistrictEvent = { type: STOKE, unit: ref(e), data: { from: own.pressure, to } };
    emit(ctx, ev);
    ctx.s.rules = { ...rules, [BOIL_OVER_RULE_ID]: { ...own, pressure: to } };
  },
  describe: () => `stoke the house (+${STEWARD_TUNING.stokePips})`,
};

export const STEWARD_STEP_LIST: readonly ScriptStep[] = [STEWARD_LAY, STEWARD_SHOVE, STEWARD_STOKE];

export const STEWARD_EVENT_LINES: readonly DistrictEventDef[] = [
  {
    type: STEAMS_AWAY,
    describe: (e) =>
      `${e.unit ? who(e.unit) : 'the Steward'} steams away and re-forms at ${where(e.at)}`,
  },
  {
    type: STOKE,
    describe: () => `the Steward stokes the house (+${STEWARD_TUNING.stokePips})`,
  },
];
