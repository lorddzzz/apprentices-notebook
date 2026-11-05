import { ENEMIES } from '$data';
import { BATHER_AREA_SOURCES, BATHER_BITE } from '$data/districts/bathhouses';
import { avoids } from '../../ai';
import { arrive, hasTrait } from '../../arrival';
import { type Ctx, emit, ref } from '../../ctx';
import { dealDamage } from '../../damage';
import { who } from '../../events';
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
import type { HarmGuard, HarmVerdict } from '../../harm';
import { enemyWalk } from '../../movement';
import { distanceField, findUnit, isAlive, isCloud, isOpen, members, tileAt } from '../../queries';
import type { Telegraph } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { DistrictEvent, DistrictEventDef, FoeBehaviour, KitId, PreviewShape } from '../types';
import { STEAM_CAUSE } from './types';

/**
 * The dissolved bather (bathhouses-plan P8; BH-4). Dissolved is derived, never stored: a unit with
 * the `dissolves` trait is dissolved while its tile is a cloud tile. Then single hits, pushes,
 * holds and swaps pass through it (a harm guard: `passesThrough`, then `unharmed`), but the area
 * bursts in `BATHER_AREA_SOURCES` hurt it. It drifts through connected cloud for free (the
 * `steam` cause, landing only), and bites only from an open tile at an apprentice on an open tile,
 * so a party in a cloud is safe from it and it is solid for the player phase after it steps out.
 */

export const BATHER_BEHAVIOUR: KitId = 'bathhouses:bather';
export const BATHER_GUARD_ID = 'bathhouses:bather';
export const PASSES_THROUGH = 'bathhouses:passesThrough';

/** Whether `u` is dissolved now: alive, a bather, standing on a cloud tile. */
export function isDissolved(s: BattleState, u: Unit): boolean {
  return isAlive(u) && hasTrait(u, 'dissolves') && isCloud(tileAt(s, u.pos));
}

// ── The guard ───────────────────────────────────────────

/** `bathhouses:passesThrough`: what passed through it (`hit`, `push`, `hold`, `swap`) and from whom. */
export type PassesThroughEvent = DistrictEvent & {
  type: typeof PASSES_THROUGH;
  data: { harm: 'hit' | 'push' | 'hold' | 'swap'; source: string };
};

const sourceOf = (kind: 'push' | 'hold' | 'swap'): string =>
  kind === 'push' ? 'push' : kind === 'hold' ? 'hold' : 'swap';

export const BATHER_GUARD: HarmGuard = {
  id: BATHER_GUARD_ID,
  kinds: ['hit', 'push', 'hold', 'swap'],
  run(ctx, harm): HarmVerdict {
    if (harm.kind === 'mark') return { kind: 'pass' };
    const u = findUnit(ctx.s, harm.unit);
    if (!u || !isDissolved(ctx.s, u)) return { kind: 'pass' };
    if (harm.kind === 'hit' && BATHER_AREA_SOURCES.includes(harm.source)) return { kind: 'pass' };
    const ev: PassesThroughEvent = {
      type: PASSES_THROUGH,
      unit: ref(u),
      at: { ...u.pos },
      data: { harm: harm.kind, source: harm.kind === 'hit' ? harm.source : sourceOf(harm.kind) },
    };
    emit(ctx, ev);
    return { kind: 'cancel' };
  },
};

export const BATHER_EVENT_LINES: readonly DistrictEventDef[] = [
  {
    type: PASSES_THROUGH,
    describe: (e) => {
      const data = e.data as { source?: unknown } | undefined;
      const what = typeof data?.source === 'string' ? data.source : 'it';
      return `${e.unit ? who(e.unit) : 'the bather'} is steam: the ${what} passes through`;
    },
  },
];

// ── Movement (free through connected cloud) ─────────────

interface SteamReach {
  at: Coord;
  path: Coord[];
  /** Move spent: steps into an open tile, or out of or into a cloud, cost 1; cloud to cloud 0. */
  cost: number;
}

/**
 * Every tile the bather can reach this phase: a step from a cloud tile to a cloud tile costs
 * nothing, any other step 1, up to its move. Cheapest first, then fewer steps, reading order.
 */
export function steamReach(s: BattleState, e: EnemyUnit): SteamReach[] {
  const move = ENEMIES[e.def].move;
  const best = new Map<string, SteamReach>([[key(e.pos), { at: e.pos, path: [], cost: 0 }]]);
  const queue: SteamReach[] = [{ at: e.pos, path: [], cost: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost || a.path.length - b.path.length);
    const r = queue.shift() as SteamReach;
    if ((best.get(key(r.at))?.cost ?? 0) < r.cost) continue;
    const fromCloud = isCloud(tileAt(s, r.at));
    for (const dir of DIRS) {
      const n = step(r.at, dir);
      if (!isOpen(s, n, e.id)) continue;
      const cost = r.cost + (fromCloud && isCloud(tileAt(s, n)) ? 0 : 1);
      if (cost > move) continue;
      const seen = best.get(key(n));
      if (
        seen &&
        (seen.cost < cost || (seen.cost === cost && seen.path.length <= r.path.length + 1))
      )
        continue;
      const next = { at: n, path: [...r.path, n], cost };
      best.set(key(n), next);
      queue.push(next);
    }
  }
  return [...best.values()]
    .filter((r) => r.path.length === 0 || !avoids(s, e, r.at))
    .sort((a, b) => a.cost - b.cost || a.path.length - b.path.length || byReadingOrder(a.at, b.at));
}

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Living apprentices standing on open (non-cloud) tiles: the only ones it can bite. */
const exposed = (s: BattleState): Unit[] =>
  members(s).filter((m) => isAlive(m) && !isCloud(tileAt(s, m.pos)));

/** An open tile beside an exposed apprentice: where it can bite from. */
const biteSpot = (s: BattleState, at: Coord): boolean =>
  !isCloud(tileAt(s, at)) && exposed(s).some((m) => manhattan(m.pos, at) === 1);

/**
 * Where it goes: a bite spot if it can reach one (cheapest, then shortest, reading order);
 * otherwise as near an apprentice as it can get, keeping to the cloud on a tie.
 */
function chooseSpot(s: BattleState, e: EnemyUnit): SteamReach | null {
  const reach = steamReach(s, e);
  const spots = reach.filter((r) => biteSpot(s, r.at));
  if (spots[0]) return spots[0];
  const targets = exposed(s).length ? exposed(s) : members(s).filter(isAlive);
  if (!targets.length) return null;
  const fields = targets.map((m) => distanceField(s, m.pos, e.id));
  const dist = (c: Coord) =>
    Math.min(...fields.map((f) => f.get(key(c)) ?? Number.POSITIVE_INFINITY));
  const open = (c: Coord) => (isCloud(tileAt(s, c)) ? 0 : 1);
  let best: SteamReach | null = null;
  for (const r of reach) {
    if (!best) {
      best = r;
      continue;
    }
    const d = dist(r.at) - dist(best.at) || open(r.at) - open(best.at);
    if (d < 0) best = r;
  }
  return best;
}

/** Walks to its spot. Setting out dissolved, it drifts as steam (stains and fog do not catch it). */
function batherMove(ctx: Ctx, e: EnemyUnit): void {
  const spot = chooseSpot(ctx.s, e);
  const end = spot?.path[spot.path.length - 1];
  if (!spot || !end) return;
  if (!isDissolved(ctx.s, e)) {
    enemyWalk(ctx, e, spot.path);
    return;
  }
  const start = { ...e.pos };
  emit(ctx, {
    type: 'moved',
    unit: ref(e),
    from: start,
    to: { ...end },
    path: spot.path.map((c) => ({ ...c })),
    cause: STEAM_CAUSE,
  });
  e.lastMove = lastDir(start, spot.path);
  arrive(ctx, e.id, spot.path, { cause: STEAM_CAUSE, origin: null, landing: true });
}

function lastDir(from: Coord, path: readonly Coord[]): Dir | null {
  const end = path[path.length - 1];
  const before = path[path.length - 2] ?? from;
  return end ? (DIRS.find((d) => sameCoord(step(before, d), end)) ?? null) : null;
}

// ── The bite ────────────────────────────────────────────

/** The exposed apprentice it can bite where it stands (reading order), or null when dissolved. */
export function biteVictim(s: BattleState, e: EnemyUnit): Unit | null {
  if (isDissolved(s, e)) return null;
  return (
    exposed(s)
      .filter((m) => manhattan(m.pos, e.pos) === 1)
      .sort((a, b) => byReadingOrder(a.pos, b.pos))[0] ?? null
  );
}

const where = (c: Coord | undefined): string => (c ? label(c) : '?');

export const BATHER_FOE: FoeBehaviour = {
  id: BATHER_BEHAVIOUR,
  move: batherMove,
  plan(s, e): Telegraph | null {
    const victim = biteVictim(s, e);
    return victim ? { label: 'bite', tiles: [{ ...victim.pos }], units: [victim.id] } : null;
  },
  /** Lands if both are still out of the cloud and side by side; else a miss. */
  resolve(ctx, e, tg) {
    const victim = tg.units[0] ? findUnit(ctx.s, tg.units[0]) : null;
    if (
      !victim ||
      !isAlive(victim) ||
      isDissolved(ctx.s, e) ||
      isCloud(tileAt(ctx.s, victim.pos)) ||
      manhattan(victim.pos, e.pos) !== 1
    ) {
      emit(ctx, { type: 'miss', source: 'Bite' });
      return;
    }
    const heading = DIRS.find((d) => sameCoord(step(e.pos, d), victim.pos)) ?? null;
    dealDamage(ctx, victim, BATHER_BITE, 'Bite', [], { heading, at: e.pos });
  },
  preview(_s, e): readonly PreviewShape[] {
    const tg = e.intent?.kind === 'behaviour' ? e.intent.telegraph : null;
    const at = tg?.tiles[0];
    return at ? [{ kind: 'pulse', at: { ...at } }] : [];
  },
  describe: (tg) => `bite ${where(tg.tiles[0])}`,
};
