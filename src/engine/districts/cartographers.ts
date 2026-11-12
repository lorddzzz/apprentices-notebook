import { CARTOGRAPHERS_EVENT_TYPES, type CartographersEventType } from './cartographers/types';
import type { DistrictEventDef, DistrictModule } from './types';

export * from './cartographers/types';

/**
 * The Cartographers' engine module, assembled from `cartographers/`. CG-W0 registers the events'
 * lines and nothing else: the pieces (CG-1, CG-4), the guild's hand (CG-2), the foes (CG-5, CG-6),
 * the Registrar's trick (CG-7), the trip shape (CG-8) and the offers come in later tasks. `heart`
 * (CG-10, through `frame.ts`'s `placeFrame`, salt 7160) and `bot` (CG-10, `BotTerms` as the
 * bathhouses') are absent on purpose. The district stays `gate: 'drawing'` with no rooms, so no
 * trip carries this shape. It is not yet in `kit.ts`'s module list: two existing tests mock the kit
 * with a fixture module under this id (CG-1 registers it and moves their fixtures).
 */

const LINES: Record<CartographersEventType, string> = {
  'cartographers:inked': 'The pencil is inked in.',
  'cartographers:rubbedOut': 'The pencil is rubbed out.',
  'cartographers:undrawn': 'The paper is un-drawn.',
  'cartographers:drawnIn': 'The outline inks in.',
  'cartographers:circled': 'The register circles a name.',
  'cartographers:struck': 'The name is struck from the register.',
};
const events: readonly DistrictEventDef[] = CARTOGRAPHERS_EVENT_TYPES.map((type) => ({
  type,
  describe: () => LINES[type],
}));

export const CARTOGRAPHERS_MODULE: DistrictModule = {
  id: 'cartographers',
  events,
};
