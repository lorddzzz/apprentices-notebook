import { APPRENTICES, type ApprenticeId } from '$data';
import { byReadingOrder, type Coord, label } from './grid';
import { type BoardSpec, type BoardUnit, parseBoard, parseLabel } from './notation';
import { createRng, deriveSeed } from './rng';
import type { Trip } from './types';

/** Rooms and start points (HC plan §4 "Boards", P3–P5, party.md §0b and §1). */

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
/** The most apprentices a trip fields (party.md §0b). */
export const MAX_PARTY = 3;

/** One authoring problem `checkRoom` finds; `cell` names the offending tile when there is one. */
export interface RoomProblem {
  cell: Coord | null;
  message: string;
}

const CELL_IN_ERROR = /in cell ([A-Z]\d+)/;

/**
 * The room format check (HC P5): width 5–7, height 6–9, at least four `P`, no apprentice
 * tokens, every `P` on a standable tile. Empty when the layout is fine.
 */
export function checkRoom(layout: string): RoomProblem[] {
  let board: BoardSpec;
  try {
    board = parseBoard(layout);
  } catch (err) {
    // The notation refuses a `P` on a plate, gate or grate (or with a unit), naming the cell.
    const message = err instanceof Error ? err.message : String(err);
    const cell = CELL_IN_ERROR.exec(message)?.[1];
    return [{ cell: cell ? parseLabel(cell) : null, message }];
  }
  const L = ROOM_LIMITS;
  const problems: RoomProblem[] = [];
  if (board.width < L.minWidth || board.width > L.maxWidth) {
    problems.push({
      cell: null,
      message: `Room is ${board.width} wide, want ${L.minWidth}–${L.maxWidth}`,
    });
  }
  if (board.height < L.minHeight || board.height > L.maxHeight) {
    problems.push({
      cell: null,
      message: `Room is ${board.height} tall, want ${L.minHeight}–${L.maxHeight}`,
    });
  }
  for (const u of board.units) {
    if (u.kind !== 'member') continue;
    const token = APPRENTICES[u.def as ApprenticeId].token;
    problems.push({
      cell: { ...u.at },
      message: `Apprentice token "${token}" in cell ${label(u.at)}: rooms use start points (P)`,
    });
  }
  if (board.starts.length < L.minStarts) {
    problems.push({
      cell: null,
      message: `Room has ${board.starts.length} start points, want at least ${L.minStarts}`,
    });
  }
  return problems;
}

/** Fisher–Yates over a copy, through the seeded rng. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rng = createRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const swap = out[i] as T;
    out[i] = out[j] as T;
    out[j] = swap;
  }
  return out;
}

/**
 * Places a lineup (1–3, slot order) on the board's start points: a seeded shuffle of `starts`,
 * taken in order (HC P4). Same board, lineup and seed: same spots. The seed is already salted
 * (`startSeedFor`, or `deriveSeed(battle seed, START_SALT)` in `createBattle`).
 */
export function placeParty(
  board: BoardSpec,
  lineup: readonly ApprenticeId[],
  seed: number,
): BoardSpec {
  if (lineup.length < 1 || lineup.length > MAX_PARTY) {
    throw new Error(`A party is 1–${MAX_PARTY} apprentices, got ${lineup.length}`);
  }
  if (new Set(lineup).size !== lineup.length)
    throw new Error('An apprentice is in the party twice');
  const fixed = board.units.find((u) => u.kind === 'member');
  if (fixed) throw new Error(`The board already places an apprentice in cell ${label(fixed.at)}`);
  if (board.starts.length < lineup.length) {
    throw new Error(
      `${lineup.length} apprentices need as many start points, the board has ${board.starts.length}`,
    );
  }
  const spots = shuffled(board.starts, seed);
  const placed = lineup.map(
    (def, i): BoardUnit => ({
      kind: 'member',
      def,
      at: { ...(spots[i] as Coord) },
      mark: null,
      collar: false,
      shackle: false,
      shield: 0,
    }),
  );
  const units = [...board.units, ...placed].sort((a, b) => byReadingOrder(a.at, b.at));
  return { ...board, units, starts: board.starts.map((c) => ({ ...c })) };
}

/** The seed a trip room draws its start points from: derived from the trip seed, never stored. */
export function startSeedFor(trip: Trip, encounter: number): number {
  return deriveSeed(trip.seed, START_SALT + encounter);
}
