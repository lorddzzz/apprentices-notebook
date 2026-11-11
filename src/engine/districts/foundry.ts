import { BELL_TRIGGERS, bellsPreview, bellsStep, settleBells } from './foundry/ring';
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
  parseBells,
  parseFoundryState,
  TUNE_RULE_ID,
  type TuneState,
} from './foundry/types';

import type {
  BoardRule,
  DistrictEvent,
  DistrictEventDef,
  DistrictModule,
  PieceDef,
  TripShapeDef,
} from './types';

export * from './foundry/pieces';
export * from './foundry/ring';

/**
 * The foundry's engine module, assembled from `foundry/`. BF-0 registered the contracts, BF-3 and
 * BF-5 add the ring: the bell's triggers (strike, hit, Brass), the bell rule's settle, step and
 * preview, and the events' lines. The district stays `gate: 'drawing'` with no rooms, so no trip
 * carries this shape; only a Lab or test board brings the bells.
 */

type Data = Record<string, unknown>;
const dataOf = (e: DistrictEvent): Data => (e.data ?? {}) as Data;
const toneWord = (d: Data): string => (typeof d.tone === 'string' ? d.tone : 'great');

const LINES: Record<(typeof FOUNDRY_EVENT_TYPES)[number], (e: DistrictEvent) => string> = {
  'foundry:bellStruck': (e) => {
    const d = dataOf(e);
    const how = d.by === 'shove' ? 'shoved' : d.by === 'spark' ? 'sparked' : 'struck';
    return `The ${toneWord(d)} bell is ${how}.`;
  },
  'foundry:ring': (e) => `The ${toneWord(dataOf(e))} bells ring.`,
  'foundry:pulse': (e) => {
    const n = Array.isArray(dataOf(e).units) ? (dataOf(e).units as unknown[]).length : 0;
    return `A ${toneWord(dataOf(e))} bell pulses against ${n === 1 ? 'one unit' : `${n} units`}.`;
  },
  'foundry:hum': (e) =>
    dataOf(e).on === false
      ? `The ${toneWord(dataOf(e))} bells fall quiet.`
      : `The ${toneWord(dataOf(e))} bells hum until round end.`,
  'foundry:retuned': (e) => `A bell is retuned from ${dataOf(e).from} to ${dataOf(e).to}.`,
  'foundry:muffled': () => 'The muffled bell stays silent.',
  'foundry:bellRung': (e) => `The great bell of note ${dataOf(e).note} rings.`,
  'foundry:tuneNote': (e) =>
    dataOf(e).answered
      ? 'The called note is answered; the tune starts over.'
      : `A ${toneWord(dataOf(e))} note of the tune is called.`,
  'foundry:greatPeal': () => 'The Great Peal rings every bell that is not humming.',
};
const events: readonly DistrictEventDef[] = FOUNDRY_EVENT_TYPES.map((type) => ({
  type,
  describe: LINES[type],
}));

/**
 * P3: the last `late` rule (order 90), brought by a bell or a great bell on the board. Its step
 * settles what is queued, then clears the humming tones and this round's strikers (BF-3); `settle`
 * is the cast, action and foe settle points (P18); `preview` outlines the tiles a queued tone pulses.
 */
export const BELLS_RULE: BoardRule<BellsState> = {
  id: BELLS_RULE_ID,
  slot: 'late',
  order: 90,
  scope: 'piece',
  activatedBy: { kind: 'piece', pieces: [BELL_PIECE, GREAT_BELL_PIECE] },
  init: () => initBells(),
  step: (ctx, own) => bellsStep(ctx, parseBells(own)),
  settle: (ctx, own) => settleBells(ctx, parseBells(own)),
  preview: (s, own) => bellsPreview(s, parseBells(own)),
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

/** BF-3: the bell takes its triggers here (the base defs in `foundry/types.ts` stay cycle-free). */
const withTriggers = (def: PieceDef): PieceDef =>
  def.id === BELL_PIECE ? { ...def, triggers: BELL_TRIGGERS } : def;

export const FOUNDRY_MODULE: DistrictModule = {
  id: 'foundry',
  events,
  pieces: FOUNDRY_PIECES.map(withTriggers),
  rules: [BELLS_RULE, TUNE_RULE],
  trip: shape,
};
