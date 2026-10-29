import { describe, expect, test } from 'vitest';
import {
  afterRoomWon,
  beginEncounter,
  type DistrictShape,
  newProfile,
  type Profile,
  shapeOf,
  startTrip,
  type Trip,
} from '$engine';
import type { Json, TripShapeDef } from '$engine/districts/types';

/**
 * DK-D9: a trip shape's `lootAfterRoom` edits the trip's loot once a won room's `afterRoom` has
 * run, reading the state it just wrote. A fixture shape on a canal trip, called directly.
 */

const p: Profile = {
  ...newProfile(),
  city: { ...newProfile().city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
};

const base = startTrip(p, 7, 'canals');
const trip: Trip = {
  ...base,
  kit: { state: { settled: false }, choices: [], checkpoint: false, bonuses: [] },
  loot: [
    { kind: 'vellum', amount: 1 },
    { kind: 'vellum', amount: 2 },
  ],
};
const battle = beginEncounter(p, trip).state;

const settles: TripShapeDef = {
  id: 'canals:settles',
  parseState: (raw) => raw as Json,
  initState: () => ({ settled: false }),
  afterRoom: () => ({ settled: true }),
};
const shapeWith = (t: TripShapeDef): DistrictShape => ({ ...shapeOf('canals'), trip: t });

describe('lootAfterRoom (DK-D9)', () => {
  test('drops loot after afterRoom, seeing the state it wrote', () => {
    const seen: Json[] = [];
    const shape = shapeWith({
      ...settles,
      lootAfterRoom: ({ trip: t, state }) => {
        seen.push(state);
        return t.loot.filter((i) => !(i.kind === 'vellum' && i.amount === 2));
      },
    });
    const r = afterRoomWon(trip, battle, [], shape);
    expect(seen).toEqual([{ settled: true }]);
    expect(r.trip.loot).toEqual([{ kind: 'vellum', amount: 1 }]);
    expect(r.trip.kit?.state).toEqual({ settled: true });
    expect(trip.loot).toHaveLength(2);
  });

  test('a shape without it keeps the loot as it was', () => {
    const r = afterRoomWon(trip, battle, [], shapeWith(settles));
    expect(r.trip.loot).toBe(trip.loot);
  });

  test('a trip without a kit is not asked', () => {
    const shape = shapeWith({
      ...settles,
      lootAfterRoom: () => {
        throw new Error('called');
      },
    });
    const bare: Trip = { ...trip };
    delete bare.kit;
    expect(afterRoomWon(bare, battle, [], shape).trip).toBe(bare);
  });
});
