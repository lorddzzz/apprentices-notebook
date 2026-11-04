import type { LootTableId } from '../types';
import type { DistrictData } from './index';

/**
 * The lower Seam's data (SM P7, P8): its own trip below the Seam, one floor per opened district
 * with an intrusion. It has no static rooms (the engine module builds the floors per trip), no
 * hearing of its own and is never heard or opened in the city: it opens on the Seam's heart. It
 * hears as the Seam (P5) and clearing its lowest floor marks no heart.
 */
export const LOWER_SEAM_KIT: DistrictData = {
  id: 'lowerSeam',
  name: 'The lower Seam',
  guild: "No guild: the owner's drawing",
  edge: 'wall',
  rooms: [],
  hear: [],
  gate: { kind: 'drawing' },
  line: 'The page goes on below the Seam.',
  // P8: shown on the stair, and the reason a trip with no floor is refused.
  barred: 'Nothing below yet. The page waits for the city.',
  lean: { lean: 'ink', text: 'All five materials' },
  // Never drawn as a node: SM-11 draws the stair in the slot under the Seam (DK-16).
  map: { x: 50, y: 92, label: 'below' },
  ret: { kind: 'any' },
  hearsAs: 'seam',
  marksHeart: false,
};

/** A floor's loot until SM-8's `lowerSeam` table: the Seam's basics; two picks on the lowest (P10). */
export const LOWER_SEAM_FLOOR: { loot: LootTableId; picks: number; lowestPicks: number } = {
  loot: 'shallow',
  picks: 1,
  lowestPicks: 2,
};
