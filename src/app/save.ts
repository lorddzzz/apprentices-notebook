import { newSave, parseSaveData, type SaveData } from '$engine';

export interface SaveEnvelope<T = unknown> {
  version: number;
  data: T;
}

/** The save format (P1): version 7. No migrations; an older save starts a fresh notebook. */
export const CURRENT_VERSION = 7;

export const SAVE_KEY = 'apprentices-notebook:save';

/** What the player reads when a save from before the rune redesign turns up. */
export const OLDER_EDITION = 'This notebook is from an older edition';

/** A save from an earlier edition of the game: it cannot be read, and is kept aside. */
export class OlderEditionError extends Error {
  constructor() {
    super(OLDER_EDITION);
    this.name = 'OlderEditionError';
  }
}

export function serialize(data: unknown, version = CURRENT_VERSION): string {
  return JSON.stringify({ version, data } satisfies SaveEnvelope);
}

/**
 * Text form used for export/import and localStorage. Throws "Not a valid save", "Save is from a
 * newer version", or `OlderEditionError` for anything before version 7.
 */
export function parse(text: string): SaveEnvelope {
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
  if (env.version < CURRENT_VERSION) throw new OlderEditionError();
  if (env.version > CURRENT_VERSION) throw new Error('Save is from a newer version');
  return env;
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

/** Save text → validated SaveData. Throws "Not a valid save" / "Save is from a newer version" / the older-edition notice. */
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

export interface Loaded {
  save: SaveData;
  /** The stored text could not be used and was replaced by a new game (the old text is kept aside). */
  recovered: boolean;
  /** Why, when it is because the notebook is from before this edition (P1). */
  older: boolean;
}

/**
 * The save from the backend. Nothing there → a new game. Unusable text (an older edition, or
 * unreadable) → a new game too, but the old text is copied to the backend's corrupt slot first.
 * `now` seeds new games.
 */
export function loadSave(backend: SaveBackend, now: number): Loaded {
  let text: string | null = null;
  try {
    text = backend.read();
  } catch {
    // storage blocked: play without a save
  }
  if (text === null) return { save: newSave(now), recovered: false, older: false };
  try {
    return { save: parseSaveText(text), recovered: false, older: false };
  } catch (e) {
    try {
      backend.keepCorrupt(text);
    } catch {
      // nothing more to do
    }
    return { save: newSave(now), recovered: true, older: e instanceof OlderEditionError };
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
