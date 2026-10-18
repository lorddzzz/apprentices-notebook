/**
 * Rune redesign engine contracts (docs/plans/rune-redesign-plan.md §2.2–2.4).
 * W0 writes them beside the old model; W0b moves them into `engine/types.ts` and deletes the old.
 */

import type { DraftGoal, EnemyId, MemberId } from '$data';
import type {
  AuraRuneId,
  BindEvent,
  CompoundId,
  EdgeRule,
  HabitId,
  Lean,
  LineId,
  Meets,
  RuneRef,
  SealRuneId,
  SolventId,
  SourceRuneId,
  StateId,
  TriggerRuneId,
} from '$data/next/types';
import type { Coord, Dir } from '../grid';
import type { CellKey, GlyphId, Intent, SpellKey, UnitId } from '../types';

export type { CellKey, GlyphId, SpellKey, UnitId };

/** Which cast made a board object; every event it later causes carries it (P8, lifetime elegance). */
export interface Origin {
  caster: UnitId;
  spell: SpellKey;
  cast: number; // BattleState.castSeq at cast start
  glyph?: GlyphId;
}

// ── Tiles ───────────────────────────────────────────────
/** A state or compound on a tile. */
export interface Layer {
  id: StateId | CompoundId;
  rounds: number; // rounds left; 0 = permanent (layout plate, or set by Lay)
  origin: Origin | null;
  hits?: number; // plates and Walls: hits left before it breaks
  set?: true; // Lay: permanent until broken
  /** Aura flags read at decay: Afterglow (+1 round once), Steep (spreads each round). */
  afterglow?: true;
  steep?: true;
}
export interface Terrain {
  water: Dir | null; // canal lane and its current
  drop: boolean; // `_`: an open side; a pushed land unit drops (P3)
  vent: boolean;
  grate: boolean;
  gate: boolean;
  lamp: boolean;
}
export interface Jar {
  owner: UnitId;
  event: 'step' | 'dusk'; // Jar opens on a step, Fuse at round end
  rest: Step | null; // what was wired after the Seal
  heading: Dir | null; // the sealing cast's heading (P32)
  origin: Origin;
}
export interface Tile {
  terrain: Terrain;
  state: Layer | null;
  jar: Jar | null;
  hot: number; // Cinder: rounds left; oil here catches fire
}

// ── Units ───────────────────────────────────────────────
/** What a bound mark holds (Bind). */
export interface Bound {
  action: RuneRef;
  event: BindEvent;
  solvent: SolventId | null;
  heading: Dir | null; // the binding cast's heading, the fallback release heading (P30)
}
export interface Mark {
  deep: boolean; // Deep mark: takes two Sparks to clear
  lineage: number; // spread copies share one lineage (§6.4 limit 3)
  bound: Bound | null;
  origin: Origin | null;
  wax?: true; // Wax solvent: never spreads, fire melts it unspent
}
interface UnitBase {
  id: UnitId;
  name: string;
  pos: Coord;
  hp: number;
  maxHp: number;
  shield: number;
  guardUntil: number | null; // round at whose player phase start Guard's shield ends (P27)
  mark: Mark | null;
  collar: Origin | null | false; // false = none; null = layout (born brass)
  shackle: number; // rounds left; 0 = none
  held: number; // Hold/Rivet: rounds left
  stunned: boolean; // skips its next action (dropped elite)
  elite: boolean; // members count as elites (P19)
  lastMove: Dir | null; // this turn, for Touch-self headings (P22)
}
export interface UndoRecord {
  from: Coord;
}
export interface MemberUnit extends UnitBase {
  kind: 'member';
  def: MemberId;
  move: number;
  moved: boolean;
  acted: boolean;
  undo: UndoRecord | null;
  spells: Spell[];
  charges: Record<SpellKey, number>;
  lean: Lean;
}
export interface EnemyUnit extends UnitBase {
  kind: 'enemy';
  def: EnemyId;
  intent: Intent | null;
}
export type Unit = MemberUnit | EnemyUnit;

// ── Spells and steps (§2.3) ─────────────────────────────
interface StepBase {
  at: Coord; // lattice cell (a Glyph's socket)
  inner?: Coord; // inside a Glyph: the local cell
  via?: readonly Coord[]; // shape cells walked to reach it
  viaInner?: readonly Coord[];
}
/** Margin inventions are auras too. */
export type AuraRef = AuraRuneId | `inv:${string}`;
/** One wired rune after the Source. Bend leaves no step (R6). */
export type Step =
  | (StepBase & {
      role: 'action' | 'kind';
      rune: RuneRef;
      auras: readonly AuraRef[];
      next: Step | null;
    })
  | (StepBase & { role: 'trigger'; rune: TriggerRuneId; next: Step | null })
  | (StepBase & { role: 'shape'; rune: 'seep' | 'lay' | 'toll'; next: Step | null })
  | (StepBase & { role: 'fork'; left: Step | null; right: Step | null })
  | (StepBase & { role: 'seal'; rune: SealRuneId; rest: Step | null }); // J1: the rest goes in the jar

export interface PathCell {
  at: Coord;
  rune: RuneRef;
  dir: Dir;
  inner?: Coord;
}
export interface FiredCell {
  at: Coord;
  rune: RuneRef | null; // null for a Glyph socket
  glyph?: GlyphId;
  dir?: Dir;
}
export interface Spell {
  key: SpellKey;
  at: Coord;
  source: SourceRuneId;
  sourceAuras: readonly AuraRef[]; // auras touching the source cell
  first: Step | null;
  charges: number;
  path: readonly PathCell[];
  ink: number; // what it costs on the page (P33)
  glyph?: GlyphId;
  cells?: readonly FiredCell[];
}

// ── Resolution (§2.4) ───────────────────────────────────
export type Target = { kind: 'unit'; unit: UnitId } | { kind: 'tile'; at: Coord };
export type Aim =
  | { kind: 'dir'; dir: Dir } // Bolt
  | { kind: 'tile'; at: Coord } // Splash, Vat; Touch on an adjacent unit or tile
  | { kind: 'self' }; // Touch on yourself
/** The board as it stood when the cast began (R8); triggers read only this. */
export interface Snapshot {
  tiles: readonly Tile[];
  units: readonly Unit[];
  landed: BattleState['landed'];
}
/** What flows down a spell's steps. */
export interface Flow {
  caster: UnitId;
  origin: Origin;
  snapshot: Snapshot;
  /** The heading for a target (R4, P22): Bolt's aim, Touch's direction, area: centre outward. */
  headings: ReadonlyMap<string, Dir | null>; // by targetKey
  lay: boolean; // a Lay upstream: what lands sets for good
  gifted: boolean; // the caster is gifted in the current rune's school (per step)
  solvent: SolventId | null; // inside a flavoured invention
  habit: HabitId | null;
  depth: number; // invention nesting guard (§6.4 limit 1)
  auras: readonly AuraRef[]; // auras touching the current step
}
export const targetKey = (t: Target): string =>
  t.kind === 'unit' ? `u:${t.unit}` : `t:${t.at.x},${t.at.y}`;

// ── Scheduling (E6) ─────────────────────────────────────
export interface Scheduled {
  when: 'ownerTurn' | 'roundEnd' | 'nextRoundEnd';
  owner: UnitId;
  step: Step | RuneRef;
  target: Target;
  heading: Dir | null;
  origin: Origin;
  kind: 'repeat' | 'margin' | 'wick' | 'graphite' | 'filings' | 'thunderhead' | 'pitch';
}

// ── Battle ──────────────────────────────────────────────
export type BattlePhase = 'player' | 'won' | 'lost';
export interface BattleState {
  title: string;
  width: number;
  height: number;
  edge: EdgeRule; // the district's edge (P3)
  tiles: Tile[];
  units: Unit[];
  round: number;
  phase: BattlePhase;
  rngState: number;
  lab: boolean;
  objective?: DraftGoal;
  castSeq: number; // casts so far this battle (Origin.cast)
  /** Mark lineages: who each has reached, once per fight (§6.4 limit 3). */
  lineages: Record<number, { reached: UnitId[] }>;
  nextLineage: number;
  scheduled: Scheduled[];
  /** This player phase's casts and every target they touched (Unison, P26). */
  landed: { caster: UnitId; targets: string[] }[];
  /** Things met this battle, for `Profile.met` (the Bench palette, P37). */
  met: Meets[];
  /** Compounds, bursts and idioms already named this battle (D7). */
  named: string[];
}

/** The fine-print line that caused an event, and the cast whose board object did (§2.6). */
export interface EventMeta {
  line?: LineId;
  origin?: Origin;
}
