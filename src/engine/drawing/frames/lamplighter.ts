import { COSTS } from '$data/drawing';
import type { HeartSetup } from '../../districts/types';
import { type BoardSpec, parseBoard, parseCell } from '../../notation';
import { at, coords, isPlain, needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';
import { CANALS_SIZE, canalsHeart, farFromFoes } from './lampMother';

/**
 * The Lamplighter's frame (P35, EN-K2): the lamp-mother's loop, lamps, Snuffers and moths with the
 * Lamplighter standing on dry ground inside the loop instead of her. He plays his usual rival
 * routine (P16: his page is not awarded to a drawn trip, which the sandbox already guarantees).
 * `KIT` is read lazily (see `generate.ts`'s import cycle).
 */

/** The dry tile nearest the middle of the board, where the loop leaves him room to walk. */
function lamplighterAt(board: BoardSpec) {
  const mid = { x: (board.width - 1) / 2, y: (board.height - 1) / 2 };
  const dist = (c: { x: number; y: number }) => Math.abs(c.x - mid.x) + Math.abs(c.y - mid.y);
  const free = coords(board)
    .filter((c) => {
      const t = at(board, c);
      return (
        t !== undefined && isPlain(t) && !board.units.some((u) => u.at.x === c.x && u.at.y === c.y)
      );
    })
    .sort((a, b) => dist(a) - dist(b) || a.y - b.y || a.x - b.x);
  return free[0];
}

function lamplighterFrame(heart: HeartSetup, board: BoardSpec, seed: number): BoardSpec {
  const framed = heart.frame(board, seed);
  const rest = { ...framed, units: framed.units.filter((u) => u.def !== 'mother') };
  const where = lamplighterAt(rest);
  const unit = where ? parseCell('L', where).unit : undefined;
  return farFromFoes(unit ? { ...rest, units: [...rest.units, unit] } : rest);
}

/**
 * The authored fallback (P10): the Lamplighter alone in the middle of the loop, lamps on the rim.
 * Won by the scripted solve in `tests/drawing/kits-a.test.ts`.
 */
const FALLBACK = [
  'l .  .  l  .  .  l',
  '. w> w> w> w> wv .',
  '. w^ .  .  .  wv .',
  '. w^ .  .  .  wv .',
  '. w^ .  L  .  wv .',
  '. w^ .  .  .  wv .',
  '. w^ w< w< w< w< .',
  '. .  .  .  .  .  .',
  'l P  P  P  P  .  l',
].join('\n');

let setup: HeartSetup | undefined;

export const LAMPLIGHTER_FRAME: HeartFrame = {
  master: 'lamplighter',
  cost: COSTS.hearts.lamplighter,
  needs: needsOf('lamplighter'),
  size: CANALS_SIZE,
  get setup(): HeartSetup {
    if (!setup) {
      const heart = canalsHeart();
      setup = {
        foe: 'lamplighter',
        rules: heart.rules,
        frame: (b, seed) => lamplighterFrame(heart, b, seed),
      };
    }
    return setup;
  },
  escorts: [],
  ruleAt: [],
  get fallback(): BoardSpec {
    return parseBoard(FALLBACK);
  },
};
