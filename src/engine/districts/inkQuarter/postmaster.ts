import { CLOCK_TUNING } from '$data/districts/inkQuarter/enemies';
import type { Ctx } from '../../ctx';
import { byReadingOrder, type Coord } from '../../grid';
import { coordOf, isAlive, livingUnits, members, unitAt } from '../../queries';
import type { GoalDef, TrickDef, TrickMark, TrickPlan } from '../../rivals/types';
import type { BattleState, EnemyUnit, Unit } from '../../types';
import type { Json } from '../types';
import {
  canPlaceSeal,
  canServe,
  canStamp,
  clockStaggered,
  serveClock,
  spendStagger,
  withdrawClock,
} from './clock';

/**
 * The postmaster as a rival (ink-quarter plan P9, P10; IQ-22). His signature trick is the clock
 * writ, served as an **action trick** through `clock.ts` (`serveClock`): a seal by him, a stamp
 * by the nearest apprentice, due in three rounds. Its **round-end step** (`late`, after the clock
 * rule) settles the stagger: an answered writ stuns him (`clock.ts` `lift`), the stun skips his
 * next action, and once it is spent the stagger is cleared. His death withdraws the writ. The
 * routine's district goals live here too: serve whenever he may, levy when marks gather.
 */

export const CLOCK_WRIT_TRICK_ID = 'inkQuarter:clockWrit' as const;
export const SERVE_GOAL_ID = 'inkQuarter:serveWrit' as const;
export const COLLECT_GOAL_ID = 'inkQuarter:collectMarks' as const;

/** The heart's foes (IQ-10 places them): the postmaster (token `p`), a Sealer, two dead letters. */
export const HEART_ROSTER = ['postmaster', 'sealer', 'deadLetter', 'deadLetter'] as const;

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** The nearest living apprentice to `from`, ties in reading order. */
function nearestMember(s: BattleState, from: Coord): Unit | null {
  let best: Unit | null = null;
  for (const m of members(s).filter(isAlive)) {
    const d = manhattan(from, m.pos);
    const bd = best ? manhattan(from, best.pos) : Number.POSITIVE_INFINITY;
    if (d < bd || (d === bd && best && byReadingOrder(m.pos, best.pos) < 0)) best = m;
  }
  return best;
}

/** The legal tile nearest `to` for `fits` (not in `skip`), ties in reading order. */
function tileNear(
  s: BattleState,
  to: Coord,
  fits: (c: Coord) => boolean,
  skip: readonly Coord[] = [],
): Coord | null {
  let best: Coord | null = null;
  for (let i = 0; i < s.width * s.height; i++) {
    const c = coordOf(s, i);
    if (!fits(c) || skip.some((k) => k.x === c.x && k.y === c.y)) continue;
    if (!best || manhattan(to, c) < manhattan(to, best)) best = c;
  }
  return best;
}

/** The writ's tiles: stamp = the free tile nearest the nearest apprentice, seal = the one nearest him. */
export function writTiles(s: BattleState, e: EnemyUnit): { seal: Coord; stamp: Coord } | null {
  const target = nearestMember(s, e.pos);
  const stamp = tileNear(s, target?.pos ?? e.pos, (c) => canStamp(s, c) && !unitAt(s, c));
  if (!stamp) return null;
  const seal = tileNear(s, e.pos, (c) => canPlaceSeal(s, c), [stamp]);
  return seal ? { seal, stamp } : null;
}

const coordIn = (v: Json | undefined): Coord | null => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const { x, y } = v as { readonly [k: string]: Json };
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

/** The seal and stamp tiles a served plan carries (`{seal, stamp}`), or null. */
function planTiles(shown: TrickPlan | TrickMark): { seal: Coord; stamp: Coord } | null {
  if (!('lock' in shown)) return null;
  const d = shown.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const r = d as { readonly [k: string]: Json };
  const seal = coordIn(r.seal);
  const stamp = coordIn(r.stamp);
  return seal && stamp ? { seal, stamp } : null;
}

const asJson = (c: Coord): Json => ({ x: c.x, y: c.y });

/** The clock writ as his signature trick: an action, a round-end step and a death hook. */
export const CLOCK_WRIT_TRICK: TrickDef = {
  id: CLOCK_WRIT_TRICK_ID,
  name: 'the clock writ',
  init: () => null,
  action: {
    // One writ at a time and only after the cooldown: otherwise nothing to serve.
    plan(state, unit) {
      if (!canServe(state, unit.id)) return [];
      const t = writTiles(state, unit);
      return t ? [{ lock: null, data: { seal: asJson(t.seal), stamp: asJson(t.stamp) } }] : [];
    },
    // A tile gone unfit since the telegraph serves nothing: a starved order, so the fallback.
    resolve(ctx, unit, intent, own) {
      const t = planTiles(intent);
      if (t) serveClock(ctx, unit.id, t.seal, t.stamp);
      return own;
    },
  },
  roundEnd: {
    slot: 'late',
    // After the clock rule (rules run before tricks in a slot): a stagger whose stun is spent clears.
    step(ctx: Ctx, unit, own) {
      if (clockStaggered(ctx.s, unit.id) && !unit.stunned) spendStagger(ctx.s, unit.id);
      return own;
    },
  },
  onDeath(ctx, unit, own) {
    withdrawClock(ctx, unit.id);
    return own;
  },
  draw(_state, _unit, shown) {
    const t = planTiles(shown);
    return {
      label: 'serve',
      tiles: t ? [t.seal, t.stamp] : [],
      units: [],
      countdown: CLOCK_TUNING.deadlineAfter,
    };
  },
  describe: () =>
    'serves a clock writ: break his seal or stand an apprentice on his stamp, or every mark collects',
};

/** Serve whenever the trick would put a writ down (his seal summoned). */
export const SERVE_GOAL: GoalDef = {
  id: SERVE_GOAL_ID,
  accepts: (o, _input, cand) => cand.intent.kind === 'trick' && o.effect,
  score: () => 0,
};

/** Marked living units (either side) in the 3x3 around `at`. */
function marksAround(s: BattleState, at: Coord): number {
  return livingUnits(s).filter(
    (u) => u.mark && Math.abs(u.pos.x - at.x) <= 1 && Math.abs(u.pos.y - at.y) <= 1,
  ).length;
}

/**
 * Levy when marks gather (plan P10: "levy when 2+ marks are near him"): a tile aim whose 3x3 holds
 * at least `marks` marks (default 2) as the cast begins, harming nothing of his; most marks wins.
 */
export const COLLECT_GOAL: GoalDef = {
  id: COLLECT_GOAL_ID,
  accepts(o, input, cand) {
    const i = cand.intent;
    if (i.kind !== 'cast' || i.aim.kind !== 'tile' || o.selfHarm > 0) return false;
    const need = typeof input.params.marks === 'number' ? input.params.marks : 2;
    return marksAround(input.state, i.aim.at) >= need;
  },
  score(_o, input, cand) {
    const i = cand.intent;
    return i.kind === 'cast' && i.aim.kind === 'tile' ? marksAround(input.state, i.aim.at) : 0;
  },
};

export const POSTMASTER_TRICKS: readonly TrickDef[] = [CLOCK_WRIT_TRICK];
export const POSTMASTER_GOALS: readonly GoalDef[] = [SERVE_GOAL, COLLECT_GOAL];
