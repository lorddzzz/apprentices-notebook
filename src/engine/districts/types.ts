import type {
  ApprenticeId,
  BindEvent,
  DistrictId,
  EncounterDef,
  EnemyId,
  LootSpec,
  LootTableId,
} from '$data';
import type { ArrivalCause, ArrivalCauses, ArrivalHook, EnteredTiles } from '../arrival';
import type { Ctx } from '../ctx';
import type { EventLog, UnitRef } from '../events';
import type { Coord, Dir } from '../grid';
import type { HarmGuard } from '../harm';
import type { BoardSpec } from '../notation';
import type { Telegraph } from '../rivals/types';
import type {
  Action,
  BattleState,
  CoreLootItem,
  EnemyUnit,
  Origin,
  Profile,
  Terrain,
  Trip,
  UnitId,
} from '../types';

/**
 * The district kit's engine contracts (district-kit plan P1–P16, §4, §9). DK-1: interfaces only.
 * Every field of `DistrictModule` is optional: an empty module is a plain district like the Seam.
 * The tasks named on each block wire it into the battle and the trip flow.
 */

// ── Shared ids and values ───────────────────────────────
/** Any JSON-safe value: rule state, piece data and trip state are saved and cloned as plain data. */
export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [k: string]: Json };
/** A district-owned id, namespaced so two districts never collide (P2): `'canals:current'`. */
export type KitId<D extends DistrictId = DistrictId> = `${D}:${string}`;
export type RuleId = KitId;
export type PieceId = KitId;
export type StepId = KitId;
export type TripShapeId = KitId;

/** Runtime entered-tiles values for district causes (FD-0's `ArrivalCauses`, namespaced keys). */
export type KitCauses = { readonly [C in ArrivalCause & KitId]?: ArrivalCauses[C] };

// ── Telegraph (RV P10's `draw` descriptor, RV-W0) ───────
export type { Telegraph };

// ── Round-end board rules (P8, P9; DK-3) ────────────────
/**
 * The three fixed round-end slots around `turn.ts` hazards: `carry` (where drift and driftWaiting
 * run), `afterChemistry` (where burnGates runs), `late` (after snuffStep).
 */
export type RoundEndSlot = 'carry' | 'afterChemistry' | 'late';
/** Generic "Next round" overlay shapes (P8, BH meter, BF outlines and pulses; DK-13 draws them). */
export type PreviewShape =
  | { kind: 'ghost'; unit: UnitId; from: Coord; to: Coord }
  /** A state that moves with the board (a float on the current); `to` null = off the board. */
  | { kind: 'float'; from: Coord; to: Coord | null }
  | { kind: 'tile'; at: Coord; tone: 'warn' | 'cracked' | 'falls' | 'drawn' | 'erased' }
  | { kind: 'outline'; cells: readonly Coord[]; label?: string }
  | { kind: 'pulse'; at: Coord }
  | { kind: 'meter'; label: string; value: number; max: number };
/** How a rule turns on (P9): listed by its district, or brought by a piece/terrain on the board. */
export type RuleActivation =
  | { kind: 'district' }
  | { kind: 'piece'; pieces: readonly PieceId[] }
  | { kind: 'terrain'; flag: keyof Terrain };
export interface BoardRule<S extends Json = Json> {
  id: RuleId;
  slot: RoundEndSlot;
  /** Order inside the slot, ascending; ties break by id. Built-ins keep today's order (P8). */
  order: number;
  /** `piece`: may come with an intrusion or a Lab board; `district`: only with its district (P9). */
  scope: 'piece' | 'district';
  activatedBy: RuleActivation;
  /** Its state at battle start; lives in `BattleState.rules[id]` (DK-3 adds the field). */
  init(state: BattleState, config: Json | undefined): S;
  /**
   * One round-end run: mutates `ctx` through `emit`, returns its next state. Runs while the rule
   * is active (`isRuleActive` in `rules.ts`); a brought rule's step must be a no-op without its
   * piece or terrain.
   */
  step(ctx: Ctx, own: S): S;
  preview?(state: BattleState, own: S): readonly PreviewShape[];
  /** Bench/generator palette key: met once a fight ran under the rule (DK-E4). */
  met?: string;
}
/** `BattleState.rules` (DK-3): each active rule's own state by id. */
export type RuleStates = Readonly<Record<RuleId, Json>>;

// ── Board pieces (P10; DK-4) ────────────────────────────
/** What a piece blocks: nothing, units only (a pencil outline), or units and shots (a plate). */
export type Solidity = 'none' | 'units' | 'unitsAndShots';
/** What struck a piece (§9 CG, BF): damage, a push into it, a Spark, a basic Shove, Erase or Draw. */
export type StruckBy = 'damage' | 'push' | 'spark' | 'shove' | 'erase' | 'draw';
/** A piece on a tile (DK-4 adds `Tile.piece: TilePiece | null`); `data` is cloned and saved (BF). */
export interface TilePiece {
  id: PieceId;
  data: Json;
}
export interface PieceTriggers {
  /** Registered into FD's arrival pipeline as a district hook (FD P3). */
  onArrive?: Omit<ArrivalHook, 'id'>;
  onTurnEnd?(ctx: Ctx, at: Coord, piece: TilePiece): void;
  onStruck?(ctx: Ctx, at: Coord, piece: TilePiece, by: StruckBy, origin: Origin | null): void;
  /** A projectile or area landing on its tile. */
  onHit?(ctx: Ctx, at: Coord, piece: TilePiece, origin: Origin | null): void;
}
export interface PieceDef<D extends Json = Json> {
  id: PieceId;
  /** Notation inside braces: `bell` reads `{bell}` and `{bell:a}` (the suffix is parsed by `parse`). */
  token: string;
  solid: Solidity;
  /** Default data and the reader for a token suffix (`{bell:a}` → tone a). */
  data?: { init: D; parse?(suffix: string): D | null; write?(data: D): string };
  triggers: PieceTriggers;
  /** Foe AI steps around it (IQ D-requests). */
  aiAvoid?: boolean;
  /** Unit traits the piece ignores (`flies`, a habit id): data-driven exemption (IQ). */
  exempt?: readonly string[];
  /** Piece-scoped rules it switches on while on the board (P9). */
  rules?: readonly RuleId[];
  palette?: { label: string; lab: boolean };
  /** Bench parity (BL-102): the `met` key that offers it on the Bench. */
  bench?: { met: string; label: string };
  /** UI art key looked up in `src/ui/districts` (P10). */
  art: string;
}

// ── Out of the room (P11; DK-6) ─────────────────────────
export type OutCause = 'fell' | 'erased';
/** `Unit.out` (DK-6): off the board, untargetable, delayed effects lapse; null = in the room. */
export type UnitOut = OutCause | null;
/** Flags DK-6 adds to units: out of the room, and the bystander crate (CN §9). */
export interface UnitKitFlags {
  out: UnitOut;
  /** Ignored by `checkEnd`, foe targeting and kill credit (the barge). */
  bystander?: true;
}
/** Event DK-6 adds to `GameEvent`. */
export interface OutOfRoomEvent {
  type: 'outOfRoom';
  unit: UnitRef;
  cause: OutCause;
}

// ── Offers (P6, DK-R1; DK-7) ────────────────────────────
/** The core kinds every district may offer; districts add namespaced ones. */
export type CoreOfferKindId = CoreLootItem['kind'] | 'recruit' | 'bindEvent';
export type OfferKindId = CoreOfferKindId | KitId;
/** Every loot item: the core ones, recruit, bindEvent and namespaced kinds (`LootItem` is this). */
export type KitLootItem =
  | CoreLootItem
  | { kind: 'recruit'; apprentice: ApprenticeId } // RC-4's semantics
  | { kind: 'bindEvent'; event: BindEvent } // granted through FD-9
  | { kind: KitId; data: Json; held?: true };
/** Specs a table, a guarantee or a contributor may name (rolled into a `KitLootItem`). */
export type KitLootSpec =
  | LootSpec
  | { kind: 'recruit'; apprentice: ApprenticeId }
  | { kind: 'bindEvent'; event: BindEvent }
  | { kind: KitId; data: Json };
/** P2: loot tables owned by a district file are namespaced. */
export type KitLootTableId = LootTableId | KitId;
export interface OfferRollCtx {
  profile: Profile;
  trip: Trip;
  /** The room just won (encounter index). */
  room: number;
  /** The won room's loot table. */
  table: KitLootTableId;
  /** A seed of its own for this roll (never the table's draw, so the table rolls as before). */
  seed: number;
}
/** What a contributor adds to one roll (DK-R1). */
export interface OfferContribution {
  /** Offered after the table's `guaranteed` page, counting toward the normal offers like it. */
  must?: KitLootSpec;
  /** Cards after the normal offers, never counted toward them. */
  extra?: readonly KitLootItem[];
}
/** DK-R1: run on every roll; may force one offer and add extra cards. */
export type OfferContributor = (ctx: OfferRollCtx) => OfferContribution;
/** A weighted entry a kind joins to the end of the table's pool (the key, K-23). */
export interface PoolEntry {
  spec: KitLootSpec;
  weight: number;
}
export interface OfferKind<I extends KitLootItem = KitLootItem> {
  id: OfferKindId;
  /** Rolls this kind's own cards, beside the table (plunge, terms): offered after the normal ones. */
  roll?(ctx: OfferRollCtx): readonly I[];
  /** Weighted entries joining the end of the table's pool, drawn like any page (the key). */
  joinPool?(ctx: OfferRollCtx): readonly PoolEntry[];
  /**
   * Taking it, after the pick is spent: most add it to `trip.loot`; the doorway sets the status
   * instead; a kind may also raise `picksLeft` (IQ D4).
   */
  onPick(trip: Trip, item: I): Trip;
  /** Returning home with it. */
  onBank(profile: Profile, item: I): Profile;
  /** On a wipe; absent = lost with the rest of the trip loot. */
  onWipe?(profile: Profile, item: I): Profile;
  /** At most this many in one trip's loot and offers (the key: 1; a recruit: 1 per apprentice). */
  limitPerTrip?: number;
  /** Groups items for `limitPerTrip` (a recruit by apprentice); absent = the whole kind. */
  limitKey?(item: I): string;
  /** Save parsing: the item or null when it is not a valid one of this kind. */
  parse(raw: unknown): I | null;
  /** Card key in `src/ui/districts` (DK-12). */
  card: string;
}
/** A module's per-room offers (P7; CG/BF guarantees). */
export interface RoomOffers {
  table: KitLootTableId;
  picks: number;
  guaranteed?: readonly KitLootSpec[];
  extra?: readonly KitLootItem[];
}

// ── Hearing (P12; DK-8) ─────────────────────────────────
export type HearKindId =
  | 'burst'
  | 'named'
  | 'heart'
  | 'trips'
  | 'crossDebt'
  | 'burstUnits'
  | 'conducted'
  | 'performed'
  | 'pages'
  | KitId;
export interface HearInput {
  log: EventLog;
  /** Where the battle was; the lower Seam counts as the Seam (SM §9). */
  district: DistrictId;
  profile: Profile;
}
/** A pure log/profile predicate; only an apprentice's cast hears a district (SM P5). */
export interface HearKind<C = unknown> {
  id: HearKindId;
  when: 'battle' | 'trip';
  test(condition: C, input: HearInput): boolean;
}

// ── Trip shape (P3–P5, P7, P13, DK-E1–E3; DK-5a/5b) ─────
/** P3: `{ ok }` or the greyed button's reason and the next landing. */
export type ReturnCheck = { ok: true } | { ok: false; why: string; next?: number };
export interface ReturnBlock {
  why: string;
}
/** P4: "which way next". The default pair is push and return. */
export interface CrossroadsChoice {
  id: string;
  label: string;
  kind: 'push' | 'return' | 'through';
  /** The next room's variant indices when this choice is taken (seeded replays). */
  variantPool?: readonly number[];
  /** "After this room: no way home" (DK-11). */
  warn?: string;
  disabled?: string;
}
/** One Crossroads passed: the choice taken after room `after`, and the pool it fixed for the next. */
export interface TakenChoice {
  after: number;
  id: string;
  /** The next room's variant indices, stored so a replay never re-asks the module (P4). */
  pool?: number[];
}
/**
 * `Trip.kit` (DK-5a): everything the trip shape carries room to room. Absent on a trip into a
 * district with no shape hooks and no checkpoint (the Seam, the canals), so their saves are unchanged.
 */
export interface TripKitState {
  /** The module's own value; parsed only by its module (P7). */
  state: Json;
  /** One per Crossroads passed, in order. */
  choices: TakenChoice[];
  /** The checkpoint was reached this trip (applied to `city.checkpoints` on win or wipe, P5). */
  checkpoint: boolean;
  /** Bonus objectives met, by room index (P13). */
  bonuses: number[];
}
/** `city.checkpoints` (DK-5a): a district's checkpoint room index, once reached. */
export type CityCheckpoints = Partial<Record<DistrictId, number>>;
export type StartAt = 'start' | 'checkpoint';
/** One board edit applied after HC's start-point draw (BF §9). */
export type BoardEdit =
  | { at: Coord; piece: TilePiece | null }
  | { at: Coord; terrain: Partial<Terrain> };
export interface RoomSetup {
  rulesConfig?: Readonly<Record<RuleId, Json>>;
  /** Activate another district's district-scoped rule by id (DK-E2). */
  activate?: readonly RuleId[];
  boardEdits?: readonly BoardEdit[];
  variantPool?: readonly number[];
}
/** Read-only view a shape hook gets: the trip plus its parsed state. */
export interface ShapeInput<S extends Json> {
  trip: Trip;
  kit: TripKitState;
  state: S;
  room: number;
  /** Rooms in this trip (DK-E3): static `rooms.length` or the module's `length`. */
  length: number;
}
/** A trip shape (DK-E3), registered by its owner district and reusable by drawn districts. */
export interface TripShapeDef<S extends Json = Json> {
  id: TripShapeId;
  parseState(raw: unknown): S;
  initState(): S;
  returnBlocks?(input: ShapeInput<S>): readonly ReturnBlock[];
  choices?(input: ShapeInput<S>): readonly CrossroadsChoice[];
  roomSetup?(input: ShapeInput<S>): RoomSetup;
  afterRoom?(input: ShapeInput<S>, log: EventLog, won: boolean): S;
  /**
   * The trip's loot once a won room's `afterRoom` has run (DK-D9): `input` carries the new state,
   * so a settled stake can drop what it held. Absent keeps the loot as it is.
   */
  lootAfterRoom?(input: ShapeInput<S>): readonly KitLootItem[];
  offersFor?(input: ShapeInput<S>): RoomOffers | null;
}

// ── Scripted steps, stand-ins and foe behaviours (P14; DK-9) ──
/** A registered step: plans a telegraph in the enemy phase, acts on it next (RV's contract). */
export interface ScriptStep {
  id: StepId;
  plan(state: BattleState, unit: EnemyUnit): Telegraph | null;
  act(ctx: Ctx, unit: EnemyUnit, telegraph: Telegraph): void;
  /** Round-end part (CG: a stand-in's own step). */
  roundEnd?(ctx: Ctx, unit: EnemyUnit): void;
  describe(telegraph: Telegraph): string;
}
/** `EnemyDef.script` (DK-9): steps cycled by round; `standIn` clears the heart, never a page. */
export interface EnemyScript {
  steps: readonly StepId[];
  standIn: boolean;
}
/** A district foe's AI (IQ D2, BH): ordinary foes use the same registry as stand-ins. */
export interface FoeBehaviour {
  id: KitId;
  /** Walks before planning, in a phase where the foe may move (not round 1, not held). */
  move?(ctx: Ctx, unit: EnemyUnit): void;
  /** The telegraph for this round (null: it idles). Runs after `move`. */
  plan(state: BattleState, unit: EnemyUnit): Telegraph | null;
  resolve(ctx: Ctx, unit: EnemyUnit, telegraph: Telegraph): void;
  preview?(state: BattleState, unit: EnemyUnit): readonly PreviewShape[];
  /** The telegraph in words (log, intent line); absent = its `label`. */
  describe?(telegraph: Telegraph): string;
  /** Enemy-level struck trigger (BF's Clapper). */
  onStruck?(ctx: Ctx, unit: EnemyUnit, by: StruckBy): void;
}

// ── District events (P2) ────────────────────────────────
/** A district's own event: namespaced type, generic playback reads `at`/`unit`. */
export interface DistrictEvent {
  type: KitId;
  at?: Coord;
  unit?: UnitRef;
  dir?: Dir;
  data?: Json;
}
export interface DistrictEventDef {
  type: KitId;
  describe(e: DistrictEvent): string;
}

// ── Heart frame and bot (EN §9, DK-E6) ──────────────────
/** The terrain a district's master needs, callable outside the district (EN). */
export interface HeartSetup {
  foe: EnemyId | KitId;
  rules: readonly RuleId[];
  /** Places the master's terrain and pieces on a board of any allowed size. */
  frame(board: BoardSpec, seed: number): BoardSpec;
}
export interface BotTerms {
  value?(state: BattleState): number;
  actions?(state: BattleState): readonly Action[];
}

// ── The module (P1) ─────────────────────────────────────
export interface DistrictModule {
  id: DistrictId;
  rules?: readonly BoardRule[];
  pieces?: readonly PieceDef[];
  offerKinds?: readonly OfferKind[];
  offerContributors?: readonly OfferContributor[];
  hearKinds?: readonly HearKind[];
  events?: readonly DistrictEventDef[];
  steps?: readonly ScriptStep[];
  foes?: readonly FoeBehaviour[];
  /**
   * Guards run before a hit, a push or a mark lands (DK-IQ D1: IQ's forwarding writ, BH): after
   * the habits' guards, in registry order. Ids are owner-prefixed (`inkQuarter:forward`).
   */
  harmGuards?: readonly HarmGuard[];
  /**
   * Its own causes for FD's pipeline with their entered tiles (`'bridges:fall': 'landing'`). The
   * type comes from augmenting `ArrivalCauses` in the district's own file (FD-0); this is the
   * runtime value FD-3 composes.
   */
  causes?: KitCauses;
  trip?: TripShapeDef;
  heart?: HeartSetup;
  bot?: BotTerms;
  /** DK-E1: rooms supplied per trip instead of static data. */
  encounter?(trip: Trip, index: number): EncounterDef;
  length?(trip: Trip): number;
}

/** Every registry, assembled once from the module list (no runtime registration, FD P3). */
export interface Kit {
  modules: Readonly<Partial<Record<DistrictId, DistrictModule>>>;
  rules: Readonly<Record<RuleId, BoardRule>>;
  pieces: Readonly<Record<PieceId, PieceDef>>;
  /** Pieces by their notation token. */
  tokens: Readonly<Record<string, PieceDef>>;
  offerKinds: Readonly<Partial<Record<OfferKindId, OfferKind>>>;
  offerContributors: readonly OfferContributor[];
  hearKinds: Readonly<Partial<Record<HearKindId, HearKind>>>;
  events: Readonly<Record<KitId, DistrictEventDef>>;
  steps: Readonly<Record<StepId, ScriptStep>>;
  foes: Readonly<Record<KitId, FoeBehaviour>>;
  /** Every module's harm guards, in registry order (`harm.ts` runs them after the habits'). */
  harmGuards: readonly HarmGuard[];
  shapes: Readonly<Record<TripShapeId, TripShapeDef>>;
  /** Every district cause with its entered tiles, for FD-3 to merge with the core table. */
  causes: Readonly<Record<string, EnteredTiles>>;
}
