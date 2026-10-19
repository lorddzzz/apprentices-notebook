import { describe, expect, test } from 'vitest';
import { DISTRICT_IDS, DISTRICTS, ENCOUNTERS, encountersOf } from '$data';
import {
  createBattle,
  districtState,
  type EventLog,
  hearAfterTrip,
  hearFromBattle,
  namedIn,
  newProfile,
  parseBoard,
  serializeBoard,
  startTrip,
  variantFor,
} from '$engine';

describe('districts (K-1, K-2)', () => {
  test('the Seam is ENCOUNTERS, unchanged', () => {
    expect(encountersOf('seam')).toBe(ENCOUNTERS);
  });

  test('every district room and threshold board parses and round-trips', () => {
    for (const d of DISTRICT_IDS) {
      for (const enc of encountersOf(d)) {
        for (const v of enc.variants) {
          const spec = parseBoard(v.layout);
          expect(parseBoard(serializeBoard(spec)), v.name).toEqual(spec);
          expect(() => createBattle({ title: v.name, board: v.layout, seed: 1 })).not.toThrow();
        }
      }
      const gate = DISTRICTS[d].gate;
      if (gate.kind === 'threshold') expect(() => parseBoard(gate.room.board)).not.toThrow();
    }
  });

  test('the canals have five rooms, landings after 1, 3 and the heart', () => {
    const canals = DISTRICTS.canals;
    expect(canals.encounters.map((e) => e.loot)).toEqual([
      'canalShallow',
      'canalShallow',
      'canalDeep',
      'canalDeep',
      'canalHeart',
    ]);
    expect(canals.encounters.at(-1)?.heart).toBe(true);
    expect(canals.landings).toEqual([0, 2, 4]);
  });

  test('a trip belongs to a district; closed districts refuse', () => {
    const p = newProfile();
    expect(startTrip(p, 3).district).toBe('seam');
    expect(() => startTrip(p, 3, 'canals')).toThrow('not open');
    const open = { ...p, city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] } };
    const t = startTrip(open as typeof p, 3, 'canals');
    expect(t.district).toBe('canals');
    expect(variantFor(t, 0)).toBeLessThan(3);
  });
});

describe('the city this build (P2, P3)', () => {
  test('the Seam and the canals have walls at the edge; every district states its edge', () => {
    expect(DISTRICTS.seam.edge).toBe('wall');
    expect(DISTRICTS.canals.edge).toBe('wall');
    for (const d of DISTRICT_IDS) expect(['wall', 'drop']).toContain(DISTRICTS[d].edge);
  });

  test('the five other districts are heard of, barred and have no rooms', () => {
    const drawn = DISTRICT_IDS.filter((d) => d !== 'seam' && d !== 'canals');
    expect(drawn).toHaveLength(5);
    for (const d of drawn) {
      const def = DISTRICTS[d];
      expect(def.gate.kind, d).toBe('drawing');
      expect(def.encounters, d).toEqual([]);
      expect(def.hear.length, d).toBeGreaterThan(0);
      expect(def.barred, d).not.toBe('');
    }
  });

  test('a drawn district is heard from its named result or its rumour, and never opens', () => {
    const p = newProfile();
    const t = startTrip(p, 1);
    const log: EventLog = [{ type: 'named', what: 'compound', id: 'greaseFog' }];
    const heard = hearFromBattle({ ...p, named: namedIn(log) }, t, log);
    expect(heard.heard).toEqual(['bathhouses']);
    expect(heard.profile.city.open).toEqual(['seam']);
    expect(districtState(heard.profile, 'bathhouses')).toBe('heard');
    let q = p;
    for (let i = 0; i < 3; i++) q = hearAfterTrip(q, t, 'returned').profile;
    expect(q.city.heard).toContain('inkQuarter');
    expect(q.city.open).toEqual(['seam']);
    expect(() => startTrip(q, 1, 'inkQuarter')).toThrow('not open');
  });

  test('the canals are still heard from a 3-tile fire in the Seam', () => {
    expect(DISTRICTS.canals.hear[0]).toMatchObject({
      kind: 'burst',
      burst: 'fire',
      atLeast: 3,
      district: 'seam',
    });
  });
});
