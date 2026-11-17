import type { Json, TripKitState } from '../districts/types';
import type { Profile, Trip } from '../types';
import { readDrawing } from './profile';
import type { GenInput, InkedTripState } from './types';

/**
 * A drawn trip's state and rooms (P31): a room is generated outside `encounter` (which has no
 * profile), stored in `InkedTripState.rooms`, and replayed from there on every reload. `inkRoom`,
 * which runs the generator, lives in `generate.ts`: the `inkedPage` district module imports this
 * file while the district kit is still loading, so it must not reach the generator's frames.
 */

const badSave = (): never => {
  throw new Error('Not a valid save');
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isJson = (v: unknown): v is Json => {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(isJson);
  return isRecord(v) && Object.values(v).every(isJson);
};

/**
 * `Trip.kit.state` of a drawn trip, strictly: a slot 0-2, a drawing that `readDrawing` accepts,
 * one entry per room (a layout string or `null`) and the lent shape's JSON state. Throws on
 * anything else.
 */
export function parseInkedState(raw: unknown): InkedTripState {
  if (!isRecord(raw)) return badSave();
  const { slot, drawing: rawDrawing, rooms, inner } = raw;
  if (slot !== 0 && slot !== 1 && slot !== 2) return badSave();
  const drawing = readDrawing(rawDrawing) ?? badSave();
  if (!Array.isArray(rooms) || rooms.length !== drawing.length) return badSave();
  if (!rooms.every((r) => r === null || (typeof r === 'string' && r.length > 0))) return badSave();
  if (!isJson(inner)) return badSave();
  return { slot, drawing, rooms: [...rooms] as (string | null)[], inner };
}

/** The state of a drawn trip (any other district's trip throws). */
function stateOf(t: Trip): InkedTripState {
  if (t.district !== 'inkedPage') throw new Error('Not a drawn trip');
  return parseInkedState(t.kit?.state);
}

function checkRoom(state: InkedTripState, room: number): void {
  if (!Number.isInteger(room) || room < 0 || room >= state.rooms.length) {
    throw new RangeError(`Room ${room + 1} is not on this page`);
  }
}

/** What the generator is asked for room `room` (default: the trip's current room), P31. */
export function roomInput(p: Profile, t: Trip, room: number = t.encounter): GenInput {
  const state = stateOf(t);
  checkRoom(state, room);
  // The Crossroads choice taken before this room, for a shape whose choice changes the spec (P15).
  const choice = t.kit?.choices.find((c) => c.after === room - 1)?.id;
  return {
    profile: p,
    drawing: state.drawing,
    party: t.party,
    seed: t.seed,
    room,
    ...(choice === undefined ? {} : { choice }),
  };
}

/** Stores room `room`'s layout; throws if a different layout is stored there already. */
export function storeRoom(t: Trip, room: number, layout: string): Trip {
  const state = stateOf(t);
  checkRoom(state, room);
  const stored = state.rooms[room] ?? null;
  if (stored === layout) return t;
  if (stored !== null) throw new Error(`Room ${room + 1} is already inked`);
  const next: InkedTripState = {
    ...state,
    rooms: state.rooms.map((r, i) => (i === room ? layout : r)),
  };
  const kit = t.kit as TripKitState;
  return { ...t, kit: { ...kit, state: next as unknown as Json } };
}
