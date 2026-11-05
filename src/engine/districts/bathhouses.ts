import {
  BATH_EVENT_TYPES,
  BATH_SHAPE,
  type BathTripState,
  initBathState,
  parseBathState,
  STEAM_CAUSE,
} from './bathhouses/types';
import type { DistrictEventDef, DistrictModule, TripShapeDef } from './types';

/**
 * The bathhouses' engine module, assembled from `bathhouses/`. BH-0 registers the contracts only:
 * the trip state's reader, the events' lines and the `steam` cause. No rules, foes or offers yet,
 * and the district stays `gate: 'drawing'` with no rooms, so no trip carries this shape.
 */

const shape: TripShapeDef<BathTripState> = {
  id: BATH_SHAPE,
  parseState: parseBathState,
  initState: initBathState,
};

const LINES: Record<(typeof BATH_EVENT_TYPES)[number], string> = {
  'bathhouses:pressure': 'The steam builds.',
  'bathhouses:boilOver': 'The house boils over.',
};
const events: readonly DistrictEventDef[] = BATH_EVENT_TYPES.map((type) => ({
  type,
  describe: () => LINES[type],
}));

export const BATHHOUSES_MODULE: DistrictModule = {
  id: 'bathhouses',
  events,
  trip: shape,
  causes: { [STEAM_CAUSE]: 'landing' },
};
