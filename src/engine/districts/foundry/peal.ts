import { DEFAULT_HANG, FOUNDRY_HEART, type Note } from '$data/districts/foundry';
import type { EventLog } from '../../events';
import { byReadingOrder, type Coord } from '../../grid';
import { variantFor } from '../../trip/place';
import type { BoardEdit, RoomSetup, ShapeInput, TilePiece } from '../types';
import {
  type BellRungEvent,
  type FoundryTripState,
  GREAT_BELL_PIECE,
  type GreatBellData,
  parseFoundryState,
  TUNE_RULE_ID,
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

/** Each heart layout's `{hook}` tiles in reading order (all bare, note 0), read off the authored layouts. */
const hooksOf = (layout: string): HookTile[] =>
  layout.split('\n').flatMap((row, y) =>
    row
      .trim()
      .split(/\s+/)
      .flatMap((cell, x) => (cell === '{hook}' ? [{ at: { x, y }, note: 0 }] : [])),
  );

/**
 * The heart's hook tiles, by layout (BF-12). A `RoomSetup` cannot read the board, so they are listed
 * here from the authored layouts; the trip's variant picks the list.
 */
export const HEART_HOOKS: readonly (readonly HookTile[])[] = (FOUNDRY_HEART.variants ?? []).map(
  (v) => hooksOf(v.layout),
);

/**
 * P7, P24: the heart hangs the peal on its layout's hooks and seeds the tune from the trip seed
 * (the tune rule is listed by the district); every other room sets up as it is authored.
 */
export function pealRoomSetup(input: ShapeInput<FoundryTripState>): RoomSetup {
  if (input.room < input.length - 1) return {};
  const hooks = HEART_HOOKS[variantFor(input.trip, input.room)] ?? [];
  const boardEdits = alliedBellEdits(parseFoundryState(input.state), hooks);
  return {
    ...(boardEdits.length > 0 ? { boardEdits } : {}),
    rulesConfig: { [TUNE_RULE_ID]: { seed: input.trip.seed } },
  };
}
