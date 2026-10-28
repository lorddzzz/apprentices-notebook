import { describe, expect, it } from 'vitest';
import type { DistrictId } from '$data';
import { encountersOf } from '$data/districts';
import type { IntrusionSpec } from '$data/districts/index';
import { MARGINALIA, SEAM_DEEP_ROOMS } from '$data/districts/seam';
import { newProfile, type Profile } from '$engine';
import { checkFloor, floorsFor, lowerSeamOpen, ownerDoor } from '$engine/districts/lowerSeam';
import { MARGINALIA_STEPS, noteFor } from '$engine/districts/seam';

const LANE = [
  '. . . . wv . .',
  'P . r . wv . .',
  'P . . . wv . b',
  'P . . . wv . .',
  'P . . . wv . .',
  'P . . . wv . .',
  '. . . . wv . .',
].join('\n');
const canalFloor = (rooms: [string, string, string] = [LANE, LANE, LANE]): IntrusionSpec => ({
  district: 'canals',
  pieces: [],
  rules: ['canals:current'],
  rooms,
  loot: 'basics',
});

const withCity = (patch: Partial<Profile['city']> & { doorSeen?: boolean }): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, ...patch } };
};

describe('SM-0 lower Seam contracts', () => {
  it('accepts a canal lane floor', () => {
    expect(checkFloor(canalFloor())).toEqual([]);
  });

  it('rejects unknown rules, district foes, small boards and bare floors', () => {
    const bare = LANE.replaceAll('wv', '.');
    const eel = LANE.replace(' b', ' e');
    const small = LANE.split('\n').slice(0, 6).join('\n');
    const problems = checkFloor({
      ...canalFloor([bare, eel, small]),
      rules: ['canals:current', 'canals:nope'],
    });
    expect(problems.map((p) => p.layout)).toEqual([null, 0, 1, 2]);
    expect(problems[1]?.message).toMatch(/intrusion/);
    expect(problems[2]?.message).toMatch(/Seam foes only/);
    expect(problems[3]?.message).toMatch(/tall/);
  });

  it('lists floors by opening order, only districts with an intrusion, never Seam or Cartographers', () => {
    const open: DistrictId[] = ['seam', 'bathhouses', 'cartographers', 'canals'];
    const kit = { bathhouses: {}, canals: { intrusion: canalFloor() }, cartographers: {} };
    expect(floorsFor(withCity({ open }), kit)).toEqual(['canals']);
    expect(floorsFor(newProfile())).toEqual([]);
  });

  it('opens below the Seam once its heart has fallen', () => {
    expect(lowerSeamOpen(newProfile())).toBe(false);
    expect(lowerSeamOpen(withCity({ hearts: ['seam'] }))).toBe(true);
  });

  it('derives the door: hidden, sealed, open', () => {
    expect(ownerDoor(newProfile())).toBe('hidden');
    expect(ownerDoor(withCity({ hearts: ['cartographers'] }))).toBe('hidden');
    expect(ownerDoor(withCity({ doorSeen: true }))).toBe('sealed');
    expect(ownerDoor(withCity({ doorSeen: true, hearts: ['cartographers'] }))).toBe('open');
  });
});

describe('SM-0 Seam contracts', () => {
  it('names the five hands in cycle order', () => {
    expect(MARGINALIA_STEPS).toEqual([
      'seam:write:ink',
      'seam:write:oil',
      'seam:write:steam',
      'seam:write:brass',
      'seam:write:spark',
    ]);
    expect(MARGINALIA.id.startsWith('seam:')).toBe(true);
  });

  it('keeps the deep-room ids RC names', () => {
    const ids = encountersOf('seam').map((e) => e.id);
    for (const id of SEAM_DEEP_ROOMS) expect(ids).toContain(id);
  });

  it('shows the first note until the margins answer', () => {
    expect(noteFor(newProfile(), 'rune:bolt')).toEqual({
      text: expect.any(String),
      answered: false,
    });
    expect(() => noteFor(newProfile(), 'rune:nope')).toThrow();
  });
});
