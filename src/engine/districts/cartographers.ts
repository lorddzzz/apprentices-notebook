import type { TrickDef } from '../rivals/types';
import { CARTOGRAPHERS_FOES, TRACER_RULE } from './cartographers/foes';
import { GUILD_HAND_RULE, PENCIL_RULE } from './cartographers/guildHand';
import { CARTOGRAPHERS_BOT, CARTOGRAPHERS_HEART_SETUP } from './cartographers/heartFrame';
import { CARTOGRAPHERS_REGISTERED_PIECES } from './cartographers/pieces';
import {
  REGISTRAR_GOALS,
  registrarEraseAt,
  STRIKE_FROM_THE_REGISTER,
} from './cartographers/registrar';
import { BOARD_GUARANTEE, CARTOGRAPHERS_TRIP } from './cartographers/trip';
import { CARTOGRAPHERS_EVENT_TYPES, type CartographersEventType } from './cartographers/types';
import type { DistrictEventDef, DistrictModule, TripShapeDef } from './types';

export * from './cartographers/types';

/**
 * The Cartographers' engine module, assembled from `cartographers/`. CG-W0 registered the events'
 * lines; CG-1 adds the three paper pieces (`pieces.ts`) and CG-2 the guild's hand (`guildHand.ts`:
 * the district's rule, and the pencil's own piece-scoped one). CG-5 and CG-6 add the guild's hands
 * (`foes.ts`: the surveyor, the eraser and the tracer, with the tracer's memory as a third rule).
 * The Registrar's trick, goals and `eraseAt` (CG-7, `registrar.ts`), the trip shape (CG-8) and the offers come in later tasks. `heart`
 * (CG-10, through `frame.ts`'s `placeFrame`, salt 7160) and `bot` (a `BotTerms` that keeps units off
 * pencil about to be rubbed) are in `cartographers/heartFrame.ts`. CG-9 and CG-10 lay the six rooms;
 * the district stays `gate: 'drawing'` until CG-14.
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
  rules: [GUILD_HAND_RULE, PENCIL_RULE, TRACER_RULE],
  pieces: CARTOGRAPHERS_REGISTERED_PIECES,
  foes: CARTOGRAPHERS_FOES,
  // The Registrar is a rival (CG-7): his trick, routine goals and the Erase that lifts his circles.
  tricks: [STRIKE_FROM_THE_REGISTER as TrickDef],
  goals: REGISTRAR_GOALS,
  eraseAt: registrarEraseAt,
  events,
  trip: CARTOGRAPHERS_TRIP as TripShapeDef,
  offerContributors: [BOARD_GUARANTEE],
  heart: CARTOGRAPHERS_HEART_SETUP,
  bot: CARTOGRAPHERS_BOT,
};
