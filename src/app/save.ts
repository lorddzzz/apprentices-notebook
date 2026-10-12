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
}

export function localBackend(key = SAVE_KEY): SaveBackend {
  return {
    read: () => localStorage.getItem(key),
    write: (text) => localStorage.setItem(key, text),
  };
}

export function memoryBackend(initial: string | null = null): SaveBackend {
  let text = initial;
  return {
    read: () => text,
    write: (t) => {
      text = t;
    },
  };
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
