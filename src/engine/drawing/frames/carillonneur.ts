import { COSTS } from '$data/drawing';
import { KIT } from '../../districts/kit';
import type { HeartSetup } from '../../districts/types';
import { type BoardSpec, parseBoard } from '../../notation';
import { needsOf } from '../kits/seam';
import type { HeartFrame } from '../types';

/**
 * The Carillonneur's frame (P35, EN-K6): the foundry's own `HeartSetup` on a 7 x 9 board. The setup
 * hangs the four `{hook}` tiles of the Great Bell, then stands the Carillonneur, the ringers on
 * their ropes, the Clapper and the Detuner and settles the bells (the tune is the heart's own
 * rule), so the frame has no escorts of its own and no place for the drawing's rule: the bells
 * are the heart's. The hooks stay bare until the peal hangs a great bell on each rung note (the
 * peal shape, `kits/foundry.ts`). `KIT` is read lazily (see `generate.ts`'s import cycle).
 */

const SIZE = { width: 7, height: 9 } as const;

/**
 * The authored fallback (P10): the district's first authored heart written out, so a change to
 * the foundry's heart cannot change what the safe fallback is. Won by the scripted solve in
 * `tests/drawing/kits-c.scripts.ts`.
 */
const FALLBACK = [
  '{hook} .           .           V .            .           {hook}',
  '.      .           Z{rope:low} . Z{rope:high} .           .',
  '.      .           .           . .            .           .',
  '.      {bell:mid}  .           Q .            {bell:low}  .',
  '.      .           .           . .            .           .',
  '{hook} .           .           X .            .           {hook}',
  '.      {bell:high} .           . {bell:mid}   .           .',
  'P      .           P           . .            P           .',
  '.      P           .           . P            .           .',
].join('\n');

let setup: HeartSetup | undefined;

export const CARILLONNEUR_FRAME: HeartFrame = {
  master: 'carillonneur',
  cost: COSTS.hearts.carillonneur,
  needs: needsOf('carillonneur'),
  size: SIZE,
  get setup(): HeartSetup {
    if (!setup) {
      const heart = KIT.modules.foundry?.heart;
      if (!heart) throw new Error('the foundry has no heart setup');
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
