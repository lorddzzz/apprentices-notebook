import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import type { HeartSetup } from '../../districts/types';
import { type BoardSpec, parseBoard } from '../../notation';
import { needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The Bath-Steward's frame (P35, EN-K4): the baths' own `HeartSetup` on a 7 x 8 board. The setup
 * stands the Steward on a connected cloud pool of four or more tiles, with the vents and a
 * dissolved bather settled around it, so the frame has no escorts of its own and no place for the
 * drawing's rule (the boil-over is the heart's own, its heat the shape's). `KIT` is read lazily
 * (see `generate.ts`'s import cycle).
 */

const SIZE = { width: 7, height: 8 } as const;

/**
 * The authored fallback (P10): the district's first authored heart written out, with the bather
 * beside the pool instead of on it (a drawn room never starts a foe in a cloud but the Steward), so
 * a change to the baths' heart cannot change what the safe fallback is. Won by the scripted solve
 * in `tests/drawing/kits-b.scripts.ts`.
 */
const FALLBACK = [
  '. . . @ .  . .',
  '. ~ ~ ~ ~  . .',
  '. ~ H~ ~ ~ s .',
  '. ~ ~ ~ ~  . .',
  '. . . . .  . .',
  'P . . . .  . P',
  '. . P . .  . .',
  '. . . . P  . P',
].join('\n');

let setup: HeartSetup | undefined;

export const STEWARD_FRAME: HeartFrame = {
  master: 'bathSteward',
  cost: COSTS.hearts.bathSteward,
  needs: needsOf('bathSteward'),
  size: SIZE,
  get setup(): HeartSetup {
    if (!setup) {
      const heart = KIT.modules.bathhouses?.heart;
      if (!heart) throw new Error('the bathhouses have no heart setup');
      setup = heart;
    }
    return setup;
  },
  escorts: [],
  ruleAt: [],
  masterInCloud: true,
  get fallback(): BoardSpec {
    return parseBoard(FALLBACK);
  },
};
