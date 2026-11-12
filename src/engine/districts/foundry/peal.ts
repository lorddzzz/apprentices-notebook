import { DEFAULT_HANG, type Note } from '$data/districts/foundry';
import type { EventLog } from '../../events';
import { byReadingOrder, type Coord } from '../../grid';
import type { BoardEdit, RoomSetup, ShapeInput, TilePiece } from '../types';
import {
  type BellRungEvent,
  type FoundryTripState,
  GREAT_BELL_PIECE,
  type GreatBellData,
  parseFoundryState,
} from './types';

/**
 * The peal across the trip (foundry-plan P7, P8; BF-8): a won room whose great bell rang writes
 * `{ room, note }` to trip state, and the heart hangs one allied great bell per note rung. There is
 * no offer card and no currency; a return home or a wipe drops the state with the trip.
 */

const isBellRung = (e: EventLog[number]): e is EventLog[number] & BellRungEvent =>
  (e as { type: string }).type === 'foundry:bellRung';

/** P7: the won room's rung great bell (the `foundry:bellRung` in its log) joins the trip's peal. */
export function pealAfterRoom(
  input: ShapeInput<FoundryTripState>,
  log: EventLog,
  won: boolean,
): FoundryTripState {
  const state = parseFoundryState(input.state);
  const rung = won ? log.find(isBellRung) : undefined;
  if (!rung) return state;
  return parseFoundryState({ rung: [...state.rung, { room: input.room, note: rung.data.note }] });
}

/** A `{hook}` tile on the heart's board: `note` 0 is a bare hook (filled in reading order, P7). */
export interface HookTile {
  at: Coord;
  note: number;
}

/**
 * P7: an allied great bell at each hook for every note rung. A hook that names a note takes that
 * note if it was rung; the rest of the rung notes go to the bare hooks in reading order.
 */
export function alliedBellEdits(state: FoundryTripState, hooks: readonly HookTile[]): BoardEdit[] {
  const notes: number[] = state.rung.map((r) => r.note).sort((a, b) => a - b);
  const named = new Set(hooks.map((h) => h.note).filter((n) => n > 0));
  const spare: number[] = notes.filter((n) => !named.has(n));
  const edits: BoardEdit[] = [];
  const bell = (note: Note): TilePiece => {
    const data: GreatBellData = { note, hang: DEFAULT_HANG[note], allied: true, rung: true };
    return { id: GREAT_BELL_PIECE, data: { ...data } };
  };
  for (const h of [...hooks].sort((a, b) => byReadingOrder(a.at, b.at))) {
    const note = h.note > 0 ? (notes.includes(h.note) ? h.note : null) : (spare.shift() ?? null);
    if (note !== null) edits.push({ at: { ...h.at }, piece: bell(note as Note) });
  }
  return edits;
}

/**
 * The heart's hook tiles. A `RoomSetup` cannot read the board, so the heart's authored layouts
 * (BF-12) list them here, by layout; empty until then, which hangs nothing.
 */
export const HEART_HOOKS: readonly HookTile[] = [];

/** P7: the heart hangs the peal; every other room sets up as it is authored. */
export function pealRoomSetup(input: ShapeInput<FoundryTripState>): RoomSetup {
  if (input.room < input.length - 1) return {};
  const boardEdits = alliedBellEdits(parseFoundryState(input.state), HEART_HOOKS);
  return boardEdits.length > 0 ? { boardEdits } : {};
}
