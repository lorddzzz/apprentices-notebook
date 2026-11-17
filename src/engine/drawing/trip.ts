import type { Json } from '../districts/types';
import type { Profile, Trip } from '../types';
import { readDrawing } from './profile';
import { notBuilt } from './stub';
import type { GenInput, InkedTripState } from './types';

/**
 * A drawn trip's state and rooms (P31, EN-W1): `parseInkedState` is built; the three functions
 * that ink a room are stubs until EN-3. A room is generated outside `encounter` (which has no
 * profile), stored in `InkedTripState.rooms`, and replayed from there on every reload.
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

/** What the generator is asked for room `room` (default: the trip's current room), EN-3. */
export function roomInput(_p: Profile, _t: Trip, _room?: number): GenInput {
  return notBuilt('EN-3');
}

/** Stores room `room`'s layout; throws if a different layout is stored there already. EN-3. */
export function storeRoom(_t: Trip, _room: number, _layout: string): Trip {
  return notBuilt('EN-3');
}

/** Generates and stores room `room` (default: the current one); a room already stored returns `t` itself. EN-3. */
export function inkRoom(_p: Profile, _t: Trip, _room?: number): Trip {
  return notBuilt('EN-3');
}
