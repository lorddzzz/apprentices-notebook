import type { DraftDef, DraftGoal, DraftId, LootTableId } from '$data';
import { createBattle } from './battle';
import type { GameEvent } from './events';
import type { BattleState, GlyphInside, LootItem, Profile, Trip } from './types';

/**
 * The owner's drafts (design research-and-mastery §4.7, plan M29–M36): loot, the desk test,
 * repair. W0 stubs with final signatures; task E4 fills them.
 *
 * Never import `run.ts` here: run.ts imports this module (`nextDraft`, `bankDrafts`).
 */

/** One run of a draft's test stage (M31): the log, the final state, and each goal line's tick. */
export interface DraftRun {
  events: GameEvent[];
  state: BattleState;
  passed: boolean;
  goals: { goal: DraftGoal; met: boolean }[];
}

/** The owner's page as an inside (local frame, entry at (0,0)). W0 stub: an empty inside. */
export function draftInside(d: DraftDef): GlyphInside {
  return { kind: d.kind, cells: [], entry: { x: 0, y: 0 } };
}

/** Runs the test stage with `inside` compiled as the Draughtsman's (M31). W0 stub: the stage only. */
export function draftTest(d: DraftDef, _inside: GlyphInside): DraftRun {
  const r = createBattle({ title: d.name, board: d.test.board, seed: 1, lab: true });
  return { events: r.events, state: r.state, passed: false, goals: [] };
}

/** One goal against a test's log and final state (M32). W0 stub. */
export function checkGoal(
  _goal: DraftGoal,
  _events: readonly GameEvent[],
  _state: BattleState,
): boolean {
  return false;
}

/** The draft a won fight's loot table may offer, or null (M30). W0 stub: none. */
export function nextDraft(_p: Profile, _t: Trip, _table: LootTableId): DraftId | null {
  return null;
}

/** Banks the trip's draft loot into `Profile.drafts` on return (M30). W0 stub. */
export function bankDrafts(p: Profile, _loot: readonly LootItem[]): Profile {
  return p;
}

/** Marks a passing, valid draft repaired and adds its Glyph v1 (M33). Throws why not. W0 stub. */
export function repairDraft(p: Profile, _id: DraftId): Profile {
  return p;
}

/** Saves the working copy of a draft's inside (M34). W0 stub. */
export function editDraft(p: Profile, _id: DraftId, _inside: GlyphInside): Profile {
  return p;
}

/** "Start over": the working copy goes back to the owner's page (M34). W0 stub. */
export function resetDraft(p: Profile, _id: DraftId): Profile {
  return p;
}
