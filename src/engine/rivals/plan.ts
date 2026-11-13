import { TUNING } from '$data';
import type { GoalAction, GoalId, GoalStep, RivalDef } from '$data/rivals';
import { cloneData } from '../clone';
import type { Ctx, FootnoteIds } from '../ctx';
import type { Json } from '../districts/types';
import { type EventLog, type GameEvent, relocations } from '../events';
import { byReadingOrder, type Coord, chebyshev, DIRS, type Dir, key, step } from '../grid';
import { hasFootnote } from '../footnotes';
import { WICK_NOTE } from '../jars';
import { enemyWalk } from '../movement';
import { findUnit, inBoard, isAlive, isFire, isOpen, tileAt, unitAt } from '../queries';
import type { Aim, BattleState, EnemyUnit, JarId, RivalIntent, Spell, UnitId } from '../types';
import { type Detail, goalOf, ownStepJars, partyDistance, setDetail } from './goals';
import { isEffect, isStarved, resolveRivalIntent, rivalDefOf, trickOf } from './resolve';
import { isTrickEvent } from './tricks';
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

/** A tile a planned walk may cross: no fire or drop, and no live step-jar unless the Jar note is written (RV-20b). */
function safeTile(s: BattleState, c: Coord, self: UnitId, footnotes: FootnoteIds): boolean {
  if (!isOpen(s, c, self)) return false;
  const t = tileAt(s, c);
  const jarOk = t.jar?.event !== 'step' || hasFootnote({ footnotes }, WICK_NOTE);
  return !t.terrain.drop && !isFire(t) && jarOk;
}

/** Stay, then every safe tile within `move` steps (BFS in `DIRS` order): shortest, then reading order. */
export function destinations(
  s: BattleState,
  e: EnemyUnit,
  move: number,
  footnotes: FootnoteIds = {},
): Dest[] {
  const out: Dest[] = [{ at: { ...e.pos }, path: [] }];
  const seen = new Set([key(e.pos)]);
  let frontier = out.slice();
  for (let d = 1; d <= move; d++) {
    const next: Dest[] = [];
    for (const r of frontier) {
      for (const dir of DIRS) {
        const n = step(r.at, dir);
        if (seen.has(key(n)) || !safeTile(s, n, e.id, footnotes)) continue;
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

function jarIdsOf(s: BattleState): Map<string, JarId> {
  const out = new Map<string, JarId>();
  s.tiles.forEach((t, i) => {
    if (t.jar?.id !== undefined)
      out.set(key({ x: i % s.width, y: Math.floor(i / s.width) }), t.jar.id);
  });
  return out;
}

const ownedJarAt = (s: BattleState, at: Coord, owner: UnitId): boolean =>
  inBoard(s, at) && tileAt(s, at).jar?.owner === owner;

const isMemberRef = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && 'member' in v && v.member === true;
/** The event names an apprentice as its `unit` or `target`. */
const namesMember = (e: GameEvent): boolean =>
  ('unit' in e && isMemberRef(e.unit)) || ('target' in e && isMemberRef(e.target));

/** The id and tile of a `<district>:trickObject` event's object. */
function trickObjectMade(e: GameEvent): { id: number; at: Coord | null } | null {
  const d = 'data' in e ? e.data : null;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const o = d as { readonly [k: string]: Json };
  if (typeof o.id !== 'number') return null;
  const at = o.at && typeof o.at === 'object' && !Array.isArray(o.at) ? o.at : null;
  const { x, y } = (at ?? {}) as { readonly [k: string]: Json };
  return { id: o.id, at: typeof x === 'number' && typeof y === 'number' ? { x, y } : null };
}

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
    ownCrumbled: 0,
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
      const id = e.id ?? jars.get(key(e.at));
      if (id !== undefined) opened.push({ kind: 'jar', id });
    } else if (isTrickEvent(e, 'trickObject')) {
      // A trick object made (a writ, a circle): an object like a sealed jar (RV-14).
      const made1 = trickObjectMade(e);
      if (made1) {
        made.push({ kind: 'trick', id: made1.id });
        if (made1.at) d.madeAt.push(made1.at);
      }
    } else if (e.type === 'jarCrumbles' && ownedJarAt(before, e.at, self)) d.ownCrumbled++;
    else if (e.type === 'dropped') d.dropped.push(e.unit.id);
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
  setDetail(o, d);
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

/** A goal's action half (`accepts` and `score`), or null for an unknown or move-only goal. */
function actionGoal(id: GoalId): Required<Pick<GoalDef, 'accepts' | 'score'>> | null {
  const g = goalOf(id);
  return g?.accepts && g.score ? { accepts: g.accepts, score: g.score } : null;
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
  const goal = actionGoal(st.goal);
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
  const goal = actionGoal(st.goal);
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

function bestMove(
  s: BattleState,
  e: EnemyUnit,
  def: RivalDef,
  st: GoalStep,
  dests: Dest[],
): Dest | null {
  const goal = goalOf(st.goal);
  if (!goal?.moveScore) return null;
  const input: GoalInput = { state: s, unit: e, rival: def, params: st.params ?? {} };
  let best: { dest: Dest; score: number } | null = null;
  for (const dest of dests) {
    const score = goal.moveScore(input, dest);
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
export function planRival(
  state: BattleState,
  unit: UnitId,
  move: boolean,
  footnotes: FootnoteIds = {},
): RivalPlan | null {
  const e = findUnit(state, unit);
  if (e?.kind !== 'enemy' || !e.rival || !isAlive(e)) return null;
  const def = rivalDefOf(e);
  if (!def) return null;
  const dests = destinations(state, e, move ? def.move : 0, footnotes); // the RivalDef's move, not the shell's
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
      const d = bestMove(state, e, def, st, dests);
      if (d?.path.length) return { path: d.path, intent: null };
    }
  }
  return dry ? dryPlan(state, e, dests) : { path: [], intent: null };
}
