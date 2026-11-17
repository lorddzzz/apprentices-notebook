import type { Profile, SaveData, Trip } from '$engine';
import { parseInkedState, storeRoom } from '$engine/drawing';
import { handle } from './generation.worker';

/** EN-4 (P36): a drawn trip's rooms are inked off the main thread, ahead of the fight that needs them. */
export interface RoomInker {
  ink(profile: Profile, trip: Trip, room: number): Promise<{ layout: string; ms: number }>;
}

/** The engine directly: the tests' path, and the fallback when no Worker runs. */
export const syncInker: RoomInker = {
  ink: (profile, trip, room) => Promise.resolve(handle({ profile, trip, room })),
};

interface Pending {
  resolve(r: { layout: string; ms: number }): void;
  reject(e: Error): void;
}

/** A module Web Worker; without `Worker`, or when it errors, the synchronous path answers instead. */
export function workerInker(): RoomInker {
  if (typeof Worker === 'undefined') return syncInker;
  let worker: Worker | null = null;
  let broken = false;
  let next = 0;
  const pending = new Map<number, Pending>();
  const fail = (): void => {
    broken = true;
    worker?.terminate();
    worker = null;
    for (const p of pending.values()) p.reject(new Error('The worker failed'));
    pending.clear();
  };
  const start = (): Worker | null => {
    if (broken) return null;
    if (worker) return worker;
    try {
      const w = new Worker(new URL('./generation.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (
        e: MessageEvent<{ id: number; layout?: string; ms?: number; error?: string }>,
      ) => {
        const p = pending.get(e.data.id);
        if (!p) return;
        pending.delete(e.data.id);
        if (e.data.layout === undefined) p.reject(new Error(e.data.error ?? 'No layout'));
        else p.resolve({ layout: e.data.layout, ms: e.data.ms ?? 0 });
      };
      w.onerror = fail;
      w.onmessageerror = fail;
      worker = w;
      return w;
    } catch {
      broken = true;
      return null;
    }
  };
  return {
    ink(profile, trip, room) {
      const w = start();
      if (!w) return syncInker.ink(profile, trip, room);
      const id = next++;
      const viaWorker = new Promise<{ layout: string; ms: number }>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        w.postMessage({ id, profile, trip, room });
      });
      return viaWorker.catch(() => syncInker.ink(profile, trip, room));
    },
  };
}

/** True when `room` of the save's drawn trip is on the page and not yet inked. */
export function needsRoom(save: SaveData, room: number): boolean {
  const t = save.trip;
  if (!t || t.district !== 'inkedPage') return false;
  try {
    const rooms = parseInkedState(t.kit?.state).rooms;
    return room >= 0 && room < rooms.length && rooms[room] === null;
  } catch {
    return false;
  }
}

/** The layout stored for `room` of the save's drawn trip, or null. */
export function storedRoom(save: SaveData, room: number): string | null {
  const t = save.trip;
  if (!t || t.district !== 'inkedPage') return null;
  try {
    return parseInkedState(t.kit?.state).rooms[room] ?? null;
  } catch {
    return null;
  }
}

/**
 * Stores `layout` as room `room` only when the save's trip is still a drawn trip with this `seed`
 * and no layout for the room; otherwise the save as given (a stale result is dropped, not an error).
 */
export function applyRoom(save: SaveData, seed: number, room: number, layout: string): SaveData {
  const t = save.trip;
  if (!t || t.seed !== seed || !needsRoom(save, room)) return save;
  return { ...save, trip: storeRoom(t, room, layout) };
}

/** Inks `room` of the save's drawn trip through `inker` and stores it (see `applyRoom`). */
export async function requestRoom(
  save: SaveData,
  room: number,
  inker: RoomInker,
): Promise<SaveData> {
  const trip = save.trip;
  if (!trip || !needsRoom(save, room)) return save;
  const { layout } = await inker.ink(save.profile, trip, room);
  return applyRoom(save, trip.seed, room, layout);
}
