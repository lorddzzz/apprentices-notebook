import { type Coord, sameCoord } from '../../grid';
import { type BoardSpec, parseCell } from '../../notation';
import { createRng, deriveSeed } from '../../rng';
import { ROOM_LIMITS } from '../../rooms';
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

interface Placement {
  token: string;
  /** Preferred spot as a fraction of width and height (0 to 1), before mirroring. */
  at: { x: number; y: number };
}

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

const dist = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const cellIndex = (b: BoardSpec, c: Coord): number => c.y * b.width + c.x;

function bare(b: BoardSpec, c: Coord): boolean {
  const t = b.tiles[cellIndex(b, c)];
  return (
    t !== undefined &&
    t.piece === null &&
    !b.units.some((u) => sameCoord(u.at, c)) &&
    !b.starts.some((s) => sameCoord(s, c))
  );
}

/** The bare tile nearest `want`, ties in reading order. Null only on a full board. */
function settle(b: BoardSpec, want: Coord): Coord | null {
  let best: Coord | null = null;
  for (let y = 0; y < b.height; y++) {
    for (let x = 0; x < b.width; x++) {
      const c = { x, y };
      if (bare(b, c) && (!best || dist(c, want) < dist(best, want))) best = c;
    }
  }
  return best;
}

export function inkHeartFrame(board: BoardSpec, seed: number): BoardSpec {
  const rng = createRng(deriveSeed(seed, SALT));
  const mirror = rng.int(0, 1) === 1;
  const lean = rng.int(-1, 1);
  const out: BoardSpec = {
    ...board,
    tiles: board.tiles.map((t) => ({ ...t, terrain: { ...t.terrain } })),
    units: [...board.units],
    starts: [...board.starts],
  };
  PLACEMENTS.forEach((p, i) => {
    const fx = mirror ? 1 - p.at.x : p.at.x;
    const x = Math.round(fx * (out.width - 1)) + (i === 0 ? lean : 0);
    const want = {
      x: Math.min(out.width - 1, Math.max(0, x)),
      y: Math.round(p.at.y * (out.height - 1)),
    };
    const at = settle(out, want);
    if (!at) return;
    const cell = parseCell(p.token, at);
    if (cell.unit) out.units.push(cell.unit);
    const tile = out.tiles[cellIndex(out, at)];
    if (tile && cell.tile.piece) tile.piece = cell.tile.piece;
  });
  out.units.sort((a, b) => a.at.y - b.at.y || a.at.x - b.at.x);
  for (let y = out.height - 1; y >= 0 && out.starts.length < ROOM_LIMITS.minStarts; y--) {
    for (let x = 0; x < out.width && out.starts.length < ROOM_LIMITS.minStarts; x++) {
      if (bare(out, { x, y })) out.starts.push({ x, y });
    }
  }
  out.starts.sort((a, b) => a.y - b.y || a.x - b.x);
  return out;
}

/** The heart's foes by id, for the test and for EN's `HeartFrame.escorts`. */
export const INK_HEART_FOES = HEART_ROSTER;

export const INK_HEART: HeartSetup = {
  foe: 'postmaster',
  rules: [CLOCK_RULE_ID],
  frame: inkHeartFrame,
};
