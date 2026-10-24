import {
  type ApprenticeId,
  type Beat,
  DISTRICT_IDS,
  type DistrictId,
  encountersOf,
  type InventionDef,
  isInvention,
  type LootSpec,
  RECRUITS,
  type RecruitDef,
  type RuneId,
  START_KNOWN,
  TUNING,
} from '$data';
import { DISTRICT_KIT, type RecruitPages, type RecruitPlacement } from '$data/districts/index';
import { inHousehold, joinHousehold } from './household';
import { parseLattice } from './notation';
import type { Profile, Trip } from './types';

/**
 * Recruitment (docs/plans/recruitment-plan.md §4). RC-2 builds the precondition check, RC-3 the
 * guaranteed pages, RC-4 the recruit offer; the RC-6 stubs throw until their task lands.
 */

/** The recruit offer card (P7); matches DK-1's `KitLootItem` member, banked via `joinHousehold`. */
export interface RecruitLootItem {
  kind: 'recruit';
  apprentice: ApprenticeId;
}

/** `Profile.recruits` (RC-6 adds it to `Profile` in engine/types.ts; parsed with an empty default). */
export interface RecruitsState {
  /** Door arrivals written under the attic door, oldest first; each stays until welcomed (P3). */
  notes: readonly ApprenticeId[];
}
export const EMPTY_RECRUITS: RecruitsState = { notes: [] };

/** Everything a recruit waits for: beats plus runes, page runes derived from `starterPage` (P1). */
export interface Preconditions {
  beat: readonly Beat[];
  runes: { all: readonly RuneId[]; any?: readonly RuneId[] };
}

/** Where readiness is asked: on a trip (its loot counts as owned, P2) and at the landmark room. */
export interface ReadyCtx {
  trip?: Trip;
  atLandmark?: boolean;
}

const todo = (what: string): never => {
  throw new Error(`recruits: ${what} is not built yet (RC-W0 stub)`);
};

type RecruitId = keyof typeof RECRUITS;

const RECRUIT_IDS = Object.keys(RECRUITS) as readonly RecruitId[];

const isRecruitId = (id: ApprenticeId): id is RecruitId => Object.hasOwn(RECRUITS, id);

function recruitDef(id: ApprenticeId): RecruitDef {
  if (!isRecruitId(id)) throw new Error(`${String(id)} is not a recruit`);
  return RECRUITS[id];
}

/** The runes a starter page spells (inventions never appear on one), in page order. */
const pageRunes = (page: string): RuneId[] =>
  parseLattice(page).runes.flatMap((r) => ('rune' in r && !isInvention(r.rune) ? [r.rune] : []));

/** RC-2 (P1): typed beats and runes, plus every starter-page rune outside START_KNOWN, once each. */
export function preconditionsOf(id: ApprenticeId): Preconditions {
  const r = recruitDef(id);
  const derived = pageRunes(r.starterPage).filter((x) => !START_KNOWN.includes(x));
  const all = [...new Set([...r.runes.all, ...derived])];
  return { beat: r.beat, runes: r.runes.any ? { all, any: r.runes.any } : { all } };
}

/** What the household owns, plus rune pages waiting in the trip's loot (P2, like `ownedBy`). */
function ownedRunes(p: Profile, trip?: Trip): ReadonlySet<RuneId> {
  const loot = trip?.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : [])) ?? [];
  return new Set([...p.known, ...loot]);
}

/** Whether a recruit offer for `id` is already in the trip's loot (RC-4's card, DK-7's kinds). */
function inTripLoot(id: ApprenticeId, trip?: Trip): boolean {
  const loot: readonly { kind: string; apprentice?: unknown }[] = trip?.loot ?? [];
  return loot.some((i) => i.kind === 'recruit' && i.apprentice === id);
}

const idiomNamed = (p: Profile): boolean => p.named.some((n) => n.startsWith('idiom:'));

function beatHolds(p: Profile, id: RecruitId, b: Beat, ctx: ReadyCtx): boolean {
  switch (b.kind) {
    case 'landmark': {
      const found = RECRUITS[id].found;
      if (!ctx.atLandmark || !('district' in found)) return false;
      return !ctx.trip || ctx.trip.district === found.district;
    }
    case 'joined':
      return inHousehold(p, b.who);
    case 'idiomNamed':
      return idiomNamed(p);
    case 'provenInvention':
      return provenInvention(p) !== null;
  }
}

function runesHeld(owned: ReadonlySet<RuneId>, pre: Preconditions): boolean {
  const { all, any } = pre.runes;
  return all.every((x) => owned.has(x)) && (!any || any.some((x) => owned.has(x)));
}

/**
 * RC-2: computed, never stored (P2). Every beat and rune holds; trip loot pages count as owned. A
 * landmark beat holds only `atLandmark`, and on a trip only in her own district. Says nothing about
 * whether she has already joined: callers check `inHousehold` and the trip's loot.
 */
export function isReady(p: Profile, id: ApprenticeId, ctx: ReadyCtx = {}): boolean {
  const pre = preconditionsOf(id);
  if (!isRecruitId(id)) return false;
  return pre.beat.every((b) => beatHolds(p, id, b, ctx)) && runesHeld(ownedRunes(p, ctx.trip), pre);
}

/**
 * RC-2: recruits not in the household (nor the trip's loot) whose district is heard; a door
 * arrival waits once her non-rune beats hold (P6). Registry order. Feeds RC-3's guarantees.
 */
export function waitingFor(p: Profile, trip?: Trip): readonly ApprenticeId[] {
  return RECRUIT_IDS.filter((id) => {
    if (inHousehold(p, id) || inTripLoot(id, trip)) return false;
    const r = RECRUITS[id];
    if ('district' in r.found) return p.city.heard.includes(r.found.district);
    return r.beat.every((b) => beatHolds(p, id, b, { ...(trip ? { trip } : {}) }));
  });
}
/** The Seam's own precondition pages (§0d), guaranteed in its deep and heart rooms (P6). */
const SEAM_PAGES: readonly RuneId[] = ['touch', 'splash', 'steam', 'brass'];
const SEAM_DEEP_TABLES: readonly string[] = ['deep', 'heart'];

/** P5's priority: the recruit placed earliest in the city (district order), door arrivals last. */
function cityRank(id: ApprenticeId): number {
  const found = recruitDef(id).found;
  return 'district' in found
    ? DISTRICT_IDS.indexOf(found.district)
    : DISTRICT_IDS.length + (found.door === 'A' ? 0 : 1);
}

const byCity = (ids: readonly ApprenticeId[]): ApprenticeId[] =>
  [...ids].sort((a, b) => cityRank(a) - cityRank(b));

/** The first missing rune of a page line: any of `all` unowned, or the first of `any` if none is owned. */
function firstMissing(
  owned: ReadonlySet<RuneId>,
  all: readonly RuneId[],
  any: readonly RuneId[] = [],
): RuneId | null {
  const missing = all.find((x) => !owned.has(x));
  if (missing) return missing;
  return any.length > 0 && !any.some((x) => owned.has(x)) ? (any[0] ?? null) : null;
}

const pageLine = (pages: RecruitPages): { all: readonly RuneId[]; any?: readonly RuneId[] } =>
  'runes' in pages ? { all: pages.runes } : { all: [], any: pages.any };

/** The placement data guarantees read: each district's `recruit` and `recruitPages` (P8). */
export type RecruitKit = Readonly<
  Partial<
    Record<
      DistrictId,
      { recruit?: readonly RecruitPlacement[]; recruitPages?: readonly RecruitPages[] }
    >
  >
>;

/** District pages: the trip's district places them in this room for a waiting recruit (P8). */
function districtPage(
  p: Profile,
  trip: Trip,
  room: number,
  owned: ReadonlySet<RuneId>,
  pages: readonly RecruitPages[],
) {
  const waiting = waitingFor(p, trip);
  const lines = pages.filter((l) => l.rooms.includes(room) && waiting.includes(l.for));
  for (const id of byCity(lines.map((l) => l.for))) {
    for (const l of lines.filter((x) => x.for === id)) {
      const { all, any } = pageLine(l);
      const rune = firstMissing(owned, all, any);
      if (rune) return rune;
    }
  }
  return null;
}

/** Seam pages: the first heard recruit's missing Seam rune, in the Seam's deep and heart rooms (P6). */
function seamPage(
  p: Profile,
  trip: Trip,
  room: number,
  owned: ReadonlySet<RuneId>,
  kit: RecruitKit,
) {
  const table = encountersOf(trip.district)[room]?.loot;
  if (trip.district !== 'seam' || !table || !SEAM_DEEP_TABLES.includes(table)) return null;
  const isSeam = (x: RuneId): boolean => SEAM_PAGES.includes(x);
  // A district recruit counts once her district places her (P9: unplaced is never shown) and the
  // map has shown her district (not `city.fresh`, e.g. heard on this very trip), so a fresh
  // notebook's first trips roll as before (P6). Door arrivals have no placement.
  const settled = (id: ApprenticeId): boolean => {
    const found = recruitDef(id).found;
    if (!('district' in found)) return true;
    const placed = kit[found.district]?.recruit?.some((r) => r.apprentice === id) ?? false;
    return placed && !p.city.fresh.includes(found.district);
  };
  for (const id of byCity(waitingFor(p, trip).filter(settled))) {
    const { all, any } = preconditionsOf(id).runes;
    const rune = firstMissing(owned, all.filter(isSeam), any?.filter(isSeam));
    if (rune) return rune;
  }
  return null;
}

/**
 * RC-3: at most one missing precondition page for this roll (P5, P6), offered after the table's own
 * guarantee. District pages in the rooms a district places them; Seam pages in the Seam's deep and
 * heart rooms while a heard and placed recruit (or a door arrival whose beats hold) lacks them; a
 * district still in `city.fresh` counts once the map has shown it. Nothing once she joined, her
 * card is in the trip's loot, or the page is owned (known or in the trip's loot). `kit` defaults to
 * the districts' data (tests pass fixtures).
 */
export function guaranteesFor(
  p: Profile,
  trip: Trip,
  room: number,
  kit: RecruitKit = DISTRICT_KIT,
): LootSpec | null {
  const owned = ownedRunes(p, trip);
  const pages = kit[trip.district]?.recruitPages ?? [];
  const rune = districtPage(p, trip, room, owned, pages) ?? seamPage(p, trip, room, owned, kit);
  return rune ? { kind: 'rune', rune } : null;
}
/**
 * RC-4 (P7): the recruit cards for this room: each person the trip's district places here, ready
 * at her landmark (trip loot counts as owned), not yet in the household nor in the trip's loot.
 * Computed on every roll, so a declined or wiped card comes back on a later trip. `kit` defaults
 * to the districts' data (tests pass fixtures).
 */
export function recruitOffers(
  p: Profile,
  trip: Trip,
  room: number,
  kit: RecruitKit = DISTRICT_KIT,
): RecruitLootItem[] {
  const placed = kit[trip.district]?.recruit ?? [];
  return placed
    .filter((r) => r.room === room && isRecruitId(r.apprentice))
    .filter((r) => !inHousehold(p, r.apprentice) && !inTripLoot(r.apprentice, trip))
    .filter((r) => isReady(p, r.apprentice, { trip, atLandmark: true }))
    .map((r) => ({ kind: 'recruit', apprentice: r.apprentice }));
}

/** RC-4: she comes home with the trip and joins the household, on the bench with her page. */
export const bankRecruit = (p: Profile, item: RecruitLootItem): Profile =>
  joinHousehold(p, item.apprentice);

/** RC-2: the first household invention proven in `TUNING.provenCasts` masks (P4), for the note (P12). */
export function provenInvention(p: Profile): InventionDef | null {
  const masks = Object.values(p.proof).filter((m) => m !== undefined);
  return (
    p.inventions.find((inv) =>
      masks.some(
        (ms) => ms.filter((m) => m.some((c) => c.rune === inv.id)).length >= TUNING.provenCasts,
      ),
    ) ?? null
  );
}
/** RC-6: at most one ready door arrival to write as a note this homecoming (P3). */
export function doorArrivals(_p: Profile): ApprenticeId | null {
  return todo('doorArrivals');
}
/** RC-6: removes the note and calls `joinHousehold`; idempotent. */
export function welcome(_p: Profile, _id: ApprenticeId): Profile {
  return todo('welcome');
}
/** RC-6: in the household or holding a note: the only reveal test UI may use (§1). */
export function isRevealed(_p: Profile, _id: ApprenticeId): boolean {
  return todo('isRevealed');
}
