import type { DistrictKitData } from './index';

/**
 * The Seam's kit data. Its rooms, hearing and map still live in `src/data/districts.ts` until
 * DK-17 moves them here. Home is one step away after every room.
 */
export const SEAM_KIT: DistrictKitData = { id: 'seam', ret: { kind: 'any' } };
