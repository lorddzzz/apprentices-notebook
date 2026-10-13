import type { InteractionId, MemberId } from '$data';
import type { Coord, LootItem, SaveData, Trip } from '$engine';
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
  | 'gallery';

const TRIP_SCREEN: Record<Trip['status'], Screen> = {
  fight: 'battle',
  looting: 'loot',
  crossroads: 'crossroads',
  cleared: 'cleared',
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
