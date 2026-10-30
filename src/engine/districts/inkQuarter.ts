import { INK_FOES } from './inkQuarter/foes';
import {
  FORWARD_EVENT_LINES,
  FORWARD_GUARD,
  FORWARD_PIECES,
  FORWARDS_RULE,
} from './inkQuarter/forward';
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
import { WAX_EVENT_LINES, WAX_PIECES } from './inkQuarter/wax';
import { WRIT_EVENT_LINES, WRIT_PIECES, WRITS_RULE } from './inkQuarter/writs';
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

/** Log lines: the writs' (IQ-1), forwarding's (IQ-2) and the terms' (IQ-3), else the event's name (IQ-6 writes its own). */
const events: readonly DistrictEventDef[] = INK_EVENT_TYPES.map(
  (type) =>
    WRIT_EVENT_LINES[type] ??
    FORWARD_EVENT_LINES[type] ??
    WAX_EVENT_LINES[type] ??
    TERM_EVENT_DEFS.find((d) => d.type === type) ?? {
      type,
      describe: () => type.slice('inkQuarter:'.length),
    },
);

export const INK_QUARTER_MODULE: DistrictModule = {
  id: 'inkQuarter',
  rules: [WRITS_RULE, FORWARDS_RULE],
  harmGuards: [FORWARD_GUARD],
  pieces: INK_BASE_PIECES.map(
    (p) => WRIT_PIECES[p.id] ?? FORWARD_PIECES[p.id] ?? WAX_PIECES[p.id] ?? p,
  ),
  events,
  foes: INK_FOES,
  trip: shape,
  offerKinds: [TERMED_KIND],
};
