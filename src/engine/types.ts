import type {
  AttackId,
  AuraRuneId,
  BindEvent,
  CompoundId,
  DistrictId,
  EdgeRule,
  EnemyId,
  Goal,
  HabitId,
  InventionDef,
  Lean,
  LineId,
  Meets,
  MemberId,
  MethodId,
  RuneId,
  RuneRef,
  SealRuneId,
  SolventId,
  SourceRuneId,
  StateId,
  TriggerRuneId,
} from '$data';
import type { GameEvent } from './events';
import type { Coord, Dir } from './grid';

export type CellKey = string; // "x,y"
export type SpellKey = CellKey; // the source rune's lattice cell
export type UnitId = string; // MemberId for members; `${enemyId}-${n}` (n from 1, per def, board reading order)

// ── Lattice ─────────────────────────────────────────────
export interface PlacedRune {
  at: Coord;
  rune: RuneRef; // an authored rune or a household invention
  dir?: Dir; // iff the rune is an arrow rune (sources, Bend)
}
/** A compiled Glyph sitting in one socket. Its arrow is the way in (plan P4). */
export interface PlacedGlyph {
  at: Coord;
  glyph: GlyphId;
  dir: Dir;
  /** Arguments for the Glyph's open cells, by local cell key; a missing one means the default (M21). */
  args?: Readonly<Record<CellKey, GlyphArg>>;
}
/** The rune an open cell takes on this placement (M21, P7: a Kind or an Action). */
export interface GlyphArg {
  rune: RuneRef;
  dir?: Dir;
}
/** What a lattice socket can hold. */
export type Placed = PlacedRune | PlacedGlyph;
export const isGlyph = (p: Placed): p is PlacedGlyph => 'glyph' in p;

export type GlyphId = string;
/**
 * A Fair Copy: a proven cluster compressed into one socket. `cells` are in the Glyph's local
 * frame, where flow enters at `entry` travelling 'right' (a Spell Glyph's inner source points
 * 'right'). Placed with dir d, the local frame is rotated so 'right' becomes d.
 */
export interface GlyphDef {
  id: GlyphId;
  name: string;
  kind: 'spell' | 'payload';
  cells: readonly PlacedRune[];
  entry: Coord;
  exits: readonly { from: Coord; dir: Dir }[]; // local; inner walk order
  /** Idioms are log patterns now (P7): always null on new Glyphs. */
  idiom: string | null;
  /** 1 on compile; a revision makes max + 1 (M17). The current version lives in `Profile.glyphs`. */
  version: number;
  /** Open cells (local cell keys) that take an argument at placement (M21). A setting, not the inside. */
  params: readonly CellKey[];
  /** The extra exit's local side (up, right or down), active only at Reliability silver (M26). */
  extraExit: Dir | null;
  /** Ink off from the Economy tier. Only in the effective view (`glyphLibrary`), never saved. */
  discount?: number;
}
/** What a revision edits: the inside, never the settings (M20). */
export type GlyphInside = Pick<GlyphDef, 'kind' | 'cells' | 'entry'>;
export type GlyphLibrary = Readonly<Record<GlyphId, GlyphDef>>;
export type InventionLibrary = Readonly<Record<`inv:${string}`, InventionDef>>;

export interface FixedLatticeShape {
  /** Existing ASCII/scenario shapes omit the discriminant. */
  kind?: 'fixed';
  width: number;
  height: number;
  holes: readonly Coord[];
}
/** Derived framing only: every valid lattice coordinate is writable. */
export interface GrowingLatticeShape {
  kind: 'growing';
  origin: Coord;
  width: number;
  height: number;
  holes: readonly [];
}
export type LatticeShape = FixedLatticeShape | GrowingLatticeShape;
export interface Lattice {
  shape: LatticeShape;
  runes: readonly Placed[];
}

// ── Spells and steps (plan §2.3) ────────────────────────
interface StepBase {
  at: Coord; // lattice cell (a Glyph's socket)
  inner?: Coord; // inside a Glyph: the local cell
  glyph?: GlyphId; // retained by stored steps after the original recorder is gone
  via?: readonly Coord[]; // shape cells walked to reach it (Bend)
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
  | (StepBase & { role: 'seal'; rune: SealRuneId; rest: Step | null }) // J1: the rest goes in the jar
  /**
   * A Glyph's extra exit (M27): the flow leaves the Glyph twice, and both continuations act on
   * the same targets, in order. `at` is the Glyph's socket.
   */
  | (StepBase & { role: 'split'; branches: readonly Step[] });

export interface PathCell {
  at: Coord;
  rune: RuneRef;
  dir: Dir; // travel direction on entry (source: its arrow)
  inner?: Coord; // inside a Glyph: `at` is the socket, `inner` the local cell
}
export interface AuraTouch {
  aura: AuraRef;
  from: Coord; // aura cell
  to: Coord; // touched path/source cell
}
/** One cell that fired in a cast (proof masks; plan P7). `at` is the lattice cell. */
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
  path: readonly PathCell[]; // every cell the flow entered, in walk order (for highlighting)
  ink: number; // what it costs on the page (P33)
  glyph?: GlyphId; // set when the source is a Spell Glyph (`source` is then its inner source)
  /** Every cell the flow entered as proof sees it (a Glyph's inner cells collapse to its socket). */
  cells?: readonly FiredCell[];
}
export interface CompiledLattice {
  spells: Spell[];
  reached: CellKey[];
  auraTouches: AuraTouch[];
}
export interface LatticeIssue {
  kind: 'ink' | 'owned' | 'socket' | 'arrow' | 'overlap' | 'arg';
  at?: Coord;
  rune?: RuneRef;
  message: string;
}

// ── Board (plan §2.2) ───────────────────────────────────
/** Which cast made a board object; every event it later causes carries it (P8, lifetime elegance). */
export interface Origin {
  caster: UnitId;
  spell: SpellKey;
  cast: number; // BattleState.castSeq at cast start
  glyph?: GlyphId;
  /** Socket that made the object, disambiguating repeated uses of a payload Glyph. */
  glyphAt?: Coord;
}
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
  steepWide?: true; // a Steep-gifted caster's: it spreads two tiles a round
  /** A slick a unit slid over: the round it was used up in (no pinball, design §4.4). */
  slid?: number;
}
export interface Terrain {
  water: Dir | null; // canal lane and its current (K-6)
  drop: boolean; // `_`: an open side; a pushed land unit drops (P3)
  vent: boolean; // puffs a cloud when its tile is empty at round end
  grate: boolean; // on water: floats pass, units, movement and projectiles don't (K-10)
  gate: boolean; // a wooden lock gate: blocks like a plate, burns from adjacent fire (K-11)
  lamp: boolean; // where the lamp-mother calls moths (K-17)
}
export interface Jar {
  owner: UnitId;
  event: 'step' | 'dusk'; // Jar opens on a step, Fuse at round end
  rest: Step | null; // what was wired after the Seal
  heading: Dir | null; // the sealing cast's heading (P32)
  origin: Origin;
  seq?: number; // sealing order among the jars on the board: the lowest crumbles first (twoJars)
  /**
   * Monotonic identity from `BattleState.nextJar` (foundations P10): never reused in a battle,
   * so dusk can open exactly the jars it snapshotted. Absent until FD-5 assigns it.
   */
  id?: JarId;
  /** What the sealing step carried, restored when the jar runs (P9). Absent until FD-4. */
  context?: SealedContext;
}
export type JarId = number;
export interface Tile {
  terrain: Terrain;
  state: Layer | null;
  jar: Jar | null;
  hot: number; // Cinder: rounds left; oil here catches fire
}

/** `dir` is from the enemy's CURRENT position at resolve time. */
export interface AttackIntent {
  kind: 'attack';
  attack: AttackId;
  dir: Dir;
  order: number;
}
/** A boss's special intents (K-17): call a moth at a lamp, or flare every moth. */
export type SpecialIntent =
  | { kind: 'summon'; at: Coord; order: number }
  | { kind: 'flare'; order: number };
export type Intent = AttackIntent | SpecialIntent;

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
/** hp 0 = dead/down: stays in the array, ignored by all board queries. */
export type Unit = MemberUnit | EnemyUnit;

// ── Resolution (plan §2.4) ──────────────────────────────
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
  /** Auras among the step's that the caster is gifted in (design §9): one step better. */
  giftedAuras?: readonly AuraRuneId[];
  depth: number; // invention nesting guard (§6.4 limit 1)
  /** Running as a repeat coming due: it may not schedule another (§6.4 limit 5). */
  repeated?: boolean;
  /** A Wick invention coming due: it has waited, so it acts now (E8). */
  woken?: boolean;
  /** Fog jar: how many steps weaker this reach is (push, damage; min 0) (E8). */
  weaker?: number;
  auras: readonly AuraRef[]; // auras touching the current step
}
export const targetKey = (t: Target): string =>
  t.kind === 'unit' ? `u:${t.unit}` : `t:${t.at.x},${t.at.y}`;

/**
 * The part of a `Flow` a delayed run keeps from the moment it was sealed (foundations P9): a jar's
 * rest or a scheduled entry runs with these instead of starting bare. `woken` and `repeated` are
 * not part of it: they belong to the run coming due (limit 5, nested Wick waits its own round).
 */
export interface SealedContext {
  auras: readonly AuraRef[];
  giftedAuras?: readonly AuraRuneId[];
  weaker?: number;
  habit: HabitId | null;
}

/** What Graphite puts back: tile states and where units stood (E8). */
export interface BoardUndo {
  tiles: { at: Coord; state: Layer | null }[];
  units: { id: UnitId; pos: Coord }[];
}

/** A repeat, Wick, Graphite, Filings, Thunderhead or Pitch waiting for its moment (E6). */
export interface Scheduled {
  when: 'ownerTurn' | 'roundEnd' | 'nextRoundEnd';
  owner: UnitId;
  step: Step | RuneRef;
  target: Target;
  heading: Dir | null;
  origin: Origin;
  /** The flavour the scheduled run keeps (a flavoured Repeat repeats flavoured). */
  solvent?: SolventId | null;
  /** Graphite: the board as it was before the invention; restored when the entry comes due. */
  undo?: BoardUndo;
  /** The sealing step's auras, gifted auras, weakness and habit (P9). Absent until FD-4. */
  context?: SealedContext;
  kind: 'repeat' | 'margin' | 'wick' | 'graphite' | 'filings' | 'thunderhead' | 'pitch';
}

// ── Battle ──────────────────────────────────────────────
export type BattlePhase = 'player' | 'won' | 'lost';
export interface BattleState {
  title: string;
  width: number;
  height: number;
  edge: EdgeRule; // the district's edge (P3)
  tiles: Tile[]; // row-major, index y*width+x
  units: Unit[]; // creation order = board reading order (members and enemies interleaved)
  round: number;
  phase: BattlePhase;
  rngState: number;
  lab: boolean; // charges are not spent
  /** A threshold room's goal (K-22): won when met, never by clearing the board. */
  objective?: Goal;
  castSeq: number; // casts so far this battle (Origin.cast)
  /** The next `Jar.id` to hand out (P10); absent reads as 1. Only ever grows. */
  nextJar?: JarId;
  /** Mark lineages: who each has reached, once per fight (§6.4 limit 3). */
  lineages: Record<number, { reached: UnitId[] }>;
  nextLineage: number;
  scheduled: Scheduled[];
  /** The household's inventions, so a Conduct, Bind or Repeat can be run from its id (E7). */
  inventions: InventionLibrary;
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

export type Action =
  | { type: 'move'; unit: UnitId; to: Coord }
  | { type: 'undoMove'; unit: UnitId }
  | { type: 'cast'; unit: UnitId; spell: SpellKey; aim: Aim }
  | { type: 'shove'; unit: UnitId; dir: Dir }
  | { type: 'endTurn' };
export interface ActionResult {
  state: BattleState;
  events: GameEvent[];
}

export interface PartyInit {
  hp?: number;
  spells?: Spell[];
  charges?: Record<SpellKey, number>;
}
export interface BattleSpec {
  title: string;
  board: string;
  seed: number;
  edge?: EdgeRule; // default 'wall' (P3)
  party?: Partial<Record<MemberId, PartyInit>>; // member tokens on the board are spawned; this overrides hp/spells/charges
  hp?: Readonly<Record<string, number>>; // by label, any unit
  intents?: Readonly<Record<string, Dir>>; // by label; if given, round-1 AI telegraph is skipped, unlisted enemies idle
  lab?: boolean;
  objective?: Goal;
  inventions?: InventionLibrary; // the household's inventions (default none)
  /**
   * HC P3/P4: the party (1–3, slot order) placed on the board's start points (`P`). Absent: the
   * board's own apprentice tokens are the party (tests, Lab).
   */
  lineup?: readonly MemberId[];
  /** The start-point draw's seed (`startSeedFor`); default `deriveSeed(seed, START_SALT)`. */
  startSeed?: number;
}

// ── Run layer (plan §2.8; R1 rebuilds it) ───────────────
export type LootItem =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'method'; method: MethodId }
  | { kind: 'solvent'; solvent: SolventId }
  | { kind: 'ink'; member: MemberId; amount: number }
  | { kind: 'vellum'; amount: number }
  | { kind: 'doorway' } // never banked: picking it opens field rewiring (plan S11)
  | { kind: 'key'; district: DistrictId }; // opens `district` when banked (K-23)

/** Profile v7 (P1): knowledge, not copies (P34). */
export interface Profile {
  known: RuneId[];
  methods: MethodId[];
  inventions: InventionDef[];
  solvents: Record<SolventId, number>;
  inkCapacity: Record<MemberId, number>;
  lattices: Record<MemberId, Placed[]>; // shape comes from MEMBERS[m].shape
  witnessed: LineId[];
  named: string[]; // named results: 'compound:stain', 'burst:fire', 'idiom:bonfire' (D7)
  met: Meets[];
  foesMet: EnemyId[];
  footnotes: Partial<Record<RuneId, { points: number; chosen: Partial<Record<LineId, string>> }>>;
  vellum: number;
  glyphs: GlyphDef[];
  /** Older versions of Glyphs, with their own records (M17). Kept forever. */
  glyphArchive: GlyphDef[];
  /** Records per `versionKey(id, version)`; a missing one reads as empty (M8). */
  glyphRecords: Record<string, GlyphRecord>;
  proof: Record<MemberId, FiredCell[][]>; // cast masks, newest last, capped
  city: CityState;
}

/** The map's ladder (K-19): heard ⊇ open ⊇ hearts. */
export interface CityState {
  heard: DistrictId[];
  open: DistrictId[];
  hearts: DistrictId[]; // heart cleared at least once
  solved: DistrictId[]; // threshold room solved
  trips: number; // finished trips (returned or wiped)
  fresh: DistrictId[]; // heard since the map was last opened (drawn in new ink)
}

// ── Mastery (records, tiers) ────────────────────────────
export type TierLevel = 0 | 1 | 2 | 3; // none, bronze, silver, gold
/** One cast of a Glyph (one socket): its harm, its base cost plus outer auras, and whether it did anything (M8, M9). */
export interface CastSample {
  harm: number;
  cost: number;
  meaningful: boolean;
}
/** One Glyph version's record (M8). */
export interface GlyphRecord {
  casts: number; // lifetime
  harm: number;
  meaningful: number;
  recent: readonly CastSample[]; // newest last, ≤ TUNING.tierWindow
  best: { economy: TierLevel; reliability: TierLevel }; // never drops
  fired: Readonly<Record<CellKey, number>>; // local cell → casts it fired in
}
/** A tier a Glyph version reached during a trip (M16). */
export interface TierUp {
  glyph: GlyphId;
  name: string;
  version: number;
  metric: 'economy' | 'reliability';
  tier: TierLevel;
}
/** One spell's line in the trip ledger (plan S16). A spell is a member's source cell; `name` is for display. */
export interface SpellTally {
  member: MemberId;
  spell: SpellKey;
  name: string;
  casts: number;
  damage: number;
  kills: number;
  /** The spell's path cells when it was fought (a Glyph socket is one cell), last trip only (M15). */
  cells: CellKey[];
  /** The cells that fired in any of its casts (union of trace cells). */
  fired: CellKey[];
}
/** What a trip did, accumulated at each `finishEncounter` from the event log (plan S16). */
export interface TripStats {
  fights: number; // encounters finished (won or lost)
  spells: SpellTally[]; // first-cast order
  /** The cast with the most reaction events (mixes, bursts, crushes, drops, …). */
  biggestChain: { member: MemberId; spell: SpellKey; name: string; reactions: number } | null;
  discoveries: string[]; // codex ids first found on this trip, in order ('compound:stain', 'idiom:bonfire')
  proofCasts: number; // meaningful casts recorded toward proof
  elegance: TierUp[]; // tier-ups in the order they landed (M16)
  heard: DistrictId[]; // districts heard of on this trip (K-20)
}
/** The last finished trip, kept for the trip page (plan S17) until the next trip starts. */
export interface TripRecap {
  district: DistrictId;
  outcome: 'returned' | 'wiped';
  encounter: number; // the deepest encounter index reached
  place: string; // that room's name (its layout's place name)
  stats: TripStats;
}
/** doorway: rewiring in the field after picking a quiet doorway (plan S11). */
export type TripStatus = 'fight' | 'looting' | 'crossroads' | 'cleared' | 'doorway';
export interface Trip {
  district: DistrictId;
  seed: number;
  encounter: number; // index into `encountersOf(district)` of the current/next fight
  /** fight: go fight `encounter`; looting: pick from offers; crossroads: push or return; cleared: heart won, must return */
  status: TripStatus;
  hp: Record<MemberId, number>;
  charges: Record<MemberId, Record<SpellKey, number>>;
  loot: LootItem[]; // pending, banked on return, lost on wipe
  offers: LootItem[];
  picksLeft: number;
  /** The current fight's actions so far (status `fight`): a reload replays them instead of restarting. */
  actions: Action[];
  stats: TripStats;
}
export interface SaveData {
  profile: Profile;
  trip: Trip | null;
  seedCounter: number;
  lastTrip: TripRecap | null;
}
