import { describe, expect, test, vi } from 'vitest';
import type { DistrictId } from '$data';
import {
  type BattleState,
  beginEncounter,
  closeBattle,
  type GameEvent,
  hearFromBattle,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  pushOn,
  recordAction,
  returnCheck,
  returnHome,
  roomsOf,
  startTrip,
  type Trip,
} from '$engine';
import { LOWER_SEAM, tripFloors } from '$engine/districts/lowerSeam';
import { variantFor } from '$engine/trip/place';

/**
 * SM-7: the lower Seam's trip (P7, P8, P5). The canals and the ink quarter ship real intrusions;
 * the bathhouses get a fixture one here so a trip can have three floors.
 */
vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const lane = [
    '. . . . wv . .',
    'P . r . wv . .',
    'P . . . wv . b',
    'P . . . wv . .',
    'P . . . wv . .',
    'P . . . wv . .',
    '. . . . wv . .',
  ].join('\n');
  const intrusion = {
    district: 'bathhouses' as const,
    pieces: [],
    rules: ['canals:current'],
    rooms: [lane, lane, lane] as const,
    loot: 'basics' as const,
  };
  return {
    ...m,
    DISTRICT_KIT: {
      ...m.DISTRICT_KIT,
      bathhouses: { ...m.DISTRICT_KIT.bathhouses, intrusion },
    },
  };
});

/** A profile past the Marginalia with these districts open after the Seam. */
const below = (open: readonly DistrictId[], hearts: readonly DistrictId[] = ['seam']): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: ['seam', ...open], open: ['seam', ...open], hearts: [...hearts] },
  };
};
const ONE = below(['canals']);
const THREE = below(['canals', 'inkQuarter', 'bathhouses']);

function won(b: BattleState): BattleState {
  const s = structuredClone(b);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return s;
}
function lost(b: BattleState): BattleState {
  const s = structuredClone(b);
  s.phase = 'lost';
  for (const u of s.units) if (u.kind === 'member') u.hp = 0;
  return s;
}

/** Wins the current floor and takes every pick. */
function clearFloor(p: Profile, t: Trip): Trip {
  const r = closeBattle(p, t, won(beginEncounter(p, t).state));
  let trip = r.trip ?? (null as never);
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return trip;
}
/** A three-floor trip standing at the Crossroads after floor `i` (0-based). */
function clearedTo(i: number, seed = 5): Trip {
  let t = startTrip(THREE, seed, LOWER_SEAM);
  for (let f = 0; f < i; f++) t = pushOn(clearFloor(THREE, t));
  return clearFloor(THREE, t);
}

describe('starting a lower-Seam trip', () => {
  test('it stays shut until the Marginalia falls', () => {
    expect(() => startTrip(below(['canals'], []), 1, LOWER_SEAM)).toThrow(/not open/);
  });

  test('with no floor yet it is refused with the stair line (P8)', () => {
    expect(() => startTrip(below([]), 1, LOWER_SEAM)).toThrow(
      'Nothing below yet. The page waits for the city.',
    );
  });

  test('one floor: the canals, the lowest floor and so the last room', () => {
    const t = startTrip(ONE, 1, LOWER_SEAM);
    expect(tripFloors(t)).toEqual(['canals']);
    const rooms = roomsOf(t);
    expect(rooms).toHaveLength(1);
    expect(rooms[0]).toMatchObject({ id: 'lowerSeam:canals', heart: true, picks: 2 });
    expect(beginEncounter(ONE, t).state.phase).toBe('player');
  });

  test('three floors in opening order, fixed into trip state at the start', () => {
    const t = startTrip(THREE, 2, LOWER_SEAM);
    expect(tripFloors(t)).toEqual(['canals', 'inkQuarter', 'bathhouses']);
    expect(roomsOf(t).map((r) => r.heart)).toEqual([false, false, true]);
    // The city changing afterwards does not move the trip's floors.
    expect(tripFloors(t)).toEqual(tripFloors({ ...t }));
    const fewer = below(['canals']);
    expect(roomsOf(t)).toHaveLength(3);
    expect(() => beginEncounter(fewer, t)).not.toThrow();
    for (let i = 0; i < 3; i++) {
      const at = i === 0 ? t : pushOn(clearedTo(i - 1, 2));
      expect(beginEncounter(THREE, at).state.phase).toBe('player');
    }
  });

  test('each floor draws its layout with its own salt', () => {
    const seq = (floor: number) =>
      Array.from({ length: 40 }, (_, s) => variantFor(startTrip(THREE, s, LOWER_SEAM), floor));
    const [a, b, c] = [seq(0), seq(1), seq(2)];
    expect(a).not.toEqual(b);
    expect(b).not.toEqual(c);
    expect(a).not.toEqual(c);
  });
});

describe('a reload', () => {
  const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

  test('replays the same floor fight after a save round trip', () => {
    let t = pushOn(clearedTo(0, 9));
    t = recordAction(t, { type: 'endTurn' });
    const save = { ...newSave(1), profile: THREE, trip: t };
    const loaded = parseSaveData(json(save));
    expect(loaded).toEqual(save);
    const trip = loaded.trip ?? (null as never);
    expect(beginEncounter(loaded.profile, trip)).toEqual(beginEncounter(THREE, t));
  });

  test('a save naming a floor that is not one is refused', () => {
    const t = startTrip(THREE, 3, LOWER_SEAM);
    const kit = t.kit ?? (null as never);
    for (const floors of [[], ['seam'], ['canals', 'canals'], ['foundry']]) {
      const bad = {
        ...newSave(1),
        profile: THREE,
        trip: { ...t, kit: { ...kit, state: { floors } } },
      };
      expect(() => parseSaveData(json(bad)), JSON.stringify(floors)).toThrow('Not a valid save');
    }
  });
});

describe('going home', () => {
  test('free return after every floor', () => {
    for (let i = 0; i < 3; i++) {
      const t = clearedTo(i);
      expect(t.status).toBe(i === 2 ? 'cleared' : 'crossroads');
      expect(returnCheck(t).ok).toBe(true);
      const home = returnHome(THREE, t);
      expect(home.city.trips).toBe(THREE.city.trips + 1);
    }
  });

  test('clearing the lowest floor marks no heart', () => {
    const home = returnHome(THREE, clearedTo(2));
    expect(home.city.hearts).toEqual(['seam']);
    expect(home.city.open).not.toContain(LOWER_SEAM);
    expect(home.city.heard).not.toContain(LOWER_SEAM);
  });

  test('a wipe ends the trip and marks nothing', () => {
    const t = pushOn(clearedTo(0));
    const r = closeBattle(THREE, t, lost(beginEncounter(THREE, t).state));
    expect(r.outcome).toBe('wiped');
    expect(r.trip).toBeNull();
    expect(r.profile.city.hearts).toEqual(['seam']);
    expect(r.profile.city.trips).toBe(THREE.city.trips + 1);
  });
});

const rat = (n: number) => ({ id: `rat-${n}`, name: 'rat', at: { x: n, y: 0 }, member: false });

describe('hearing below (P5)', () => {
  test('a storm on three in a floor hears the bathhouses, as in the Seam', () => {
    const p = below(['canals']);
    const t = startTrip(p, 4, LOWER_SEAM);
    const by = t.party[0] ?? (null as never);
    const storm: GameEvent = {
      type: 'burst',
      burst: 'storm',
      at: { x: 0, y: 0 },
      tiles: [{ x: 0, y: 0 }],
      units: [rat(1), rat(2), rat(3)],
      origin: { caster: by, spell: 'a', cast: 1 },
    };
    expect(hearFromBattle(p, t, [storm]).heard).toEqual(['bathhouses']);
    // Scoped to the Seam: a canal trip does not count.
    const canal = startTrip(p, 4, 'canals');
    expect(hearFromBattle(p, canal, [storm]).heard).toEqual([]);
  });
});
