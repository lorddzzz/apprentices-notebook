import { TERMED_KIND } from './inkQuarter/offers';
import { TERM_EVENT_DEFS, TERM_HOOKS } from './inkQuarter/terms';
import {
  INK_BASE_PIECES,
  INK_EVENT_TYPES,
  INK_SHAPE,
  type InkTripState,
  initInkState,
  parseInkState,
} from './inkQuarter/types';
import type { DistrictEventDef, DistrictModule, TripShapeDef } from './types';

/**
 * The ink-makers' quarter's engine module (P15), assembled from `inkQuarter/`. IQ-W0 registers the
 * contracts only: base pieces (no triggers), the events' lines and the trip state's reader. The
 * district stays `gate: 'drawing'` with no rooms, so no trip carries this shape yet.
 */

/** Trip state and the terms' hooks (IQ-3); IQ-4 adds `roomSetup` for the next-room stakes. */
const shape: TripShapeDef<InkTripState> = {
  id: INK_SHAPE,
  parseState: parseInkState,
  initState: initInkState,
  ...TERM_HOOKS,
};

/** Placeholder log lines: the event's own name (IQ-1, IQ-2, IQ-3, IQ-6 write the wording). */
const events: readonly DistrictEventDef[] = INK_EVENT_TYPES.map(
  (type) =>
    TERM_EVENT_DEFS.find((d) => d.type === type) ?? {
      type,
      describe: () => type.slice('inkQuarter:'.length),
    },
);

export const INK_QUARTER_MODULE: DistrictModule = {
  id: 'inkQuarter',
  pieces: INK_BASE_PIECES,
  events,
  trip: shape,
  offerKinds: [TERMED_KIND],
};
