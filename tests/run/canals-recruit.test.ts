import { describe, expect, test } from 'vitest';
import { APPRENTICES, type DistrictId, encountersOf, type RuneId } from '$data';
import { DISTRICT_KIT } from '$data/districts/index';
import {
  beginEncounter,
  closeBattle,
  inHousehold,
  newProfile,
  type Profile,
  pickLoot,
  returnHome,
  rollOffers,
  startTrip,
  type Trip,
} from '$engine';
import { guaranteesFor } from '$engine/recruits';
import { offerRegistry } from '$engine/trip/offerKinds';
import { ownedBy } from '$engine/trip/offers';

/**
 * CN-6 (canals revisit P8): the runaway's landing through the REAL game registry and the canals'
 * own data. The plan counts rooms from 1 ("afterRoom: 3"); the data is 0-based, so her room is
 * index 2 (room 3, the second landing) and the Fuse guarantee rooms 1-3 are indices 0-2.
 */

const SEED = 4242;
const LANDMARK = 2;
const REGISTRY = offerRegistry();
const runaway = { kind: 'recruit', apprentice: 'runaway' } as const;
const fusePage = { kind: 'rune', rune: 'fuse' } as const;
const touchPage = { kind: 'rune', rune: 'touch' } as const;

const profileWith = (...runes: readonly RuneId[]): Profile => {
  const p = newProfile();
  return {
    ...p,
    known: [...new Set([...p.known, ...runes])],
    city: { ...p.city, heard: ['seam', 'canals'], fresh: [] },
  };
};

function tripAt(p: Profile, room: number, loot: Trip['loot'] = []): Trip {
  const district: DistrictId = 'canals';
  const open = { ...p, city: { ...p.city, open: [...p.city.open, district] } };
  const start = startTrip(open, SEED, district);
  const kit = start.kit
    ? { ...start.kit, choices: Array.from({ length: room }, (_, after) => ({ after, id: 'ink' })) }
    : undefined;
  return { ...start, district, encounter: room, loot, ...(kit ? { kit } : {}) };
}

function roll(p: Profile, t: Trip) {
  const table = encountersOf(t.district)[t.encounter]?.loot;
  if (!table) throw new Error('no room');
  return rollOffers(t.seed, t.encounter, table, t.party, null, ownedBy(p, t), {
    profile: p,
    trip: t,
    registry: REGISTRY,
  });
}

const looting = (p: Profile, t: Trip): Trip => ({
  ...t,
  status: 'looting',
  offers: roll(p, t),
  picksLeft: encountersOf(t.district)[t.encounter]?.picks ?? 1,
});
const atLanding = (t: Trip): Trip => ({ ...t, status: 'crossroads', offers: [], picksLeft: 0 });

describe('placement matches P8', () => {
  test('she is after room 3 (index 2), the second landing; Fuse rooms 1-3', () => {
    const kit = DISTRICT_KIT.canals;
    expect(kit?.recruit).toEqual([{ apprentice: 'runaway', room: LANDMARK }]);
    expect(kit?.recruitPages).toEqual([{ for: 'runaway', runes: ['fuse'], rooms: [0, 1, 2] }]);
    expect(kit?.ret).toEqual({ kind: 'landings', after: [0, 2, 4] });
  });
});

describe('hidden without Fuse or Touch', () => {
  test('neither, Fuse only, Touch only: absent at her room', () => {
    for (const runes of [[], ['fuse'], ['touch']] as const) {
      const p = profileWith(...runes);
      expect(roll(p, tripAt(p, LANDMARK)), runes.join()).not.toContainEqual(runaway);
    }
  });
});

describe('offered after room 3 with both', () => {
  test('known Fuse and Touch: her card follows the normal three at room 3 only', () => {
    const p = profileWith('fuse', 'touch');
    const offers = roll(p, tripAt(p, LANDMARK));
    expect(offers).toHaveLength(4);
    expect(offers[3]).toEqual(runaway);
    for (const room of [0, 1, 3, 4]) {
      expect(roll(p, tripAt(p, room)), `room ${room + 1}`).not.toContainEqual(runaway);
    }
  });

  test('pages taken this trip count', () => {
    const p = profileWith();
    expect(roll(p, tripAt(p, LANDMARK, [fusePage, touchPage]))).toContainEqual(runaway);
  });
});

describe('Fuse guarantee (rooms 1-3, only while lacking it and she is absent)', () => {
  test('Fuse is offered first in rooms 1-3, not later', () => {
    const p = profileWith();
    for (const room of [0, 1, 2]) {
      expect(roll(p, tripAt(p, room))[0], `room ${room + 1}`).toEqual(fusePage);
    }
    expect(guaranteesFor(p, tripAt(p, 3), 3)).toBeNull();
    expect(guaranteesFor(p, tripAt(p, 4), 4)).toBeNull();
  });

  test('not once Fuse is known or already in the trip loot', () => {
    const known = profileWith('fuse');
    const p = profileWith();
    for (const room of [0, 1, 2]) {
      expect(guaranteesFor(known, tripAt(known, room), room)).toBeNull();
      expect(guaranteesFor(p, tripAt(p, room, [fusePage]), room)).toBeNull();
    }
  });

  test('not once she is in the household', () => {
    const p = profileWith();
    const joined = {
      ...p,
      household: { ...p.household, members: [...p.household.members, 'runaway' as const] },
    };
    for (const room of [0, 1, 2]) {
      expect(guaranteesFor(joined, tripAt(joined, room), room)).toBeNull();
    }
  });
});

describe('declined, taken, wiped', () => {
  const ready = () => profileWith('fuse', 'touch');
  const takeHer = (p: Profile): Trip => {
    const t = looting(p, tripAt(p, LANDMARK));
    return pickLoot(
      t,
      t.offers.findIndex((o) => o.kind === 'recruit'),
      REGISTRY,
    );
  };

  test('declined → offered next trip', () => {
    const p = ready();
    const t = looting(p, tripAt(p, LANDMARK));
    const other = t.offers.findIndex((o) => o.kind !== 'recruit');
    const home = returnHome(p, atLanding(pickLoot(t, other, REGISTRY)), REGISTRY);
    expect(inHousehold(home, 'runaway')).toBe(false);
    expect(roll(home, tripAt(home, LANDMARK))).toContainEqual(runaway);
  });

  test('taken → trip loot, joins on return', () => {
    const p = ready();
    const taken = takeHer(p);
    expect(taken.loot).toContainEqual(runaway);
    expect(inHousehold(p, 'runaway')).toBe(false);
    const home = returnHome(p, atLanding(taken), REGISTRY);
    expect(inHousehold(home, 'runaway')).toBe(true);
    expect(APPRENTICES.runaway.starterPage).toBeTruthy();
    expect(roll(home, tripAt(home, LANDMARK))).not.toContainEqual(runaway);
  });

  test('taken then wiped → lost, offered again next trip', () => {
    const p = ready();
    const taken = takeHer(p);
    const next = { ...atLanding(taken), encounter: LANDMARK + 1, status: 'fight' as const };
    const b = structuredClone(beginEncounter(p, next).state);
    b.phase = 'lost';
    const wiped = closeBattle(p, next, b);
    expect(wiped.outcome).toBe('wiped');
    expect(inHousehold(wiped.profile, 'runaway')).toBe(false);
    expect(roll(wiped.profile, tripAt(wiped.profile, LANDMARK))).toContainEqual(runaway);
  });
});
