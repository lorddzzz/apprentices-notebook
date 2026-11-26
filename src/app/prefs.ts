/** Device preferences, pure parts (UF-P9). They live on the device, never in the save (D7). */

export type Motion = 'normal' | 'quick';

export const PREFS_KEY = 'apprentices-notebook:prefs';

export const MOTIONS: readonly Motion[] = ['normal', 'quick'];

/** The one multiplier for every duration: 1 for normal, 0.5 for quick. */
export function motionScaleOf(motion: Motion): number {
  return motion === 'quick' ? 0.5 : 1;
}

/** The stored text → the motion pref; anything unreadable is the default. */
export function parseMotion(raw: string | null): Motion {
  if (raw === null) return 'normal';
  try {
    const value: unknown = JSON.parse(raw);
    const motion = (value as { motion?: unknown } | null)?.motion;
    return motion === 'quick' ? 'quick' : 'normal';
  } catch {
    return 'normal';
  }
}

export function serializePrefs(motion: Motion): string {
  return JSON.stringify({ motion });
}

/** Where the prefs text lives. Injected so logic is testable without a DOM. */
export interface PrefsBackend {
  read(): string | null;
  write(text: string): void;
}

export function localPrefsBackend(key = PREFS_KEY): PrefsBackend {
  return {
    read: () => localStorage.getItem(key),
    write: (text) => localStorage.setItem(key, text),
  };
}

export interface MemoryPrefsBackend extends PrefsBackend {
  /** The storage keys written so far, for tests. */
  keys(): string[];
}

export function memoryPrefsBackend(initial: string | null = null): MemoryPrefsBackend {
  let text = initial;
  let written = false;
  return {
    read: () => text,
    write: (t) => {
      text = t;
      written = true;
    },
    keys: () => (written ? [PREFS_KEY] : []),
  };
}

/** The Gallery (and other dev pages) show in a dev build or with `?dev` in the URL. */
export function isDevEnabled(isDevBuild: boolean, search: string): boolean {
  return isDevBuild || new URLSearchParams(search).has('dev');
}
