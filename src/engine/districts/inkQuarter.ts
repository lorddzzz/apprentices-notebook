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

/** Trip state only; IQ-3 adds `returnBlocks`, `offersFor`, `roomSetup`, `afterRoom`. */
const shape: TripShapeDef<InkTripState> = {
  id: INK_SHAPE,
  parseState: parseInkState,
  initState: initInkState,
};

/** Placeholder log lines: the event's own name (IQ-1, IQ-2, IQ-3, IQ-6 write the wording). */
const events: readonly DistrictEventDef[] = INK_EVENT_TYPES.map((type) => ({
  type,
  describe: () => type.slice('inkQuarter:'.length),
}));

export const INK_QUARTER_MODULE: DistrictModule = {
  id: 'inkQuarter',
  pieces: INK_BASE_PIECES,
  events,
  trip: shape,
};
