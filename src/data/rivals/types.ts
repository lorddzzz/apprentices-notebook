import type { Json, KitId } from '$engine/districts/types';
import type { AttackId, DistrictId, Habitat, HabitId, LineId, RuneId } from '../types';

/**
 * The rival data contracts (rivals plan P1, P5, P10, P11, P15; RV-W0). Types only: RV-1 builds the
 * units from `RivalDef`, RV-4 reads `GoalStep`s, RV-15 banks `RivalPageDef`s. A district adds its
 * rival by extending `RivalId` here and listing the def in `RIVALS` (`./index.ts`).
 */

// ── Ids ─────────────────────────────────────────────────
/** One id per rival; districts add theirs (IQ, BH, BR, BF, CG). */
export type RivalId = 'lamplighter';
/** A spell inside one rival's kit (`'lantern'`, `'herd'`); unique per rival only. */
export type RivalSpellId = string;
/** A recovered page, namespaced by its rival: `'lamplighter:lantern'`. Validated against `RIVAL_PAGES`. */
export type RivalPageId = `${RivalId}:${string}`;
/** A signature trick (P10), namespaced by its district: `'canals:longWick'`. */
export type TrickId = KitId;

// ── Spells (P1) ─────────────────────────────────────────
/** One spell in the kit: an ordinary lattice, compiled at spawn with full knowledge and no lean. */
export interface RivalSpellDef {
  id: RivalSpellId;
  name: string;
  /** `parseLattice` notation, as a member's page. */
  lattice: string;
  /** Casts per encounter (rivals §2: five). */
  charges: number;
}

// ── Routine (P5) ────────────────────────────────────────
/** The shared goal vocabulary (plan §4); districts add theirs through `registerGoal` (RV-12). */
export type CoreGoalId =
  | 'hitParty'
  | 'herdInto'
  | 'openOwnObject'
  | 'placeObjectNear'
  | 'approach'
  | 'holdDistance';
export type GoalId = CoreGoalId | KitId;
/** Which action a goal step may try: one spell, the action trick, or a plain move. */
export type GoalAction =
  | { kind: 'spell'; spell: RivalSpellId }
  | { kind: 'trick' }
  | { kind: 'move' };
/** Goal parameters (`herdInto`: `{ object: 'jar' }`), plain data so a def stays serialisable. */
export type GoalParams = { readonly [k: string]: Json };
/** One row of a routine; the first step that yields an effective plan wins (P5). */
export interface GoalStep {
  goal: GoalId;
  action: GoalAction;
  params?: GoalParams;
}

// ── The rival (P1) ──────────────────────────────────────
export interface RivalDef {
  id: RivalId;
  /** Display name, capitalised: "Lamplighter" until a district names him (P15). */
  name: string;
  /** Board token, one letter, checked against every other token (`RIVAL_TOKENS`). */
  token: string;
  /** Home district: a page banks only from a fight there (build program §4, RV-15). */
  district: DistrictId;
  hp: number;
  move: number;
  elite: boolean;
  habitat: Habitat;
  blurb: string;
  spells: readonly RivalSpellDef[];
  routine: readonly GoalStep[];
  /** The P10 signature trick (an action, mark, reaction, immunity or round-end hook). */
  trick: TrickId | null;
  /** An AH habit carried as `EnemyDef.trick` (a passive rule); separate from `trick`. */
  habit?: HabitId;
  /** The starved-chain strike (rivals §1). */
  fallback: { damage: number };
  /** The plain attack once every spell is dry (P2 `rivalStrike`), never a fallback. */
  dryStrike: AttackId;
  page: RivalPageId | null;
}

// ── Recovered pages (P11–P13) ───────────────────────────
/** The page's footnote variant (footnotes §1): a third option in a named slot, in FN's format. */
export interface RivalNote {
  rune: RuneId;
  line: LineId;
  variant: string;
}
export interface RivalPageDef {
  id: RivalPageId;
  rival: RivalId;
  /** Which of the rival's spells the page recovers. */
  spell: RivalSpellId;
  title: string;
  /** The recovered spell's exact wiring (`parseLattice` notation). */
  lattice: string;
  annotation: string;
  story: string;
  /** The Bench page trial's ready scene, in board notation (RV-18). */
  trial: { board: string };
  note: RivalNote | null;
}
