import type { ApprenticeId, DistrictId, Drawing, EnemyId, Habitat, MasterId, ShapeId } from '$data';
import type { HeartSetup, PieceId, RuleId } from '../districts/types';
import type { Coord } from '../grid';
import type { BoardSpec } from '../notation';
import type { Profile } from '../types';

/**
 * The ending's contracts (EN-W0; ending-plan §2, §4): the drawing table's derived values, the
 * kit and frame interfaces the generator composes, and the generator's input and result. Types
 * only; every function that uses them is a stub in this folder until the task named in its error.
 * EN takes seed salts 7000-7999 (bot trials `7000 + 10*room + attempt`, fallbacks `7900 + room`).
 */

export const MASTER_IDS = [
  'marginalia',
  'mother',
  'lamplighter',
  'postmaster',
  'bathSteward',
  'chiefWarden',
  'carillonneur',
  'registrar',
] as const satisfies readonly MasterId[];

/** The seed salt range EN owns (P8, P10). */
export const EN_SALT = { from: 7000, to: 7999, fallback: 7900 } as const;

// ── Compatibility (P5) ──────────────────────────────────
/**
 * One thing an element needs: any one of `anyOf` (a rule or a piece) must be on the drawing.
 * `reason` is the sentence the table shows when the element is greyed.
 */
export interface Need {
  anyOf: readonly (RuleId | PieceId)[];
  reason: string;
}
/** An element of a drawing, as the table lists it. */
export type DrawingElement =
  | 'name'
  | 'rule'
  | 'foe'
  | 'piece'
  | 'shape'
  | 'length'
  | 'heart'
  | 'pen';
/** One unmet need or limit (`checkDrawing`): which element, which id, and why in one sentence. */
export interface Issue {
  element: DrawingElement;
  id: string | null;
  reason: string;
}

// ── Palette, pen, weight (P3, P6, P7) ───────────────────
/** What the household has met, derived and never stored (P3). */
export interface Palette {
  rules: RuleId[];
  foes: EnemyId[];
  pieces: PieceId[];
  shapes: ShapeId[];
  masters: MasterId[];
}
/** The pen (P6): hearts cleared, one per four known rune pages, level-III capstones. */
export interface PenParts {
  hearts: number;
  pages: number;
  capstones: number;
}
export interface Pen {
  total: number;
  parts: PenParts;
}
export type WeightBand = 'light' | 'medium' | 'heavy';

// ── Kits (P14): EN's adapter for one district's content ─
/** Every kit and frame declares its needs with a reason (P5). */
interface Needing {
  needs: readonly Need[];
}
export interface RuleKit extends Needing {
  id: RuleId;
  /** The pieces the rule brings at no piece cost (P4). */
  brings: readonly PieceId[];
  /** Stamps the rule's ground; `minimum` is the fallback's smallest stamp (P10). */
  stamp(layout: BoardSpec, seed: number, minimum: boolean): BoardSpec;
}
export interface PieceKit extends Needing {
  id: PieceId;
  /** Element cost on the pen (data in `src/data/drawing.ts`, EN-5). */
  cost: number;
  /** Where the piece goes, or `null` when the layout has no place for it. */
  place(layout: BoardSpec, seed: number): BoardSpec | null;
  /** How much the piece matters on this layout (higher is placed first). */
  matters(layout: BoardSpec): number;
  valid(layout: BoardSpec): boolean;
}
export interface FoeKit extends Needing {
  id: EnemyId;
  /** Minion-equivalents against the room's foe budget (P7). */
  budget: number;
  habitat: Habitat;
  valid(layout: BoardSpec, at: Coord): boolean;
}
export interface ShapeKit extends Needing {
  id: ShapeId;
  /** `id` is the `TripShapeDef` its owner district registered (DK-E3); hooks take `(trip, roomIndex, length)`. */
  /** Lengths the shape can be drawn at. */
  lengths: readonly Drawing['length'][];
}
/** One master "redrawn in your rules" (P13), EN-owned, one per master. */
export interface HeartFrame extends Needing {
  master: MasterId;
  cost: number;
  size: { width: number; height: number };
  /** The district's callable setup for its master (`HeartSetup`, DK-E6). */
  setup: HeartSetup;
  /** The master's fixed escorts. */
  escorts: readonly EnemyId[];
  /** Where the drawing's rule may be added on the frame. */
  ruleAt: readonly Coord[];
  /** The authored fallback board: always offered when the bot cannot clear a generated heart. */
  fallback: BoardSpec;
}
/** The adapter for one district, reviewed by its owner (P14). */
export interface GenKit {
  district: DistrictId;
  rules: readonly RuleKit[];
  pieces: readonly PieceKit[];
  foes: readonly FoeKit[];
  shapes: readonly ShapeKit[];
  frames: readonly HeartFrame[];
}

// ── The generator (P8-P10) ──────────────────────────────
/** What one room is asked to be. */
export interface GenSpec {
  drawing: Drawing;
  /** 0-based room index within the trip; the heart is `length - 1`. */
  room: number;
  heart: boolean;
  size: { width: number; height: number };
  /** Foe budget in minion-equivalents, scaled by the weight band (P7). */
  budget: number;
  kits: readonly GenKit[];
}
export interface GenInput {
  profile: Profile;
  drawing: Drawing;
  party: readonly ApprenticeId[];
  /** The trip seed; each attempt derives its own from it (salts 7000-7999). */
  seed: number;
  room: number;
  /** The bot's applied-action budget per trial (default `TRIAL_BUDGET`, never wall-clock). */
  budget?: number;
}
export interface GenResult {
  layout: BoardSpec;
  /** Attempts used, 1-4 (1-3 at the heart). */
  attempts: number;
  /** The safe fallback was used (P10). */
  fallback: boolean;
  /** Applied actions spent by the bot across the attempts. */
  ops: number;
}
/** One broken guardrail of P9. */
export interface GenIssue {
  guardrail: 'room' | 'distance' | 'reach' | 'kit' | 'needs' | 'blocked' | 'budget' | 'burst';
  reason: string;
  at?: Coord;
}

// ── Ending (EN-10, EN-11) ───────────────────────────────
/** Credits (ending §1.1): what `creditsOf` lists; every part derives from the profile. */
export interface Credits {
  /** Districts in opening order. */
  districts: DistrictId[];
  /** Named idioms (`idiom:` entries of `Profile.named`). */
  idioms: string[];
  casts: number;
  trips: number;
  biggest: { chain: number; caster: ApprenticeId; name: string } | null;
}
