import type { DistrictId, LootTableId } from '$data';
import { checkGoal } from './drafts';
import type { EventLog } from './events';
import type { BattleState, CityState, LootItem, Profile, Trip } from './types';

/**
 * The city (K-19 to K-24): which districts are heard of, open and cleared, how hearing happens,
 * how gates open, keys, rumours and landings. W0 stubs with final signatures; E3 fills them.
 */

export type DistrictState = 'unheard' | 'heard' | 'open';

/** A new notebook's city: only the Seam, heard and open. */
export function cityDefaults(): CityState {
  return { heard: ['seam'], open: ['seam'], hearts: [], solved: [], trips: 0, fresh: [] };
}

export function districtState(p: Profile, id: DistrictId): DistrictState {
  if (p.city.open.includes(id)) return 'open';
  return p.city.heard.includes(id) ? 'heard' : 'unheard';
}

/**
 * Owner hearing, read off a finished trip battle's log, win or wipe (K-20). `heard` lists the
 * districts newly heard (they also go into `city.fresh`; a `discovery` gate opens them).
 */
export function hearFromBattle(
  p: Profile,
  _t: Trip,
  _log: EventLog,
): { profile: Profile; heard: DistrictId[] } {
  return { profile: p, heard: [] };
}

/**
 * After a trip ends (returned or wiped): counts it, marks a cleared heart, then checks rumour
 * conditions (K-20). `heard` lists the districts newly heard.
 */
export function hearAfterTrip(
  p: Profile,
  _t: Trip,
  _outcome: 'returned' | 'wiped',
): { profile: Profile; heard: DistrictId[] } {
  return { profile: p, heard: [] };
}

/** Whether the party may return home from this Crossroads (K-4). */
export function canReturn(_t: Trip): boolean {
  return true;
}

/** The next landing's room name for the greyed Return button, or null when this is one (K-4). */
export function nextLanding(_t: Trip): string | null {
  return null;
}

/**
 * The key a won fight's table may offer (K-23): a district whose `key` gate is `t.district` +
 * `table`, heard and not open, none on this trip yet. Null for none.
 */
export function keyOffer(
  _p: Profile,
  _t: Trip,
  _table: LootTableId,
): { district: DistrictId; weight: number } | null {
  return null;
}

/** Opens the districts whose keys are in the banked loot (K-23). */
export function bankKeys(p: Profile, _loot: readonly LootItem[]): Profile {
  return p;
}

/** A threshold battle's objective, checked on an action's log and the state (K-22). */
export function objectiveMet(state: BattleState, log: EventLog): boolean {
  return state.objective ? checkGoal(state.objective, log, state) : false;
}

/** A threshold room solved: the district opens and the map shows a burnt gate (K-22). */
export function solveThreshold(p: Profile, _district: DistrictId): Profile {
  return p;
}

/** The map was opened: nothing is fresh any more (K-19). */
export function seeMap(p: Profile): Profile {
  return p;
}

/** Dev: every district heard and open (K-24). */
export function openAll(p: Profile): Profile {
  return p;
}
