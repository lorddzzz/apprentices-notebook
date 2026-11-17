import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import type { HeartSetup } from '../../districts/types';
import { type BoardSpec, parseBoard } from '../../notation';
import { needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The Marginalia's frame (P35, EN-W1, EN-K1): the Seam's own `HeartSetup` on a 7 x 7 board, no
 * escorts (the setup places the two familiars and the ground) and no place for the drawing's rule.
 * The fallback is the authored board below, the setup's first board written out, so a change to the
 * Seam's heart cannot change what the safe fallback is. Won by the scripted solve in
 * `tests/drawing/kits-a.test.ts`.
 */

const SIZE = { width: 7, height: 7 } as const;

const FALLBACK = [
  '. . G .  . . .',
  '. f . .  . f .',
  '. = . ~@ . = .',
  'o o . .  . o o',
  '. . = .  = . .',
  '. . . .  . . .',
  'P P P P  . . .',
].join('\n');

export const MARGINALIA_FRAME: HeartFrame = {
  master: 'marginalia',
  cost: COSTS.hearts.marginalia,
  needs: needsOf('marginalia'),
  size: SIZE,
  /** Read on first use: `KIT` must not be touched at module load (the import cycle in `generate.ts`). */
  get setup(): HeartSetup {
    const heart = KIT.modules.seam?.heart;
    if (!heart) throw new Error('the Seam has no heart setup');
    return heart;
  },
  escorts: [],
  ruleAt: [],
  /** Parsed on each read: the notation parser is not ready at module load. */
  get fallback(): BoardSpec {
    return parseBoard(FALLBACK);
  },
};
