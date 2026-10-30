import type { KitLootSpec } from '$engine/districts/types';
import type { PaperDef } from '../index';

/**
 * The ink-makers' quarter's data contracts (IQ-W0; ink-quarter-plan §2, §4). Types and ids only:
 * the tasks named on each block fill them in. Every number here is
 * *tune by playing* and set by IQ-8 / IQ-20.
 */

// ── Ids ─────────────────────────────────────────────────
/** An id this district owns (P2, P15). */
export type InkId = `inkQuarter:${string}`;

/**
 * The postal staff and the heart (P8, P10), as they will join `EnemyId` (IQ-5a, IQ-5b, IQ-7):
 * plain words like the canals' foes. `seal` is the clock's anchored 3-HP inert unit (P9).
 */
export const INK_FOE_IDS = ['sorter', 'sealer', 'deadLetter', 'postmaster', 'seal'] as const;
export type InkFoeId = (typeof INK_FOE_IDS)[number];

/** Loot tables the district owns (P15): rooms 1-2, rooms 3-4, the heart (IQ-8 fills them). */
export const INK_TABLE_IDS = ['inkQuarter:shallow', 'inkQuarter:deep', 'inkQuarter:heart'] as const;
export type InkTableId = (typeof INK_TABLE_IDS)[number];

// ── Terms (P5, P6; IQ-3, IQ-4, IQ-8) ────────────────────
/** A `TermDef` id: `inkQuarter:term-bind`. */
export type TermId = InkId;

/** What signing gives now (P6, P7): a page (held until the term settles), or a second pick. */
export type TermReward =
  | { kind: 'page'; spec: KitLootSpec }
  | { kind: 'extraPick' }
  | { kind: 'both'; spec: KitLootSpec };

/** What must hold when the next room is won (P6): DK's goal language plus `noneDowned`. */
export type TermCondition =
  | { kind: 'winRoom' }
  | { kind: 'withinRounds'; rounds: number }
  | { kind: 'noneDowned' };

/** Taken from the trip on a broken term (P6); never below revive HP (IQ-3 clamps). */
export type ResourceLoss =
  | { kind: 'hp'; amount: number }
  | { kind: 'charge'; amount: number }
  | { kind: 'ink'; amount: number };

/** Applied to the next room on signing, whatever the outcome (P6). */
export type NextRoomCost =
  | { kind: 'mark' }
  | { kind: 'extraFoe'; foe: InkFoeId }
  | { kind: 'seal' };

/**
 * The stake (P6). `reward`: the page is held and removed if the condition fails. `resources`: a
 * loss on failure. `nextRoom`: a price always paid in the next room (the condition still decides
 * paid or broken, but a broken one costs nothing more).
 */
export type TermStake =
  | { kind: 'reward' }
  | { kind: 'resources'; loss: ResourceLoss }
  | { kind: 'nextRoom'; cost: NextRoomCost };

/** One term as data (IQ-8's term list). The three lines are shown before signing (P7). */
export interface TermDef {
  id: TermId;
  reward: TermReward;
  stake: TermStake;
  condition: TermCondition;
  /** 0-based rooms whose offers may carry it; never the heart (P5). */
  rooms: readonly number[];
  /** Guaranteed in these rooms while the household lacks this page (P7: Bind in room 2). */
  guaranteedWhileLacking?: string;
  text: { reward: string; condition: string; penalty: string };
}

// ── Papers (P13; IQ-14) ─────────────────────────────────
/** A letter to the owner: a `PaperDef` under the codex group "Dead letters". */
export type InkPaperId = InkId;
export type InkPaperDef = PaperDef & {
  id: InkPaperId;
  district: 'inkQuarter';
  group: 'Dead letters';
};
