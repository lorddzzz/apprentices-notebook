import { BOARD_TREASURES, TREASURE_ROOMS } from '$data/districts/cartographers/loot';
import {
  CARTOGRAPHERS_TABLE_IDS,
  type CartographersTableId,
} from '$data/districts/cartographers/types';
import type { Profile } from '../../types';
import type {
  CrossroadsChoice,
  KitLootItem,
  KitLootSpec,
  OfferContributor,
  RoomOffers,
  ShapeInput,
  TripShapeDef,
} from '../types';

/**
 * The Cartographers' trip (cartographers-plan P13-P15; CG-8): free return after rooms 1-3 (`ret`
 * in the data), the quiet doorway after room 3 as the point of no return and the checkpoint, the
 * six loot tables by room, and the Board treasures rooms 1-3 guarantee. The shape carries no
 * state of its own.
 */
export const CARTOGRAPHERS_SHAPE = 'cartographers:doorway';

/** The Crossroads after room 3 (0-based room 2) holds the doorway. */
export const DOORWAY_AFTER = 2;
export const DOORWAY_CHOICE: CrossroadsChoice = {
  id: 'doorway',
  label: 'Through the doorway',
  kind: 'through',
  warn: 'What you carry is lost if you fall past it.',
};

export const cartographersChoices = (input: ShapeInput<null>): readonly CrossroadsChoice[] =>
  input.room === DOORWAY_AFTER ? [DOORWAY_CHOICE] : [];

const ROOM_TABLES: readonly CartographersTableId[] = CARTOGRAPHERS_TABLE_IDS.slice(0, 5);
const HEART_TABLE: CartographersTableId = 'cartographers:heart';

/** Rooms 1-5 read their own table; the last room is the heart's. One pick each (P14). */
export const cartographersOffersFor = (input: ShapeInput<null>): RoomOffers => {
  const last = input.room >= input.length - 1;
  const table = last ? HEART_TABLE : ROOM_TABLES[Math.min(input.room, ROOM_TABLES.length - 1)];
  return { table: table ?? HEART_TABLE, picks: 1 };
};

export const CARTOGRAPHERS_TRIP: TripShapeDef<null> = {
  id: CARTOGRAPHERS_SHAPE,
  parseState: () => null,
  initState: () => null,
  choices: cartographersChoices,
  offersFor: cartographersOffersFor,
};

type Treasure = (typeof BOARD_TREASURES)[number];

const owned = (p: Profile, t: Treasure): boolean => {
  switch (t.kind) {
    case 'rune':
      return p.known.includes(t.rune);
    case 'bindEvent':
      return p.bindEvents.includes(t.event);
    case 'solvent':
      return p.solventsFound.includes(t.solvent) || p.solvents[t.solvent] > 0;
  }
};

const same = (i: KitLootItem, t: Treasure): boolean => {
  switch (t.kind) {
    case 'rune':
      return i.kind === 'rune' && i.rune === t.rune;
    case 'bindEvent':
      return i.kind === 'bindEvent' && i.event === t.event;
    case 'solvent':
      return i.kind === 'solvent' && i.solvent === t.solvent;
  }
};
const carried = (loot: readonly KitLootItem[], t: Treasure): boolean =>
  loot.some((i) => same(i, t));

/**
 * P14: in rooms 1-3 of a cartographers trip one Board treasure the household does not own and the
 * trip is not carrying is offered: Erase, Draw, Swap, the *dies* page, Quicksilver, Graphite in
 * that order. The other offers roll from the room's table as usual. A copy owned is never offered
 * again (the bindEvent kind's own `limitPerTrip` covers a second *dies* in one trip).
 */
export const BOARD_GUARANTEE: OfferContributor = (ctx) => {
  if (ctx.trip.district !== 'cartographers' || !TREASURE_ROOMS.includes(ctx.room)) return {};
  const next = BOARD_TREASURES.find((t) => !owned(ctx.profile, t) && !carried(ctx.trip.loot, t));
  return next ? { must: next as KitLootSpec } : {};
};
