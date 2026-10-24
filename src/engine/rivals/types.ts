import type {
  GoalId,
  GoalParams,
  RivalDef,
  RivalId,
  RivalPageId,
  RivalSpellId,
  TrickId,
} from '$data/rivals';
import type { Ctx } from '../ctx';
import type { Json, RoundEndSlot } from '../districts/types';
import type { EventLog, UnitRef } from '../events';
import type { Coord } from '../grid';
import type { Harm, HarmVerdict } from '../harm';
import type {
  Aim,
  BattleState,
  EnemyUnit,
  JarId,
  Origin,
  RivalIntent,
  Spell,
  UnitId,
} from '../types';

/**
 * The rival engine's contracts (rivals plan P1–P10, §4; RV-W0). Interfaces only: RV-1..RV-6 build
 * units, casting, the wick, the planner and the preview against them; RV-11..RV-14 the trick hooks.
 */

// ── Telegraph descriptor (P10 `draw`) ───────────────────
/**
 * What a telegraphed step or trick shows before it acts, drawn by the generic UI (RV-13). DK's
 * `ScriptStep`/`FoeBehaviour` reuse it for stand-in hearts and district foes.
 */
export interface Telegraph {
  label: string;
  tiles: readonly Coord[];
  units: readonly UnitId[];
  /** Board objects it is about (the wick's jar, a writ, a circle). */
  objects?: readonly ObjectRef[];
  /** An `n/m` sequence (a tune's notes). */
  sequence?: readonly [number, number];
  /** Rounds left (the clock writ). */
  countdown?: number;
}

// ── Objects and locks (P2, P10) ─────────────────────────
/** A trick-owned board object's id: battle-unique, never reused (like `JarId`). */
export type TrickObjectId = number;
/** A named board object. Jars use FD's stable `Jar.id`; trick objects their own id. */
export type ObjectRef = { kind: 'jar'; id: JarId } | { kind: 'trick'; id: TrickObjectId };
/** A trick's own object (a writ, a register circle, a tune): plain data, cloned and saved. */
export interface TrickObject {
  id: TrickObjectId;
  trick: TrickId;
  owner: UnitId;
  /** Its tile, or null when it is not on the board (a tune). */
  at: Coord | null;
  data: Json;
}
/** Why a locked order fails (RV-3): it never switches to a replacement object. */
export type LockLost = 'opened' | 'erased' | 'crumbled' | 'ownerChanged' | 'gone';

// ── Rival state (P1) ────────────────────────────────────
/** What a rival unit carries (RV-1 attaches it to its `EnemyUnit`). Plain serialisable data. */
export interface RivalState {
  rival: RivalId;
  /** Each kit spell compiled at spawn, by its def id. */
  spells: Readonly<Record<RivalSpellId, Spell>>;
  /** Casts left this encounter, by spell id. */
  charges: Record<RivalSpellId, number>;
  /** The signature trick's own state (`TrickDef.init`). */
  trick: Json;
  /** Objects the trick owns on the board. */
  objects: TrickObject[];
  /** Objects named by the shown intent (the long wick's jar). */
  locked: ObjectRef[];
  /** A scenario's pinned intent (RV-1): RV-2 resolves it in place of planning. */
  pinned?: RivalIntent;
}

// ── Planning (P4, P5) ───────────────────────────────────
/** What one simulated action did, from the real resolver on a clone (P4). */
export interface Outcome {
  /** Damage dealt to apprentices, absorbed included. */
  partyHarm: number;
  selfHarm: number;
  allyHarm: number;
  /** Tiles units entered (push, slide, drift), in order. */
  entered: readonly Coord[];
  /** Objects made (a sealed jar) and opened. */
  made: readonly ObjectRef[];
  opened: readonly ObjectRef[];
  /** False = starved (`isStarved`): such a plan is never telegraphed. */
  effect: boolean;
}
/** One scored candidate: a destination, the walk there and the action from it. */
export interface PlanCandidate {
  dest: Coord;
  path: readonly Coord[];
  intent: RivalIntent;
  outcome: Outcome;
}
/** What a goal reads besides the outcome. */
export interface GoalInput {
  state: BattleState;
  unit: EnemyUnit;
  rival: RivalDef;
  params: GoalParams;
}
/** One goal in the vocabulary (P5): a predicate plus a score; higher scores win. */
export interface GoalDef {
  id: GoalId;
  accepts(outcome: Outcome, input: GoalInput, candidate: PlanCandidate): boolean;
  score(outcome: Outcome, input: GoalInput, candidate: PlanCandidate): number;
}

// ── Preview (P6, P7) ────────────────────────────────────
/** `rivalPreview(state, id)`: the shown action simulated now, on a clone. */
export interface RivalPreview {
  path: readonly Coord[];
  landing: Coord | null;
  targets: readonly UnitId[];
  events: EventLog;
  /** Only the objects this action would open (P7). */
  opens: readonly ObjectRef[];
  /** The fallback tile is still adjacent and occupied by an apprentice. */
  fallbackLive: boolean;
}

// ── Trick hook points (P10) ─────────────────────────────
/** An action trick's candidate: what the intent would lock and carry. */
export interface TrickPlan {
  lock: ObjectRef | null;
  data: Json;
}
/** When a per-round mark resolves relative to the enemy actions. */
export type MarkTiming = 'beforeActions' | 'afterActions';
/** A per-round mark: an extra, always-shown, non-action telegraph (a tune note, register circles). */
export interface TrickMark {
  data: Json;
  tiles: readonly Coord[];
}
/** `beforeHarm`'s answer: AH's guard verdicts, or cancel and move through FD's pipeline. */
export type TrickHarmReaction = HarmVerdict | { kind: 'relocate'; to: Coord };
/** What an immunity can refuse. */
export type Resistance = 'push' | 'hold' | 'fall';

/**
 * A signature trick (P10). Every hook is optional; `own` is the trick's state in `RivalState.trick`,
 * and hooks that change it return the next state. Lives in its district's engine module.
 */
export interface TrickDef<S extends Json = Json> {
  id: TrickId;
  name: string;
  init(rival: RivalDef): S;
  /** Action trick, telegraphed like a spell (the long wick, the clock writ). */
  action?: {
    plan(state: BattleState, unit: EnemyUnit, own: S): readonly TrickPlan[];
    resolve(ctx: Ctx, unit: EnemyUnit, intent: Extract<RivalIntent, { kind: 'trick' }>, own: S): S;
  };
  /** Per-round mark with its timing slot. */
  mark?: {
    timing: MarkTiming;
    plan(state: BattleState, unit: EnemyUnit, own: S): TrickMark | null;
    resolve(ctx: Ctx, unit: EnemyUnit, mark: TrickMark, own: S): S;
  };
  /** Reaction before harm lands on the rival (steams away); registered as an `rv:` harm guard. */
  beforeHarm?(ctx: Ctx, unit: EnemyUnit, harm: Harm, own: S): TrickHarmReaction;
  /** Immunity conditioned on board state (right of way). */
  resists?(state: BattleState, unit: EnemyUnit, what: Resistance, own: S): boolean;
  /** Round-end step through DK's round-end slots (the clock expires, circled units are erased). */
  roundEnd?: { slot: RoundEndSlot; step(ctx: Ctx, unit: EnemyUnit, own: S): S };
  onDeath?(ctx: Ctx, unit: EnemyUnit, own: S): S;
  /** The generic telegraph for an action intent or a mark. */
  draw(state: BattleState, unit: EnemyUnit, shown: TrickPlan | TrickMark, own: S): Telegraph;
  describe(shown: TrickPlan | TrickMark): string;
}

/** What a district's engine module adds for its rival (DK to spread into `DistrictModule`). */
export interface RivalModule {
  tricks?: readonly TrickDef[];
  goals?: readonly GoalDef[];
}

// ── Events (plan §4) ────────────────────────────────────
/** Events RV-2/RV-3/RV-15 join into `GameEvent`. */
export type RivalEvent =
  | { type: 'rivalPlans'; unit: UnitRef; intent: RivalIntent }
  /** A locked tile aim no longer legal from the rival's tile (RV-2): no cast, no charge spent. */
  | { type: 'castFails'; unit: UnitRef; spell: string; at: Coord }
  /** The starved-chain strike at its pre-shown tile; `target` null = defeated (left, out of reach). */
  | { type: 'fallbackStrike'; unit: UnitRef; at: Coord; target: UnitRef | null; damage: number }
  | { type: 'orderFails'; unit: UnitRef; object: ObjectRef; why: LockLost }
  | { type: 'pageRecovered'; page: RivalPageId };

// ── Entry points (signatures; RV-2, RV-6, RV-15 implement) ──
export type IsEffectFn = (e: EventLog[number]) => boolean;
export type IsStarvedFn = (events: EventLog) => boolean;
export type RivalPreviewFn = (state: BattleState, unit: UnitId) => RivalPreview | null;
/** Who cast what, for credit by origin (RV-16). */
export type OriginOf = (e: EventLog[number]) => Origin | null;
/** The native aims a rival spell may lock (RV-4 enumerates them in `DIRS` order). */
export type NativeAimsFn = (state: BattleState, unit: EnemyUnit, spell: Spell) => readonly Aim[];
