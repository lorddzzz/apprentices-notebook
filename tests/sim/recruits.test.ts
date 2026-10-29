import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  APPRENTICES,
  type ApprenticeId,
  DISTRICT_IDS,
  type DistrictId,
  type EncounterDef,
  encountersOf,
  type InventionDef,
  LOOT_TABLES,
  RECRUITS,
  RUNE_IDS,
  type RuneId,
  START_KNOWN,
  TUNING,
} from '$data';
import { DISTRICT_KIT, type RecruitPages } from '$data/districts/index';
import {
  codexView,
  inHousehold,
  joinHousehold,
  type LootItem,
  newProfile,
  newSave,
  type Profile,
  rollOffers,
  type SaveData,
  seeMap,
  solveThreshold,
  startTrip,
  type Trip,
} from '$engine';
import {
  guaranteesFor,
  isReady,
  isRevealed,
  knockAtDoor,
  preconditionsOf,
  type RecruitKit,
  recruitOffers,
  someoneJoined,
  waitingFor,
  welcome,
} from '$engine/recruits';
import { recruitOffersWith } from '$engine/recruits/offers';
import { createRng, type Rng } from '$engine/rng';
import { bankLoot, buildOfferRegistry, CORE_OFFERS, wipeLoot } from '$engine/trip/offerKinds';
import { ownedBy } from '$engine/trip/offers';
import { householdRows } from '../../src/app/codexHousehold';
import {
  endBattle,
  goHome,
  leaveDoorway,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
} from '../../src/app/flow';
import { notesUnderDoor } from '../../src/app/recruitNotes';
import { benchOf, cardOf, seatsOf } from '../../src/app/study';
import { FIXTURE_ROOMS } from '../fixtures/district-kit/fixture-district/data';
import {
  botFight,
  eagerGoesHome,
  eagerPick,
  RECRUIT_SIM_SEED,
  randomGoesHome,
  randomPick,
  wantedRunes,
} from './bot';

/**
 * RC-9 (recruitment plan §6): the no-soft-lock and no-leak proof. Four layers:
 * 1. a property fuzz over random reachable notebooks x trips x rooms (invariants a-d);
 * 2. an abstract campaign on fixture placements for all seven (the five unbuilt districts use
 *    DK-18's fixture rooms), eager and random-with-wipes;
 * 3. the campaign bot on the real Seam and canals with real fights (`botFight`);
 * 4. the leak checks no view model can carry (the campaign Lab list).
 * Fast by default for `pnpm check`. `RECRUIT_FUZZ_CASES`, `RECRUIT_CAMPAIGN_SEEDS` and
 * `RECRUIT_BOT_SEEDS` scale them (the plan's numbers: 500, 50, 50).
 */

const FUZZ_CASES = Number(process.env.RECRUIT_FUZZ_CASES) || 500;
const CAMPAIGN_SEEDS = Number(process.env.RECRUIT_CAMPAIGN_SEEDS) || 10;
const BOT_SEEDS = Number(process.env.RECRUIT_BOT_SEEDS) || 2;
const LONG = 600_000;

type RecruitId = keyof typeof RECRUITS;
const RECRUIT_IDS = Object.keys(RECRUITS) as RecruitId[];
const DISTRICT_RECRUITS = RECRUIT_IDS.filter((id) => 'district' in RECRUITS[id].found);
const DOOR_RECRUITS = RECRUIT_IDS.filter((id) => 'door' in RECRUITS[id].found);
const SEAM_PAGES: readonly RuneId[] = ['touch', 'splash', 'steam', 'brass'];
const isSeamPage = (r: RuneId): boolean => SEAM_PAGES.includes(r);

// ── Fixture placements (DK-18's fixture rooms for the unbuilt districts) ──

/** The fixture landmark: the third of DK-18's four rooms (a district's "second landing"). */
const FX_LANDMARK = 2;

/** Every non-Seam precondition rune of `id` as a page line in rooms 1-2 (the plan's static rule). */
function fixtureLines(id: RecruitId, rooms: readonly number[] = [0, 1]): RecruitPages[] {
  const { all, any } = preconditionsOf(id).runes;
  const own = all.filter((r) => !isSeamPage(r));
  const lines: RecruitPages[] = own.length ? [{ for: id, runes: own, rooms }] : [];
  if (any && !any.some(isSeamPage)) lines.push({ for: id, any, rooms });
  return lines;
}

const fixtureDistrict = (id: RecruitId) => ({
  recruit: [{ apprentice: id, room: FX_LANDMARK }],
  recruitPages: fixtureLines(id),
});

/** The real canals and Seam plus a placement for each unbuilt recruit; the exile's Board pages in CG. */
const FIXTURE_KIT: RecruitKit = {
  seam: {},
  canals: {
    ...(DISTRICT_KIT.canals?.recruit ? { recruit: DISTRICT_KIT.canals.recruit } : {}),
    ...(DISTRICT_KIT.canals?.recruitPages
      ? { recruitPages: DISTRICT_KIT.canals.recruitPages }
      : {}),
  },
  inkQuarter: fixtureDistrict('notary'),
  bathhouses: fixtureDistrict('towelBearer'),
  bridges: fixtureDistrict('warden'),
  foundry: fixtureDistrict('tuner'),
  cartographers: { recruitPages: fixtureLines('exile', [0, 1, 2]) },
};
const FIXTURE_REG = buildOfferRegistry([CORE_OFFERS, recruitOffersWith(FIXTURE_KIT)]);

/** The rooms each district plays: the real ones, or DK-18's fixture rooms where none are built. */
function roomsOf(d: DistrictId): readonly EncounterDef[] {
  const real = encountersOf(d);
  return real.length > 0 ? real : FIXTURE_ROOMS;
}
const FX_DISTRICTS = DISTRICT_IDS.filter((d) => d in FIXTURE_KIT);

// ── Profiles ──

const INV: InventionDef = {
  id: 'inv:lantern',
  name: 'Lantern',
  method: 'repeat',
  parts: ['spark'],
  solvent: null,
};
const learn = (p: Profile, runes: readonly RuneId[]): Profile => ({
  ...p,
  known: [...new Set([...p.known, ...runes])],
});
const nameIdiom = (p: Profile): Profile =>
  p.named.includes('idiom:bonfire') ? p : { ...p, named: [...p.named, 'idiom:bonfire'] };
const prove = (p: Profile): Profile => ({
  ...p,
  inventions: p.inventions.some((i) => i.id === INV.id) ? p.inventions : [...p.inventions, INV],
  proof: {
    ...p.proof,
    draughtsman: Array.from({ length: TUNING.provenCasts }, () => [
      { at: { x: 1, y: 1 }, rune: INV.id },
    ]),
  },
});

const ALL_PRE_RUNES: RuneId[] = [
  ...new Set(
    RECRUIT_IDS.flatMap((id) => {
      const r = preconditionsOf(id).runes;
      return [...r.all, ...(r.any ?? [])];
    }),
  ),
];
const pickSome = <T>(rng: Rng, xs: readonly T[], chance: number): T[] =>
  xs.filter(() => rng.int(0, 99) < chance);

/** A random notebook a campaign could reach: basics known, some recruits joined, notes, beats. */
function randomProfile(rng: Rng): Profile {
  const base = newProfile();
  let p = learn(base, [...pickSome(rng, ALL_PRE_RUNES, 45), ...pickSome(rng, RUNE_IDS, 10)]);
  for (const id of pickSome(rng, RECRUIT_IDS, 20)) {
    // The Copyist comes after the runaway (her beat); a random notebook keeps that order.
    if (id === 'copyist' && !inHousehold(p, 'runaway')) continue;
    p = joinHousehold(p, id);
  }
  if (rng.int(0, 1)) p = nameIdiom(p);
  if (rng.int(0, 2) === 0) p = prove(p);
  const heard = ['seam', ...pickSome(rng, DISTRICT_IDS.slice(1), 60)] as DistrictId[];
  const fresh = pickSome(rng, heard.slice(1), 25);
  p = { ...p, city: { ...p.city, heard, open: heard, fresh } };
  // A note is written only once her beats hold (the Copyist's: the runaway joined).
  const notes = DOOR_RECRUITS.filter(
    (id) =>
      !inHousehold(p, id) && (id !== 'copyist' || inHousehold(p, 'runaway')) && rng.int(0, 3) === 0,
  );
  return notes.length ? { ...p, recruits: { notes } } : p;
}

const tripAt = (p: Profile, district: DistrictId, room: number, loot: LootItem[]): Trip => ({
  ...startTrip(p, 1 + room, 'seam'),
  district,
  encounter: room,
  loot,
});

/** Some trip loot: pages a recruit needs, now and then a recruit card already taken. */
function randomLoot(rng: Rng, p: Profile): LootItem[] {
  const pages: LootItem[] = pickSome(rng, ALL_PRE_RUNES, 15)
    .filter((r) => !p.known.includes(r))
    .map((rune) => ({ kind: 'rune', rune }));
  const cards: LootItem[] = pickSome(rng, DISTRICT_RECRUITS, 8)
    .filter((id) => !inHousehold(p, id))
    .map((apprentice) => ({ kind: 'recruit', apprentice }));
  return [...pages, ...cards];
}

// ── The invariants ──

const ownedRunes = (p: Profile, t: Trip): Set<RuneId> =>
  new Set([...p.known, ...t.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : []))]);

/**
 * The oracle for (a), written from the plan rather than the code: every rune a waiting recruit
 * lacks that this room is placed to give (her district's page lines naming the room, or a Seam
 * page in the Seam's deep/heart rooms for a placed, seen district or a door arrival).
 */
function placedMissing(p: Profile, t: Trip, room: number, kit: RecruitKit): Set<RuneId> {
  const owned = ownedRunes(p, t);
  const out = new Set<RuneId>();
  const waiting = waitingFor(p, t);
  for (const line of kit[t.district]?.recruitPages ?? []) {
    if (!line.rooms.includes(room) || !waiting.includes(line.for)) continue;
    if ('runes' in line) {
      for (const r of line.runes) if (!owned.has(r)) out.add(r);
    } else if (!line.any.some((r) => owned.has(r))) {
      out.add(line.any[0] as RuneId);
    }
  }
  const table = roomsOf(t.district)[room]?.loot;
  if (t.district === 'seam' && (table === 'deep' || table === 'heart')) {
    for (const id of waiting) {
      const found = RECRUITS[id as RecruitId].found;
      if ('district' in found) {
        const placed = kit[found.district]?.recruit?.some((r) => r.apprentice === id);
        if (!placed || p.city.fresh.includes(found.district)) continue;
      }
      const { all, any } = preconditionsOf(id).runes;
      for (const r of all) if (isSeamPage(r) && !owned.has(r)) out.add(r);
      const seamAny = any?.filter(isSeamPage) ?? [];
      if (seamAny.length && !seamAny.some((r) => owned.has(r))) out.add(seamAny[0] as RuneId);
    }
  }
  return out;
}

/** (b): who should stand in this room: placed here, not home, not in the loot, ready at her landmark. */
function expectedCards(p: Profile, t: Trip, room: number, kit: RecruitKit): ApprenticeId[] {
  return (kit[t.district]?.recruit ?? [])
    .filter((r) => r.room === room && !inHousehold(p, r.apprentice))
    .filter((r) => !t.loot.some((i) => i.kind === 'recruit' && i.apprentice === r.apprentice))
    .filter((r) => isReady(p, r.apprentice, { trip: t, atLandmark: true }))
    .map((r) => r.apprentice);
}

const recruitCards = (offers: readonly LootItem[]): ApprenticeId[] =>
  offers.flatMap((o) => (o.kind === 'recruit' ? [o.apprentice] : []));

/** Checks (a) and (b) on one roll; `offers` is what the room rolled. Returns the guaranteed rune. */
function checkRoll(
  p: Profile,
  t: Trip,
  room: number,
  offers: readonly LootItem[],
  kit: RecruitKit,
  where: string,
): RuneId | null {
  const g = guaranteesFor(p, t, room, kit);
  const missing = placedMissing(p, t, room, kit);
  // (a) a placed, missing page is guaranteed (one per roll), and it is in the offers.
  expect(g !== null, `${where}: guarantee iff a placed page is missing (${[...missing]})`).toBe(
    missing.size > 0,
  );
  if (g) {
    expect(g.kind, where).toBe('rune');
    if (g.kind !== 'rune') return null;
    expect(missing.has(g.rune), `${where}: ${g.rune} is a missing placed page`).toBe(true);
    expect(offers, `${where}: the guaranteed page is offered`).toContainEqual(g);
  }
  // The table's own guarantee (Conduct at the heart) stays first.
  const tableMust = LOOT_TABLES[roomsOf(t.district)[room]?.loot ?? 'shallow'].guaranteed;
  if (tableMust?.kind === 'method' && !ownedBy(p, t).methods.includes(tableMust.method)) {
    expect(offers[0], `${where}: the table's guarantee first`).toEqual(tableMust);
  }
  // (b) her card exactly when she is ready at her landmark, once, after the normal offers.
  const cards = recruitCards(offers);
  expect(cards.sort(), `${where}: recruit cards`).toEqual(expectedCards(p, t, room, kit).sort());
  expect(
    offers.slice(0, TUNING.offersPerWin).some((o) => o.kind === 'recruit'),
    where,
  ).toBe(false);
  return g?.kind === 'rune' ? g.rune : null;
}

/** (c): what the home screens show, as text; no unrevealed person may be named in it. */
function homeViews(p: Profile): string {
  const members = p.household.members;
  return JSON.stringify({
    codex: codexView(p),
    household: householdRows(p),
    seats: seatsOf(p),
    bench: benchOf(p),
    cards: members.map((m) => cardOf(p, m)),
    notes: notesUnderDoor(p),
  });
}

function checkNoLeak(p: Profile, where: string, offers: readonly LootItem[] = []): void {
  const text = homeViews(p);
  const offered = recruitCards(offers);
  for (const id of RECRUIT_IDS) {
    if (isRevealed(p, id)) continue;
    const at = text.indexOf(`"${id}"`);
    expect(at < 0, `${where}: ${id}'s id in a home view: ${text.slice(at - 200, at + 40)}`).toBe(
      true,
    );
    expect(text.includes(APPRENTICES[id].name), `${where}: ${id}'s name in a home view`).toBe(
      false,
    );
    // Offers only name her through her own card, rolled when she is ready (b).
    if (offered.includes(id)) continue;
    expect(JSON.stringify(offers).includes(`"${id}"`), `${where}: ${id} in the offers`).toBe(false);
  }
}

function rollAt(p: Profile, t: Trip, room: number) {
  const table = roomsOf(t.district)[room]?.loot ?? 'shallow';
  return rollOffers(t.seed, room, table, t.party, null, ownedBy(p, t), {
    profile: p,
    trip: t,
    registry: FIXTURE_REG,
  });
}

// ── 1. Property fuzz ──

describe('RC-9 property fuzz: random notebooks x trips x rooms (plan §6)', () => {
  test(`fixture placements source every precondition rune (static, for the sims)`, () => {
    for (const id of RECRUIT_IDS) {
      const { all, any } = preconditionsOf(id).runes;
      const lines = FX_DISTRICTS.flatMap((d) => FIXTURE_KIT[d]?.recruitPages ?? []).filter(
        (l) => l.for === id,
      );
      const placed = lines.flatMap((l) => ('runes' in l ? l.runes : l.any));
      for (const r of all) {
        if (START_KNOWN.includes(r)) continue;
        expect(isSeamPage(r) || placed.includes(r), `${id} needs ${r}`).toBe(true);
      }
      if (any)
        expect(
          any.some((r) => isSeamPage(r) || placed.includes(r)),
          id,
        ).toBe(true);
    }
  });

  test(
    `${FUZZ_CASES} cases: (a) guarantees, (b) cards, (c) no leak, (d) monotone readiness`,
    () => {
      const rng = createRng(RECRUIT_SIM_SEED);
      let guaranteed = 0;
      let cards = 0;
      for (let n = 0; n < FUZZ_CASES; n++) {
        const p = randomProfile(rng);
        const district = FX_DISTRICTS[rng.int(0, FX_DISTRICTS.length - 1)] as DistrictId;
        const rooms = roomsOf(district);
        const room = rng.int(0, rooms.length - 1);
        const t = tripAt(p, district, room, randomLoot(rng, p));
        const where = `case ${n} ${district} room ${room + 1}`;
        const offers = rollAt(p, t, room);
        if (checkRoll(p, t, room, offers, FIXTURE_KIT, where)) guaranteed++;
        cards += recruitCards(offers).length;
        checkNoLeak(p, where, offers);

        // (a, eventually): taking each guaranteed page in turn empties the placed-missing set.
        let q = p;
        for (let k = 0; k < 12; k++) {
          const g = guaranteesFor(q, t, room, FIXTURE_KIT);
          if (g?.kind !== 'rune') break;
          q = learn(q, [g.rune]);
        }
        expect(placedMissing(q, t, room, FIXTURE_KIT).size, `${where}: eventually`).toBe(0);

        // (d) banking more runes (and more people) never hides anyone who was ready.
        const more = learn(p, pickSome(rng, ALL_PRE_RUNES, 40));
        const bigger = pickSome(rng, DISTRICT_RECRUITS, 20).reduce(
          (acc, id) => (inHousehold(acc, id) ? acc : joinHousehold(acc, id)),
          more,
        );
        for (const id of RECRUIT_IDS) {
          for (const ctx of [{}, { trip: t, atLandmark: true }]) {
            if (isReady(p, id, ctx)) expect(isReady(bigger, id, ctx), `${where}: ${id}`).toBe(true);
          }
        }
      }
      // The fuzz reaches the interesting cases, not only empty rolls.
      expect(guaranteed).toBeGreaterThan(FUZZ_CASES / 10);
      expect(cards).toBeGreaterThan(0);
    },
    LONG,
  );
});

// ── 2. Abstract campaign on fixture placements ──

interface Policy {
  name: string;
  district(p: Profile, rng: Rng): DistrictId;
  pick(p: Profile, t: Trip, rng: Rng): number;
  home(p: Profile, t: Trip, rng: Rng): boolean;
  /** Chance in 100 that a room's fight wipes the party. */
  wipe: number;
}

/** Where an eager player goes next: the first waiting recruit's district, or the Seam for its pages. */
function eagerDistrict(p: Profile): DistrictId {
  for (const id of waitingFor(p)) {
    const found = RECRUITS[id as RecruitId].found;
    const want = wantedRunes(p, tripAt(p, 'seam', 0, []));
    const { all, any } = preconditionsOf(id).runes;
    const lacks = [...all, ...(any ?? [])].filter((r) => want.has(r));
    const nonSeam = lacks.filter((r) => !isSeamPage(r));
    if (lacks.length > 0 && nonSeam.length === 0) return 'seam';
    if ('district' in found) return found.district;
    // A door arrival's pages: the district that places them.
    const from = FX_DISTRICTS.find((d) =>
      (FIXTURE_KIT[d]?.recruitPages ?? []).some((l) => l.for === id),
    );
    if (from) return from;
  }
  return 'seam';
}

const EAGER: Policy = {
  name: 'eager',
  district: (p) => eagerDistrict(p),
  pick: (p, t) => eagerPick(p, t),
  home: (p, t) => eagerGoesHome(p, t),
  wipe: 0,
};
const RANDOM: Policy = {
  name: 'random with wipes',
  district: (_p, rng) => FX_DISTRICTS[rng.int(0, FX_DISTRICTS.length - 1)] as DistrictId,
  pick: (_p, t, rng) => randomPick(t, rng),
  home: (_p, _t, rng) => randomGoesHome(rng),
  wipe: 20,
};

interface CampaignLog {
  joinedAt: Partial<Record<ApprenticeId, number>>;
  rolls: number;
  wipes: number;
}

/**
 * One trip: rooms in order, offers rolled through the fixture registry and checked, picks by the
 * policy; home when the policy says (landings are the real campaign's job), lost on a wipe.
 */
function abstractTrip(
  p: Profile,
  district: DistrictId,
  seed: number,
  policy: Policy,
  rng: Rng,
  log: CampaignLog,
  where: string,
): Profile {
  const rooms = roomsOf(district);
  let t: Trip = { ...startTrip(p, seed, 'seam'), district, loot: [] };
  for (let room = 0; room < rooms.length; room++) {
    t = { ...t, encounter: room };
    if (rng.int(0, 99) < policy.wipe) {
      log.wipes++;
      return knockAtDoor(wipeLoot(p, t.loot, FIXTURE_REG));
    }
    let offers = rollAt(p, t, room);
    checkRoll(p, t, room, offers, FIXTURE_KIT, `${where} room ${room + 1}`);
    log.rolls++;
    for (let picks = rooms[room]?.picks ?? 1; picks > 0 && offers.length > 0; picks--) {
      const i = policy.pick(p, { ...t, offers }, rng);
      const item = offers[i];
      if (!item) break;
      if (item.kind !== 'doorway') t = { ...t, loot: [...t.loot, item] };
      offers = offers.filter((_, k) => k !== i);
    }
    if (room < rooms.length - 1 && !policy.home(p, t, rng)) continue;
    const banked = bankLoot(p, t.loot, FIXTURE_REG);
    return knockAtDoor(banked, someoneJoined(p, banked));
  }
  return p;
}

/** At home: the beats fights would bring (named on trip 1, proven on trip 2), notes welcomed. */
function atHome(p: Profile, trip: number, log: CampaignLog): Profile {
  let q = p;
  if (trip >= 1) q = nameIdiom(q);
  if (trip >= 2) q = prove(q);
  for (const id of q.recruits?.notes ?? []) q = welcome(q, id);
  for (const id of q.household.members) if (log.joinedAt[id] === undefined) log.joinedAt[id] = trip;
  checkNoLeak(q, `home before trip ${trip}`);
  return q;
}

function abstractCampaign(seed: number, policy: Policy, trips: number): CampaignLog {
  const rng = createRng(deriveCampaignSeed(seed));
  const log: CampaignLog = { joinedAt: {}, rolls: 0, wipes: 0 };
  const base = newProfile();
  let p: Profile = {
    ...base,
    city: { ...base.city, heard: [...FX_DISTRICTS], open: [...FX_DISTRICTS], fresh: [] },
  };
  for (let n = 0; n < trips; n++) {
    p = atHome(p, n, log);
    if (RECRUIT_IDS.every((id) => inHousehold(p, id))) break;
    const before = p;
    p = abstractTrip(p, policy.district(p, rng), seed * 1000 + n, policy, rng, log, `trip ${n}`);
    // A note is only ever written for someone ready, one per homecoming.
    const notes = (p.recruits?.notes ?? []).filter(
      (x) => !(before.recruits?.notes ?? []).includes(x),
    );
    expect(notes.length, `trip ${n}: one note at most`).toBeLessThanOrEqual(1);
    for (const id of notes) expect(isReady(p, id), `trip ${n}: ${id} ready`).toBe(true);
    if (notes.length) expect(someoneJoined(before, p), `trip ${n}: own evening`).toBe(false);
  }
  atHome(p, trips, log);
  return log;
}
const deriveCampaignSeed = (seed: number): number => RECRUIT_SIM_SEED * 31 + seed;

/** The eager bound: seven people, a handful of trips each. */
const EAGER_TRIPS = 40;

describe('RC-9 abstract campaign: all seven on fixture placements (no soft-lock)', () => {
  test(
    `eager: everyone joins within ${EAGER_TRIPS} trips on ${CAMPAIGN_SEEDS} seeds; the Copyist after the runaway`,
    () => {
      let worst = 0;
      for (let s = 1; s <= CAMPAIGN_SEEDS; s++) {
        const log = abstractCampaign(s, EAGER, EAGER_TRIPS);
        for (const id of RECRUIT_IDS) {
          expect(log.joinedAt[id], `seed ${s}: ${id} joined`).toBeDefined();
        }
        expect(log.joinedAt.copyist ?? 0).toBeGreaterThan(log.joinedAt.runaway ?? 0);
        worst = Math.max(worst, ...Object.values(log.joinedAt));
      }
      if (process.env.RECRUIT_CAMPAIGN_SEEDS) console.log(`eager abstract: worst ${worst} trips`);
    },
    LONG,
  );

  test(
    `random picks with 20% wipes: every roll holds (a) and (b), every home view (c), on ${CAMPAIGN_SEEDS} seeds`,
    () => {
      let rolls = 0;
      let wipes = 0;
      for (let s = 1; s <= CAMPAIGN_SEEDS; s++) {
        const log = abstractCampaign(s, RANDOM, 30);
        rolls += log.rolls;
        wipes += log.wipes;
      }
      expect(rolls).toBeGreaterThan(CAMPAIGN_SEEDS * 20);
      expect(wipes).toBeGreaterThan(0);
    },
    LONG,
  );

  test('a page met on a wiped trip is not kept: she is hidden until it is re-learned (P2)', () => {
    const base = newProfile();
    const p: Profile = learn(
      { ...base, city: { ...base.city, heard: ['seam', 'canals'], fresh: [] } },
      ['touch'],
    );
    const t = tripAt(p, 'canals', 2, [{ kind: 'rune', rune: 'fuse' }]);
    expect(recruitOffers(p, t, 2, FIXTURE_KIT)).toEqual([
      { kind: 'recruit', apprentice: 'runaway' },
    ]);
    const wiped = wipeLoot(p, t.loot, FIXTURE_REG);
    expect(
      isReady(wiped, 'runaway', { trip: tripAt(wiped, 'canals', 2, []), atLandmark: true }),
    ).toBe(false);
    expect(guaranteesFor(wiped, tripAt(wiped, 'canals', 0, []), 0, FIXTURE_KIT)).toEqual({
      kind: 'rune',
      rune: 'fuse',
    });
  });
});

// ── 3. The campaign bot on the real Seam and canals ──

interface BotLog {
  trips: number;
  runawayAt: number | null;
  copyistNoteAt: number | null;
  wipes: number;
  rolls: number;
  heardCanalsAt: number | null;
  idiomAt: number | null;
}

/** Fights the room with the greedy bot; a stalled fight counts as a wipe (the bot gave up). */
function fightRoom(save: SaveData): { save: SaveData; wiped: boolean } {
  const start = startBattle(save);
  const trip = save.trip as Trip;
  const fight = botFight(start.state, 25, trip.party);
  const state =
    fight.state.phase === 'player' ? { ...fight.state, phase: 'lost' as const } : fight.state;
  const end = endBattle(save, state, [...start.events, ...fight.events]);
  return { save: end.save, wiped: end.outcome === 'wiped' };
}

/** Where the eager bot sets out: the canals for the runaway once Touch is banked, else the Seam. */
function botDistrict(p: Profile): DistrictId {
  const runawayWaits = waitingFor(p).includes('runaway');
  return runawayWaits && p.known.includes('touch') && p.city.open.includes('canals')
    ? 'canals'
    : 'seam';
}

interface BotPolicy {
  district(p: Profile, rng: Rng): DistrictId;
  pick(p: Profile, t: Trip, rng: Rng): number;
  home(p: Profile, t: Trip, rng: Rng): boolean;
  /** Stop once the Copyist's note has come (the eager goal); the random walk plays every trip. */
  stopAtNote: boolean;
}
const EAGER_BOT: BotPolicy = {
  district: (p) => botDistrict(p),
  pick: (p, t) => eagerPick(p, t),
  home: (p, t) => eagerGoesHome(p, t),
  stopAtNote: true,
};
const RANDOM_BOT: BotPolicy = {
  district: (p, rng) => p.city.open[rng.int(0, p.city.open.length - 1)] ?? 'seam',
  pick: (_p, t, rng) => randomPick(t, rng),
  home: (_p, _t, rng) => randomGoesHome(rng),
  stopAtNote: false,
};

function botCampaign(seed: number, maxTrips: number, policy: BotPolicy = EAGER_BOT): BotLog {
  const rng = createRng(seed);
  let save = newSave(seed);
  const log: BotLog = {
    trips: 0,
    runawayAt: null,
    copyistNoteAt: null,
    wipes: 0,
    rolls: 0,
    heardCanalsAt: null,
    idiomAt: null,
  };
  for (let n = 0; n < maxTrips; n++) {
    // At home: the map is looked at; the threshold is the player's desk puzzle, solved here.
    let p = seeMap(save.profile);
    if (p.city.heard.includes('canals') && !p.city.open.includes('canals')) {
      p = solveThreshold(p, 'canals');
    }
    if (log.heardCanalsAt === null && p.city.heard.includes('canals')) log.heardCanalsAt = n;
    if (log.idiomAt === null && p.named.some((x) => x.startsWith('idiom:'))) log.idiomAt = n;
    if (log.runawayAt === null && inHousehold(p, 'runaway')) log.runawayAt = n;
    if (log.copyistNoteAt === null && (p.recruits?.notes ?? []).includes('copyist')) {
      log.copyistNoteAt = n;
    }
    checkNoLeak(p, `seed ${seed} home ${n}`);
    for (const id of p.recruits?.notes ?? []) p = welcome(p, id);
    if (policy.stopAtNote && log.copyistNoteAt !== null) break;
    save = setOut({ ...save, profile: p }, policy.district(p, rng));
    log.trips++;
    for (let guard = 0; guard < 60 && save.trip; guard++) {
      const t: Trip = save.trip;
      const where = `seed ${seed} trip ${n} ${t.district} room ${t.encounter + 1}`;
      if (t.status === 'fight') {
        const before = save.profile;
        const r = fightRoom(save);
        save = r.save;
        if (r.wiped) {
          log.wipes++;
          break;
        }
        const after = save.trip as Trip;
        checkRoll(before, after, after.encounter, after.offers, DISTRICT_KIT, where);
        log.rolls++;
      } else if (t.status === 'looting') {
        save = takeOffer(save, policy.pick(save.profile, t, rng));
      } else if (t.status === 'doorway') {
        save = leaveDoorway(save, save.profile);
      } else if (t.status === 'cleared') {
        save = goHome(save);
      } else if (t.status === 'crossroads') {
        let home = false;
        if (policy.home(save.profile, t, rng)) {
          try {
            save = goHome(save);
            home = true;
          } catch {
            // Not a landing: push on.
          }
        }
        if (!home) save = pushOnward(save);
      } else {
        throw new Error(`${where}: unexpected ${t.status}`);
      }
    }
  }
  return log;
}

describe('RC-9 campaign bot on the real Seam and canals', () => {
  test(
    `eager: the runaway joins, then the Copyist's note comes, within 30 trips (${BOT_SEEDS} seeds)`,
    () => {
      const logs: BotLog[] = [];
      for (let s = 1; s <= BOT_SEEDS; s++) {
        const log = botCampaign(RECRUIT_SIM_SEED + s, 30);
        logs.push(log);
        expect(log.runawayAt, `seed ${s}: runaway (${JSON.stringify(log)})`).not.toBeNull();
        expect(log.copyistNoteAt, `seed ${s}: Copyist (${JSON.stringify(log)})`).not.toBeNull();
        expect(log.copyistNoteAt ?? 0).toBeGreaterThan(log.runawayAt ?? 0);
      }
      if (process.env.RECRUIT_BOT_SEEDS) console.log(logs.map((l) => JSON.stringify(l)).join('\n'));
    },
    LONG,
  );

  test(
    `random picks, random returns, real wipes: every roll holds (a) and (b) (${BOT_SEEDS} seeds x 8 trips)`,
    () => {
      let rolls = 0;
      let wipes = 0;
      for (let s = 1; s <= BOT_SEEDS; s++) {
        const log = botCampaign(RECRUIT_SIM_SEED + 100 + s, 8, RANDOM_BOT);
        rolls += log.rolls;
        wipes += log.wipes;
      }
      expect(rolls).toBeGreaterThan(BOT_SEEDS * 4);
      if (process.env.RECRUIT_BOT_SEEDS) console.log(`random bot: rolls ${rolls} wipes ${wipes}`);
    },
    LONG,
  );
});

// ── 4. Leaks no view model carries ──

describe('RC-9 no-leak: the campaign Lab', () => {
  // P14 (a request to HC's P16): in a campaign the Lab's lineup, page and kit pickers list the
  // whole registry, so "Visit the Lab" in the Study names every unmet recruit. The pickers read
  // APPRENTICE_IDS straight in the component; there is no campaign filter to call yet.
  test.fails('BL-RC9-1: the campaign Lab lists only the household (pickers filter the registry)', () => {
    for (const file of ['LabLineup', 'MemberPicker', 'LabKits']) {
      const src = readFileSync(`src/ui/components/lab/${file}.svelte`, 'utf8');
      expect(src, file).not.toMatch(/\{#each APPRENTICE_IDS as/);
    }
  });
});
