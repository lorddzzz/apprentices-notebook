import { expect, test } from 'vitest';
import { isDevEnabled, memoryPrefsBackend, PREFS_KEY, parseMotion } from '../../src/app/prefs';
import { createPrefs, type MediaQuery } from '../../src/app/prefs.svelte';
import { SAVE_KEY } from '../../src/app/save';

function fakeMedia(matches: boolean): MediaQuery & { set(next: boolean): void } {
  let listener: ((e: { matches: boolean }) => void) | null = null;
  const media = {
    matches,
    addEventListener: (_type: 'change', fn: (e: { matches: boolean }) => void) => {
      listener = fn;
    },
    set(next: boolean) {
      media.matches = next;
      listener?.({ matches: next });
    },
  };
  return media;
}

test('prefs: defaults normal', () => {
  const p = createPrefs({ backend: memoryPrefsBackend() });
  expect(p.prefs.motion).toBe('normal');
  expect(p.motionScale()).toBe(1);
});

test('prefs: quick scales to 0.5', () => {
  const scales: number[] = [];
  const p = createPrefs({ backend: memoryPrefsBackend(), apply: (s) => scales.push(s) });
  p.prefs.motion = 'quick';
  expect(p.motionScale()).toBe(0.5);
  expect(scales).toEqual([1, 0.5]);
});

test('prefs: persists under its own key, not the save', () => {
  const backend = memoryPrefsBackend();
  const p = createPrefs({ backend });
  p.prefs.motion = 'quick';
  expect(PREFS_KEY).toBe('apprentices-notebook:prefs');
  expect(PREFS_KEY).not.toBe(SAVE_KEY);
  expect(backend.keys()).toEqual([PREFS_KEY]);
  // A new session on the same device reads it back.
  expect(createPrefs({ backend }).prefs.motion).toBe('quick');
});

test('prefs: unreadable value falls back', () => {
  for (const raw of ['not json', '{"motion":"warp"}', '[]', 'null', '{"motion":3}', '']) {
    expect(parseMotion(raw)).toBe('normal');
    expect(createPrefs({ backend: memoryPrefsBackend(raw) }).prefs.motion).toBe('normal');
  }
  const throwing = {
    read: (): string | null => {
      throw new Error('blocked');
    },
    write: (): void => {
      throw new Error('blocked');
    },
  };
  const p = createPrefs({ backend: throwing });
  expect(p.prefs.motion).toBe('normal');
  p.prefs.motion = 'quick'; // storage blocked: still works for this session
  expect(p.motionScale()).toBe(0.5);
});

test('prefs: reduced-motion media forces cross-fades', () => {
  const media = fakeMedia(true);
  const p = createPrefs({ backend: memoryPrefsBackend(), media });
  expect(p.prefs.reduced).toBe(true);
  media.set(false);
  expect(p.prefs.reduced).toBe(false);
  media.set(true);
  expect(p.prefs.reduced).toBe(true);
  // It does not change the scale: the pref is about cross-fades only.
  expect(p.motionScale()).toBe(1);
  expect(createPrefs({ backend: memoryPrefsBackend() }).prefs.reduced).toBe(false);
});

test('dev: ?dev enables the Gallery, a plain release does not', () => {
  expect(isDevEnabled(false, '')).toBe(false);
  expect(isDevEnabled(false, '?other=1')).toBe(false);
  expect(isDevEnabled(false, '?dev')).toBe(true);
  expect(isDevEnabled(false, '?x=1&dev=1')).toBe(true);
  expect(isDevEnabled(true, '')).toBe(true);
});
