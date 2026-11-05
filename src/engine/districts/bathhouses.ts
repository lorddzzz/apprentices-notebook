import { BOIL_OVER_RULE } from './bathhouses/boilOver';
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
 * The bathhouses' engine module, assembled from `bathhouses/`. BH-0 registered the contracts (the
 * trip state's reader, the events' lines, the `steam` cause); BH-1 adds the boil-over rule. No foes
 * or offers yet,
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
  rules: [BOIL_OVER_RULE],
  causes: { [STEAM_CAUSE]: 'landing' },
};
