import type { BoardSpec } from '../../notation';
import { type Placement, placeFrame } from '../frame';
import type { BotTerms, HeartSetup } from '../types';
import { CLOCK_RULE_ID } from './clock';
import { HEART_ROSTER } from './postmaster';

/**
 * The postmaster's heart frame (KIT-R3a; the exemplar the other districts' frames copy). `frame`
 * takes any board of an allowed size (5-7 wide, 6-9 tall, or smaller for a bare test board) and
 * returns a copy with the master's pieces and terrain placed, pure and seeded:
 *   1. a `PLACEMENTS` list of notation tokens with a preferred spot as a fraction of the board;
 *   2. each lands on its spot, or on the nearest bare tile in reading order (`settle`), so no
 *      size can lose a piece or stack two;
 *   3. start points are topped up on the bottom rows to `ROOM_LIMITS.minStarts`.
 * The seed only mirrors the layout and picks the postmaster's column; nothing else varies.
 */

const SALT = 7100;
/** The ink quarter's bot reads no extra state (it has no gauge): the terms are registered, empty. */
export const INK_BOT: BotTerms = {};

/** Postmaster first (token `p`), then the roster, then the stamps. `x` dead letter, `z` Sealer. */
const PLACEMENTS: readonly Placement[] = [
  { token: 'p', at: { x: 0.5, y: 0.15 } },
  { token: 'z', at: { x: 0.85, y: 0 } },
  { token: 'x', at: { x: 0.15, y: 0 } },
  { token: 'x', at: { x: 0.2, y: 0.3 } },
  { token: '{return}', at: { x: 0.5, y: 0.45 } },
  { token: '{order}', at: { x: 0.15, y: 0.6 } },
  { token: '{order}', at: { x: 0.85, y: 0.6 } },
];

export function inkHeartFrame(board: BoardSpec, seed: number): BoardSpec {
  return placeFrame(board, seed, SALT, PLACEMENTS);
}

/** The heart's foes by id, for the test and for EN's `HeartFrame.escorts`. */
export const INK_HEART_FOES = HEART_ROSTER;

export const INK_HEART: HeartSetup = {
  foe: 'postmaster',
  rules: [CLOCK_RULE_ID],
  frame: inkHeartFrame,
};
