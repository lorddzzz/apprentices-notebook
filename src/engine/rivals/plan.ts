import { ENEMIES, TUNING } from '$data';
import type { GoalAction, GoalId, GoalStep, RivalDef } from '$data/rivals';
import { cloneData } from '../clone';
import type { Ctx } from '../ctx';
import { type EventLog, type GameEvent, relocations } from '../events';
import {
  byReadingOrder,
  type Coord,
  chebyshev,
  DIRS,
  type Dir,
  key,
  sameCoord,
  step,
} from '../grid';
import { enemyWalk } from '../movement';
import {
  distanceField,
  findUnit,
  inBoard,
  isAlive,
  isFire,
  isOpen,
  members,
  tileAt,
  travel,
  unitAt,
} from '../queries';
import type { Aim, BattleState, EnemyUnit, JarId, RivalIntent, Spell, UnitId } from '../types';
import { isEffect, isStarved, resolveRivalIntent, rivalDefOf, trickOf } from './resolve';
import type { GoalDef, GoalInput, ObjectRef, Outcome, PlanCandidate } from './types';

/**
 * The rival planner (rivals plan P4, P5; RV-4). Rng-free and pure: every action is tried on a
 * clone through the real resolver, scored by the routine's goal steps in order, and the first
 * step that yields an effective plan wins. Ties: shorter move, destination in reading order, aim
 * in `DIRS` order (tiles in reading order). The real state is only touched by `rivalAct`'s walk.
 */

/** What a plan does: walk `path` (empty = stay), then show `intent` (null = no telegraph). */
export interface RivalPlan {
  path: readonly Coord[];
  intent: RivalIntent | null;
}

// ── Destinations (P4) ───────────────────────────────────

interface Dest {
  at: Coord;
  path: Coord[];
}

/** A tile a planned walk may cross: no live step-jar, fire or drop. */
function safeTile(s: BattleState, c: Coord, self: UnitId): boolean {
  if (!isOpen(s, c, self)) return false;
  const t = tileAt(s, c);
  return !t.terrain.drop && !isFire(t) && t.jar?.event !== 'step';
}

/** Stay, then every safe tile within `move` steps (BFS in `DIRS` order): shortest, then reading order. */
export function destinations(s: BattleState, e: EnemyUnit, move: number): Dest[] {
  const out: Dest[] = [{ at: { ...e.pos }, path: [] }];
  const seen = new Set([key(e.pos)]);
  let frontier = out.slice();
  for (let d = 1; d <= move; d++) {
    const next: Dest[] = [];
    for (const r of frontier) {
      for (const dir of DIRS) {
        const n = step(r.at, dir);
        if (seen.has(key(n)) || !safeTile(s, n, e.id)) continue;
        seen.add(key(n));
        const reach = { at: n, path: [...r.path, n] };
        next.push(reach);
      }
    }
    next.sort((a, b) => byReadingOrder(a.at, b.at));
    out.push(...next);
    frontier = next;
  }
  return out;
}

// ── Native aims ─────────────────────────────────────────

/** The aims a rival spell may lock from `from`: Bolt in `DIRS` order, tiles in reading order. */
export function nativeAims(s: BattleState, from: Coord, spell: Spell): Aim[] {
  switch (spell.source) {
    case 'bolt':
      return DIRS.filter((d) => inBoard(s, step(from, d))).map((dir) => ({ kind: 'dir', dir }));
    case 'splash':
    case 'vat': {
      const range = spell.source === 'splash' ? TUNING.splashRange : TUNING.vatRange;
      const out: Aim[] = [];
      for (let y = 0; y < s.height; y++)
        for (let x = 0; x < s.width; x++)
          if (chebyshev(from, { x, y }) <= range) out.push({ kind: 'tile', at: { x, y } });
      return out;
    }
    case 'touch':
      return [
        { kind: 'self' },
        ...DIRS.map((d) => step(from, d))
          .filter((c) => inBoard(s, c))
          .map((at): Aim => ({ kind: 'tile', at })),
      ];
  }
}

// ── The clone evaluator (P4) ────────────────────────────

/** What the goals read beyond `Outcome`: where made objects stand and who was moved where. */
interface Detail {
  madeAt: Coord[];
  moves: { unit: UnitId; member: boolean; path: Coord[] }[];
  /** The rival's own step-jars as the cast began (after the walk). */
  ownJars: Coord[];
  dropped: UnitId[];
  /** Effect events that named an apprentice (inked, marked, pushed, hurt…). */
  partyTouched: number;
}
const details = new WeakMap<Outcome, Detail>();
const EMPTY: Detail = { madeAt: [], moves: [], ownJars: [], dropped: [], partyTouched: 0 };
const detailOf = (o: Outcome): Detail => details.get(o) ?? EMPTY;

function jarIdsOf(s: BattleState): Map<string, JarId> {
  const out = new Map<string, JarId>();
  s.tiles.forEach((t, i) => {
    if (t.jar?.id !== undefined)
      out.set(key({ x: i % s.width, y: Math.floor(i / s.width) }), t.jar.id);
  });
  return out;
}

function ownStepJars(s: BattleState, owner: UnitId): Coord[] {
  const out: Coord[] = [];
  s.tiles.forEach((t, i) => {
    if (t.jar?.owner === owner && t.jar.event === 'step')
      out.push({ x: i % s.width, y: Math.floor(i / s.width) });
  });
  return out;
}

const isMemberRef = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && 'member' in v && v.member === true;
/** The event names an apprentice as its `unit` or `target`. */
const namesMember = (e: GameEvent): boolean =>
  ('unit' in e && isMemberRef(e.unit)) || ('target' in e && isMemberRef(e.target));

/** Reads one cast's events into an `Outcome` (P4). */
export function outcomeOf(events: EventLog, self: UnitId, before: BattleState): Outcome {
  let partyHarm = 0;
  let selfHarm = 0;
  let allyHarm = 0;
  const entered: Coord[] = [];
  const made: ObjectRef[] = [];
  const opened: ObjectRef[] = [];
  const d: Detail = {
    madeAt: [],
    moves: [],
    ownJars: ownStepJars(before, self),
    dropped: [],
    partyTouched: 0,
  };
  const jars = jarIdsOf(before);
  const harm = (id: UnitId, member: boolean, n: number) => {
    if (id === self) selfHarm += n;
    else if (member) partyHarm += n;
    else allyHarm += n;
  };
  for (const e of events) {
    if (isEffect(e) && namesMember(e)) d.partyTouched++;
    if (e.type === 'damage') harm(e.target.id, e.target.member, e.amount);
    else if (e.type === 'shieldAbsorbs') harm(e.unit.id, e.unit.member, e.absorbed);
    else if (e.type === 'jarSealed') {
      jars.set(key(e.at), e.id);
      made.push({ kind: 'jar', id: e.id });
      d.madeAt.push({ ...e.at });
    } else if (e.type === 'jarOpened') {
      const id = jars.get(key(e.at));
      if (id !== undefined) opened.push({ kind: 'jar', id });
    } else if (e.type === 'dropped') d.dropped.push(e.unit.id);
    for (const r of relocations(e)) {
      entered.push(...r.path.map((c) => ({ ...c })));
      d.moves.push({ unit: r.unit.id, member: r.unit.member, path: r.path });
    }
  }
  const o: Outcome = {
    partyHarm,
    selfHarm,
    allyHarm,
    entered,
    made,
    opened,
    effect: !isStarved(events),
  };
  details.set(o, d);
  return o;
}

/** Walks `path` and casts `intent` on a clone; the real state and its rng are never touched. */
export function simulate(
  state: BattleState,
  unit: UnitId,
  path: readonly Coord[],
  intent: Extract<RivalIntent, { kind: 'cast' | 'trick' }>,
): Outcome {
  const ctx: Ctx = { s: cloneData(state), log: [], cast: null, meta: {}, footnotes: {} };
  const e = findUnit(ctx.s, unit);
  if (e?.kind !== 'enemy') return outcomeOf([], unit, ctx.s);
  enemyWalk(ctx, e, path);
  if (!isAlive(e)) return outcomeOf([], unit, ctx.s);
  const before = cloneData(ctx.s);
  const from = ctx.log.length;
  resolveRivalIntent(ctx, e, { ...intent, fallback: null });
  return outcomeOf(ctx.log.slice(from), unit, before);
}

// ── Goals (P5) ──────────────────────────────────────────

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const clean = (o: Outcome) => o.effect && o.selfHarm === 0;
const net = (o: Outcome) => o.partyHarm - o.allyHarm;

function hazardTiles(s: BattleState): Coord[] {
  const out: Coord[] = [];
  s.tiles.forEach((t, i) => {
    if (t.terrain.drop || isFire(t) || t.jar?.event === 'step')
      out.push({ x: i % s.width, y: Math.floor(i / s.width) });
  });
  return out;
}

/** The tiles `herdInto` aims at: the rival's own step-jars, or (`object: 'hazard'`) any hazard. */
function herdTargets(o: Outcome, input: GoalInput): Coord[] {
  return input.params.object === 'hazard' ? hazardTiles(input.state) : detailOf(o).ownJars;
}

const livingParty = (s: BattleState) => members(s).filter(isAlive);

/** The core vocabulary's action goals (plan §4). RV-12 adds `registerGoal` for district goals. */
export const CORE_GOALS: Readonly<Partial<Record<GoalId, GoalDef>>> = {
  /** Harm an apprentice, or land any effect on one, without harming himself. */
  hitParty: {
    id: 'hitParty',
    accepts: (o) => clean(o) && (o.partyHarm > 0 || detailOf(o).partyTouched > 0),
    /** Harm first, then how many effects reached the party. */
    score: (o) => net(o) * 100 + detailOf(o).partyTouched,
  },
  /** Push or slide an apprentice onto his own step-jar (or any hazard) without harming himself. */
  herdInto: {
    id: 'herdInto',
    accepts: (o, input) => {
      const targets = herdTargets(o, input);
      const d = detailOf(o);
      return (
        clean(o) &&
        (d.moves.some(
          (m) => m.member && m.path.some((c) => targets.some((t) => sameCoord(c, t))),
        ) ||
          (input.params.object === 'hazard' &&
            d.dropped.some((id) => findUnit(input.state, id)?.kind === 'member')))
      );
    },
    score: (o) => net(o) + 1,
  },
  /** Open his own object (the long wick) when it harms an apprentice and not himself. */
  openOwnObject: {
    id: 'openOwnObject',
    accepts: (o) => clean(o) && o.opened.length > 0 && o.partyHarm > 0,
    score: (o) => net(o),
  },
  /** Make an object within `near` tiles (default 2, Chebyshev) of a living apprentice: a useful landing. */
  placeObjectNear: {
    id: 'placeObjectNear',
    accepts: (o, input) => {
      const near = typeof input.params.near === 'number' ? input.params.near : 2;
      const party = livingParty(input.state);
      return (
        clean(o) && detailOf(o).madeAt.some((c) => party.some((m) => chebyshev(c, m.pos) <= near))
      );
    },
    /** Closer to the party scores higher. */
    score: (o, input) => {
      const party = livingParty(input.state);
      const best = Math.min(
        ...detailOf(o).madeAt.flatMap((c) => party.map((m) => chebyshev(c, m.pos))),
      );
      return net(o) - best;
    },
  },
};

/** Walking distance from `at` to the nearest living apprentice. */
function partyDistance(s: BattleState, at: Coord, self: UnitId): number {
  let best = Number.POSITIVE_INFINITY;
  for (const m of livingParty(s)) {
    const d = distanceField(s, m.pos, self).get(key(at));
    if (d !== undefined && d < best) best = d;
  }
  return best;
}

/**
 * P5 herding position: a Bolt from `at` first hits a living apprentice, and a push along its
 * heading brings them closer (Manhattan) to one of his own step-jars. Lower is better; null = not.
 */
function herdingScore(s: BattleState, e: EnemyUnit, at: Coord): number | null {
  const jars = ownStepJars(s, e.id);
  let best: number | null = null;
  for (const dir of DIRS) {
    const r = travel(s, at, dir, TUNING.boltRange, e.id);
    if (r.reason !== 'unit' || r.unit.kind !== 'member') continue;
    const pushed = step(r.unit.pos, dir);
    for (const j of jars) {
      const after = manhattan(pushed, j);
      if (after < manhattan(r.unit.pos, j) && (best === null || after < best)) best = after;
    }
  }
  return best;
}

/**
 * A `move` step's score for one destination (higher wins; null = it does not qualify). Move steps
 * have no cast to simulate, so they read the board: `approach`, `holdDistance` (`range`, default
 * 2) and `herdInto` (a herding position, P5).
 */
function moveScore(
  goal: GoalId,
  st: GoalStep,
  s: BattleState,
  e: EnemyUnit,
  dest: Dest,
): number | null {
  const d = partyDistance(s, dest.at, e.id);
  switch (goal) {
    case 'approach':
      return Number.isFinite(d) && d < partyDistance(s, e.pos, e.id) ? -d : null;
    case 'holdDistance': {
      const range = typeof st.params?.range === 'number' ? st.params.range : 2;
      return Number.isFinite(d) ? -Math.abs(d - range) : null;
    }
    case 'herdInto': {
      const h = herdingScore(s, e, dest.at);
      return h === null ? null : -h;
    }
    default:
      return null;
  }
}

// ── Planning ────────────────────────────────────────────

/** An empty routine (fixtures): hit the party with any spell, else approach. */
function defaultRoutine(def: RivalDef): GoalStep[] {
  return [
    ...def.spells.map(
      (sp): GoalStep => ({ goal: 'hitParty', action: { kind: 'spell', spell: sp.id } }),
    ),
    { goal: 'approach', action: { kind: 'move' } },
  ];
}

/** The fallback tile (rivals §1): the first adjacent tile in reading order holding a living apprentice. */
export function fallbackTile(s: BattleState, at: Coord): Coord | null {
  const near = DIRS.map((d) => step(at, d))
    .filter((c) => {
      const u = inBoard(s, c) ? unitAt(s, c) : null;
      return u?.kind === 'member' && isAlive(u);
    })
    .sort(byReadingOrder);
  return near[0] ?? null;
}

interface Scored {
  cand: PlanCandidate;
  score: number;
}

/** The best candidate of one spell step: strict `>` keeps the first in tie order. */
function bestSpellPlan(
  s: BattleState,
  e: EnemyUnit,
  def: RivalDef,
  st: GoalStep,
  action: Extract<GoalAction, { kind: 'spell' }>,
  dests: Dest[],
): PlanCandidate | null {
  const goal = CORE_GOALS[st.goal];
  const spell = e.rival?.spells[action.spell];
  if (!goal || !spell || (e.rival?.charges[action.spell] ?? 0) <= 0) return null;
  const input: GoalInput = { state: s, unit: e, rival: def, params: st.params ?? {} };
  let best: Scored | null = null;
  for (const dest of dests) {
    for (const aim of nativeAims(s, dest.at, spell)) {
      const intent = {
        kind: 'cast',
        spell: action.spell,
        aim,
        fallback: null,
        order: 0,
      } as const;
      const outcome = simulate(s, e.id, dest.path, intent);
      if (!outcome.effect) continue;
      const cand: PlanCandidate = { dest: dest.at, path: dest.path, intent, outcome };
      if (!goal.accepts(outcome, input, cand)) continue;
      const score = goal.score(outcome, input, cand);
      if (!best || score > best.score) best = { cand, score };
    }
  }
  return best?.cand ?? null;
}

/** The best action-trick candidate (the long wick): each plan the trick offers from each destination. */
function bestTrickPlan(
  s: BattleState,
  e: EnemyUnit,
  def: RivalDef,
  st: GoalStep,
  dests: Dest[],
): PlanCandidate | null {
  const goal = CORE_GOALS[st.goal];
  const trick = def.trick ? trickOf(def.trick) : null;
  if (!goal || !trick?.action || !e.rival) return null;
  const plans = trick.action.plan(s, e, e.rival.trick);
  const input: GoalInput = { state: s, unit: e, rival: def, params: st.params ?? {} };
  let best: Scored | null = null;
  for (const dest of dests) {
    for (const p of plans) {
      const intent = {
        kind: 'trick',
        trick: trick.id,
        lock: p.lock,
        data: p.data,
        fallback: null,
        order: 0,
      } as const;
      const outcome = simulate(s, e.id, dest.path, intent);
      if (!outcome.effect) continue;
      const cand: PlanCandidate = { dest: dest.at, path: dest.path, intent, outcome };
      if (!goal.accepts(outcome, input, cand)) continue;
      const score = goal.score(outcome, input, cand);
      if (!best || score > best.score) best = { cand, score };
    }
  }
  return best?.cand ?? null;
}

function bestMove(s: BattleState, e: EnemyUnit, st: GoalStep, dests: Dest[]): Dest | null {
  let best: { dest: Dest; score: number } | null = null;
  for (const dest of dests) {
    const score = moveScore(st.goal, st, s, e, dest);
    if (score !== null && (!best || score > best.score)) best = { dest, score };
  }
  return best?.dest ?? null;
}

/** Plain approach and strike once every spell is dry (P2): walk closer, strike if adjacent. */
function dryPlan(s: BattleState, e: EnemyUnit, dests: Dest[]): RivalPlan {
  let best = dests[0] ?? { at: e.pos, path: [] };
  let bestD = partyDistance(s, best.at, e.id);
  for (const d of dests) {
    const dist = partyDistance(s, d.at, e.id);
    if (dist < bestD) {
      best = d;
      bestD = dist;
    }
  }
  const dir: Dir | undefined = DIRS.find((d) => {
    const u = unitAt(s, step(best.at, d));
    return u?.kind === 'member' && isAlive(u);
  });
  return { path: best.path, intent: dir ? { kind: 'rivalStrike', dir, order: 0 } : null };
}

/**
 * The plan for this state (P4, P5): the first routine step that yields an effective plan wins.
 * Pure: the same state gives the same plan. `move` false plans from the current tile only.
 */
export function planRival(state: BattleState, unit: UnitId, move: boolean): RivalPlan | null {
  const e = findUnit(state, unit);
  if (e?.kind !== 'enemy' || !e.rival || !isAlive(e)) return null;
  const def = rivalDefOf(e);
  if (!def) return null;
  const dests = destinations(state, e, move ? ENEMIES[e.def].move : 0);
  const r = e.rival;
  // Dry of charges: only the wick (it needs a live jar, not a charge) or the plain strike remain.
  const dry = !Object.keys(r.spells).some((id) => (r.charges[id] ?? 0) > 0);
  const routine = def.routine.length ? def.routine : defaultRoutine(def);
  for (const st of routine) {
    const a = st.action;
    if (a.kind === 'spell') {
      const c = bestSpellPlan(state, e, def, st, a, dests);
      if (c?.intent.kind === 'cast')
        return { path: c.path, intent: { ...c.intent, fallback: fallbackTile(state, c.dest) } };
    } else if (a.kind === 'trick') {
      const c = bestTrickPlan(state, e, def, st, dests);
      if (c?.intent.kind === 'trick')
        return { path: c.path, intent: { ...c.intent, fallback: fallbackTile(state, c.dest) } };
    } else if (a.kind === 'move' && move && !dry) {
      const d = bestMove(state, e, st, dests);
      if (d?.path.length) return { path: d.path, intent: null };
    }
  }
  return dry ? dryPlan(state, e, dests) : { path: [], intent: null };
}
