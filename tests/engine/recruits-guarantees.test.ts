import { describe, expect, test } from 'vitest';
import { type DistrictId, encountersOf, type RuneId } from '$data';
import type { RecruitPages } from '$data/districts/index';
import { joinHousehold, newProfile, type Profile, rollOffers, startTrip, type Trip } from '$engine';
import { guaranteesFor, type RecruitKit } from '$engine/recruits';
import {
  buildOfferRegistry,
  CORE_OFFERS,
  type OfferRegistry,
  offerRegistry,
} from '$engine/trip/offerKinds';
import { ownedBy } from '$engine/trip/offers';

/** RC-3 (recruitment plan P5, P6, P8, P9): guaranteed precondition pages through DK-R1. */

const SEED = 4242;
// The Seam: rooms 0–1 shallow, 2 deep, 3 heart.
const DEEP = 2;
const HEART = 3;

/** Fixture placements: no district places a recruit yet (RC-5 places the runaway). */
const KIT: RecruitKit = {
  canals: { recruit: [{ apprentice: 'runaway', room: 2 }] },
  inkQuarter: { recruit: [{ apprentice: 'notary', room: 3 }] },
};

/** The game's contributor, reading the fixture placements. */
const FIXTURE_REGISTRY: OfferRegistry = buildOfferRegistry([
  CORE_OFFERS,
  {
    contributors: [
      (ctx) => {
        const must = guaranteesFor(ctx.profile, ctx.trip, ctx.room, KIT);
        return must ? { must } : {};
      },
    ],
  },
]);

const hear = (p: Profile, ...ds: DistrictId[]): Profile => ({
  ...p,
  city: { ...p.city, heard: [...new Set([...p.city.heard, ...ds])] },
});
const learn = (p: Profile, ...runes: RuneId[]): Profile => ({
  ...p,
  known: [...new Set([...p.known, ...runes])],
});
const tripAt = (p: Profile, district: DistrictId, room: number, loot: Trip['loot'] = []): Trip => ({
  ...startTrip(p, SEED),
  district,
  encounter: room,
  loot,
});
const seamAt = (p: Profile, room: number, loot: Trip['loot'] = []) =>
  guaranteesFor(p, tripAt(p, 'seam', room, loot), room, KIT);

/** The offers `finishEncounter` rolls in this room; `registry` null = the plain table roll. */
function roll(p: Profile, t: Trip, registry: OfferRegistry | null = FIXTURE_REGISTRY) {
  const table = encountersOf(t.district)[t.encounter]?.loot;
  if (!table) throw new Error('no room');
  const withKit = registry ? { profile: p, trip: t, registry } : null;
  return rollOffers(t.seed, t.encounter, table, t.party, null, ownedBy(p, t), withKit);
}

const touch = { kind: 'rune', rune: 'touch' } as const;

describe('Seam pages (P6)', () => {
  test('a fresh notebook rolls exactly as before in every Seam room', () => {
    const p = newProfile();
    encountersOf('seam').forEach((_, room) => {
      const t = tripAt(p, 'seam', room);
      expect(seamAt(p, room)).toBeNull();
      expect(roll(p, t, offerRegistry())).toEqual(roll(p, t, null));
      expect(roll(p, t)).toEqual(roll(p, t, null));
    });
  });

  test('the canals heard and the runaway placed: Touch in the deep room, not the shallow ones', () => {
    const p = hear(newProfile(), 'canals');
    expect(seamAt(p, 0)).toBeNull();
    expect(seamAt(p, 1)).toBeNull();
    expect(seamAt(p, DEEP)).toEqual(touch);
    const offers = roll(p, tripAt(p, 'seam', DEEP));
    expect(offers[0]).toEqual(touch);
    expect(offers).toHaveLength(3);
  });

  test('an unplaced recruit guarantees nothing (P9): the real districts place none yet', () => {
    const p = hear(newProfile(), 'canals', 'inkQuarter');
    expect(guaranteesFor(p, tripAt(p, 'seam', DEEP), DEEP)).toBeNull();
    const t = tripAt(p, 'seam', DEEP);
    expect(roll(p, t, offerRegistry())).toEqual(roll(p, t, null));
  });

  test('a district heard since the map was last opened waits (first trips roll as before)', () => {
    const p = hear(newProfile(), 'canals');
    expect(seamAt({ ...p, city: { ...p.city, fresh: ['canals'] } }, DEEP)).toBeNull();
  });

  test('Conduct stays first at the heart; the page follows it and counts toward the three', () => {
    const p = hear(newProfile(), 'canals');
    const offers = roll(p, tripAt(p, 'seam', HEART));
    expect(offers.slice(0, 2)).toEqual([{ kind: 'method', method: 'conduct' }, touch]);
    expect(offers).toHaveLength(3);
  });

  test('same seed, same offers', () => {
    const p = hear(newProfile(), 'canals', 'inkQuarter');
    const t = tripAt(p, 'seam', DEEP);
    expect(roll(p, t)).toEqual(roll(p, t));
  });

  test('one page per roll, the recruit placed earliest in the city first', () => {
    // The runaway (canals) waits on Touch, the notary (ink quarter) on Splash and Steam.
    const p = hear(newProfile(), 'canals', 'inkQuarter');
    expect(seamAt(p, DEEP)).toEqual(touch);
    expect(seamAt(learn(p, 'touch'), DEEP)).toEqual({ kind: 'rune', rune: 'splash' });
    const forced = roll(p, tripAt(p, 'seam', DEEP)).filter((o) => o.kind === 'rune');
    expect(forced[0]).toEqual(touch);
  });

  test('nothing once the page is owned, in the loot, she joined or her card is in the loot', () => {
    const p = hear(newProfile(), 'canals');
    expect(seamAt(learn(p, 'touch'), DEEP)).toBeNull();
    expect(seamAt(p, DEEP, [touch])).toBeNull();
    expect(seamAt(joinHousehold(p, 'runaway'), DEEP)).toBeNull();
    expect(seamAt(p, DEEP, [{ kind: 'recruit', apprentice: 'runaway' }])).toBeNull();
  });

  test('outside the Seam no Seam page is guaranteed', () => {
    const p = hear(newProfile(), 'canals');
    encountersOf('canals').forEach((_, room) => {
      expect(guaranteesFor(p, tripAt(p, 'canals', room), room, KIT)).toBeNull();
    });
  });

  test('the contributor and the recruit kind are registered from RC’s source', () => {
    expect(offerRegistry().kinds.recruit?.card).toBe('recruit');
    expect(offerRegistry().contributors.length).toBeGreaterThan(0);
  });
});

describe('district pages (P8)', () => {
  const fuse: RecruitPages = { for: 'runaway', rooms: [0, 1, 2], runes: ['fuse'] };
  const at = (q: Profile, d: DistrictId, room: number, pages: readonly RecruitPages[]) =>
    guaranteesFor(q, tripAt(q, d, room), room, { [d]: { recruitPages: pages } });

  test('placed rooms guarantee the page while she waits, and nowhere else', () => {
    const p = hear(newProfile(), 'canals');
    expect(at(p, 'canals', 1, [fuse])).toEqual({ kind: 'rune', rune: 'fuse' });
    expect(at(p, 'canals', 3, [fuse])).toBeNull();
    expect(at(learn(p, 'fuse'), 'canals', 1, [fuse])).toBeNull();
    expect(at(joinHousehold(p, 'runaway'), 'canals', 1, [fuse])).toBeNull();
    expect(at(p, 'canals', 1, [])).toBeNull();
  });

  test('an `any` line guarantees its first rune until one of them is owned', () => {
    const line: RecruitPages = { for: 'towelBearer', rooms: [0], any: ['seep', 'vat', 'steep'] };
    const p = hear(newProfile(), 'bathhouses');
    expect(at(p, 'bathhouses', 0, [line])).toEqual({ kind: 'rune', rune: 'seep' });
    expect(at(learn(p, 'steep'), 'bathhouses', 0, [line])).toBeNull();
  });
});
