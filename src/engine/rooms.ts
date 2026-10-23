import type { ApprenticeId } from '$data';
import type { Coord } from './grid';
import type { BoardSpec } from './notation';
import type { Trip } from './types';

/**
 * Rooms and start points (HC plan §4 "Boards", P3–P5, party.md §0b). HC-W0 contract only:
 * HC-2 adds the `P` token and `BoardSpec.starts`, `BattleSpec.lineup`/`startSeed`, and fills these.
 */

/** Room size limits (party.md §1 "Start points and boards"). */
export const ROOM_LIMITS = {
  minWidth: 5,
  maxWidth: 7,
  minHeight: 6,
  maxHeight: 9,
  minStarts: 4,
} as const;
/** Salt for the start-point draw, kept apart from the variant draw and the AI's rolls (HC P4). */
export const START_SALT = 6000;

/** One authoring problem `checkRoom` finds; `cell` names the offending tile when there is one. */
export interface RoomProblem {
  cell: Coord | null;
  message: string;
}

const stub = (name: string): never => {
  throw new Error(`${name} is an HC-W0 stub (HC-2 builds it)`);
};

/**
 * The room format check (HC P5): width 5–7, height 6–9, at least four `P`, no apprentice
 * tokens, every `P` on a standable tile. Empty when the layout is fine.
 */
export function checkRoom(layout: string): RoomProblem[] {
  return stub(`checkRoom(${layout.length})`);
}

/**
 * Places a lineup (1–3, slot order) on the board's start points: a seeded shuffle of `starts`,
 * taken in order (HC P4). Same board, lineup and seed: same spots.
 */
export function placeParty(
  board: BoardSpec,
  lineup: readonly ApprenticeId[],
  seed: number,
): BoardSpec {
  return stub(`placeParty(${board.width}, ${lineup.length}, ${seed})`);
}

/** The seed a trip room draws its start points from: derived from the trip seed, never stored. */
export function startSeedFor(trip: Trip, encounter: number): number {
  return stub(`startSeedFor(${trip.seed}, ${encounter})`);
}
