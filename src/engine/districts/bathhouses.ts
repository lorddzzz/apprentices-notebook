import { BOIL_OVER_RULE } from './bathhouses/boilOver';
import { BATHER_EVENT_LINES, BATHER_FOE, BATHER_GUARD } from './bathhouses/dissolved';
import { BATH_FOES } from './bathhouses/foes';
import { AREAS_GUARANTEE, BATH_TRIP, PLUNGE } from './bathhouses/trip';
import { BATH_EVENT_TYPES, STEAM_CAUSE } from './bathhouses/types';
import type { DistrictEventDef, DistrictModule } from './types';

/**
 * The bathhouses' engine module, assembled from `bathhouses/`. BH-0 registered the contracts (the
 * trip state's reader, the events' lines, the `steam` cause); BH-1 adds the boil-over rule; BH-2
 * the heat and the trip (room setup, offers by heat). No foes yet, and the district stays
 * `gate: 'drawing'` with no rooms, so no trip carries this shape.
 */

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
  events: [...events, ...BATHER_EVENT_LINES],
  trip: BATH_TRIP,
  offerKinds: [PLUNGE],
  offerContributors: [AREAS_GUARANTEE],
  rules: [BOIL_OVER_RULE],
  foes: [...BATH_FOES, BATHER_FOE],
  harmGuards: [BATHER_GUARD],
  causes: { [STEAM_CAUSE]: 'landing' },
};
