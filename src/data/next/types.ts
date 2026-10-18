/**
 * Rune redesign contracts ("Mix, Move, Invent", docs/plans/rune-redesign-plan.md §2.1).
 * W0 writes these beside the old model; W0b moves them into `data/types.ts` and deletes the old.
 */

export type Role = 'source' | 'action' | 'kind' | 'shape' | 'trigger' | 'seal' | 'aura';
export type SchoolId =
  | 'seam'
  | 'timing'
  | 'contracts'
  | 'areas'
  | 'structure'
  | 'resonance'
  | 'board';
export type DistrictId =
  | 'seam'
  | 'canals'
  | 'inkQuarter'
  | 'bathhouses'
  | 'bridges'
  | 'foundry'
  | 'cartographers';
/** What pushing a unit into the board edge does in a district (P3; Seam and canals: wall). */
export type EdgeRule = 'wall' | 'drop';

export type KindId = 'ink' | 'oil' | 'steam' | 'brass' | 'spark';
export type SourceRuneId = 'bolt' | 'splash' | 'touch' | 'vat';
export type ActionRuneId =
  | 'strike'
  | 'shove'
  | 'guard'
  | 'sentence'
  | 'levy'
  | 'hold'
  | 'swap'
  | 'draw'
  | 'erase';
export type ShapeRuneId = 'fork' | 'bend' | 'seep' | 'lay' | 'toll';
export type TriggerRuneId = 'tally' | 'brink' | 'unison';
export type SealRuneId = 'jar' | 'fuse';
export type AuraRuneId = 'afterglow' | 'steep' | 'coil';
/** The 31 authored runes. */
export type RuneId =
  | SourceRuneId
  | ActionRuneId
  | KindId
  | ShapeRuneId
  | TriggerRuneId
  | SealRuneId
  | AuraRuneId;
export type InventionId = `inv:${string}`;
/** Anything a lattice cell (or an invention's part) can name. */
export type RuneRef = RuneId | InventionId;
export const isInvention = (r: RuneRef): r is InventionId => r.startsWith('inv:');

/** What being gifted in a rune's school adds to it (design §9): +1 tile pushed, +1 range/area, +1 round. */
export type Gift = 'push' | 'tile' | 'round' | null;

export interface RuneDef {
  id: RuneId;
  name: string; // 'Bolt'
  token: string; // lattice ASCII token: 'Bolt'
  role: Role;
  school: SchoolId;
  district: DistrictId; // where its page is found
  headline: string; // D1: one sentence, always true, always shown
  arrow: boolean; // sources and Bend carry an absolute, rotatable arrow
  charges: number; // per trip, sources only; 0 otherwise
  gift: Gift;
}

// ── Board chemistry (design §4) ─────────────────────────
/** Plain states a tile can hold. `blot` = plain Ink on an empty tile (P13); `plate` = brass plate. */
export type StateId = 'blot' | 'slick' | 'cloud' | 'plate' | 'fire';
/** The 10 lingering compounds (design §4.2). Deep mark and Shackle live on units (P15). */
export type CompoundId =
  | 'deepMark'
  | 'stain'
  | 'brandCloud'
  | 'shackle'
  | 'pool'
  | 'greaseFog'
  | 'skidPlate'
  | 'bank'
  | 'kettle'
  | 'wall';
export type PlainBurstId = 'detonation' | 'fire' | 'storm' | 'conduct' | 'surge';
/** The 5 bursts plus the burst page: Spark on each lingering compound (design §4.3). */
export type BurstId = PlainBurstId | `page:${CompoundId}`;
/** A kind landing on a plain state (or a unit's mark/collar) makes a compound. */
export interface MixRow {
  kind: Exclude<KindId, 'spark'>;
  on: StateId | 'mark' | 'collar';
  makes: CompoundId;
}
/** What Spark bursts on a layer. */
export interface BurstRow {
  on: StateId | CompoundId | 'mark';
  burst: BurstId;
  damage: number;
}

// ── The Bench (design §6) ───────────────────────────────
export type MethodId = 'conduct' | 'repeat' | 'margin' | 'bind' | 'lift';
export type BindEvent = 'hit' | 'enters' | 'pushed' | 'dies';
/**
 * What a method's part slot accepts (design §6.2, compatibility is visible): an Action that
 * resolves at once, an Action that moves a unit, the carrier kind (Ink), any Action, or a
 * Repeat invention.
 */
export type PartAccepts = 'instantAction' | 'movingAction' | 'carrier' | 'action' | 'repeat';
export interface PartSlot {
  accepts: PartAccepts;
  label: string; // 'an Action', shown on the empty slot
}
export interface MethodDef {
  id: MethodId;
  name: string;
  district: DistrictId; // where it's taught
  ink: number; // added to the parts' sum (P33)
  makes: Role;
  slots: readonly PartSlot[];
  /** Bind only: the events it can name (each needs its district; see BIND_EVENT_DISTRICT). */
  events?: readonly BindEvent[];
  /** Headline template: `{0}`, `{1}` = the parts' names, `{event}` = the Bind event phrase. */
  headline: string;
}
export type SolventId =
  | 'gallnut'
  | 'cinder'
  | 'pitch'
  | 'wick'
  | 'wax'
  | 'sand'
  | 'bathSalt'
  | 'fogJar'
  | 'mortar'
  | 'chalk'
  | 'rivet'
  | 'filings'
  | 'quicksilver'
  | 'graphite';
export interface SolventDef {
  id: SolventId;
  name: string;
  district: DistrictId;
  rule: string; // "Bends the invention so that …" (design §6.3)
}
/** A rune the household invented at the Bench. Its role, headline and ink are derived. */
export interface InventionDef {
  id: InventionId;
  name: string; // the player's name for it
  method: MethodId;
  parts: readonly RuneRef[];
  event?: BindEvent; // Bind only
  solvent: SolventId | null;
}

// ── Fine print (design §2) ──────────────────────────────
/** What a rune meets; a line is (subject, meets) → sentence (D8). */
export type Meets =
  | StateId
  | CompoundId
  | 'empty'
  | 'mark'
  | 'collar'
  | 'minion'
  | 'elite'
  | 'member'
  | 'shielded'
  | 'held'
  | 'jar'
  | 'edge'
  | 'water'
  | 'drop'
  | 'unit'
  | 'noHeading'
  | 'noTarget'
  | 'network';
export type LineSubject = RuneId | MethodId | SolventId;
export type LineId = `${LineSubject}:${Meets}`;
export interface LineDef {
  id: LineId;
  subject: LineSubject;
  meets: Meets;
  text: string; // one sentence, readable after one sighting (D8)
  district: DistrictId; // where the thing it meets is found (footnote solvents, P39)
  /** Fired by the engine but its text isn't written yet (C1 fills it). */
  pending?: true;
}
/** A footnote variant of a line (design §8, P39). */
export interface VariantDef {
  id: string;
  line: LineId;
  level: 1 | 2 | 3;
  text: string;
}
/** A notable pattern in a cast's whole-life log (design D7, §11). Matched in `engine/idioms.ts`. */
export interface IdiomDef {
  id: string;
  name: string;
  district: DistrictId;
  rule: string; // what makes it, in one plain line
  ownerNote: string;
}

// ── The party (design §9, P36) ──────────────────────────
export type HabitId = 'forkAhead' | 'twoJars' | 'bindOnTile';
export interface Lean {
  trained: SchoolId; // its runes cost 1 ink less (min 1)
  gifted: SchoolId | null; // its runes work one step better (RuneDef.gift)
  habit: HabitId | null;
}
