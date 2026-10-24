import {
  type ApprenticeId,
  type Beat,
  type InventionDef,
  isInvention,
  type LootSpec,
  RECRUITS,
  type RecruitDef,
  type RuneId,
  START_KNOWN,
  TUNING,
} from '$data';
import { inHousehold } from './household';
import { parseLattice } from './notation';
import type { Profile, Trip } from './types';

/**
 * Recruitment (docs/plans/recruitment-plan.md §4). RC-2 builds the precondition check;
 * the RC-3/6 stubs throw until their task lands.
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
/** RC-3: at most one missing precondition page for this roll (P5, P6), after the table's own. */
export function guaranteesFor(_p: Profile, _trip: Trip, _room: number): LootSpec | null {
  return todo('guaranteesFor');
}
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
