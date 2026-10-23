import {
  assertImportText,
  newSave,
  parseSaveData,
  ResourceLimitError,
  type SaveData,
} from '$engine';
import { parseLegacyV7 } from '$engine/legacyV7';

export interface SaveEnvelope<T = unknown> {
  version: number;
  data: T;
}

/** v8 adds signed growing pages. v7 has an explicit identity-preserving decoder. */
export const CURRENT_VERSION = 8;

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
  assertImportText(text);
  const raw: unknown = JSON.parse(text);
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !Number.isSafeInteger((raw as SaveEnvelope).version) ||
    !('data' in raw)
  ) {
    throw new Error('Not a valid save');
  }
  const env = raw as SaveEnvelope;
  if (env.version < 7) throw new OlderEditionError();
  if (env.version > CURRENT_VERSION) throw new Error('Save is from a newer version');
  return env;
}

/** Where save text lives. Injected so logic is testable without a DOM. */
export interface SaveBackend {
  read(): string | null;
  write(text: string): void;
  /** Keeps unreadable save text somewhere safe before it is replaced (the last `CORRUPT_KEEP`). */
  keepCorrupt(text: string): void;
}

/** How many unreadable save texts are kept aside; the oldest is dropped first. */
export const CORRUPT_KEEP = 3;

/** The kept texts with `text` added as the newest (oldest first, at most `CORRUPT_KEEP`). */
export function addCorrupt(kept: readonly string[], text: string): string[] {
  return [...kept, text].slice(-CORRUPT_KEEP);
}

/** The list stored under the corrupt key. A single raw text from an older build counts as one entry. */
export function readCorrupt(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (Array.isArray(list) && list.every((t) => typeof t === 'string'))
      return list.slice(-CORRUPT_KEEP);
  } catch {
    // not a list: a raw text from an older build
  }
  return [raw];
}

export function localBackend(key = SAVE_KEY): SaveBackend {
  const corruptKey = `${key}.corrupt`;
  return {
    read: () => localStorage.getItem(key),
    write: (text) => localStorage.setItem(key, text),
    keepCorrupt: (text) => {
      const kept = readCorrupt(localStorage.getItem(corruptKey));
      localStorage.setItem(corruptKey, JSON.stringify(addCorrupt(kept, text)));
    },
  };
}

export interface MemoryBackend extends SaveBackend {
  /** The last corrupt text kept, for tests. */
  corrupt: string | null;
  /** Every kept corrupt text, oldest first, for tests. */
  corruptTexts: string[];
}

export function memoryBackend(initial: string | null = null): MemoryBackend {
  let text = initial;
  const backend: MemoryBackend = {
    corrupt: null,
    corruptTexts: [],
    read: () => text,
    write: (t) => {
      text = t;
    },
    keepCorrupt: (t) => {
      backend.corrupt = t;
      backend.corruptTexts = addCorrupt(backend.corruptTexts, t);
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
  return env.version === 7 ? parseLegacyV7(env.data) : parseSaveData(env.data);
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
  /** Supported data exceeded an input resource limit. Keep it in place and block ordinary writes. */
  refused?: { message: string; text: string };
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
    if (e instanceof ResourceLimitError)
      return {
        save: newSave(now),
        recovered: false,
        older: false,
        refused: { message: e.message, text },
      };
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
