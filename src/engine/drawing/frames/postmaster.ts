import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import type { HeartSetup } from '../../districts/types';
import { type BoardSpec, parseBoard } from '../../notation';
import { needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The postmaster's frame (P35, EN-K3): the ink quarter's own `HeartSetup` on a 7 x 9 board. The
 * setup places the postmaster, his dead letters and Sealer, and the return and order writs, so the
 * frame has no escorts of its own and no place for the drawing's rule (the writs are the heart's).
 * `KIT` is read lazily (see `generate.ts`'s import cycle).
 */

const SIZE = { width: 7, height: 9 } as const;

/**
 * The authored fallback (P10): the postmaster, his Sealer and two dead letters, the return and the two orders, start points
 * across the bottom. Won by the scripted solve in `tests/drawing/kits-a.test.ts`.
 */
const FALLBACK = [
  '. x       . .        . z       .',
  '. .       . .        p .       .',
  '. x       . .        . .       .',
  '. .       . .        . .       .',
  '. .       . {return} . .       .',
  '. {order} . .        . {order} .',
  '. .       . .        . .       .',
  '. .       . .        . .       .',
  'P P       P P        . .       .',
].join('\n');

let setup: HeartSetup | undefined;

export const POSTMASTER_FRAME: HeartFrame = {
  master: 'postmaster',
  cost: COSTS.hearts.postmaster,
  needs: needsOf('postmaster'),
  size: SIZE,
  get setup(): HeartSetup {
    if (!setup) {
      const heart = KIT.modules.inkQuarter?.heart;
      if (!heart) throw new Error('the ink quarter has no heart setup');
      setup = heart;
    }
    return setup;
  },
  escorts: [],
  ruleAt: [],
  get fallback(): BoardSpec {
    return parseBoard(FALLBACK);
  },
};
