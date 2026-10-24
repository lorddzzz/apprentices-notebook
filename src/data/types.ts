import type { EnemyScript } from '$engine/districts/types';
import type { GameEvent } from '$engine/events';
import type { Dir } from '$engine/grid';
import type { Action } from '$engine/types';
import type { ApprenticeId } from './apprentices';
import type { RECRUIT_HABITS } from './recruits';

/** Data types: the rune model ("Mix, Move, Invent", docs/design/rune-design-final.md) and content. */

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
  | 'network'
  | 'flier' // a flying unit (AH: a pulled flier never falls)
  | 'spread' // a mark spreading to its neighbours (FN-1A A1: `ink:spread`)
  | 'shot' // a foe's line shot or spit (FN-1A A1: `steam:shot`, `brass:shot`)
  | 'limit' // a refusal at a rule's limit (FN-1A A1: Margin's limit of 5)
  | 'compound'; // a kind landing on any compound without its own row (P16)
/**
 * A rune, method or solvent; a habit's fine print (AH P11); or a basic action's (`pull`, `hop`;
 * Swap and Shove use their runes' lines, AH P7). Only a `FootnoteSubject` has a margin and points.
 */
export type LineSubject = RuneId | MethodId | SolventId | HabitId | 'pull' | 'hop';
export type LineId = `${LineSubject}:${Meets}`;
export interface LineDef {
  id: LineId;
  subject: LineSubject;
  meets: Meets;
  text: string; // one sentence, readable after one sighting (D8)
  district: DistrictId; // where the thing it meets is found (footnote solvents, P39)
  /**
   * Not live yet: fired by the engine with no text (C1 writes it), or written but not fired yet
   * (AH rows: the task that fires it drops the flag).
   */
  pending?: true;
}
// ── Footnotes (footnotes.md, plan FN §4) ────────────────
/** What has a margin: a rune, a method or a solvent. Habits and basic actions never do (AH). */
export type FootnoteSubject = RuneId | MethodId | SolventId;
/** Picks the thresholds a subject uses (`FOOTNOTES.levels`). */
export type FootnoteKind = 'rune' | 'method' | 'solvent';
/** A line slot's level; level III is the subject's capstone, not a slot. */
export type SlotLevel = 1 | 2;
/** One line slot of a subject's margin: `shove:wall@1` (a wide string: `${LineId}@…` is too big a union). */
export type SlotKey = `${string}:${string}@${SlotLevel}`;
/** A subject's capstone place in the footnote context: `shove@cap`. */
export type CapstoneKey = `${string}@cap`;
/** Where a written variant sits: a line slot or a capstone (one variant per key). */
export type FootnoteKey = SlotKey | CapstoneKey;
/** A rival's id (RV, BL-118). A plain string until RV-W0 names the rivals. */
export type RivalId = string;
/** The place a variant fills: a line slot (level I or II) or the subject's capstone (level III). */
export type VariantSlot = { line: LineId; level: SlotLevel } | { capstone: true };
/**
 * A footnote variant (v2). `id` is stable once shipped (FD P13); the text can change freely.
 * A line slot's `line` has `subject` as its subject. A rival note (`rival`) is a third option in
 * its slot, hidden until the rival's page is held; `credit` is the margin's lore line.
 */
export interface VariantDef {
  id: string;
  subject: FootnoteSubject;
  slot: VariantSlot;
  text: string;
  rival?: RivalId;
  credit?: string;
}
/** A notable pattern in a cast's whole-life log (design D7, §11). Matched in `engine/idioms.ts`. */
export interface IdiomDef {
  id: string;
  name: string;
  district: DistrictId;
  rule: string; // what makes it, in one plain line
  ownerNote: string;
}

// ── The party (design §9, P36; household: docs/design/party.md §0b–§2) ──
/** The seven recruits' habit ids, derived from RC's table so the two can't drift (AH P10). */
export type RecruitHabitId = (typeof RECRUIT_HABITS)[keyof typeof RECRUIT_HABITS];
/**
 * Habit ids (party.md §1, AH P10): the pair's two plus the recruits' seven. `mender` is reserved
 * for the ending plan (EN builds it); no other habit may take that id.
 */
export type HabitId = 'forkAhead' | 'twoJars' | RecruitHabitId;
/** What a ward or harm guard reads off a hit (AH P14). Only steam is tagged so far. */
export type HarmKind = 'steam';
/**
 * The one field a habit bends (AH P9). The engine reads it through `habitRule(unit)`; an absent
 * field means the habit leaves that rule alone.
 */
export interface HabitRule {
  jarLimit?: number; // jars kept at once (twoJars: 2)
  forkAhead?: true; // Fork also acts on the tile ahead
  fuseOnStep?: true; // her own Fuse jars also open on a step (her arrival only)
  tallyMarkWeight?: number; // what one mark counts in her Tally
  wards?: readonly HarmKind[]; // harm that never hurts her (not a hit)
  holdExtra?: number; // extra units each Hold she lands also holds
  unisonReach?: number; // how far from the target another cast may land for her Unison
  touchReach?: number; // how far her Touch aims in a straight line
  eraseRestores?: true; // her Erase on an empty target puts back what the last Erase took
}
/** A unit's lean as the engine reads it: the apprentice's schools plus their habit. */
export interface Lean {
  trained: SchoolId; // its runes cost 1 ink less (min 1)
  gifted: SchoolId | null; // its runes work one step better (RuneDef.gift)
  habit: HabitId | null;
}
/** One habit (party.md §1): a lattice habit bends one headline; a body habit, one board rule. */
export interface HabitDef {
  id: HabitId;
  line: string; // the one-sentence name on the card
  kind: 'lattice' | 'body';
  /** The rune the habit bends; a household without it shows the dormant flag (HC P12). */
  leansOn: RuneId | null;
  /** The rule it bends (AH P9): only the one field. */
  rule: HabitRule;
}
/** The four basic actions (party.md §1). Only `shove` is built; AH adds the other three. */
export type BasicActionId = 'shove' | 'pull' | 'hop' | 'swap';
/** Named token colours (HC P13). HC-6 maps each to theme values and adds the owner's tenth. */
export type ApprenticeHue =
  | 'slate'
  | 'rust'
  | 'amber'
  | 'moss'
  | 'teal'
  | 'plum'
  | 'rose'
  | 'ochre'
  | 'indigo'
  /** The owner's (EN): the tenth, never offered as a recruit. */
  | 'gilt';
/** Token shapes, so colour is never the only cue (HC P13). */
export type TokenShape =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'pentagon'
  | 'star'
  | 'cross'
  | 'drop'
  /** The owner's. */
  | 'ring';
/** One apprentice's kit (party.md §0b): body, action, lean, habit, starter page, look. */
export interface ApprenticeDef<Id extends string = ApprenticeId> {
  id: Id;
  name: string;
  token: string; // board token, one unique letter: 'D'
  look: { hue: ApprenticeHue; shape: TokenShape };
  hp: number;
  move: number;
  action: BasicActionId;
  lean: { trained: SchoolId; gifted: SchoolId | null };
  habit: HabitId | null;
  /** Lattice ASCII of the page they arrive with (read by `parseLattice`). */
  starterPage: string;
  blurb: string;
}

// ── Units and foes ──────────────────────────────────────
/** @deprecated HC P2: a party unit's id; prefer `ApprenticeId` in new code. */
export type MemberId = ApprenticeId;
export type EnemyId =
  | 'rat'
  | 'sentry'
  | 'familiar'
  | 'dummy'
  | 'eel'
  | 'snuffer'
  | 'moth'
  | 'mother'
  | 'lamplighter';
export type AttackId = 'bite' | 'line' | 'spit' | 'lunge' | 'pole' | 'burst';

/**
 * @deprecated The pre-household view of an apprentice (`MEMBERS`): the registry entry with the
 * engine's `Lean` (habit included) and `startLattice` (= `starterPage`). Prefer `APPRENTICES`.
 */
export interface MemberDef extends Omit<ApprenticeDef, 'lean'> {
  lean: Lean;
  startLattice: string;
  shape: string; // the starter page's fixed geometry: '.' socket, 'x' hole (tests and fixtures)
}

export interface AttackDef {
  id: AttackId;
  name: string; // damage source label: 'Bite' | 'Line' | 'Spit'
  verb: string; // 'bite' | 'fire' | 'spit'
  verbs: string; // 'bites' | 'fires' | 'spits'
  kind: 'adjacent' | 'projectile';
  range: number; // 1, 99 (unlimited), 2
  damage: number;
  inks: boolean; // lands Ink where it hits (spit)
}

export type EnemyAi = 'chaser' | 'liner' | 'spitter' | 'idle' | 'lurker' | 'moth' | 'mother';
/** Where a foe may stand (K-13). */
export type Habitat = 'land' | 'water' | 'any';
export interface EnemyDef {
  id: EnemyId;
  name: string; // lowercase: 'rat' | 'sentry' | 'familiar' | 'dummy'
  token: string;
  hp: number;
  move: number;
  attack: AttackId | null;
  ai: EnemyAi;
  /** Born brass: starts with a layout collar (it conducts). */
  brass: boolean;
  /** Leaves a slick on every tile it walks (rats). */
  oilTrail: boolean;
  /** P20: elites take 4 and are stunned when dropped; minions are gone. */
  elite: boolean;
  blurb: string;
  habitat: Habitat;
  /** Ignores water, drift and oil slides (K-16). */
  flies: boolean;
  /** Never moves and never drifts (K-17). */
  anchored: boolean;
  /** Puts out fire in its 3×3 after the burn step (K-15). */
  snuffs: boolean;
  /** Bursts on its intent and on death (K-16). */
  bursts: boolean;
  /** Shown by name with an HP bar in the battle header (K-18). */
  boss: boolean;
  /** A rival's one trick (AH P9, RV): any habit; its rule applies to this foe like a member's. */
  trick?: HabitId;
  /** A scripted foe (DK-9, P14): registered steps cycled by round; `standIn` marks a heart that gives no page. */
  script?: EnemyScript;
}

// ── Encounters and loot ─────────────────────────────────
/** The Seam's three tables, then the canals' three (P35: each district teaches its own pages). */
export type LootTableId =
  | 'shallow'
  | 'deep'
  | 'heart'
  | 'canalShallow'
  | 'canalDeep'
  | 'canalHeart';
/** One of a depth's boards. The trip seed picks one (`variantFor`); the Crossroads shows `name`. */
export interface EncounterVariant {
  name: string; // a short place name: 'The drainage cut'
  layout: string; // board ASCII, 6×8, includes D and S
}
export interface EncounterDef {
  id: string;
  title: string;
  depth: number; // 1-based room index in its district
  layout: string; // = variants[0].layout (the original board)
  variants: readonly EncounterVariant[];
  loot: LootTableId;
  picks: number; // heart: 2
  heart: boolean;
}

export type LootSpec =
  | { kind: 'rune'; rune: RuneId } // a rune page (P34)
  | { kind: 'method'; method: MethodId } // a method page
  | { kind: 'ink' } // member chosen when rolled
  | { kind: 'solvent'; solvent: SolventId }
  | { kind: 'vellum'; amount: number }
  | { kind: 'doorway' } // a quiet doorway: rewire in the field (plan S11)
  | { kind: 'key'; district: DistrictId }; // never in a table: added by `keyOffer` (K-23)
export interface LootEntry {
  spec: LootSpec;
  weight: number;
}
export interface LootTableDef {
  id: LootTableId;
  entries: readonly LootEntry[];
  /** Offered at the top of the table until the household has it (P35: Conduct at the first heart clear). */
  guaranteed?: LootSpec;
}

// ── Codex and Lab ───────────────────────────────────────
export interface CodexEntryDef {
  id: string; // 'rune:bolt', 'idiom:bonfire'
  kind: 'rune' | 'method' | 'idiom' | 'compound' | 'burst' | 'solvent';
  ref: string;
  title: string;
  text: string; // the headline (D1)
  ownerNote: string; // previous owner's cryptic margin note
  /** One line in the owner's voice shown under `???` while unknown (plan S15). */
  hint?: string;
}

export interface ScenarioDef {
  id: string;
  title: string;
  note: string;
  board: string; // board ASCII
  inventions?: Readonly<Record<InventionId, InventionDef>>;
  lattices?: Partial<Record<MemberId, string>>; // omitted member → Lab uses profile lattice; tests use none
  hp?: Readonly<Record<string, number>>; // by cell label 'C1'
  intents?: Readonly<Record<string, Dir>>; // by cell label; listed enemies telegraph this dir, others idle
  demo: readonly Action[];
  expected: readonly string[]; // describeLog of all demo events concatenated
}

// ── Goals (threshold rooms) ─────────────────────────────
/** What a threshold room asks for, checked on the log and the final state (K-22). Unit ids: 'rat-1'. */
export type Goal =
  | { all: readonly Goal[] }
  | { happens: GameEvent['type']; atLeast?: number }
  | { hurt: string; atLeast: number }
  | { dies: string }
  | { spared: string }
  | { tile: string; has: StateId | CompoundId };

// ── Tuning ──────────────────────────────────────────────
export interface Tuning {
  grid: { width: number; height: number };
  /** P33: ink per role; trained runes cost 1 less (min 1). */
  inkCost: Record<Role, number>;
  startInk: number;
  inkReserve: number;
  // Sources (R2, P21)
  boltRange: number;
  splashRange: number;
  splashRadius: number;
  vatRange: number;
  // Actions and kinds (design §4, §5.1, P19, P27)
  strikeDamage: number;
  sparkDamage: number;
  guardShield: number;
  shoveTiles: number;
  crushBase: number; // a pushed unit hitting something: base + per tile moved
  crushPerTile: number;
  crushStruck: number; // what it hit takes this
  dropEliteDamage: number;
  fireDamage: number; // a unit standing in fire at round end
  // Durations (P17)
  compoundRounds: number;
  cloudRounds: number;
  plateRounds: number;
  fireRounds: number;
  reviveHp: number;
  offersPerWin: number;
  duplicateInk: number; // a rune or method page the household already has drops as this much ink (P34)
  // Glyphs and proof
  glyphMinCells: number;
  glyphMaxCells: number;
  provenCasts: number; // meaningful casts that prove a cluster
  proofMasksPerMember: number; // cap on stored cast masks
  compileVellum: number;
  // Mastery (records, tiers, parameters, revisions)
  killHarm: number; // harm per enemy death (M1)
  tierWindow: number; // casts in a tier window (M10)
  economyTiers: readonly [number, number, number]; // harm ÷ ink for bronze, silver, gold (M11)
  reliabilityTiers: readonly [number, number, number]; // share of meaningful casts (M11)
  deadAfterCasts: number; // casts of a version before a cell that never fired counts as dead (M13)
  paramSlots: number; // open cells a Glyph may have (M22)
  paramSlotsGold: number; // at Reliability gold
}

// ── The city and its districts (K-1, K-19 to K-23) ─────
/** How a district is heard of. `owner` ones are read off a battle log, `rumour` ones after a trip (K-20). */
export type HearCondition = (
  | { kind: 'burst'; burst: BurstId; atLeast: number; district?: DistrictId } // one burst of ≥ atLeast tiles
  | { kind: 'named'; id: string } // a named result: 'compound:stain', 'idiom:bonfire'
  | { kind: 'heart'; district: DistrictId }
  | { kind: 'trips'; atLeast: number }
) & { voice: 'owner' | 'rumour' };
/** A district's threshold room: a puzzle battle with an objective, played from the map (K-22). */
export interface ThresholdDef {
  name: string;
  board: string; // board ASCII, includes D and S
  goal: Goal;
  note: string; // the owner's note on the page
}
/** How a heard district opens (K-21). `drawing`: on the map, being drawn, never opens (P2). */
export type Gate =
  | { kind: 'none' } // open from the start
  | { kind: 'discovery' } // opens on hearing
  | { kind: 'threshold'; room: ThresholdDef }
  | { kind: 'key'; from: DistrictId; table: LootTableId; weight: number }
  | { kind: 'drawing' };
export interface DistrictDef {
  id: DistrictId;
  name: string; // 'The oil-lit canals'
  material: KindId; // the kind the district is rich in, shown once heard
  guild: string; // whose quarter it is, shown once heard
  edge: EdgeRule; // P3
  encounters: readonly EncounterDef[];
  hear: readonly HearCondition[]; // any one is enough; the Seam has none (heard from the start)
  gate: Gate;
  map: { x: number; y: number }; // node position on the sketch map, 0..100 of the page
  line: string; // the owner's line once heard
  barred: string; // how the way is barred, once heard and not open
}
