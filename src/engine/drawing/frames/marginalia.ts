import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import { type BoardSpec, emptyTile } from '../../notation';
import { needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The Marginalia's frame (P35, EN-W1): the Seam's own `HeartSetup` on a 7 x 7 board, no escorts and
 * no place for the drawing's rule. The fallback is the frame's first board (the setup on a blank
 * board at seed 0), so a fixture trip can finish before EN-K1 authors the real one.
 */

const SIZE = { width: 7, height: 7 } as const;

const blank = (): BoardSpec => ({
  ...SIZE,
  tiles: Array.from({ length: SIZE.width * SIZE.height }, emptyTile),
  units: [],
  starts: [],
});

const SEAM_HEART = KIT.modules.seam?.heart;
if (!SEAM_HEART) throw new Error('the Seam has no heart setup');

let first: BoardSpec | undefined;

export const MARGINALIA_FRAME: HeartFrame = {
  master: 'marginalia',
  cost: COSTS.hearts.marginalia,
  needs: needsOf('marginalia'),
  size: SIZE,
  setup: SEAM_HEART,
  escorts: [],
  ruleAt: [],
  /** Built on first read: the notation parser is not ready at module load. */
  get fallback(): BoardSpec {
    first ??= SEAM_HEART.frame(blank(), 0);
    return structuredClone(first);
  },
};
