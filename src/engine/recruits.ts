import type { ApprenticeId, Beat, InventionDef, LootSpec, RuneId } from '$data';
import type { Profile, Trip } from './types';

/**
 * Recruitment (docs/plans/recruitment-plan.md §4). RC-W0: contracts only; every function throws
 * until its task (RC-2/3/6) lands.
 */

/** The recruit offer card (P7); matches DK-1's `KitLootItem` member, banked via `joinHousehold`. */
export interface RecruitLootItem {
  kind: 'recruit';
  apprentice: ApprenticeId;
}

/** `Profile.recruits` (RC-6 adds it to `Profile` in engine/types.ts; parsed with an empty default). */
export interface RecruitsState {
  /** Door arrivals written under the attic door, oldest first; each stays until welcomed (P3). */
  notes: readonly ApprenticeId[];
}
export const EMPTY_RECRUITS: RecruitsState = { notes: [] };

/** Everything a recruit waits for: beats plus runes, page runes derived from `starterPage` (P1). */
export interface Preconditions {
  beat: readonly Beat[];
  runes: { all: readonly RuneId[]; any?: readonly RuneId[] };
}

/** Where readiness is asked: on a trip (its loot counts as owned, P2) and at the landmark room. */
export interface ReadyCtx {
  trip?: Trip;
  atLandmark?: boolean;
}

const todo = (what: string): never => {
  throw new Error(`recruits: ${what} is not built yet (RC-W0 stub)`);
};

/** RC-2. */
export function preconditionsOf(_id: ApprenticeId): Preconditions {
  return todo('preconditionsOf');
}
/** RC-2: computed, never stored (P2). */
export function isReady(_p: Profile, _id: ApprenticeId, _ctx: ReadyCtx = {}): boolean {
  return todo('isReady');
}
/** RC-2: recruits not in the household (nor the trip's loot) whose district is heard. */
export function waitingFor(_p: Profile, _trip?: Trip): readonly ApprenticeId[] {
  return todo('waitingFor');
}
/** RC-3: at most one missing precondition page for this roll (P5, P6), after the table's own. */
export function guaranteesFor(_p: Profile, _trip: Trip, _room: number): LootSpec | null {
  return todo('guaranteesFor');
}
/** RC-2: the first household invention proven in `TUNING.provenCasts` masks (P4), for the note (P12). */
export function provenInvention(_p: Profile): InventionDef | null {
  return todo('provenInvention');
}
/** RC-6: at most one ready door arrival to write as a note this homecoming (P3). */
export function doorArrivals(_p: Profile): ApprenticeId | null {
  return todo('doorArrivals');
}
/** RC-6: removes the note and calls `joinHousehold`; idempotent. */
export function welcome(_p: Profile, _id: ApprenticeId): Profile {
  return todo('welcome');
}
/** RC-6: in the household or holding a note: the only reveal test UI may use (§1). */
export function isRevealed(_p: Profile, _id: ApprenticeId): boolean {
  return todo('isRevealed');
}
