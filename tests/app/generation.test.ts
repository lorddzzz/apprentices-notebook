import { describe, expect, it, vi } from 'vitest';
import { newSave, type Profile, type SaveData } from '$engine';
import { parseInkedState } from '$engine/drawing';
import { setOut } from '../../src/app/flow';
import {
  applyRoom,
  needsRoom,
  type RoomInker,
  requestRoom,
  storedRoom,
  syncInker,
} from '../../src/app/generation';
import { handle } from '../../src/app/generation.worker';
import { FIXTURE_DRAWINGS, fullHousehold } from '../drawing/fixtures';
import '../drawing/motherFrame';

/** EN-4 (P36): the generation worker's pure core, the synchronous path and the stale-result rule. */

function household(): Profile {
  const p = fullHousehold();
  return {
    ...p,
    drawings: [
      FIXTURE_DRAWINGS[0] ?? null,
      FIXTURE_DRAWINGS[1] ?? null,
      FIXTURE_DRAWINGS[2] ?? null,
    ],
    city: { ...p.city, open: [...new Set([...p.city.open, 'inkedPage' as const])] },
  };
}

function drawnSave(page: 0 | 1 | 2 = 0): SaveData {
  return setOut({ ...newSave(9), profile: household() }, 'inkedPage', { page });
}

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('EN-4: the generation worker', () => {
  it('EN-4: worker results equal the synchronous path', async () => {
    for (const page of [0, 1, 2] as const) {
      const save = drawnSave(page);
      const trip = save.trip;
      if (!trip) throw new Error('no trip');
      // The worker sees the profile and trip as saved: plain JSON.
      const viaWorker = handle(json({ profile: save.profile, trip, room: 0 }));
      const viaSync = await syncInker.ink(save.profile, trip, 0);
      expect(viaWorker.layout).toBe(viaSync.layout);
      expect(viaWorker.layout.length).toBeGreaterThan(0);
      expect(viaWorker.ms).toBeGreaterThanOrEqual(0);
    }
  });

  it('EN-4: a stale result is dropped', async () => {
    const save = drawnSave(0);
    const trip = save.trip;
    if (!trip) throw new Error('no trip');
    const { layout } = await syncInker.ink(save.profile, trip, 0);
    // A different trip (another seed), no trip at all, and a trip that is not drawn.
    expect(applyRoom(save, trip.seed + 1, 0, layout)).toBe(save);
    const home: SaveData = { ...save, trip: null };
    expect(applyRoom(home, trip.seed, 0, layout)).toBe(home);
    const other: SaveData = { ...save, trip: { ...trip, district: 'seam' } };
    expect(applyRoom(other, trip.seed, 0, layout)).toBe(other);
    // A matching save takes it.
    const stored = applyRoom(save, trip.seed, 0, layout);
    expect(storedRoom(stored, 0)).toBe(layout);
    // The result of an old request arriving after the room was stored another way changes nothing.
    expect(applyRoom(stored, trip.seed, 0, `${layout}`)).toBe(stored);
    // requestRoom on a save with no drawn trip returns it as given.
    const inker: RoomInker = { ink: vi.fn(() => Promise.resolve({ layout, ms: 0 })) };
    expect(await requestRoom(home, 0, inker)).toBe(home);
    expect(inker.ink).not.toHaveBeenCalled();
  });

  it('EN-4: a stored room is not inked again', async () => {
    const save = drawnSave(0);
    const spy = vi.fn(syncInker.ink);
    const inker: RoomInker = { ink: spy };
    const once = await requestRoom(save, 0, inker);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(needsRoom(once, 0)).toBe(false);
    expect(needsRoom(once, 1)).toBe(true);
    const twice = await requestRoom(once, 0, inker);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(twice).toBe(once);
    // The next room stores beside the first.
    const both = await requestRoom(once, 1, inker);
    const rooms = parseInkedState(both.trip?.kit?.state).rooms;
    expect(rooms[0]).not.toBeNull();
    expect(rooms[1]).not.toBeNull();
  });
});
