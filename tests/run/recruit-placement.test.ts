import { describe, expect, test } from 'vitest';
import { type DistrictId, encountersOf, type RuneId } from '$data';
import { DISTRICT_KIT } from '$data/districts/index';
import { newProfile, type Profile, rollOffers, startTrip, type Trip } from '$engine';
import { guaranteesFor, recruitOffers } from '$engine/recruits';
import { ownedBy } from '$engine/trip/offers';

/**
 * RC-5 (recruitment plan P8, city-and-districts §5b): the canals' real placement, read through
 * the districts' own data (no fixture kit). The runaway stands at the second landing (room 3,
 * index 2); Fuse is guaranteed in rooms 1-3.
 */

const SEED = 4242;
const LANDMARK = 2;
const runaway = { kind: 'recruit', apprentice: 'runaway' } as const;
const fusePage = { kind: 'rune', rune: 'fuse' } as const;

/** A notebook that has heard of the canals and seen them on the map (not `fresh`). */
const heardCanals = (...known: readonly RuneId[]): Profile => {
  const p = newProfile();
  return {
    ...p,
    known: [...new Set([...p.known, ...known])],
    city: { ...p.city, heard: ['seam', 'canals'], fresh: [] },
  };
};

const tripAt = (p: Profile, district: DistrictId, room: number, loot: Trip['loot'] = []): Trip => ({
  ...startTrip(p, SEED),
  district,
  encounter: room,
  loot,
});

/** The offers `finishEncounter` rolls in the trip's room through the real offer registry. */
function roll(p: Profile, t: Trip) {
  const table = encountersOf(t.district)[t.encounter]?.loot;
  if (!table) throw new Error('no room');
  return rollOffers(t.seed, t.encounter, table, t.party, null, ownedBy(p, t), {
    profile: p,
    trip: t,
  });
}

describe('the canals place the runaway (P8)', () => {
  test('she stands at the second landing, room 3', () => {
    const canals = DISTRICT_KIT.canals;
    expect(canals?.recruit).toEqual([{ apprentice: 'runaway', room: LANDMARK }]);
    const ret = canals?.ret;
    if (ret?.kind !== 'landings') throw new Error('the canals keep landings');
    expect(ret.after.indexOf(LANDMARK)).toBe(1);
    expect(encountersOf('canals').length).toBeGreaterThan(LANDMARK);
  });

  test('Fuse is guaranteed in rooms 1-3 while she waits for it, never in the heart', () => {
    const p = heardCanals();
    for (const room of [0, 1, 2]) {
      expect(guaranteesFor(p, tripAt(p, 'canals', room), room), `room ${room + 1}`).toEqual(
        fusePage,
      );
      expect(roll(p, tripAt(p, 'canals', room))[0], `room ${room + 1}`).toEqual(fusePage);
    }
    expect(guaranteesFor(p, tripAt(p, 'canals', 3), 3)).toBeNull();
  });

  test('nothing guaranteed once Fuse is known, in the trip loot, or she has joined', () => {
    const known = heardCanals('fuse');
    expect(guaranteesFor(known, tripAt(known, 'canals', 1), 1)).toBeNull();
    const p = heardCanals();
    expect(guaranteesFor(p, tripAt(p, 'canals', 2, [fusePage]), 2)).toBeNull();
    const joined = {
      ...p,
      household: { ...p.household, members: [...p.household.members, 'runaway' as const] },
    };
    expect(guaranteesFor(joined, tripAt(joined, 'canals', 1), 1)).toBeNull();
  });

  test('the same seed rolls the same canal offers', () => {
    const p = heardCanals();
    const t = tripAt(p, 'canals', 1);
    expect(roll(p, t)).toEqual(roll(p, t));
  });
});

describe('meeting her at room 3 (§0d, P2)', () => {
  test('Fuse and Touch owned: her card follows the normal three at room 3', () => {
    const p = heardCanals('fuse', 'touch');
    const offers = roll(p, tripAt(p, 'canals', LANDMARK));
    expect(offers).toHaveLength(4);
    expect(offers[3]).toEqual(runaway);
    expect(recruitOffers(p, tripAt(p, 'canals', LANDMARK), LANDMARK)).toEqual([runaway]);
  });

  test("Fuse from room 1's loot counts, and Touch known: she is there at room 3", () => {
    const p = heardCanals('touch');
    const t = tripAt(p, 'canals', LANDMARK, [fusePage]);
    expect(roll(p, t)).toContainEqual(runaway);
  });

  test('both pages in the trip loot (taken in rooms 1-2) are enough', () => {
    const p = heardCanals();
    const t = tripAt(p, 'canals', LANDMARK, [fusePage, { kind: 'rune', rune: 'touch' }]);
    expect(roll(p, t)).toContainEqual(runaway);
  });

  test('without Fuse she is absent, and Fuse is offered in the room instead', () => {
    const p = heardCanals('touch');
    const offers = roll(p, tripAt(p, 'canals', LANDMARK));
    expect(offers).not.toContainEqual(runaway);
    expect(offers[0]).toEqual(fusePage);
  });

  test('without Touch she is absent, and Touch is offered in the Seam', () => {
    const p = heardCanals('fuse');
    expect(roll(p, tripAt(p, 'canals', LANDMARK))).not.toContainEqual(runaway);
    const deep = encountersOf('seam').findIndex((e) => e.loot === 'deep' || e.loot === 'heart');
    expect(deep).toBeGreaterThan(-1);
    const offers = roll(p, tripAt(p, 'seam', deep));
    expect(offers).toContainEqual({ kind: 'rune', rune: 'touch' });
  });

  test('she is not at any other canal room', () => {
    const p = heardCanals('fuse', 'touch');
    for (const room of [0, 1, 3]) {
      expect(roll(p, tripAt(p, 'canals', room)), `room ${room + 1}`).not.toContainEqual(runaway);
    }
  });
});
