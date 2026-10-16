import type {
  AttackId,
  AuraRuneId,
  DistrictId,
  DraftGoal,
  DraftId,
  EnemyId,
  InteractionId,
  MaterialRuneId,
  MemberId,
  RuneId,
  SolventId,
  SourceRuneId,
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
  rune: RuneId;
  dir?: Dir; // iff RUNES[rune].arrow
}
/** A compiled Glyph sitting in one socket. Its arrow is the way in (plan P4). */
export interface PlacedGlyph {
  at: Coord;
  glyph: GlyphId;
  dir: Dir;
  /** Arguments for the Glyph's open cells, by local cell key; a missing one means the default (M21). */
  args?: Readonly<Record<CellKey, GlyphArg>>;
}
/** The rune an open cell takes on this placement (M21). `dir` only for arrow runes. */
export interface GlyphArg {
  rune: RuneId;
  dir?: Dir;
}
/** What a lattice socket can hold. W0b switches `Lattice.runes` to this. */
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
  idiom: string | null;
  /** 1 on compile; a revision makes max + 1 (M17). The current version lives in `Profile.glyphs`. */
  version: number;
  /** Open cells (local cell keys) that take an argument at placement (M21). A setting, not the inside. */
  params: readonly CellKey[];
  /** The extra exit's local side (up, right or down), active only at Reliability silver (M26). */
  extraExit: Dir | null;
  /** Set when the Glyph came from repairing an owner's draft (M33). */
  draft?: DraftId;
  /** Ink off from the Economy tier. Only in the effective view (`glyphLibrary`), never saved. */
  discount?: number;
}
/** What a revision edits: the inside, never the settings (M20). */
export type GlyphInside = Pick<GlyphDef, 'kind' | 'cells' | 'entry'>;
export type GlyphLibrary = Readonly<Record<GlyphId, GlyphDef>>;

export interface LatticeShape {
  width: number;
  height: number;
  holes: readonly Coord[];
}
export interface Lattice {
  shape: LatticeShape;
  runes: readonly Placed[];
}

/** A list of sibling nodes = a Fork's branches, left branch's nodes first. */
export type SpellNode =
  | {
      kind: 'material';
      rune: MaterialRuneId;
      at: Coord;
      amp: number;
      magnitude: number;
      next: readonly SpellNode[];
      inner?: Coord; // inside a Glyph: `at` is the Glyph's socket, `inner` the local cell
      via?: readonly Coord[]; // shape cells walked from the parent (or the source) to here
      viaInner?: readonly Coord[]; // local shape cells of `via` walked inside the same Glyph
      pierced?: true; // downstream of a Pierce: acts on every unit the projectile passed (plan S1)
    }
  | {
      kind: 'trigger';
      rune: TriggerRuneId;
      at: Coord;
      next: readonly SpellNode[];
      inner?: Coord;
      via?: readonly Coord[];
      viaInner?: readonly Coord[];
      pierced?: true;
    };

export interface PathCell {
  at: Coord;
  rune: RuneId;
  dir: Dir; // travel direction on entry (source: its arrow)
  inner?: Coord; // inside a Glyph: `at` is the socket, `inner` the local cell
}
export interface AuraTouch {
  aura: AuraRuneId;
  from: Coord; // aura cell
  to: Coord; // touched path/source cell
}
export interface Spell {
  key: SpellKey;
  at: Coord;
  source: SourceRuneId;
  amp: number;
  magnitude: number; // base + amp (sources get no affinity)
  echo: boolean; // an Echo touches the source cell
  charges: number; // max charges per trip (RUNES[source].charges)
  nodes: readonly SpellNode[];
  path: readonly PathCell[]; // every cell the flow entered, in walk order (for highlighting)
  /** A Pierce is on the path of a line spell (Bolt, Quill): the projectile passes the first unit (plan S1). */
  pierce?: true;
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
  rune?: RuneId;
  message: string;
}

// ── Battle ──────────────────────────────────────────────
export interface Tile {
  oil: boolean;
  ink: boolean;
  steam: number;
  fire: number;
  plate: boolean;
  /** Rounds until a rune-raised plate crumbles; 0 = permanent (layout terrain). */
  plateRounds: number;
  vent: boolean;
  /** Unlit oil with ink in it: a unit that ends a move here is inked (plan S6). Goes with the oil. */
  stain: boolean;
  /** Rounds a brass plate stays hot (plan S5); 0 = cold. */
  heat: number;
  /** A brass plate etched by Etch, for the battle (plan S8). */
  etched: boolean;
  /** The steam here is Scald's: it scalds whoever stands in it at the burn step (plan S7). Fades with the steam. */
  scald: boolean;
  /** A water lane tile and its downstream direction (K-6); null on land. */
  water: Dir | null;
  /** On water: floats pass, units, movement and projectiles don't (K-10). */
  grate: boolean;
  /** A wooden lock gate: blocks like a plate, burns from adjacent fire (K-11). */
  gate: boolean;
  /** A lamp on a pole, where the lamp-mother calls moths (K-17). */
  lamp: boolean;
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
export type Aim =
  | { kind: 'dir'; dir: Dir } // Bolt
  | { kind: 'tile'; at: Coord } // Splash
  | { kind: 'ally'; unit: UnitId }; // Ward

interface UnitBase {
  id: UnitId;
  name: string;
  pos: Coord;
  hp: number;
  maxHp: number;
  shield: number;
  inked: boolean;
  brass: boolean;
  oilSoaked: boolean;
  /** Burned into the unit by Brand: fire hits it for +2. */
  branded: boolean;
  /** Rounds a brass unit stays hot (plan S5); 0 = cold. */
  heat: number;
  /** Brass etched by Etch, for the battle (plan S8). */
  etched: boolean;
}
export interface UndoRecord {
  from: Coord;
  puddle: boolean; // the move consumed an ink puddle
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
}
export interface EnemyUnit extends UnitBase {
  kind: 'enemy';
  def: EnemyId;
  intent: Intent | null;
}
/** hp 0 = dead/down: stays in the array, ignored by all board queries. */
export type Unit = MemberUnit | EnemyUnit;

export interface EchoEntry {
  caster: UnitId;
  spell: SpellKey;
  aim: Aim;
}
export type BattlePhase = 'player' | 'won' | 'lost';
export interface BattleState {
  title: string;
  width: number;
  height: number;
  tiles: Tile[]; // row-major, index y*width+x
  units: Unit[]; // creation order = board reading order (members and enemies interleaved)
  round: number;
  phase: BattlePhase;
  echoes: EchoEntry[];
  discovered: InteractionId[]; // interactions seen in this battle (dedup, first-seen order)
  rngState: number;
  lab: boolean; // charges are not spent
  /** A threshold room's goal (K-22): won when met, never by clearing the board. */
  objective?: DraftGoal;
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
  party?: Partial<Record<MemberId, PartyInit>>; // member tokens on the board are spawned; this overrides hp/spells/charges
  hp?: Readonly<Record<string, number>>; // by label, any unit
  intents?: Readonly<Record<string, Dir>>; // by label; if given, round-1 AI telegraph is skipped, unlisted enemies idle
  lab?: boolean;
  objective?: DraftGoal;
}

// ── Run layer ───────────────────────────────────────────
export type LootItem =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'ink'; member: MemberId; amount: number }
  | { kind: 'solvent'; solvent: SolventId }
  | { kind: 'vellum'; amount: number }
  | { kind: 'doorway' } // never banked: picking it opens field rewiring (plan S11)
  | { kind: 'draft'; draft: DraftId } // an owner's draft, banked into `Profile.drafts` (M30)
  | { kind: 'key'; district: DistrictId }; // opens `district` when banked (K-23)

/** One cell that fired in a cast (proof masks; plan P7). `at` is the lattice cell. */
export interface FiredCell {
  at: Coord;
  rune: RuneId | null; // null for a Glyph socket
  glyph?: GlyphId;
  dir?: Dir;
}

export interface Profile {
  collection: Record<RuneId, number>; // owned counts
  inkCapacity: Record<MemberId, number>;
  lattices: Record<MemberId, Placed[]>; // shape comes from MEMBERS[m].shape
  interactions: InteractionId[]; // codex: discovered interactions (runes: derived from collection)
  solvents: Record<SolventId, number>;
  vellum: number;
  bench: {
    trials: string[]; // trial keys "left+right+solvent" (parents sorted)
    known: string[]; // recipe ids written in ink
  };
  glyphs: GlyphDef[];
  proof: Record<MemberId, FiredCell[][]>; // cast masks, newest last, capped
  idioms: string[]; // recognised idiom ids (codex)
  /** Older versions of Glyphs, with their own records (M17). Kept forever. */
  glyphArchive: GlyphDef[];
  /** Records per `versionKey(id, version)`; a missing one reads as empty (M8). */
  glyphRecords: Record<string, GlyphRecord>;
  /** Banked owner's drafts and their working copies (M34). */
  drafts: DraftCopy[];
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

// ── Mastery (records, tiers, drafts) ────────────────────
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
/** A draft the player owns: the working copy of its inside, and whether it is repaired (M34). */
export interface DraftCopy {
  id: DraftId;
  inside: GlyphInside;
  repaired: boolean;
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
  /** The cast with the most reaction events (ignite, conduct, arc, detonate, …). */
  biggestChain: { member: MemberId; spell: SpellKey; name: string; reactions: number } | null;
  discoveries: string[]; // codex ids first found on this trip, in order ('interaction:ignite', 'idiom:bonfire')
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
