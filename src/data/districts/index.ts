import type { KitId, KitLootSpec, KitLootTableId, PieceId, RuleId } from '$engine/districts/types';
import type { GameEvent } from '$engine/events';
import type { RecruitPages, RecruitPlacement } from '../recruits';
import type {
  BurstId,
  DistrictId,
  EdgeRule,
  EncounterDef,
  Gate,
  Goal,
  HearCondition,
  KindId,
} from '../types';
import { BATHHOUSES_KIT } from './bathhouses';
import { BRIDGES_KIT } from './bridges';
import { CANALS_KIT } from './canals';
import { CARTOGRAPHERS_KIT } from './cartographers';
import { FOUNDRY_KIT } from './foundry';
import { INK_QUARTER_KIT } from './inkQuarter';
import { SEAM_KIT } from './seam';

/**
 * The district kit's data contracts (district-kit plan P1–P16, §9). DK-1: types and empty
 * registries. Until DK-17 folds them into one `DistrictDef`, a district's kit fields live beside
 * the legacy entry in `src/data/districts.ts` (`DistrictKitData`, all optional).
 */

// ── Trip shape as data (P3, P5) ─────────────────────────
/**
 * Where the party may go home (P3; replaces `landings`). Indices are 0-based rooms, as `landings`:
 * `any` after every room; `landings` after the listed rooms; `until` free up to room `after`,
 * none beyond it (the point of no return). The heart is always a return point (city K-table),
 * whatever the policy says. Absent reads as `any`.
 */
export type ReturnPolicy =
  | { kind: 'any' }
  | { kind: 'landings'; after: readonly number[] }
  | { kind: 'until'; after: number };
/** P5: a room later trips may start after (the Cartographers' doorway). */
export interface CheckpointDef {
  after: number;
  name: string;
}

// ── Goals (P13; §9 BF, BH, IQ) ──────────────────────────
/** Goal kinds the kit adds to the threshold `Goal` language. Unit ids are labels: `'rat-1'`. */
export type GoalExtension =
  | { withinRounds: number; goal: KitGoal }
  | { piece: PieceId; state: string; atLeast?: number }
  | { rule: RuleId; key: string; atLeast?: number; atMost?: number }
  | { outOfRoom: string; cause?: 'fell' | 'erased' }
  | { happens: GameEvent['type']; unit: string; atLeast?: number }
  | { noneDowned: true };
export type KitGoal = Goal | GoalExtension | { all: readonly KitGoal[] };
/** A room's optional objective (P13): checked when the room ends. */
export interface BonusObjective {
  goal: KitGoal;
  text: string;
  /** An extra pick, a named offer, or a tag the module's `afterRoom` writes into trip state. */
  reward: { kind: 'pick' } | { kind: 'offer'; spec: KitLootSpec } | { kind: 'state'; tag: string };
}

// ── Hearing (P12) ───────────────────────────────────────
/** Hearing conditions with the kit's kinds; `district` scopes any kind to where it happens. */
export type KitHearCondition = (
  | HearCondition
  | { kind: 'crossDebt' }
  | { kind: 'burstUnits'; burst: BurstId; atLeast: number }
  | { kind: 'conducted'; atLeast: number }
  | { kind: 'performed'; idiom: string }
  | { kind: 'pages'; atLeast: number; except?: readonly string[] }
) & {
  voice: 'owner' | 'rumour';
  district?: DistrictId;
  /** The line the district's hearing shows (each district writes its own, SM §9). */
  text?: string;
  /** IQ D6: the note waiting at home. */
  homeNote?: string;
};

// ── Lore (§9 lore registry) ─────────────────────────────
export type PaperId = KitId;
/** One found paper (lamp-ledger, letter, mason's ledger). Banked at once, kept on a wipe. */
export interface PaperDef {
  id: PaperId;
  district: DistrictId;
  title: string;
  hand: string; // whose hand wrote it
  text: string;
  /** The codex "Papers" group it files under ('Lamp-ledgers', 'Dead letters'). */
  group: string;
  found: { kind: 'room'; room: number } | { kind: 'landing'; after: number } | { kind: 'heart' };
}
/** `Profile.papers` (DK-5b): ids in the order found. */
export type ProfilePapers = readonly PaperId[];

// ── Rooms, thresholds, recruits, intrusions ─────────────
export interface KitRoomDef extends EncounterDef {
  bonus?: BonusObjective;
  lore?: PaperId;
}
/**
 * P15 (BL-94): a threshold room as data; start points are HC's `P` tokens in `board`. The goal is
 * the threshold language (K-22): the engine checks a threshold battle against `Goal` alone.
 */
export interface ThresholdSpec {
  name: string;
  board: string;
  goal: Goal;
  note: string;
  /** The banner line now hard-coded in `Threshold.svelte`. */
  goalText: string;
  rules?: readonly RuleId[];
  /** Map illustration key once solved (the canals' burnt gate). */
  solvedArt: string;
}
/** DK-R1: where a recruit can be met, and the pages their arrival guarantees (RC owns them). */
export type { RecruitPages, RecruitPlacement } from '../recruits';
/** A district's lower-Seam contribution (DK-10; SM-0 owns the floor format it must pass). */
export interface IntrusionSpec {
  district: DistrictId;
  pieces: readonly PieceId[];
  /** Piece-scoped rules only (P9). */
  rules: readonly RuleId[];
  rooms: readonly [string, string, string];
  loot: 'basics';
}

// ── Map (P16, BL-95, DK-E5) ─────────────────────────────
/** P16: the district's lean on the map; replaces `material`. */
export interface DistrictLean {
  lean: KindId | 'height' | 'paper';
  text: string;
}
export interface MapEntry {
  x: number;
  y: number;
  /** Which side of the node the caption sits (DK-16 spaces seven). */
  label: 'above' | 'below' | 'left' | 'right';
  solvedArt?: string;
}
/** The row under the Seam node: SM's stair and up to three drawn districts (DK-E5). */
export type UnderSeamSlot = { kind: 'stair' } | { kind: 'drawn'; index: 0 | 1 | 2 };

// ── Tokens (§9 all) ─────────────────────────────────────
/** One board token a district claims; letters for foes, brace names for pieces. */
export interface TokenEntry {
  token: string;
  kind: 'foe' | 'piece';
  id: string;
  district: DistrictId;
}

// ── Bench parity (BL-102) ───────────────────────────────
/** One Bench palette entry, offered once its `met` key is in the profile. */
export interface BenchEntry {
  id: string;
  kind: 'foe' | 'piece' | 'state' | 'rule' | 'terrain';
  /** Board token the palette places. */
  token: string;
  label: string;
  met: string;
  /** Counts toward the three-subject limit. */
  subject: boolean;
}

/** How a district opens: `Gate` with the kit's threshold spec and namespaced key tables. */
export type KitGate =
  | Exclude<Gate, { kind: 'threshold' } | { kind: 'key' }>
  | { kind: 'threshold'; room: ThresholdSpec }
  | { kind: 'key'; from: DistrictId; table: KitLootTableId; weight: number };

// ── The district's data ─────────────────────────────────
/** The full shape after DK-17 (one entry per district file). */
export interface DistrictData {
  id: DistrictId;
  name: string;
  lean: DistrictLean;
  guild: string;
  edge: EdgeRule;
  rooms: readonly KitRoomDef[];
  ret: ReturnPolicy;
  checkpoint?: CheckpointDef;
  hear: readonly KitHearCondition[];
  gate: KitGate;
  map: MapEntry;
  line: string;
  barred: string;
  intrusion?: IntrusionSpec;
  recruit?: readonly RecruitPlacement[];
  recruitPages?: readonly RecruitPages[];
  papers?: readonly PaperDef[];
  tokens?: readonly TokenEntry[];
  bench?: readonly BenchEntry[];
  /** Loot tables this file owns (P2). */
  tables?: readonly KitLootTableId[];
  /** P15: the threshold room (copy, start points, goal, solved art). The gate's kind stays legacy until DK-17. */
  threshold?: ThresholdSpec;
}
/** Wave 0: the kit fields only, all optional, layered over the legacy `DISTRICTS` entry. */
export type DistrictKitData = { id: DistrictId } & Partial<Omit<DistrictData, 'id'>>;

/** Every district's kit data, one line each (P1). */
export const DISTRICT_KIT: Readonly<Partial<Record<DistrictId, DistrictKitData>>> = {
  seam: SEAM_KIT,
  canals: CANALS_KIT,
  inkQuarter: INK_QUARTER_KIT,
  bathhouses: BATHHOUSES_KIT,
  bridges: BRIDGES_KIT,
  foundry: FOUNDRY_KIT,
  cartographers: CARTOGRAPHERS_KIT,
};

/** Every token the districts claim, for the collision check. */
export const DISTRICT_TOKENS: readonly TokenEntry[] = Object.values(DISTRICT_KIT).flatMap(
  (d) => d?.tokens ?? [],
);

/** Tokens claimed twice across districts (or once over a built-in token); empty when clean. */
export function tokenCollisions(
  entries: readonly TokenEntry[],
  builtIn: readonly string[] = [],
): string[] {
  const seen = new Set(builtIn);
  const clash: string[] = [];
  for (const e of entries) {
    if (seen.has(e.token)) clash.push(e.token);
    seen.add(e.token);
  }
  return clash;
}
