import type { DistrictKitData } from './index';

/**
 * The canals' kit data. Their rooms, threshold and hearing still live in `src/data/districts.ts`
 * until DK-17 moves them here. Landings after rooms 1, 3 and the heart (K-4, kept as built).
 */
export const CANALS_KIT: DistrictKitData = {
  id: 'canals',
  ret: { kind: 'landings', after: [0, 2, 4] },
};
