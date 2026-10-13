import type { InteractionId, MemberId } from '$data';
import {
  type Action,
  type ActionResult,
  applyDoorway,
  type BattleState,
  beginEncounter,
  type Coord,
  discoveriesIn,
  finishEncounter,
  type GameEvent,
  type LootItem,
  nextTripSeed,
  type Profile,
  pickLoot,
  pushOn,
  recordAction,
  recordTripProof,
  returnHome,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import type { Route } from './routes';
import { parseSaveText, type SaveBackend, writeSave } from './save';
import { editProfile, type ShelfTool, type SocketDecision } from './study';

/** What a wipe leaves to read: the lost loot and what the notebook learned anyway. */
export interface WipeSummary {
  encounter: string;
  lost: LootItem[];
  learned: InteractionId[];
}

export type Screen =
  | 'study'
  | 'battle'
  | 'loot'
  | 'crossroads'
  | 'cleared'
  | 'wiped'
  | 'codex'
  | 'lab'
  | 'gallery'
  | 'bench';

const TRIP_SCREEN: Record<Trip['status'], Screen> = {
  fight: 'battle',
  looting: 'loot',
  crossroads: 'crossroads',
  cleared: 'cleared',
  // A quiet doorway reuses the Study's lattice editor in field mode (plan S11).
  doorway: 'study',
};

/**
 * Which screen a route shows. The trip (or a pending wipe) decides, not the URL: out in the city
 * there is no study, and a closed tab reopens where the save says you are. `redirect` is the route
 * the URL should be rewritten to, or null when it already fits.
 */
export function resolveScreen(
  route: Route,
  trip: Trip | null,
  wipe: WipeSummary | null,
): { screen: Screen; redirect: Route | null } {
  if (route === 'codex' || route === 'lab' || route === 'gallery') {
    return { screen: route, redirect: null };
  }
  // The Bench is a room of the study: out on a trip (or with a wipe unread) it is closed.
  if (route === 'bench' && !trip && !wipe) return { screen: 'bench', redirect: null };
  const screen: Screen | null = trip ? TRIP_SCREEN[trip.status] : wipe ? 'wiped' : null;
  if (screen === null) return { screen: 'study', redirect: route === 'study' ? null : 'study' };
  return { screen, redirect: route === 'trip' ? null : 'trip' };
}

// ── Study reducers ──

export interface StudyEdit {
  save: SaveData;
  tool: ShelfTool;
  decision: SocketDecision;
  /** A reason to show the player, or null. */
  message: string | null;
  changed: boolean;
}

/** One socket tap against the save. Pure: the profile changes, the trip and seed counter never do. */
export function editLattice(
  save: SaveData,
  m: MemberId,
  at: Coord,
  tool: ShelfTool,
  longPress: boolean,
): StudyEdit {
  const r = editProfile(save.profile, m, at, tool, longPress);
  return {
    save: r.changed ? { ...save, profile: r.profile } : save,
    tool: r.tool,
    decision: r.decision,
    message: r.message,
    changed: r.changed,
  };
}

/** `editLattice`, then one write if (and only if) the lattice changed. A failed write is reported, not thrown. */
export function editAndPersist(
  backend: SaveBackend,
  save: SaveData,
  m: MemberId,
  at: Coord,
  tool: ShelfTool,
  longPress: boolean,
): StudyEdit {
  const r = editLattice(save, m, at, tool, longPress);
  if (!r.changed) return r;
  try {
    writeSave(backend, r.save);
  } catch {
    return { ...r, message: 'Could not write the save' };
  }
  return r;
}

/** Pasted save text → SaveData. Throws a readable message when it isn't one. */
export function importSave(text: string): SaveData {
  return parseSaveText(text.trim());
}

// ── Trip reducers (pure; the GameStore persists after each) ──

/** The trip a save is on, or a readable error (a screen out of step with the save is a bug, not a crash). */
function tripOf(save: SaveData): Trip {
  if (!save.trip) throw new Error('The party is not out on a trip');
  return save.trip;
}

/** A fresh trip from the study: advances the seed counter, full HP and charges. Throws if the loadout is not ready. */
export function setOut(save: SaveData): SaveData {
  if (save.trip) throw new Error('The party is already out');
  const { seed, save: next } = nextTripSeed(save);
  return { ...next, trip: startTrip(next.profile, seed) };
}

/** The current encounter's battle. The same save always gives the same fight (reload restarts it). */
export function startBattle(save: SaveData): ActionResult {
  return beginEncounter(save.profile, tripOf(save));
}

/** One battle action into the trip, so a reload resumes the fight where it was. */
export function recordBattleAction(save: SaveData, action: Action): SaveData {
  return { ...save, trip: recordAction(tripOf(save), action) };
}

export interface BattleEnd {
  save: SaveData;
  outcome: 'won' | 'wiped';
  /** Set when the trip ended; the Wiped screen reads it. */
  wipe: WipeSummary | null;
  /** Interactions this battle taught that the notebook did not have yet. */
  learned: InteractionId[];
}

/** Closes a finished battle: won → looting, wiped → trip gone, pending loot lost, discoveries kept. */
export function endBattle(save: SaveData, battle: BattleState): BattleEnd {
  const trip = tripOf(save);
  const r = finishEncounter(recordTripProof(save.profile, trip), trip, battle);
  const learned = battle.discovered.filter((d) => !save.profile.interactions.includes(d));
  const next: SaveData = { ...save, profile: r.profile, trip: r.trip };
  const wipe: WipeSummary | null =
    r.outcome === 'wiped' ? { encounter: battle.title, lost: [...trip.loot], learned } : null;
  return { save: next, outcome: r.outcome, wipe, learned };
}

/** Takes offer `index` into the pending loot (the engine moves the trip on after the last pick). */
export function takeOffer(save: SaveData, index: number): SaveData {
  return { ...save, trip: pickLoot(tripOf(save), index) };
}

/**
 * Leaves a quiet doorway: the draft's lattices become the profile's (the collection and the rest of
 * the profile are untouched) and the charges carry over by rune type. Throws if the loadout isn't ready.
 */
export function leaveDoorway(save: SaveData, draft: Profile): SaveData {
  const r = applyDoorway(save.profile, tripOf(save), draft.lattices);
  return { ...save, profile: r.profile, trip: r.trip };
}

export function pushOnward(save: SaveData): SaveData {
  return { ...save, trip: pushOn(tripOf(save)) };
}

/** Back to the study with the loot banked. */
export function goHome(save: SaveData): SaveData {
  return { ...save, profile: returnHome(save.profile, tripOf(save)), trip: null };
}

/**
 * Interactions in `events` that deserve a "New in the notebook" toast: not in the notebook yet and
 * not already toasted this trip.
 */
export function newDiscoveries(
  events: readonly GameEvent[],
  known: readonly InteractionId[],
  toasted: readonly InteractionId[],
): InteractionId[] {
  return discoveriesIn(events).filter((d) => !known.includes(d) && !toasted.includes(d));
}
