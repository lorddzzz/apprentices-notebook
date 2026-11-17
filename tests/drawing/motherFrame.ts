import { COSTS } from '$data/drawing';
import { KIT } from '$engine/districts/kit';
import { HEART_FRAMES } from '$engine/drawing';
import { at, coords, isPlain, needsOf } from '$engine/drawing/kits/seam';
import { byReadingOrder } from '$engine/grid';
import { type BoardSpec, emptyTile } from '$engine/notation';

/**
 * Pack E's fixtures draw hearts of the Marginalia and the lamp-mother, but the canals' frame is a
 * kit pack's (Pack I). Until it lands, this import registers a stand-in built from the canals'
 * own `HeartSetup`, the way EN-W1 seeded the Marginalia's; a real frame in `HEART_FRAMES` wins.
 * The canals' placement leaves a Snuffer next to the bottom rows where the start points go, so the
 * stand-in moves the start points to the tiles farthest from every foe (a frame owns its starts).
 */

const SIZE = { width: 7, height: 9 } as const;
const blank = (): BoardSpec => ({
  ...SIZE,
  tiles: Array.from({ length: SIZE.width * SIZE.height }, emptyTile),
  units: [],
  starts: [],
});

const canals = KIT.modules.canals?.heart;
if (!canals) throw new Error('the canals have no heart setup');

const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Four start points on plain tiles, three or more from every unit, the farthest first. */
function farFromFoes(board: BoardSpec): BoardSpec {
  const near = (c: { x: number; y: number }): number =>
    Math.min(...board.units.map((u) => manhattan(u.at, c)));
  const free = coords(board).filter((c) => {
    const t = at(board, c);
    return t !== undefined && isPlain(t) && !board.units.some((u) => manhattan(u.at, c) === 0);
  });
  const starts = free
    .filter((c) => near(c) >= 3)
    .sort((a, b) => near(b) - near(a) || b.y - a.y || a.x - b.x)
    .slice(0, 4)
    .sort(byReadingOrder);
  return { ...board, starts: starts.length >= 4 ? starts : board.starts };
}

const setup = {
  ...canals,
  frame: (b: BoardSpec, seed: number) => farFromFoes(canals.frame(b, seed)),
};

let first: BoardSpec | undefined;
HEART_FRAMES.mother ??= {
  master: 'mother',
  cost: COSTS.hearts.mother,
  needs: needsOf('mother'),
  size: SIZE,
  setup,
  escorts: [],
  ruleAt: [],
  get fallback(): BoardSpec {
    first ??= setup.frame(blank(), 0);
    return structuredClone(first);
  },
};
