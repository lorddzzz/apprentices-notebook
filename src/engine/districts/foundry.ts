import {
  BELL_PIECE,
  BELLS_RULE_ID,
  type BellsState,
  FOUNDRY_EVENT_TYPES,
  FOUNDRY_PIECES,
  FOUNDRY_SHAPE,
  type FoundryTripState,
  GREAT_BELL_PIECE,
  initBells,
  initFoundryState,
  initTune,
  parseFoundryState,
  TUNE_RULE_ID,
  type TuneState,
} from './foundry/types';

import type { BoardRule, DistrictEventDef, DistrictModule, TripShapeDef } from './types';

export * from './foundry/pieces';

/**
 * The foundry's engine module, assembled from `foundry/`. BF-0 registers the contracts only: the
 * four pieces (no triggers), the bell rule and the tune (no-op steps), the events' lines and the
 * trip state's reader. The district stays `gate: 'drawing'` with no rooms, so no trip carries this
 * shape and no board carries these pieces. BF-2 adds the pieces' behaviour, BF-3 the ring.
 */

const LINES: Record<(typeof FOUNDRY_EVENT_TYPES)[number], string> = {
  'foundry:bellStruck': 'A bell is struck.',
  'foundry:ring': 'The bells ring.',
  'foundry:pulse': 'A bell pulses.',
  'foundry:hum': 'The bells hum.',
  'foundry:retuned': 'A bell is retuned.',
  'foundry:muffled': 'The muffled bell stays silent.',
  'foundry:bellRung': 'A great bell rings.',
  'foundry:tuneNote': 'A note of the tune.',
  'foundry:greatPeal': 'The Great Peal rings.',
};
const events: readonly DistrictEventDef[] = FOUNDRY_EVENT_TYPES.map((type) => ({
  type,
  describe: () => LINES[type],
}));

/**
 * P3: the last `late` rule (order 90), brought by a bell or a great bell on the board. BF-3 clears
 * the humming tones and this round's strikers here; BF-0 only keeps the state.
 */
export const BELLS_RULE: BoardRule<BellsState> = {
  id: BELLS_RULE_ID,
  slot: 'late',
  order: 90,
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [BELL_PIECE, GREAT_BELL_PIECE] },
  init: () => initBells(),
  step: (_ctx, own) => own,
};

/** P9: the tune's state, listed by the heart's setup (BF-9); a district rule, never brought. */
export const TUNE_RULE: BoardRule<TuneState> = {
  id: TUNE_RULE_ID,
  slot: 'late',
  order: 80,
  scope: 'district',
  activatedBy: { kind: 'district' },
  init: () => initTune(),
  step: (_ctx, own) => own,
};

/** P7: trip state is the great bells rung; BF-8 adds `roomSetup`, `afterRoom` and `offersFor`. */
const shape: TripShapeDef<FoundryTripState> = {
  id: FOUNDRY_SHAPE,
  parseState: parseFoundryState,
  initState: initFoundryState,
};

export const FOUNDRY_MODULE: DistrictModule = {
  id: 'foundry',
  events,
  pieces: FOUNDRY_PIECES,
  rules: [BELLS_RULE, TUNE_RULE],
  trip: shape,
};
