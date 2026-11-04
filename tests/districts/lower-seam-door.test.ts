import { describe, expect, test } from 'vitest';
import type { DistrictId } from '$data';
import {
  type BattleState,
  beginEncounter,
  closeBattle,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  pushOn,
  returnHome,
  startTrip,
  type Trip,
} from '$engine';
import { LOWER_SEAM, markDoorSeen, ownerDoor } from '$engine/districts/lowerSeam';
import { DOOR_PLACEHOLDER, doorLine } from '$ui/districts/lowerSeam';

/**
 * SM-10: the sealed door (P11). `city.doorSeen` is set when the lowest floor's fight closes (win or
 * wipe); the door is hidden, then sealed, then open once the Cartographers' heart is cleared.
 */

/** A profile past the Marginalia with these districts open after the Seam. */
const city = (
  open: readonly DistrictId[],
  extra: Partial<Profile['city']> = {},
  hearts: readonly DistrictId[] = ['seam'],
): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: {
      ...p.city,
      heard: ['seam', ...open],
      open: ['seam', ...open],
      hearts: [...hearts],
      ...extra,
    },
  };
};
const TWO = city(['canals', 'inkQuarter']);
/** The fixture "cartographers cleared": their hall open with its heart cleared. */
const CLEARED = city(['canals', 'inkQuarter', 'cartographers'], { doorSeen: true }, [
  'seam',
  'cartographers',
]);

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
const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

/** Wins the current floor and takes every pick; returns the profile and trip after it. */
function clearFloor(p: Profile, t: Trip): { profile: Profile; trip: Trip } {
  const r = closeBattle(p, t, won(beginEncounter(p, t).state));
  let trip = r.trip ?? (null as never);
  while (trip.status === 'looting') trip = pickLoot(trip, 0);
  return { profile: r.profile, trip };
}

describe('the three door states', () => {
  test('hidden until the lowest floor is reached', () => {
    expect(ownerDoor(TWO)).toBe('hidden');
    expect(ownerDoor({ city: { ...TWO.city, hearts: ['seam', 'cartographers'] } })).toBe('hidden');
  });

  test('sealed once seen, until the Cartographers fall', () => {
    expect(ownerDoor({ city: { ...TWO.city, doorSeen: true } })).toBe('sealed');
  });

  test('open once seen and the Cartographers have been cleared', () => {
    expect(ownerDoor(CLEARED)).toBe('open');
  });
});

describe('reaching the lowest floor sets doorSeen', () => {
  test('a win on a floor above it does not', () => {
    const t = startTrip(TWO, 1, LOWER_SEAM);
    const r = closeBattle(TWO, t, won(beginEncounter(TWO, t).state));
    expect(r.profile.city.doorSeen).toBeUndefined();
    expect(ownerDoor(r.profile)).toBe('hidden');
  });

  test('a win on the lowest floor does, and the door is sealed', () => {
    let t = startTrip(TWO, 1, LOWER_SEAM);
    t = pushOn(clearFloor(TWO, t).trip);
    const r = closeBattle(TWO, t, won(beginEncounter(TWO, t).state));
    expect(r.profile.city.doorSeen).toBe(true);
    expect(ownerDoor(r.profile)).toBe('sealed');
    // Going home keeps it.
    let cleared = r.trip ?? (null as never);
    while (cleared.status === 'looting') cleared = pickLoot(cleared, 0);
    expect(returnHome(r.profile, cleared).city.doorSeen).toBe(true);
  });

  test('a wipe on the lowest floor does too', () => {
    let t = startTrip(TWO, 2, LOWER_SEAM);
    t = pushOn(clearFloor(TWO, t).trip);
    const r = closeBattle(TWO, t, lost(beginEncounter(TWO, t).state));
    expect(r.outcome).toBe('wiped');
    expect(r.profile.city.doorSeen).toBe(true);
  });

  test('a wipe above the lowest floor, and any other district, do not', () => {
    const t = startTrip(TWO, 3, LOWER_SEAM);
    expect(markDoorSeen(TWO, t)).toBe(TWO);
    const canals = startTrip(TWO, 3, 'canals');
    expect(markDoorSeen(TWO, canals)).toBe(TWO);
  });

  test('an open door stays open: marking again changes nothing', () => {
    const t = startTrip(CLEARED, 1, LOWER_SEAM);
    expect(markDoorSeen(CLEARED, t)).toBe(CLEARED);
  });
});

describe('the save', () => {
  test('doorSeen round-trips', () => {
    const save = { ...newSave(1), profile: city(['canals'], { doorSeen: true }) };
    expect(parseSaveData(json(save))).toEqual(save);
  });

  test('a save without it still loads, as never seen', () => {
    const save = { ...newSave(1), profile: city(['canals']) };
    expect(parseSaveData(json(save)).profile.city.doorSeen).toBeUndefined();
  });

  test('a door seen before the Marginalia fell, or not a boolean, is refused', () => {
    const early = { ...newSave(1), profile: city(['canals'], { doorSeen: true }, []) };
    expect(() => parseSaveData(json(early))).toThrow('Not a valid save');
    const odd = { ...newSave(1), profile: city(['canals'], { doorSeen: 'yes' as never }) };
    expect(() => parseSaveData(json(odd))).toThrow('Not a valid save');
  });
});

describe('the bottom Crossroads line', () => {
  const atBottom = (p: Profile): Trip => {
    let t = startTrip(p, 1, LOWER_SEAM);
    t = pushOn(clearFloor(p, t).trip);
    return clearFloor(p, t).trip;
  };

  test('hidden: no line, not even on the lowest floor', () => {
    const t = atBottom(TWO);
    expect(t.status).toBe('cleared');
    expect(doorLine(TWO, t)).toBeNull();
  });

  test('sealed: a line that cannot be taken', () => {
    const p = { ...TWO, city: { ...TWO.city, doorSeen: true } };
    const line = doorLine(p, atBottom(p));
    expect(line?.state).toBe('sealed');
    expect(line?.label).toBe('A sealed door');
    // It never names what keeps it shut.
    expect(`${line?.label} ${line?.sub}`).not.toMatch(/cartograph/i);
  });

  test('open: "Go through the door"', () => {
    expect(doorLine(CLEARED, atBottom(CLEARED))).toMatchObject({
      state: 'open',
      label: 'Go through the door',
    });
    expect(DOOR_PLACEHOLDER).toMatch(/not yet written/);
  });

  test('no line on a floor above the bottom, nor on another district', () => {
    const t = startTrip(CLEARED, 1, LOWER_SEAM);
    const aboveCleared = clearFloor(CLEARED, t).trip;
    expect(aboveCleared.encounter).toBe(0);
    expect(doorLine(CLEARED, aboveCleared)).toBeNull();
    expect(doorLine(CLEARED, startTrip(CLEARED, 1, 'canals'))).toBeNull();
  });
});
