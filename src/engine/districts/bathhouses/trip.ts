import {
  AREAS_GUARANTEE_ROOMS,
  AREAS_RUNES,
  HEART_HEAT,
  HEAT_BY_ROOM,
  PICKS_BY_HEAT,
  PLUNGE_KIND,
  PLUNGE_ROOMS,
  tableForHeat,
} from '$data/districts/bathhouses';
import type { HeatLevel } from '$data/districts/bathhouses/types';
import type {
  OfferContributor,
  OfferKind,
  RoomOffers,
  RoomSetup,
  ShapeInput,
  TripShapeDef,
} from '../types';
import {
  BATH_SHAPE,
  type BathTripState,
  BOIL_OVER_RULE_ID,
  initBathState,
  parseBathState,
} from './types';

/**
 * The heat rises (bathhouses-plan P5, P6; BH-2): each room runs hotter than the last, the heart
 * hottest; the gauge reads the room's effective heat from `roomSetup`, and the offers follow the
 * room's base heat (a plunge buys safety, not worse loot). Return is free after any room (`ret:
 * any` in the data), so the shape blocks nothing.
 */

type Where = Pick<ShapeInput<BathTripState>, 'room' | 'length'>;

const isHeart = ({ room, length }: Where): boolean => room >= length - 1;

/** P5: the room's base heat: rooms 1–4 at 1–4 (past four stays at 4), the heart at 4. */
export function baseHeat(w: Where): HeatLevel {
  if (isHeart(w)) return HEART_HEAT;
  return HEAT_BY_ROOM[Math.min(w.room, HEAT_BY_ROOM.length - 1)] ?? HEART_HEAT;
}

/** P5: the heat the gauge runs at: one lower after a plunge, never below 1, the heart never cooled. */
export function heatOf(input: Where & { state: BathTripState }): HeatLevel {
  const base = baseHeat(input);
  if (isHeart(input) || input.state.pendingCool === 0) return base;
  return Math.max(1, base - input.state.pendingCool) as HeatLevel;
}

/** The room's gauge at its effective heat (the boil-over is listed by the district, DK-5b). */
export const bathRoomSetup = (input: ShapeInput<BathTripState>): RoomSetup => ({
  rulesConfig: { [BOIL_OVER_RULE_ID]: { heat: heatOf(input) } },
});

/** A won room spent the cool it was set up with: the next room runs at its own heat unless plunged again. */
export const bathAfterRoom = (input: ShapeInput<BathTripState>): BathTripState => ({
  ...input.state,
  pendingCool: 0,
});

/** P6: the table and the picks of the room's base heat. */
export const bathOffersFor = (input: ShapeInput<BathTripState>): RoomOffers => {
  const h = baseHeat(input);
  return { table: tableForHeat(h), picks: PICKS_BY_HEAT[h] };
};

/**
 * The Areas guarantee slot (design "Offers by heat"): in rooms 1–2 of a bathhouses trip, while
 * the household and the trip's loot hold none of the school's runes, one is offered, the first in
 * school order (Vat). The same pick RC's `firstMissing` makes, so the towel-bearer's page line
 * (BH-15) lands on the same card instead of a second one.
 */
export const AREAS_GUARANTEE: OfferContributor = (ctx) => {
  if (ctx.trip.district !== 'bathhouses' || !AREAS_GUARANTEE_ROOMS.includes(ctx.room)) return {};
  const inLoot = (r: string) => ctx.trip.loot.some((i) => i.kind === 'rune' && i.rune === r);
  if (AREAS_RUNES.some((r) => ctx.profile.known.includes(r) || inLoot(r))) return {};
  const rune = AREAS_RUNES[0];
  return rune ? { must: { kind: 'rune', rune } } : {};
};

export type PlungeItem = { kind: typeof PLUNGE_KIND; data: Record<string, never> };
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * The cold plunge (P5, P6; BH-3): a fixed extra card after rooms 1–3 of a bathhouses trip (never
 * rolled, never at the heart). Taking it spends a pick, lands in the trip's loot (so a wipe drops
 * it like the rest) and cools the next room; banking it at home changes nothing. The offers
 * stay on the room's base heat (`bathOffersFor`), so the plunge buys safety, not worse loot.
 */
export const PLUNGE: OfferKind<PlungeItem> = {
  id: PLUNGE_KIND,
  roll: (ctx) =>
    ctx.trip.district === 'bathhouses' && PLUNGE_ROOMS.includes(ctx.room)
      ? [{ kind: PLUNGE_KIND, data: {} }]
      : [],
  onPick: (trip, item) => ({
    ...trip,
    loot: [...trip.loot, item],
    kit: trip.kit && { ...trip.kit, state: { ...parseBathState(trip.kit.state), pendingCool: 1 } },
  }),
  onBank: (p) => p,
  parse: (raw) =>
    isRecord(raw) && raw.kind === PLUNGE_KIND && isRecord(raw.data)
      ? { kind: PLUNGE_KIND, data: {} }
      : null,
  card: 'plunge',
};

export const BATH_TRIP: TripShapeDef<BathTripState> = {
  id: BATH_SHAPE,
  parseState: parseBathState,
  initState: initBathState,
  roomSetup: bathRoomSetup,
  afterRoom: bathAfterRoom,
  offersFor: bathOffersFor,
};
