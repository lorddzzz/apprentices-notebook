import { expect, test } from 'vitest';
import { grantBindEvent, knownSetOf, newProfile, newSave, parseSaveData } from '$engine';

test('a save lacking bindEvents infers the same events as before (P14)', () => {
  const save = newSave(1);
  const p = { ...save.profile, methods: ['bind' as const] };
  const { bindEvents: _drop, ...rest } = p;
  const raw = JSON.parse(JSON.stringify({ ...save, profile: rest }));
  const loaded = parseSaveData(raw);
  expect(loaded.profile.bindEvents).toEqual(['hit', 'enters']);
  expect(knownSetOf(loaded.profile).events).toEqual(['hit', 'enters']);
});

test('grantBindEvent adds one event, idempotently, and the Bench lists it', () => {
  const g = grantBindEvent({ ...newProfile(), methods: ['bind'] }, 'dies');
  expect(g.bindEvents).toEqual(['dies']);
  expect(grantBindEvent(g, 'dies')).toBe(g);
  expect(knownSetOf(g).events).toEqual(['hit', 'enters', 'dies']);
});
