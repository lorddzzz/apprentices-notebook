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

test('the current save version is 8', () => {
  expect(CURRENT_VERSION).toBe(8);
  expect(JSON.parse(saveText(newSave(1))).version).toBe(8);
});

test('round-trips through text', () => {
  const text = serialize({ name: 'a' });
  expect(parse(text)).toEqual({ version: 8, data: { name: 'a' } });
});

test('rejects garbage and saves from the future', () => {
  expect(() => parse('{"nope":1}')).toThrow('Not a valid save');
  expect(() => parse(serialize({}, 9))).toThrow(/newer/);
  expect(() => parseSaveText('hello')).toThrow('Not a valid save');
  expect(() => parseSaveText(serialize({ profile: 1 }))).toThrow('Not a valid save');
});

test('pre-v7 saves retain the older-edition notice', () => {
  expect(OLDER_EDITION).toBe('This notebook is from an older edition');
  for (const version of [0, 1, 4, 6]) {
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

test('loadSave: unreadable text is kept aside too, but is not blamed on an older edition', () => {
  const b = memoryBackend('{"version":7,"data":{"profile":42}}');
  const r = loadSave(b, 4);
  expect(r.recovered).toBe(true);
  expect(r.older).toBe(false);
  expect(b.corrupt).toBe('{"version":7,"data":{"profile":42}}');
});
