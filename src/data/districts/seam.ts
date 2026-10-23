import type { DistrictKitData } from './index';

/**
 * The Seam's kit data: empty. Its rooms, hearing and map still live in `src/data/districts.ts`
 * until DK-17 moves them here; an absent `ret` reads as `{ kind: 'any' }`.
 */
export const SEAM_KIT: DistrictKitData = { id: 'seam' };
