import { describe, expect, test } from 'vitest';
import { APPRENTICES, type DistrictId, encountersOf, type RuneId } from '$data';
import {
  beginEncounter,
  closeBattle,
  inHousehold,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  returnHome,
  rollOffers,
  type SaveData,
  startTrip,
  type Trip,
} from '$engine';
import { preconditionsOf, type RecruitKit, recruitOffers } from '$engine/recruits';
import { recruitOffersWith } from '$engine/recruits/offers';
import {
  buildOfferRegistry,
  CORE_OFFERS,
  type OfferRegistry,
  offerRegistry,
  parseLootItem,
} from '$engine/trip/offerKinds';
import { ownedBy } from '$engine/trip/offers';

/** RC-4 (recruitment plan P7): the recruit offer kind, read through fixture placements. */

const SEED = 4242;
/** The canals' second landing (CN may move it; RC-5 places her for real). */
const LANDMARK = 2;
const KIT: RecruitKit = { canals: { recruit: [{ apprentice: 'runaway', room: LANDMARK }] } };
const REGISTRY: OfferRegistry = buildOfferRegistry([CORE_OFFERS, recruitOffersWith(KIT)]);
const runaway = { kind: 'recruit', apprentice: 'runaway' } as const;

const learn = (p: Profile, ...runes: readonly RuneId[]): Profile => ({
  ...p,
  known: [...new Set([...p.known, ...runes])],
});
/** A profile holding every rune the runaway waits for (Fuse plus her page's). */
const readyProfile = (): Profile => learn(newProfile(), ...preconditionsOf('runaway').runes.all);

/** A trip standing in `room`; a kit-carrying district (canals) has passed the Crossroads before it. */
function tripAt(p: Profile, district: DistrictId, room: number, loot: Trip['loot'] = []): Trip {
  const start = startTrip(
    { ...p, city: { ...p.city, open: [...p.city.open, district] } },
    SEED,
    district,
  );
  const kit = start.kit
    ? {
        ...start.kit,
        choices: Array.from({ length: room }, (_, after) => ({ after, id: 'ink' })),
      }
    : undefined;
  return { ...start, district, encounter: room, loot, ...(kit ? { kit } : {}) };
}

/** The offers `finishEncounter` rolls in the trip's room, through `registry`. */
function roll(p: Profile, t: Trip, registry: OfferRegistry = REGISTRY) {
  const table = encountersOf(t.district)[t.encounter]?.loot;
  if (!table) throw new Error('no room');
  const withKit = { profile: p, trip: t, registry };
  return rollOffers(t.seed, t.encounter, table, t.party, null, ownedBy(p, t), withKit);
}

/** The trip as `finishEncounter` leaves it after winning the room: looting the rolled offers. */
function looting(p: Profile, t: Trip): Trip {
  const enc = encountersOf(t.district)[t.encounter];
  if (!enc) throw new Error('no room');
  return { ...t, status: 'looting', offers: roll(p, t), picksLeft: enc.picks };
}

/** Wins the landmark and takes the runaway's card (spending the pick). */
function takeHer(p: Profile): Trip {
  const t = looting(p, tripAt(p, 'canals', LANDMARK));
  const at = t.offers.findIndex((o) => o.kind === 'recruit');
  expect(at).toBeGreaterThan(-1);
  return pickLoot(t, at, REGISTRY);
}

/** After taking her, any remaining picks go unused: the trip stands at the landing. */
const atLanding = (t: Trip): Trip => ({ ...t, status: 'crossroads', offers: [], picksLeft: 0 });

describe('the roll (P7)', () => {
  test('ready at her landmark: her card follows the normal three offers', () => {
    const p = readyProfile();
    const t = tripAt(p, 'canals', LANDMARK);
    const offers = roll(p, t);
    expect(offers.slice(0, 3)).toEqual(roll(p, t, buildOfferRegistry([CORE_OFFERS])));
    expect(offers[3]).toEqual(runaway);
    expect(offers).toHaveLength(4);
  });

  test('not shown away from the landmark, in another district, or before she is ready', () => {
    const p = readyProfile();
    expect(recruitOffers(p, tripAt(p, 'canals', 1), 1, KIT)).toEqual([]);
    expect(recruitOffers(p, tripAt(p, 'seam', LANDMARK), LANDMARK, KIT)).toEqual([]);
    const fresh = newProfile();
    expect(recruitOffers(fresh, tripAt(fresh, 'canals', LANDMARK), LANDMARK, KIT)).toEqual([]);
  });

  test("a page in the trip's loot counts toward readiness (P2)", () => {
    const [first, ...rest] = preconditionsOf('runaway').runes.all;
    if (!first) throw new Error('she needs a rune');
    const p = learn(newProfile(), ...rest);
    const page = { kind: 'rune', rune: first } as const;
    expect(recruitOffers(p, tripAt(p, 'canals', LANDMARK), LANDMARK, KIT)).toEqual([]);
    expect(recruitOffers(p, tripAt(p, 'canals', LANDMARK, [page]), LANDMARK, KIT)).toEqual([
      runaway,
    ]);
  });

  test('one per apprentice per trip, and never once she is in the household', () => {
    const p = readyProfile();
    expect(roll(p, tripAt(p, 'canals', LANDMARK, [runaway]))).not.toContainEqual(runaway);
    const home = returnHome(p, atLanding(takeHer(p)), REGISTRY);
    expect(roll(home, tripAt(home, 'canals', LANDMARK))).not.toContainEqual(runaway);
  });
});

describe('take, decline, wipe (P7, §0d)', () => {
  test('take → home: she joins the household, on the bench with her page', () => {
    const p = readyProfile();
    const taken = takeHer(p);
    expect(taken.loot).toContainEqual(runaway);
    expect(taken.picksLeft).toBe((encountersOf('canals')[LANDMARK]?.picks ?? 0) - 1);
    const home = returnHome(p, atLanding(taken), REGISTRY);
    expect(inHousehold(home, 'runaway')).toBe(true);
    expect(home.household.slots).toEqual(p.household.slots);
    expect(home.lattices.runaway?.length).toBeGreaterThan(0);
    expect(home.proof.runaway).toEqual([]);
    expect(APPRENTICES.runaway.starterPage).toBeTruthy();
  });

  test('take → wipe: she is gone and offered again next trip', () => {
    const p = readyProfile();
    const taken = takeHer(p);
    const next = { ...atLanding(taken), encounter: LANDMARK + 1, status: 'fight' as const };
    const b = structuredClone(beginEncounter(p, next).state);
    b.phase = 'lost';
    const wiped = closeBattle(p, next, b);
    expect(wiped.outcome).toBe('wiped');
    expect(inHousehold(wiped.profile, 'runaway')).toBe(false);
    const again = wiped.profile;
    expect(roll(again, tripAt(again, 'canals', LANDMARK))).toContainEqual(runaway);
  });

  test('decline → offered next trip', () => {
    const p = readyProfile();
    const t = looting(p, tripAt(p, 'canals', LANDMARK));
    const page = t.offers.findIndex((o) => o.kind !== 'recruit');
    const home = returnHome(p, atLanding(pickLoot(t, page, REGISTRY)), REGISTRY);
    expect(inHousehold(home, 'runaway')).toBe(false);
    expect(roll(home, tripAt(home, 'canals', LANDMARK))).toContainEqual(runaway);
  });
});

describe('saves', () => {
  test('a save with a pending recruit (offered and taken) round-trips', () => {
    const p = readyProfile();
    const offered = looting(p, tripAt(p, 'canals', LANDMARK));
    const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));
    for (const trip of [offered, atLanding(takeHer(p))]) {
      const save: SaveData = { ...newSave(3), profile: p, trip };
      expect(parseSaveData(json(save))).toEqual(save);
    }
  });

  test('an unknown apprentice id or a stray field is refused', () => {
    expect(parseLootItem(runaway)).toEqual(runaway);
    for (const bad of [
      { kind: 'recruit', apprentice: 'nobody' },
      { kind: 'recruit' },
      { kind: 'recruit', apprentice: 'runaway', extra: 1 },
    ]) {
      expect(parseLootItem(bad)).toBeNull();
    }
    const p = readyProfile();
    const trip = { ...atLanding(takeHer(p)), loot: [{ kind: 'recruit', apprentice: 'nobody' }] };
    expect(() => parseSaveData(JSON.parse(JSON.stringify({ ...newSave(3), trip })))).toThrow(
      'Not a valid save',
    );
  });

  test('two cards for one apprentice in a save are refused', () => {
    const p = readyProfile();
    const trip = { ...atLanding(takeHer(p)), loot: [runaway, runaway] };
    expect(() => parseSaveData(JSON.parse(JSON.stringify({ ...newSave(3), trip })))).toThrow(
      'Not a valid save',
    );
  });
});

describe('the game registry', () => {
  test('the canals place her at their second landing only (RC-5): other rooms roll plain', () => {
    const p = readyProfile();
    encountersOf('canals').forEach((_, room) => {
      const t = tripAt(p, 'canals', room);
      const has = roll(p, t, offerRegistry()).some((o) => o.kind === 'recruit');
      expect(has, `room ${room + 1}`).toBe(room === LANDMARK);
    });
  });
});
