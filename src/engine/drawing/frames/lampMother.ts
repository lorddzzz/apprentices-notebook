import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import type { HeartSetup } from '../../districts/types';
import { byReadingOrder, type Coord } from '../../grid';
import { type BoardSpec, parseBoard } from '../../notation';
import { at, coords, isPlain, needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The lamp-mother's frame (P35, EN-K2): the canals' own `HeartSetup` on a 7 x 9 board. The current
 * is the setup's own closed loop, so the drawing's rule has no place to add (`ruleAt` is empty)
 * and the frame owns the current. The canals' placement can leave a Snuffer by the bottom rows
 * where the start points go, so `farFromFoes` moves the start points to the tiles farthest from
 * every foe (a frame owns its starts). `KIT` is read lazily (see `generate.ts`'s import cycle).
 */

export const CANALS_SIZE = { width: 7, height: 9 } as const;

const manhattan = (a: Coord, b: Coord): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Four start points on plain tiles, three or more from every unit, the farthest first. */
export function farFromFoes(board: BoardSpec): BoardSpec {
  const near = (c: Coord): number => Math.min(...board.units.map((u) => manhattan(u.at, c)));
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

/** The canals' heart setup, read when first used. */
export function canalsHeart(): HeartSetup {
  const heart = KIT.modules.canals?.heart;
  if (!heart) throw new Error('the canals have no heart setup');
  return heart;
}

/**
 * The authored fallback (P10): the lamp-mother alone on her loop with the lamps on the rim. The
 * lite bot needs 17 or more rounds for her, so this board is won by the scripted solve in
 * `tests/drawing/kits-a.test.ts`, not by the bot within the heart's 16 rounds.
 */
const FALLBACK = [
  'l .  .  l  .  .  l',
  '. w> w> w> w> wv .',
  '. Mw^ .  .  .  wv .',
  '. w^ .  .  .  wv .',
  '. w^ .  .  .  wv .',
  '. w^ .  .  .  wv .',
  '. w^ w< w< w< w< .',
  '. .  .  .  .  .  .',
  'l P  P  P  P  .  l',
].join('\n');

let setup: HeartSetup | undefined;

export const LAMP_MOTHER_FRAME: HeartFrame = {
  master: 'mother',
  cost: COSTS.hearts.mother,
  needs: needsOf('mother'),
  size: CANALS_SIZE,
  get setup(): HeartSetup {
    if (!setup) {
      const heart = canalsHeart();
      setup = { ...heart, frame: (b, seed) => farFromFoes(heart.frame(b, seed)) };
    }
    return setup;
  },
  escorts: [],
  ruleAt: [],
  get fallback(): BoardSpec {
    return parseBoard(FALLBACK);
  },
};
