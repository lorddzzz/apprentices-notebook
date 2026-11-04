import type { LootEntry, LootTableDef, LootTableId, RuneId } from '../types';
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

const rune = (r: RuneId, weight: number): LootEntry => ({
  spec: { kind: 'rune', rune: r },
  weight,
});

/**
 * The floors' loot (SM P10): basics-tier, scaled for three, and never the intruding district's own
 * pages (Seam design, "Intrusion loot"). Seam rune pages (a page the household has drops as ink),
 * the ink reserve weighted up (ink is household-wide), Gallnut and Cinder, vellum and the quiet
 * doorway. No method pages: Conduct stays the Seam heart's. Weights are tune by playing.
 */
export const LOWER_SEAM_LOOT: LootTableDef = {
  id: 'lowerSeam',
  entries: [
    rune('splash', 2),
    rune('touch', 2),
    rune('steam', 2),
    rune('brass', 2),
    rune('bend', 2),
    rune('fork', 2),
    { spec: { kind: 'ink' }, weight: 5 },
    { spec: { kind: 'solvent', solvent: 'gallnut' }, weight: 1 },
    { spec: { kind: 'solvent', solvent: 'cinder' }, weight: 1 },
    { spec: { kind: 'vellum', amount: 1 }, weight: 1 },
    { spec: { kind: 'doorway' }, weight: 1 },
  ],
};

/** A floor's loot: one pick per floor, two on the lowest (P10). */
export const LOWER_SEAM_FLOOR: { loot: LootTableId; picks: number; lowestPicks: number } = {
  loot: 'lowerSeam',
  picks: 1,
  lowestPicks: 2,
};
