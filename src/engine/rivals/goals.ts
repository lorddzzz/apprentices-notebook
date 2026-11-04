import { TUNING } from '$data';
import type { GoalId } from '$data/rivals';
import { KIT } from '../districts/kit';
import type { Json } from '../districts/types';
import { type Coord, chebyshev, DIRS, key, sameCoord, step } from '../grid';
import { distanceField, findUnit, isAlive, isFire, members, travel } from '../queries';
import type { BattleState, EnemyUnit, UnitId } from '../types';
import type { GoalDef, GoalDest, GoalInput, Outcome, RivalModule } from './types';

/**
 * The goal vocabulary (rivals plan §4, P5; RV-12). A routine is an ordered list of
 * `GoalStep {goal, action, params}`; the planner (`plan.ts`) looks each goal up here by id and the
 * first step that yields an effective plan wins. A goal is data over the simulation: an action
 * goal judges a simulated cast (`accepts`, `score`), a move goal scores a destination
 * (`moveScore`), and a goal may do both (`herdInto`). Goals are pure and rng-free.
 *
 * Core vocabulary, with its params (all optional):
 * - `hitParty`: harm an apprentice, or land any effect on one, without harming himself.
 * - `herdInto`: push or slide an apprentice onto a target without harming himself. Targets are
 *   `object: 'jar'` (default: his own step-jars), `'hazard'` (any step-jar, fire or drop) or
 *   `tiles: [{x, y}, …]`. As a move: stand where a Bolt first hits an apprentice and the push
 *   brings them closer to a target.
 * - `openOwnObject`: open one of his objects (the long wick) when it harms an apprentice and not him.
 * - `placeObjectNear`: make an object within `near` tiles (default 2, Chebyshev) of an apprentice.
 * - `approach`: move closer to the nearest apprentice.
 * - `holdDistance`: move to `range` tiles (default 2) of the nearest apprentice.
 *
 * Districts add theirs with `registerGoal` or through `RivalModule.goals`; ids are `district:name`.
 */

// ── What the planner records about a cast ───────────────

/** What the goals read beyond `Outcome`: where made objects stand and who was moved where. */
export interface Detail {
  madeAt: Coord[];
  moves: { unit: UnitId; member: boolean; path: Coord[] }[];
  /** The rival's own step-jars as the cast began (after the walk). */
  ownJars: Coord[];
  dropped: UnitId[];
  /** Effect events that named an apprentice (inked, marked, pushed, hurt…). */
  partyTouched: number;
  /** His own jars (standing before the cast) that crumbled: a re-laid lantern, a thrown-away trap. */
  ownCrumbled: number;
}
const details = new WeakMap<Outcome, Detail>();
const EMPTY: Detail = {
  madeAt: [],
  moves: [],
  ownJars: [],
  dropped: [],
  partyTouched: 0,
  ownCrumbled: 0,
};
/** The detail `outcomeOf` attached to an outcome (empty for a hand-made one, e.g. in a test). */
export const detailOf = (o: Outcome): Detail => details.get(o) ?? EMPTY;
/** Attaches a detail to an outcome (the planner's evaluator calls this; fixtures may too). */
export const setDetail = (o: Outcome, d: Detail): void => {
  details.set(o, d);
};

// ── Board readers the goals share ───────────────────────

const coordAt = (s: BattleState, i: number): Coord => ({
  x: i % s.width,
  y: Math.floor(i / s.width),
});

/** Tiles holding a live step-jar owned by `owner`, in reading order. */
export function ownStepJars(s: BattleState, owner: UnitId): Coord[] {
  const out: Coord[] = [];
  s.tiles.forEach((t, i) => {
    if (t.jar?.owner === owner && t.jar.event === 'step') out.push(coordAt(s, i));
  });
  return out;
}

/** Tiles that hurt whoever is pushed onto them: a step-jar, fire or a drop. */
export function hazardTiles(s: BattleState): Coord[] {
  const out: Coord[] = [];
  s.tiles.forEach((t, i) => {
    if (t.terrain.drop || isFire(t) || t.jar?.event === 'step') out.push(coordAt(s, i));
  });
  return out;
}

export const livingParty = (s: BattleState) => members(s).filter(isAlive);

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Walking distance from `at` to the nearest living apprentice (Infinity when unreachable). */
export function partyDistance(s: BattleState, at: Coord, self: UnitId): number {
  let best = Number.POSITIVE_INFINITY;
  for (const m of livingParty(s)) {
    const d = distanceField(s, m.pos, self).get(key(at));
    if (d !== undefined && d < best) best = d;
  }
  return best;
}

/** An effective action that costs him nothing: no self-harm, and none of his own live objects crumble. */
export const clean = (o: Outcome): boolean =>
  o.effect && o.selfHarm === 0 && detailOf(o).ownCrumbled === 0;
/** Harm to apprentices less harm to his allies. */
export const net = (o: Outcome): number => o.partyHarm - o.allyHarm;

const num = (v: Json | undefined, fallback: number): number =>
  typeof v === 'number' ? v : fallback;

function tilesParam(v: Json | undefined): Coord[] {
  if (!Array.isArray(v)) return [];
  const out: Coord[] = [];
  for (const c of v)
    if (
      c &&
      typeof c === 'object' &&
      !Array.isArray(c) &&
      typeof c.x === 'number' &&
      typeof c.y === 'number'
    )
      out.push({ x: c.x, y: c.y });
  return out;
}

/** The tiles `herdInto` aims at (see the header); `own` is where his own step-jars stand. */
function herdTargets(input: GoalInput, own: Coord[]): Coord[] {
  const { params, state } = input;
  if (params.tiles !== undefined) return tilesParam(params.tiles);
  return params.object === 'hazard' ? hazardTiles(state) : own;
}

/**
 * Herding position: a Bolt from `at` first hits a living apprentice, and a push along its heading
 * brings them closer (Manhattan) to a target. Lower is better; null = not a herding position.
 */
function herdingScore(s: BattleState, e: EnemyUnit, at: Coord, targets: Coord[]): number | null {
  let best: number | null = null;
  for (const dir of DIRS) {
    const r = travel(s, at, dir, TUNING.boltRange, e.id);
    if (r.reason !== 'unit' || r.unit.kind !== 'member') continue;
    const pushed = step(r.unit.pos, dir);
    for (const j of targets) {
      const after = manhattan(pushed, j);
      if (after < manhattan(r.unit.pos, j) && (best === null || after < best)) best = after;
    }
  }
  return best;
}

// ── The core vocabulary ─────────────────────────────────

const hitParty: GoalDef = {
  id: 'hitParty',
  accepts: (o) => clean(o) && (o.partyHarm > 0 || detailOf(o).partyTouched > 0),
  /** Harm first, then how many effects reached the party. */
  score: (o) => net(o) * 100 + detailOf(o).partyTouched,
};

const herdInto: GoalDef = {
  id: 'herdInto',
  accepts: (o, input) => {
    const targets = herdTargets(input, detailOf(o).ownJars);
    const d = detailOf(o);
    return (
      clean(o) &&
      (d.moves.some((m) => m.member && m.path.some((c) => targets.some((t) => sameCoord(c, t)))) ||
        (input.params.object === 'hazard' &&
          d.dropped.some((id) => findUnit(input.state, id)?.kind === 'member')))
    );
  },
  score: (o) => net(o) + 1,
  moveScore: (input, dest) => {
    const h = herdingScore(
      input.state,
      input.unit,
      dest.at,
      herdTargets(input, ownStepJars(input.state, input.unit.id)),
    );
    return h === null ? null : -h;
  },
};

const openOwnObject: GoalDef = {
  id: 'openOwnObject',
  accepts: (o) => clean(o) && o.opened.length > 0 && o.partyHarm > 0,
  score: (o) => net(o),
};

const placeObjectNear: GoalDef = {
  id: 'placeObjectNear',
  accepts: (o, input) => {
    const near = num(input.params.near, 2);
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
};

const approach: GoalDef = {
  id: 'approach',
  moveScore: (input, dest: GoalDest) => {
    const d = partyDistance(input.state, dest.at, input.unit.id);
    return Number.isFinite(d) && d < partyDistance(input.state, input.unit.pos, input.unit.id)
      ? -d
      : null;
  },
};

const holdDistance: GoalDef = {
  id: 'holdDistance',
  moveScore: (input, dest) => {
    const d = partyDistance(input.state, dest.at, input.unit.id);
    return Number.isFinite(d) ? -Math.abs(d - num(input.params.range, 2)) : null;
  },
};

/** The goals the engine registers itself, in vocabulary order. */
export const CORE_GOALS: readonly GoalDef[] = [
  hitParty,
  herdInto,
  openOwnObject,
  placeObjectNear,
  approach,
  holdDistance,
];

// ── Registry ────────────────────────────────────────────

const extra = new Map<GoalId, GoalDef>();
let table: Map<GoalId, GoalDef> | null = null;

/**
 * Every goal by id: the core list, then each district module's `goals` (`RivalModule`, registry
 * order). Built on first use (district modules import the movers, so `KIT` is not ready while
 * this file loads). `registerGoal` entries are consulted before it.
 */
function goalTable(): Map<GoalId, GoalDef> {
  if (table) return table;
  const out = new Map<GoalId, GoalDef>();
  const modules = Object.values(KIT.modules) as Partial<RivalModule>[];
  for (const g of [...CORE_GOALS, ...modules.flatMap((m) => m.goals ?? [])]) {
    if (out.has(g.id)) throw new Error(`Goal '${g.id}' is registered twice`);
    out.set(g.id, g);
  }
  table = out;
  return out;
}

/**
 * Adds a goal to the vocabulary (a district or a test fixture). Ids are namespaced
 * (`canals:keepDry`) and may not repeat a core, module or earlier registered id. Returns a
 * function that removes it again (tests; a district registers for the life of the program).
 */
export function registerGoal(goal: GoalDef): () => void {
  if (extra.has(goal.id) || goalTable().has(goal.id))
    throw new Error(`Goal '${goal.id}' is registered twice`);
  extra.set(goal.id, goal);
  return () => {
    if (extra.get(goal.id) === goal) extra.delete(goal.id);
  };
}

/** A goal by id, or null (a routine step naming an unknown goal never matches). */
export const goalOf = (id: GoalId): GoalDef | null => extra.get(id) ?? goalTable().get(id) ?? null;
