import { newSave, parseSaveData, type SaveData } from '$engine';

export interface SaveEnvelope<T = unknown> {
  version: number;
  data: T;
}

/** migrations[n] upgrades data from version n to n+1. */
export type Migration = (data: unknown) => unknown;

export const migrations: Migration[] = [];

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

export function saveToStorage(data: unknown): void {
  localStorage.setItem(SAVE_KEY, serialize(data));
}

export function loadFromStorage(): SaveEnvelope | null {
  const text = localStorage.getItem(SAVE_KEY);
  return text === null ? null : parse(text);
}

/** Ask iOS/browsers not to evict our storage. Best-effort. */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // not available; text export is the backup
  }
}
