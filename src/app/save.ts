import { emptyStats, newSave, parseSaveData, type SaveData } from '$engine';

export interface SaveEnvelope<T = unknown> {
  version: number;
  data: T;
}

/** migrations[n] upgrades data from version n to n+1. */
export type Migration = (data: unknown) => unknown;

const ROUND_ROBIN = ['gallnut', 'pitch', 'cinder'] as const;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Hands out solvent ids Gallnut → Pitch → Cinder → Gallnut …, continuing across calls. */
function roundRobin(): () => (typeof ROUND_ROBIN)[number] {
  let n = 0;
  return () => ROUND_ROBIN[n++ % ROUND_ROBIN.length] ?? 'gallnut';
}

function migrateResearch(data: unknown): unknown {
  if (!isObject(data) || !isObject(data.profile)) return data;
  const next = roundRobin();
  const { research, ...profile } = data.profile;
  const solvents = { gallnut: 0, pitch: 0, cinder: 0 };
  const points = typeof research === 'number' && Number.isInteger(research) ? research : 0;
  for (let i = 0; i < points; i++) solvents[next()] += 1;
  const asSolvent = (item: unknown): unknown[] => {
    if (!isObject(item) || item.kind !== 'research') return [item];
    const amount =
      typeof item.amount === 'number' && Number.isInteger(item.amount) ? item.amount : 0;
    return Array.from({ length: amount }, () => ({ kind: 'solvent', solvent: next() }));
  };
  const trip = isObject(data.trip)
    ? {
        ...data.trip,
        loot: Array.isArray(data.trip.loot) ? data.trip.loot.flatMap(asSolvent) : data.trip.loot,
        offers: Array.isArray(data.trip.offers)
          ? data.trip.offers.flatMap(asSolvent)
          : data.trip.offers,
      }
    : data.trip;
  return {
    ...data,
    profile: {
      ...profile,
      solvents,
      vellum: 0,
      bench: { trials: [], known: [] },
      glyphs: [],
      proof: { draughtsman: [], stoker: [] },
      idioms: [],
    },
    trip,
  };
}

function migrateStats(data: unknown): unknown {
  if (!isObject(data)) return data;
  const trip = isObject(data.trip) ? { ...data.trip, stats: emptyStats() } : data.trip;
  return { ...data, trip, lastTrip: null };
}

const asList = (v: unknown, f: (x: unknown) => unknown): unknown =>
  Array.isArray(v) ? v.map(f) : v;

/** Plain-spell tallies gain their last-trip cells, the stats their tier-ups (M15, M16). */
function masteryStats(stats: unknown): unknown {
  if (!isObject(stats)) return stats;
  const tally = (t: unknown) => (isObject(t) ? { ...t, cells: [], fired: [] } : t);
  return { ...stats, spells: asList(stats.spells, tally), elegance: [] };
}

function migrateMastery(data: unknown): unknown {
  if (!isObject(data)) return data;
  const glyph = (g: unknown) =>
    isObject(g) ? { ...g, version: 1, params: [], extraExit: null } : g;
  const profile = isObject(data.profile)
    ? {
        ...data.profile,
        glyphs: asList(data.profile.glyphs, glyph),
        glyphArchive: [],
        glyphRecords: {},
        drafts: [],
      }
    : data.profile;
  const withStats = (v: unknown) => (isObject(v) ? { ...v, stats: masteryStats(v.stats) } : v);
  return { ...data, profile, trip: withStats(data.trip), lastTrip: withStats(data.lastTrip) };
}

/** Every save so far is Seam-only (K-5): trips and recaps belong to the Seam, the city is the Seam. */
function migrateCity(data: unknown): unknown {
  if (!isObject(data)) return data;
  const seam = (v: unknown) =>
    isObject(v)
      ? { ...v, district: 'seam', stats: isObject(v.stats) ? { ...v.stats, heard: [] } : v.stats }
      : v;
  const profile = isObject(data.profile)
    ? {
        ...data.profile,
        city: { heard: ['seam'], open: ['seam'], hearts: [], solved: [], trips: 0, fresh: [] },
      }
    : data.profile;
  return { ...data, profile, trip: seam(data.trip), lastTrip: seam(data.lastTrip) };
}

export const migrations: Migration[] = [
  // 0 → 1: the trip records the current fight's actions.
  (data) => {
    if (typeof data !== 'object' || data === null) return data;
    const save = data as { trip?: unknown };
    if (typeof save.trip !== 'object' || save.trip === null) return data;
    return { ...save, trip: { ...save.trip, actions: [] } };
  },
  // 1 → 2: each research point becomes one solvent (Gallnut → Pitch → Cinder round-robin).
  migrateResearch,
  // 2 → 3: a live trip starts keeping stats (empty so far); no trip page to show yet.
  migrateStats,
  // 3 → 4: Glyph versions, parameters and extra exits; records, the archive and drafts (M37).
  migrateMastery,
  // 4 → 5: districts and the city (K-5).
  migrateCity,
];

export const CURRENT_VERSION = migrations.length;

export const SAVE_KEY = 'apprentices-notebook:save';

export function migrate(env: SaveEnvelope, steps: readonly Migration[] = migrations): SaveEnvelope {
  let { version, data } = env;
  while (version < steps.length) {
    data = (steps[version] as Migration)(data);
    version++;
  }
  return { version, data };
}

export function serialize(data: unknown, version = CURRENT_VERSION): string {
  return JSON.stringify({ version, data } satisfies SaveEnvelope);
}

/** Text form used for export/import and localStorage. Throws on malformed input. */
export function parse(text: string, steps: readonly Migration[] = migrations): SaveEnvelope {
  const raw: unknown = JSON.parse(text);
  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof (raw as SaveEnvelope).version !== 'number' ||
    !('data' in raw)
  ) {
    throw new Error('Not a valid save');
  }
  const env = raw as SaveEnvelope;
  if (env.version > steps.length) throw new Error('Save is from a newer version');
  return migrate(env, steps);
}

/** Where save text lives. Injected so logic is testable without a DOM. */
export interface SaveBackend {
  read(): string | null;
  write(text: string): void;
  /** Keeps unreadable save text somewhere safe before it is replaced (`<key>.corrupt`). */
  keepCorrupt(text: string): void;
}

export function localBackend(key = SAVE_KEY): SaveBackend {
  return {
    read: () => localStorage.getItem(key),
    write: (text) => localStorage.setItem(key, text),
    keepCorrupt: (text) => localStorage.setItem(`${key}.corrupt`, text),
  };
}

export interface MemoryBackend extends SaveBackend {
  /** The last corrupt text kept, for tests. */
  corrupt: string | null;
}

export function memoryBackend(initial: string | null = null): MemoryBackend {
  let text = initial;
  const backend: MemoryBackend = {
    corrupt: null,
    read: () => text,
    write: (t) => {
      text = t;
    },
    keepCorrupt: (t) => {
      backend.corrupt = t;
    },
  };
  return backend;
}

/** Save text → validated SaveData (migrated). Throws "Not a valid save" / "Save is from a newer version". */
export function parseSaveText(text: string): SaveData {
  let env: SaveEnvelope;
  try {
    env = parse(text);
  } catch (e) {
    throw e instanceof SyntaxError ? new Error('Not a valid save') : e;
  }
  return parseSaveData(env.data);
}

export function saveText(save: SaveData): string {
  return serialize(save);
}

/**
 * The save from the backend. Nothing there → a new game. Unreadable text → a new game too, but the
 * old text is copied to the backend's corrupt slot first (`recovered: true`). `now` seeds new games.
 */
export function loadSave(
  backend: SaveBackend,
  now: number,
): { save: SaveData; recovered: boolean } {
  let text: string | null = null;
  try {
    text = backend.read();
  } catch {
    // storage blocked: play without a save
  }
  if (text === null) return { save: newSave(now), recovered: false };
  try {
    return { save: parseSaveText(text), recovered: false };
  } catch {
    try {
      backend.keepCorrupt(text);
    } catch {
      // nothing more to do
    }
    return { save: newSave(now), recovered: true };
  }
}

export function writeSave(backend: SaveBackend, save: SaveData): void {
  backend.write(saveText(save));
}

/** Ask iOS/browsers not to evict our storage. Best-effort. */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // not available; text export is the backup
  }
}
