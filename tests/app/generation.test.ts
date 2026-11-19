import { describe, expect, it, vi } from 'vitest';
import type { Drawing } from '$data';
import { newSave, type Profile, type SaveData } from '$engine';
import { parseInkedState } from '$engine/drawing';
import { setOut } from '../../src/app/flow';
import {
  applyRoom,
  inkableAhead,
  needsRoom,
  type RoomInker,
  requestRoom,
  storedRoom,
  syncInker,
  workerInker,
} from '../../src/app/generation';
import { handle } from '../../src/app/generation.worker';
import { FIXTURE_DRAWINGS, fullHousehold } from '../drawing/fixtures';

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

describe('EN-14: a room a Crossroads choice changes is not inked ahead', () => {
  const span: Drawing = {
    name: 'Spans',
    rule: 'bridges:collapse',
    foes: ['rat'],
    pieces: [],
    shape: 'bridges:span',
    length: 4,
    heart: 'marginalia',
  };
  function spanSave(drawing: Drawing): SaveData {
    const p = household();
    return setOut(
      { ...newSave(9), profile: { ...p, drawings: [drawing, null, null] } },
      'inkedPage',
      { page: 0 },
    );
  }
  const looting = (save: SaveData, choices: { after: number; id: string }[]): SaveData => {
    const t = save.trip;
    if (!t?.kit) throw new Error('no drawn trip');
    const kit = { ...t.kit, choices: choices.map((c) => ({ ...c })) };
    return { ...save, trip: { ...t, status: 'looting', encounter: 0, kit } as typeof t };
  };

  it('waits for the span choice before room 2, and never for the first room or the heart', () => {
    const save = spanSave(span);
    expect(inkableAhead(looting(save, []), 1)).toBe(false);
    expect(inkableAhead(looting(save, [{ after: 0, id: 'sound' }]), 1)).toBe(true);
    expect(inkableAhead(looting(save, []), 0)).toBe(true);
    expect(inkableAhead(looting(save, []), 3)).toBe(true);
  });

  it('inks ahead on a shape without a choice that changes the room', () => {
    expect(inkableAhead(looting(drawnSave(0), []), 1)).toBe(true);
  });
});

describe('EN-14: the inkers fail softly', () => {
  it('the synchronous path rejects an engine error instead of throwing', () => {
    const save = drawnSave(0);
    const trip = save.trip;
    if (!trip) throw new Error('no trip');
    let inked: Promise<unknown> | null = null;
    expect(() => {
      inked = syncInker.ink(save.profile, trip, 99);
    }).not.toThrow();
    return expect(inked).rejects.toThrow('Room 100 is not on this page');
  });

  it('a request the worker cannot take is inked on the main thread', async () => {
    class NoClone {
      onmessage: unknown = null;
      onerror: unknown = null;
      onmessageerror: unknown = null;
      postMessage(): void {
        throw new Error('DataCloneError');
      }
      terminate(): void {}
    }
    vi.stubGlobal('Worker', NoClone);
    try {
      const save = drawnSave(0);
      const trip = save.trip;
      if (!trip) throw new Error('no trip');
      const got = await workerInker().ink(save.profile, trip, 0);
      const want = await syncInker.ink(save.profile, trip, 0);
      expect(got.layout).toBe(want.layout);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
