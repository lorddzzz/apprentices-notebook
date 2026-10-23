import { afterEach, expect, test, vi } from 'vitest';
import { newSave } from '$engine';
import { setOut } from '../../src/app/flow';
import { GameStore } from '../../src/app/game.svelte';
import {
  CORRUPT_KEEP,
  loadSave,
  localBackend,
  memoryBackend,
  parseSaveText,
  readCorrupt,
  SAVE_KEY,
  saveText,
} from '../../src/app/save';
import { toasts } from '../../src/app/toasts.svelte';

// `startBattle` can be made to throw for the next N calls; otherwise it is the real one.
const replay = vi.hoisted(() => ({ failures: 0 }));

vi.mock('../../src/app/flow', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/app/flow')>();
  return {
    ...real,
    startBattle: (save: Parameters<typeof real.startBattle>[0]) => {
      if (replay.failures > 0) {
        replay.failures--;
        throw new Error('replay broke');
      }
      return real.startBattle(save);
    },
  };
});

function fakeStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  return store;
}

afterEach(() => {
  replay.failures = 0;
  vi.unstubAllGlobals();
});

// ── A fight that will not restart ──

test('a fight that fails to start twice returns the party home with a toast', () => {
  replay.failures = 2;
  const save = setOut(newSave(7));
  const backend = memoryBackend(saveText(save));
  const game = new GameStore(backend, () => 1);

  expect(() => game.ensureBattle()).not.toThrow();

  expect(game.battle).toBeNull();
  expect(game.save.trip).toBeNull();
  expect(game.save.lastTrip?.outcome).toBe('wiped');
  expect(game.save.profile).toEqual(save.profile);
  expect(toasts.items.at(-1)?.text).toMatch(/came home/);
  expect(parseSaveText(backend.read() ?? '').trip).toBeNull();

  // Nothing left to resume: calling again does not start another fight.
  game.ensureBattle();
  expect(game.battle).toBeNull();
});

test('a fight that fails once starts over instead of coming home', () => {
  replay.failures = 1;
  const save = setOut(newSave(7));
  const game = new GameStore(memoryBackend(saveText(save)), () => 1);

  game.ensureBattle();

  expect(game.save.trip?.status).toBe('fight');
  expect(game.save.trip?.actions).toEqual([]);
  expect(game.battle).not.toBeNull();
  expect(toasts.items.at(-1)?.text).toMatch(/starts over/);
  game.battle?.dispose();
});

// ── Corrupt save text is kept aside, three at most ──

test('memory backend keeps the last three corrupt texts, oldest dropped', () => {
  const backend = memoryBackend();
  for (const text of ['one', 'two', 'three', 'four']) {
    backend.write(text);
    loadSave(backend, 1);
  }
  expect(CORRUPT_KEEP).toBe(3);
  expect(backend.corruptTexts).toEqual(['two', 'three', 'four']);
  expect(backend.corrupt).toBe('four');
});

test('local backend stores up to three corrupt texts under the corrupt key', () => {
  const store = fakeStorage();
  const backend = localBackend();
  for (const text of ['a', 'b', 'c', 'd']) backend.keepCorrupt(text);

  expect(readCorrupt(store.get(`${SAVE_KEY}.corrupt`) ?? null)).toEqual(['b', 'c', 'd']);
  expect(store.has(SAVE_KEY)).toBe(false);
});

test('a raw corrupt text left by an older build counts as one kept text', () => {
  expect(readCorrupt(null)).toEqual([]);
  expect(readCorrupt('{"version":6}')).toEqual(['{"version":6}']);
  expect(readCorrupt('["x","y"]')).toEqual(['x', 'y']);

  const store = fakeStorage();
  store.set(`${SAVE_KEY}.corrupt`, 'old');
  localBackend().keepCorrupt('new');
  expect(JSON.parse(store.get(`${SAVE_KEY}.corrupt`) ?? '[]')).toEqual(['old', 'new']);
});
