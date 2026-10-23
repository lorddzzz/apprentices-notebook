import { expect, test } from 'vitest';
import { newProfile, newSave, startTrip, validateLoadout } from '$engine';
import {
  CURRENT_VERSION,
  loadSave,
  memoryBackend,
  OLDER_EDITION,
  OlderEditionError,
  parse,
  parseSaveText,
  SAVE_KEY,
  saveText,
  serialize,
} from '../../src/app/save';

// ── The save format (P1) ──

test('the current save version is 9', () => {
  expect(CURRENT_VERSION).toBe(9);
  expect(JSON.parse(saveText(newSave(1))).version).toBe(9);
});

test('round-trips through text', () => {
  const text = serialize({ name: 'a' });
  expect(parse(text)).toEqual({ version: 9, data: { name: 'a' } });
});

test('rejects garbage and saves from the future', () => {
  expect(() => parse('{"nope":1}')).toThrow('Not a valid save');
  expect(() => parse(serialize({}, 10))).toThrow(/newer/);
  expect(() => parseSaveText('hello')).toThrow('Not a valid save');
  expect(() => parseSaveText(serialize({ profile: 1 }))).toThrow('Not a valid save');
});

test('every save before v9 takes the older-edition notice (HC P7)', () => {
  expect(OLDER_EDITION).toBe('This notebook is from an older edition');
  for (const version of [0, 1, 4, 6, 7, 8]) {
    expect(() => parse(serialize({}, version))).toThrow(OLDER_EDITION);
    expect(() => parseSaveText(serialize(newSave(1), version))).toThrow(OlderEditionError);
  }
});

test('a fresh notebook round-trips unchanged and is ready to set out with', () => {
  const save = newSave(11);
  expect(parseSaveText(saveText(save))).toEqual(save);
  expect(validateLoadout(save.profile)).toEqual({});
  expect(save.profile.known).toEqual(newProfile().known);
});

test('a save with a live trip round-trips', () => {
  const base = newSave(3);
  const save = { ...base, trip: startTrip(base.profile, 5) };
  expect(parseSaveText(saveText(save))).toEqual(save);
});

test('memoryBackend round-trips', () => {
  const b = memoryBackend();
  expect(b.read()).toBeNull();
  b.write('hello');
  expect(b.read()).toBe('hello');
  expect(memoryBackend('seed').read()).toBe('seed');
});

test('the local backend key is namespaced', () => {
  expect(SAVE_KEY).toBe('apprentices-notebook:save');
});

// ── loadSave: an older edition starts fresh ──

test('loadSave: a v6 notebook is kept aside and a fresh one begins', () => {
  const text = serialize({ profile: { collection: {} } }, 6);
  const b = memoryBackend(text);
  expect(loadSave(b, 4)).toEqual({ save: newSave(4), recovered: true, older: true });
  expect(b.corrupt).toBe(text);
});

test.each([7, 8])(
  'loadSave: a v%s notebook is cleared: notice, a fresh notebook, the old text kept aside',
  (version) => {
    // A v8-shaped save: per-member ink, no household. It is never migrated.
    const old = newSave(1) as unknown as { profile: Record<string, unknown> };
    const { household: _h, ink: _i, ...rest } = old.profile;
    const data = { ...old, profile: { ...rest, inkCapacity: { draughtsman: 8, stoker: 8 } } };
    const text = serialize(data, version);
    const kept = serialize({ older: 'kept' }, 6);
    const b = memoryBackend(text);
    b.corruptTexts = [kept];
    expect(loadSave(b, 4)).toEqual({ save: newSave(4), recovered: true, older: true });
    expect(b.corrupt).toBe(text);
    expect(b.corruptTexts).toEqual([kept, text]);
  },
);

test('loadSave: unreadable text is kept aside too, but is not blamed on an older edition', () => {
  const b = memoryBackend('{"version":9,"data":{"profile":42}}');
  const r = loadSave(b, 4);
  expect(r.recovered).toBe(true);
  expect(r.older).toBe(false);
  expect(b.corrupt).toBe('{"version":9,"data":{"profile":42}}');
});
