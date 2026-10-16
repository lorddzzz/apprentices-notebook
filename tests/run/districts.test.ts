import { describe, expect, test } from 'vitest';
import { DISTRICT_IDS, DISTRICTS, ENCOUNTERS, encountersOf } from '$data';
import {
  createBattle,
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
      'shallow',
      'shallow',
      'deep',
      'deep',
      'heart',
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
