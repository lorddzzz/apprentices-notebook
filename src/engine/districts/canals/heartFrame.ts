import { CANAL_ROOMS } from '$data/districts/canals';
import type { Dir } from '../../grid';
import { type BoardSpec, parseBoard, parseCell } from '../../notation';
import { cellIndex, type Placement, placeFrame, placementsFrom, type Structure } from '../frame';

/**
 * The canals' heart frame (KIT-R3c; P7): the current is stamped as one closed clockwise loop (the
 * authored loop's bounding box scaled to the board, at least 3x3, off the bottom two rows) with the
 * lamp-mother standing on it; the lamps on the rim, the Snuffers and the moths settle by placement.
 */

const SALT = 7120;

interface Source {
  /** The lamp-mother's preferred spot, as a fraction of the board. */
  mother: Placement;
  /** The rest of the authored heart: its water is the loop, which is stamped instead. */
  placements: Placement[];
  /** The authored loop's bounding box as fractions. */
  box: { x0: number; y0: number; x1: number; y1: number };
}

/** Read from the authored heart on first use: the notation parser is not ready at module load. */
let source: Source | null = null;
function sourceOfHeart(): Source {
  if (source) return source;
  const layout = CANAL_ROOMS.find((r) => r.heart)?.variants?.[0]?.layout;
  if (!layout) throw new Error('the canals have no authored heart');
  const board = parseBoard(layout);
  const [mother, ...rest] = placementsFrom(board);
  if (!mother?.token.startsWith('M')) throw new Error('the canals heart has no lamp-mother');
  let x0 = board.width;
  let y0 = board.height;
  let x1 = 0;
  let y1 = 0;
  board.tiles.forEach((t, i) => {
    if (t.terrain.water === null) return;
    const x = i % board.width;
    const y = Math.floor(i / board.width);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  const wMax = Math.max(1, board.width - 1);
  const hMax = Math.max(1, board.height - 1);
  source = {
    mother,
    placements: rest.filter((p) => parseCell(p.token, { x: 0, y: 0 }).tile.terrain.water === null),
    box: { x0: x0 / wMax, y0: y0 / hMax, x1: x1 / wMax, y1: y1 / hMax },
  };
  return source;
}

/** The loop's rectangle on a board of this size: at least 3x3, never on the bottom two rows. */
function loopBox(w: number, h: number, mirror: boolean) {
  const { box } = sourceOfHeart();
  let x0 = Math.round(box.x0 * (w - 1));
  let x1 = Math.round(box.x1 * (w - 1));
  if (x1 - x0 < 2) {
    x0 = Math.max(0, Math.min(x0, w - 3));
    x1 = x0 + 2;
  }
  let y0 = Math.round(box.y0 * (h - 1));
  let y1 = Math.min(Math.round(box.y1 * (h - 1)), h - 3);
  y1 = Math.max(y1, 2);
  y0 = Math.max(0, Math.min(y0, y1 - 2));
  return mirror ? { x0: w - 1 - x1, x1: w - 1 - x0, y0, y1 } : { x0, x1, y0, y1 };
}

/** Clockwise: along the top to the right, down the right side, back along the bottom, up the left. */
function stampLoop(out: BoardSpec, mirror: boolean): void {
  if (out.width < 3 || out.height < 5) return;
  const { x0, x1, y0, y1 } = loopBox(out.width, out.height, mirror);
  const ring: { x: number; y: number }[] = [];
  const flow = (x: number, y: number, dir: Dir): void => {
    const tile = out.tiles[cellIndex(out, { x, y })];
    if (tile) tile.terrain.water = dir;
    ring.push({ x, y });
  };
  for (let x = x0; x < x1; x++) flow(x, y0, 'right');
  for (let y = y0; y < y1; y++) flow(x1, y, 'down');
  for (let x = x1; x > x0; x--) flow(x, y1, 'left');
  for (let y = y1; y > y0; y--) flow(x0, y, 'up');
  const { mother } = sourceOfHeart();
  const fx = mirror ? 1 - mother.at.x : mother.at.x;
  const want = {
    x: Math.round(fx * (out.width - 1)),
    y: Math.round(mother.at.y * (out.height - 1)),
  };
  const dist = (c: { x: number; y: number }) => Math.abs(c.x - want.x) + Math.abs(c.y - want.y);
  const at = ring.reduce((best, c) => (dist(c) < dist(best) ? c : best), ring[0] ?? want);
  const unit = parseCell('M', at).unit;
  if (unit) out.units.push(unit);
}

const stamp: Structure = stampLoop;

export const canalsHeartFrame = (board: BoardSpec, seed: number): BoardSpec =>
  placeFrame(board, seed, SALT, sourceOfHeart().placements, stamp);
