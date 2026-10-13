import type {
  AttackId,
  AuraRuneId,
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
}
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
    }
  | {
      kind: 'trigger';
      rune: TriggerRuneId;
      at: Coord;
      next: readonly SpellNode[];
      inner?: Coord;
      via?: readonly Coord[];
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
  kind: 'ink' | 'owned' | 'socket' | 'arrow' | 'overlap';
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
}
/** `dir` is from the enemy's CURRENT position at resolve time. */
export interface Intent {
  attack: AttackId;
  dir: Dir;
  order: number;
}
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
}

// ── Run layer ───────────────────────────────────────────
export type LootItem =
  | { kind: 'rune'; rune: RuneId }
  | { kind: 'ink'; member: MemberId; amount: number }
  | { kind: 'solvent'; solvent: SolventId }
  | { kind: 'vellum'; amount: number };

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
}
export type TripStatus = 'fight' | 'looting' | 'crossroads' | 'cleared';
export interface Trip {
  seed: number;
  encounter: number; // index into ENCOUNTERS of the current/next fight
  /** fight: go fight `encounter`; looting: pick from offers; crossroads: push or return; cleared: heart won, must return */
  status: TripStatus;
  hp: Record<MemberId, number>;
  charges: Record<MemberId, Record<SpellKey, number>>;
  loot: LootItem[]; // pending, banked on return, lost on wipe
  offers: LootItem[];
  picksLeft: number;
  /** The current fight's actions so far (status `fight`): a reload replays them instead of restarting. */
  actions: Action[];
}
export interface SaveData {
  profile: Profile;
  trip: Trip | null;
  seedCounter: number;
}
