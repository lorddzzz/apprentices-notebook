import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { type DistrictId, encountersOf } from '$data';
import { WARDENS_PASS } from '$data/districts/canals';
import { DISTRICTS, type DistrictData } from '$data/districts/index';
import {
  bankKeys,
  districtState,
  hearAfterTrip,
  keyOffer,
  newProfile,
  type Profile,
  rollOffers,
  startTrip,
  type Trip,
} from '$engine';
import { offerRegistry } from '$engine/trip/offerKinds';
import { ownedBy } from '$engine/trip/offers';

/**
 * CN-8 (canals revisit P7): the wardens' pass through `keyOffer` and the real offer registry. The
 * real bridges still open by `drawing` (BR's call), so a fixture swaps the pass in as their gate.
 */

const SEED = 99;
const key = { kind: 'key', district: 'bridges' } as const;
const REGISTRY = offerRegistry();

const fixture = (): Record<DistrictId, DistrictData> => ({
  ...DISTRICTS,
  bridges: { ...DISTRICTS.bridges, gate: WARDENS_PASS },
});

const profile = (heard: readonly DistrictId[] = ['seam', 'canals', 'bridges']): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, heard: [...heard], open: ['seam', 'canals'], fresh: [] } };
};

const tripAt = (p: Profile, room: number, loot: Trip['loot'] = []): Trip => ({
  ...startTrip(p, SEED, 'canals'),
  encounter: room,
  loot,
});

const roll = (p: Profile, t: Trip) => {
  const table = encountersOf('canals')[t.encounter]?.loot;
  if (!table) throw new Error('no room');
  return rollOffers(t.seed, t.encounter, table, t.party, null, ownedBy(p, t), {
    profile: p,
    trip: t,
    registry: REGISTRY,
  });
};

const original = Object.getOwnPropertyDescriptor(DISTRICTS, 'bridges');
beforeEach(() => {
  Object.defineProperty(DISTRICTS, 'bridges', {
    value: fixture().bridges,
    configurable: true,
    writable: true,
    enumerable: true,
  });
});
afterEach(() => {
  if (original) Object.defineProperty(DISTRICTS, 'bridges', original);
});

describe('the wardens pass (P7)', () => {
  test('the real gate is room 4 (index 3), guaranteed, and the bridges still use drawing', () => {
    expect(WARDENS_PASS.afterRoom).toBe(3);
    expect(WARDENS_PASS.guaranteed).toBe(true);
    expect(original?.value.gate.kind).toBe('drawing');
  });

  test('keyOffer: offered after room 4 only, reported as guaranteed', () => {
    const p = profile();
    const table = fixture();
    expect(keyOffer(p, tripAt(p, 3), 'canalDeep', table, 3)).toEqual({
      district: 'bridges',
      weight: 0,
      guaranteed: true,
    });
    for (const room of [0, 1, 2, 4]) {
      expect(keyOffer(p, tripAt(p, room), 'canalDeep', table, room), `room ${room + 1}`).toBeNull();
    }
    expect(keyOffer(p, tripAt(p, 3), 'canalDeep', table)).toBeNull();
  });

  test('rolled: one of the offer cards at room 4, never at other rooms', () => {
    const p = profile();
    const offers = roll(p, tripAt(p, 3));
    expect(offers.filter((o) => o.kind === 'key')).toEqual([key]);
    expect(offers[0]).toEqual(key);
    for (const room of [0, 1, 2, 4]) {
      expect(roll(p, tripAt(p, room)), `room ${room + 1}`).not.toContainEqual(key);
    }
  });

  test('guaranteed on every seed', () => {
    const p = profile();
    for (let seed = 1; seed <= 40; seed++) {
      const offers = roll(p, { ...tripAt(p, 3), seed });
      expect(
        offers.filter((o) => o.kind === 'key'),
        `seed ${seed}`,
      ).toHaveLength(1);
    }
  });

  test('only when the bridges are heard and closed', () => {
    const unheard = profile(['seam', 'canals']);
    expect(roll(unheard, tripAt(unheard, 3))).not.toContainEqual(key);
    const base = profile();
    const openIds: DistrictId[] = ['seam', 'canals', 'bridges'];
    const open: Profile = { ...base, city: { ...base.city, open: openIds } };
    expect(roll(open, tripAt(open, 3))).not.toContainEqual(key);
  });

  test('once per trip: not when a pass is already carried or on offer', () => {
    const p = profile();
    expect(roll(p, tripAt(p, 3, [key]))).not.toContainEqual(key);
    const offered: Trip = { ...tripAt(p, 3), offers: [key] };
    expect(keyOffer(p, offered, 'canalDeep', fixture(), 3)).toBeNull();
  });

  test('lost on a wipe, banked it opens the district', () => {
    const p = profile();
    const t: Trip = { ...tripAt(p, 4), status: 'crossroads', loot: [key] };
    expect(districtState(hearAfterTrip(p, t, 'wiped').profile, 'bridges')).toBe('heard');
    const banked = bankKeys(p, t.loot);
    expect(districtState(banked, 'bridges')).toBe('open');
    expect(roll(banked, tripAt(banked, 3))).not.toContainEqual(key);
  });

  test('gates without afterRoom keep the weighted pool', () => {
    const plain = {
      ...fixture(),
      bridges: {
        ...DISTRICTS.bridges,
        gate: { kind: 'key', from: 'canals', table: 'canalDeep', weight: 2 },
      },
    } as Record<DistrictId, DistrictData>;
    const p = profile();
    expect(keyOffer(p, tripAt(p, 0), 'canalDeep', plain)).toEqual({
      district: 'bridges',
      weight: 2,
    });
  });
});
