import type { Dir } from '$engine/grid';
import type { Action } from '$engine/types';

export type RuneFamily = 'source' | 'material' | 'shape' | 'trigger' | 'aura';
export type SourceRuneId = 'bolt' | 'splash' | 'ward' | 'quill';
export type MaterialRuneId =
  | 'ink'
  | 'oil'
  | 'spark'
  | 'steam'
  | 'brass'
  | 'smear'
  | 'torch'
  | 'fog'
  | 'mist'
  | 'brand'
  | 'scald'
  | 'etch'
  | 'kiln';
export type ShapeRuneId = 'bend' | 'fork' | 'pierce';
export type TriggerRuneId = 'onInked' | 'onKill' | 'onIgnite';
export type AuraRuneId = 'amplify' | 'echo' | 'thrift';
export type RuneId = SourceRuneId | MaterialRuneId | ShapeRuneId | TriggerRuneId | AuraRuneId;
export type MaterialId = MaterialRuneId; // affinity talks about these
export type MemberId = 'draughtsman' | 'stoker';
export type EnemyId = 'rat' | 'sentry' | 'familiar' | 'dummy';
export type AttackId = 'bite' | 'line' | 'spit';
export type InteractionId =
  | 'ignite'
  | 'conduct'
  | 'arc'
  | 'detonate'
  | 'extinguish'
  | 'slide'
  | 'diffuse'
  | 'heat'
  | 'stain';
export type Rarity = 'common' | 'uncommon' | 'rare';
/** The eight properties that tag runes, solvents, recipes and idioms (research grammar). */
export type Aspect = 'reach' | 'mark' | 'slick' | 'heat' | 'charge' | 'vapor' | 'hold' | 'return';
export type SolventId =
  | 'chalk'
  | 'gallnut'
  | 'pitch'
  | 'cinder'
  | 'quicksilver'
  | 'fogJar'
  | 'rivet'
  | 'wax';
/** What "magnitude" means for this rune. footprint: radius = magnitude − 1 (Chebyshev square). */
export type Scale = 'damage' | 'shield' | 'footprint' | 'none';

export interface RuneDef {
  id: RuneId;
  name: string; // 'Bolt', 'On Inked'
  token: string; // lattice ASCII token: 'Bolt', 'OnInked', 'Amp'
  family: RuneFamily;
  rule: string; // one-line rule (codex + tooltip)
  arrow: boolean; // true for sources + bend (absolute, rotatable arrow)
  base: number; // base magnitude (0 for shape/trigger/aura)
  scale: Scale;
  charges: number; // per trip, sources only; 0 otherwise
  rarity: Rarity;
  aspects: readonly [Aspect, Aspect];
  origin: 'loot' | 'bench'; // bench = only made by distilling a recipe
}

export interface AspectDef {
  id: Aspect;
  name: string; // 'Reach'
  glyph: string; // '☍'
  solvent: SolventId;
  margin: string; // the Bench's margin line when this aspect is the gap: 'nothing to carry it'
}
export interface SolventDef {
  id: SolventId;
  name: string; // 'Gallnut'
  aspect: Aspect;
  blurb: string;
}
export interface RecipeDef {
  id: string; // = result rune id
  result: RuneId;
  left: RuneId;
  right: RuneId;
  solvent: SolventId;
  /** A torn page: the owner's sentence with this slot torn out (null = plain silhouette). */
  torn: 'left' | 'right' | 'solvent' | null;
  ownerNote: string; // the owner's reaction once written
}
/** A step matches a node if every given field matches (aspects: the node's rune has any listed aspect). */
export interface IdiomStep {
  family?: RuneFamily;
  aspects?: readonly Aspect[];
}
export interface IdiomDef {
  id: string;
  name: string;
  steps: readonly IdiomStep[]; // matched along one root-to-leaf branch, skipping shapes
  ownerNote: string;
}

export interface MemberDef {
  id: MemberId;
  name: string;
  token: string; // board token 'D' / 'S'
  hp: number;
  move: number;
  affinity: readonly MaterialId[];
  shape: string; // lattice ASCII: '.' socket, 'x' hole
  startLattice: string; // lattice ASCII, same dims/holes as shape
  blurb: string;
}

export interface AttackDef {
  id: AttackId;
  name: string; // damage source label: 'Bite' | 'Line' | 'Spit'
  verb: string; // 'bite' | 'fire' | 'spit'
  verbs: string; // 'bites' | 'fires' | 'spits'
  kind: 'adjacent' | 'projectile';
  range: number; // 1, 99 (unlimited), 2
  damage: number;
  inks: boolean;
}

export type EnemyAi = 'chaser' | 'liner' | 'spitter' | 'idle';
export interface EnemyDef {
  id: EnemyId;
  name: string; // lowercase: 'rat' | 'sentry' | 'familiar' | 'dummy'
  token: string;
  hp: number;
  move: number;
  attack: AttackId | null;
  ai: EnemyAi;
  brass: boolean;
  oilSoaked: boolean;
  oilTrail: boolean;
  blurb: string;
}

export type LootTableId = 'shallow' | 'deep' | 'heart';
/** One of a depth's boards. The trip seed picks one (`variantFor`); the Crossroads shows `name`. */
export interface EncounterVariant {
  name: string; // a short place name: 'The drainage cut'
  layout: string; // board ASCII, 6×8, includes D and S
}
export interface EncounterDef {
  id: string;
  title: string;
  depth: number; // 1..4
  layout: string; // = variants[0].layout (the original board)
  variants: readonly EncounterVariant[];
  loot: LootTableId;
  picks: number; // heart: 2
  heart: boolean;
}

export type LootSpec =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'ink' } // member chosen when rolled
  | { kind: 'solvent'; solvent: SolventId }
  | { kind: 'vellum'; amount: number }
  | { kind: 'doorway' } // a quiet doorway: rewire in the field (plan S11)
  | { kind: 'draft' }; // the next owner's draft in story order, when one is due (M30)
export interface LootEntry {
  spec: LootSpec;
  weight: number;
}
export interface LootTableDef {
  id: LootTableId;
  entries: readonly LootEntry[];
}

export interface CodexEntryDef {
  id: string; // 'rune:bolt', 'interaction:ignite'
  kind: 'rune' | 'interaction' | 'recipe' | 'idiom' | 'aspect';
  ref: RuneId | InteractionId | Aspect | string; // recipe and idiom ids are strings
  title: string;
  text: string; // the rule
  ownerNote: string; // previous owner's cryptic margin note
  /** One line in the owner's voice shown under `???` while unknown (plan S15). Torn-page recipes have none. */
  hint?: string;
}

export interface ScenarioDef {
  id: string;
  title: string;
  note: string;
  board: string; // board ASCII
  lattices?: Partial<Record<MemberId, string>>; // omitted member → Lab uses profile lattice; tests use none
  hp?: Readonly<Record<string, number>>; // by cell label 'C1'
  intents?: Readonly<Record<string, Dir>>; // by cell label; listed enemies telegraph this dir, others idle
  demo: readonly Action[];
  expected: readonly string[]; // describeLog of all demo events concatenated
}

// ── The owner's drafts (M29–M36) ────────────────────────
export type DraftId = string;
/** Where the draft's one test cast is aimed: a direction, a tile by label ('C2'), or an ally. */
export type DraftAim = { dir: Dir } | { tile: string } | { ally: MemberId };
/** Event types a draft goal may ask for (M32). */
export type DraftEventType =
  | 'ignite'
  | 'detonate'
  | 'conduct'
  | 'arc'
  | 'extinguish'
  | 'slide'
  | 'smear'
  | 'heated'
  | 'stained'
  | 'pierced';
/** What a draft's test must show, checked on the log and the final state (M32). Unit ids: 'dummy-1'. */
export type DraftGoal =
  | { all: readonly DraftGoal[] }
  | { happens: DraftEventType; atLeast?: number }
  | { hurt: string; atLeast: number }
  | { dies: string }
  | { spared: string }
  | { tile: string; has: 'fire' | 'oil' | 'ink' | 'steam' | 'plate' };
/** The draft's test stage (M31): a Lab battle, one cast at `aim`, then optionally one idle enemy round. */
export interface DraftTest {
  board: string; // board ASCII; the caster is the Draughtsman `D`
  aim: DraftAim;
  endRound?: boolean;
  hp?: Readonly<Record<string, number>>; // by cell label, like a scenario
  goal: DraftGoal;
}
/** One of the owner's broken pages (M29). Fixes live in the tests only. */
export interface DraftDef {
  id: DraftId;
  order: number; // story order, from 1
  depth: LootTableId; // the shallowest table that can drop it
  name: string;
  kind: 'spell' | 'payload';
  inside: string; // lattice ASCII in the Glyph's local frame (the owner's broken page)
  entry: string; // the entry cell's label in `inside` ('A1'); flow enters it moving right
  host?: string; // a Payload draft's host page, lattice ASCII with `G:draft>` where it sits
  note: string; // the owner's note: what it should do
  hint: string; // a codex-style nudge, shown on the desk
  test: DraftTest;
  reaction: string; // the owner's reaction once repaired
}

export interface Tuning {
  grid: { width: number; height: number };
  inkCost: Record<RuneFamily, number>;
  startInk: number;
  inkReserve: number;
  affinityBonus: number;
  inkedBonus: number;
  detonateDamage: number;
  bumpDamage: number;
  fireDamage: number;
  oilSoakedBonus: number;
  brandedBonus: number; // fire bonus on a branded unit; replaces oilSoakedBonus (larger applies)
  fireRounds: number;
  steamRounds: number;
  plateRounds: number;
  heatRounds: number; // hot brass stays hot this many rounds (re-heating refreshes)
  heatDamage: number; // hot brass (and Scald's cloud) hits each neighbour/occupant for this at the burn step
  splashRange: number;
  splashRadius: number;
  echoDivisor: number;
  reviveHp: number;
  offersPerWin: number;
  // Research and compile
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
  revisionCanvasMax: number; // the revision canvas is at most this many cells a side (M18)
}
