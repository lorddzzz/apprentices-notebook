import { BATH_HEART } from '$data/districts/bathhouses';
import { type BoardSpec, parseBoard, parseCell } from '../../notation';
import { cellIndex, type Placement, placeFrame, placementsFrom, type Structure } from '../frame';
import type { HeartSetup } from '../types';
import { BOIL_OVER_RULE_ID } from './types';

/**
 * The bathhouses' heart frame (KIT-R3d; P7): a steam pool (the authored pool's bounding box scaled
 * to the board, a solid rectangle so it is 4-connected, at least four tiles) is stamped with the
 * Bath-Steward on it; the vents and the bather settle by placement, off the pool.
 */

const SALT = 7130;

interface Source {
  steward: Placement;
  placements: Placement[];
  box: { x0: number; y0: number; x1: number; y1: number };
}

const steamOf = () => parseCell('~', { x: 0, y: 0 }).tile.state;

/** Read from the authored heart on first use: the notation parser is not ready at module load. */
let source: Source | null = null;
function sourceOfHeart(): Source {
  if (source) return source;
  const layout = BATH_HEART.variants?.[0]?.layout;
  if (!layout) throw new Error('the bathhouses have no authored heart');
  const board = parseBoard(layout);
  const [steward, ...rest] = placementsFrom(board);
  if (!steward?.token.startsWith('H')) throw new Error('the bathhouses heart has no Steward');
  let x0 = board.width;
  let y0 = board.height;
  let x1 = 0;
  let y1 = 0;
  board.tiles.forEach((t, i) => {
    if (t.state?.id !== 'cloud') return;
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
    steward,
    // The pool is stamped, so a steam tile on its own is not scattered (a bather keeps no cloud).
    placements: rest
      .filter((p) => !p.token.startsWith('~'))
      .map((p) => ({ ...p, token: p.token.replace('~', '') })),
    box: { x0: x0 / wMax, y0: y0 / hMax, x1: x1 / wMax, y1: y1 / hMax },
  };
  return source;
}

function stampPool(out: BoardSpec, mirror: boolean): void {
  const { steward, box } = sourceOfHeart();
  const w = out.width;
  const h = out.height;
  let x0 = Math.round(box.x0 * (w - 1));
  let x1 = Math.round(box.x1 * (w - 1));
  let y0 = Math.round(box.y0 * (h - 1));
  let y1 = Math.round(box.y1 * (h - 1));
  // At least 2x2 (four tiles), kept inside the board.
  if (x1 - x0 < 1)
    [x0, x1] = [Math.max(0, Math.min(x0, w - 2)), Math.max(1, Math.min(x0, w - 2) + 1)];
  if (y1 - y0 < 1)
    [y0, y1] = [Math.max(0, Math.min(y0, h - 2)), Math.max(1, Math.min(y0, h - 2) + 1)];
  if (mirror) [x0, x1] = [w - 1 - x1, w - 1 - x0];
  const pool: { x: number; y: number }[] = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const tile = out.tiles[cellIndex(out, { x, y })];
      const state = steamOf();
      if (tile && state) tile.state = state;
      pool.push({ x, y });
    }
  }
  const fx = mirror ? 1 - steward.at.x : steward.at.x;
  const want = { x: Math.round(fx * (w - 1)), y: Math.round(steward.at.y * (h - 1)) };
  const dist = (c: { x: number; y: number }) => Math.abs(c.x - want.x) + Math.abs(c.y - want.y);
  const at = pool.reduce((best, c) => (dist(c) < dist(best) ? c : best), pool[0] ?? want);
  const unit = parseCell('H', at).unit;
  if (unit) out.units.push(unit);
}

const stamp: Structure = stampPool;

export const bathHeartFrame = (board: BoardSpec, seed: number): BoardSpec =>
  placeFrame(board, seed, SALT, sourceOfHeart().placements, stamp);

export const BATH_HEART_SETUP: HeartSetup = {
  foe: 'bathSteward',
  rules: [BOIL_OVER_RULE_ID],
  frame: bathHeartFrame,
};
