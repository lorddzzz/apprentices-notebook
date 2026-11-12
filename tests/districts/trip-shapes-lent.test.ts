import { describe, expect, test } from 'vitest';
import { KIT } from '$engine/districts';
import type { ShapeInput, TripKitState } from '$engine/districts/types';
import { policyAllows } from '$engine/trip/ret';
import { newTripKit, parseTripKit, shapeOf } from '$engine/trip/shape';
import type { Trip } from '$engine/types';

/** KIT-R3f (platform-closure P5): the Seam and the canals lend trip shapes without a `trip` of their own. */

const kit: TripKitState = { state: null, choices: [], checkpoint: false, bonuses: [] };
const input = (room: number, length: number): ShapeInput<null> => ({
  trip: { district: 'canals', encounter: room } as Trip,
  kit,
  state: null,
  room,
  length,
});

describe('KIT-R3 lent shapes', () => {
  test('KIT-R3: KIT.shapes has seam:plain and canals:landings', () => {
    expect(KIT.shapes['seam:plain']).toMatchObject({ id: 'seam:plain' });
    expect(KIT.shapes['canals:landings']).toMatchObject({ id: 'canals:landings' });
    const plain = KIT.shapes['seam:plain'];
    expect(plain?.parseState(undefined)).toBeNull();
    expect(plain?.initState()).toBeNull();
    expect(plain?.returnBlocks).toBeUndefined();
  });

  test('KIT-R3: the Seam and canal trips still carry no kit', () => {
    const t = { encounter: 0, status: 'fight' } as const;
    for (const d of ['seam', 'canals'] as const) {
      const shape = shapeOf(d);
      expect(shape.trip, d).toBeUndefined();
      expect(KIT.modules[d]?.trip, d).toBeUndefined();
    }
    // The Seam carries nothing: no kit is made and a save without one parses.
    const seam = shapeOf('seam');
    expect(newTripKit(seam)).toBeUndefined();
    expect(parseTripKit(undefined, t, seam)).toBeUndefined();
    expect(() => parseTripKit({ state: null }, t, seam)).toThrow();
    // The canals carry a kit only for the barge bonus (CN P5), as before, with state null.
    const canals = shapeOf('canals');
    expect(newTripKit(canals)?.state).toBeNull();
  });

  test("KIT-R3: canals:landings allows a return where the canals' policy does, at lengths 3 to 6", () => {
    const shape = KIT.shapes['canals:landings'];
    for (const length of [3, 4, 5, 6]) {
      const landings = {
        kind: 'landings',
        after: [0, 2, 4].filter((r) => r < length - 1),
      } as const;
      for (let room = 0; room < length; room++) {
        const blocked = shape?.returnBlocks?.(input(room, length)) ?? [];
        const why = `length ${length}, room ${room}`;
        expect(blocked.length === 0, why).toBe(policyAllows(landings, room, length - 1));
        if (blocked.length > 0) expect(blocked[0]?.why).toBe('No landing here.');
      }
    }
  });
});
