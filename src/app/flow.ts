import { type DistrictId, MEMBERS, type MemberId, TUNING } from '$data';
import type { PaperId } from '$data/districts/index';
import {
  type Action,
  type ActionResult,
  applyDoorway,
  type BattleState,
  beginEncounter,
  type Coord,
  closeBattle,
  clustersOf,
  type GameEvent,
  glyphLibrary,
  isGlyph,
  type LootItem,
  latticeOf,
  namedIn,
  nameOf,
  nextTripSeed,
  type Profile,
  pickLoot,
  placeOf,
  provenCount,
  pushOn,
  recordAction,
  returnHome,
  type SaveData,
  startTrip,
  type Trip,
  type TripRecap,
} from '$engine';
import { knockAtDoor, someoneJoined } from '$engine/recruits';
import { namedTitle } from './describe';
import { allMasks } from './faircopy';
import type { Route } from './routes';
import { parseSaveText, type SaveBackend, writeSave } from './save';
import { editProfile, type ShelfTool, type SocketDecision } from './study';

/** What a wipe leaves to read: the lost loot and what the notebook learned anyway. */
export interface WipeSummary {
  encounter: string;
  lost: LootItem[];
  learned: string[];
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
  | 'bench'
  | 'desk'
  | 'tripPage'
  | 'map'
  | 'threshold';

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
  lastTrip: TripRecap | null = null,
): { screen: Screen; redirect: Route | null } {
  if (route === 'codex' || route === 'lab' || route === 'gallery') {
    return { screen: route, redirect: null };
  }
  // The trip page reads the last finished trip; with none (or a trip under way) it is not a place to be.
  if (route === 'trip-page' && !trip && lastTrip) return { screen: 'tripPage', redirect: null };
  // The Bench is a room of the study: out on a trip (or with a wipe unread) it is closed.
  if (route === 'bench' && !trip && !wipe) return { screen: 'bench', redirect: null };
  // So is the footnote desk.
  if (route === 'desk' && !trip && !wipe) return { screen: 'desk', redirect: null };
  // The map hangs behind the study door, and the threshold rooms are reached from it (K-22).
  if (route === 'map' && !trip && !wipe) return { screen: 'map', redirect: null };
  if (route === 'threshold' && !trip && !wipe) return { screen: 'threshold', redirect: null };
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
  return settleAtDoor(parseSaveText(text.trim()));
}

/**
 * On load: a save at home gets the door arrival a homecoming would have written (recruitment P3).
 * Out on a trip (or a fresh notebook with no one ready) it comes back unchanged.
 */
export function settleAtDoor(save: SaveData): SaveData {
  if (save.trip) return save;
  const profile = knockAtDoor(save.profile);
  return profile === save.profile ? save : { ...save, profile };
}

// ── Trip reducers (pure; the GameStore persists after each) ──

/** The trip a save is on, or a readable error (a screen out of step with the save is a bug, not a crash). */
function tripOf(save: SaveData): Trip {
  if (!save.trip) throw new Error('The party is not out on a trip');
  return save.trip;
}

/** A fresh trip into an open district: advances the seed counter, full HP and charges. Throws if the loadout is not ready. */
export function setOut(save: SaveData, district: DistrictId = 'seam'): SaveData {
  if (save.trip) throw new Error('The party is already out');
  const { seed, save: next } = nextTripSeed(save);
  return { ...next, trip: startTrip(next.profile, seed, district), lastTrip: null };
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
  /** Named results (D7) this battle taught that the notebook did not have yet. */
  learned: string[];
  /** The room's paper when this win filed it for the first time (DK-12). */
  paper: PaperId | null;
}

/** Closes a finished battle: won → looting, wiped → trip gone, pending loot lost, discoveries kept. */
export function endBattle(
  save: SaveData,
  battle: BattleState,
  log: readonly GameEvent[] = [],
): BattleEnd {
  const trip = tripOf(save);
  const r = closeBattle(save.profile, trip, battle, log);
  const learned = namedIn(log).filter((d) => !save.profile.named.includes(d));
  const lastTrip: TripRecap | null =
    r.outcome === 'wiped'
      ? {
          district: trip.district,
          outcome: 'wiped',
          encounter: trip.encounter,
          place: placeOf(trip),
          stats: r.stats,
        }
      : save.lastTrip;
  // A wipe sends the party home: a door arrival may knock (recruitment P3).
  const profile = r.outcome === 'wiped' ? knockAtDoor(r.profile) : r.profile;
  const next: SaveData = { ...save, profile, trip: r.trip, lastTrip };
  const wipe: WipeSummary | null =
    r.outcome === 'wiped' ? { encounter: battle.title, lost: [...trip.loot], learned } : null;
  return { save: next, outcome: r.outcome, wipe, learned, paper: r.paper ?? null };
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

/** Back to the study with the loot banked; the trip's recap (with rumours heard on return) is kept for the trip page. */
export function goHome(save: SaveData): SaveData {
  const trip = tripOf(save);
  const banked = returnHome(save.profile, trip);
  // One newcomer per homecoming: no note on the evening a district recruit joined (P3).
  const profile = knockAtDoor(banked, someoneJoined(save.profile, banked));
  const rumours = profile.city.heard.filter((d) => !save.profile.city.heard.includes(d));
  const lastTrip: TripRecap = {
    district: trip.district,
    outcome: 'returned',
    encounter: trip.encounter,
    place: placeOf(trip),
    stats: { ...trip.stats, heard: [...trip.stats.heard, ...rumours] },
  };
  return { ...save, profile, trip: null, lastTrip };
}

/**
 * Named results in `events` that deserve a "New in the notebook" toast: not in the notebook yet
 * and not already toasted this trip.
 */
export function newDiscoveries(
  events: readonly GameEvent[],
  known: readonly string[],
  toasted: readonly string[],
): string[] {
  return namedIn(events).filter((d) => !known.includes(d) && !toasted.includes(d));
}

// ── The trip page (plan S17) ──

export interface Highlight {
  kind: 'discovery' | 'chain' | 'proof';
  title: string;
  text: string;
}

/** The pattern closest to proof: a cluster seen in 3 or more casts but fewer than a proof takes. */
export function nearProof(p: Profile): { member: MemberId; runes: string[]; casts: number } | null {
  const masks = allMasks(p);
  const lib = glyphLibrary(p);
  let best: { member: MemberId; runes: string[]; casts: number; size: number } | null = null;
  for (const m of p.household.members) {
    const lattice = latticeOf(p, m);
    for (const c of clustersOf(lattice, lib)) {
      if (c.cells.length < 2) continue;
      const casts = provenCount(lattice, c, masks);
      if (casts < 3 || casts >= TUNING.provenCasts) continue;
      if (best && (casts < best.casts || (casts === best.casts && c.cells.length <= best.size))) {
        continue;
      }
      const runes = c.cells.flatMap((at) => {
        const placed = lattice.runes.find((r) => r.at.x === at.x && r.at.y === at.y);
        return placed && !isGlyph(placed) ? [nameOf(placed.rune)] : [];
      });
      best = { member: m, runes, casts, size: c.cells.length };
    }
  }
  return best;
}

/** Up to three things to remember a trip by, in order: a discovery, the biggest chain, a pattern nearly proven. */
export function tripHighlights(recap: TripRecap, profile: Profile): Highlight[] {
  const out: Highlight[] = [];
  const first = recap.stats.discoveries[0];
  if (first) {
    out.push({
      kind: 'discovery',
      title: 'A first for the notebook',
      text: `${namedTitle(first)} was seen for the first time.`,
    });
  }
  const chain = recap.stats.biggestChain;
  if (chain && chain.reactions >= 3) {
    out.push({
      kind: 'chain',
      title: 'The biggest chain',
      text: `${MEMBERS[chain.member].name}'s ${chain.name} set off ${chain.reactions} reactions in one cast.`,
    });
  }
  const near = nearProof(profile);
  if (near) {
    out.push({
      kind: 'proof',
      title: 'Nearly proven',
      text: `${near.runes.join(' \u2192 ')} on ${MEMBERS[near.member].name}'s page: ${near.casts} of ${TUNING.provenCasts} casts.`,
    });
  }
  return out;
}
