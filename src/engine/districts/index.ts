import { CANALS_MODULE } from './canals';
import { buildKit } from './registry';
import { SEAM_MODULE } from './seam';
import type { DistrictModule } from './types';

export * from './api';
export * from './registry';
export type * from './types';

/**
 * Every district's engine module, one line each (P1): the only shared edit a district build makes
 * here. Order is registry order (rule ties, contributor order).
 */
export const DISTRICT_MODULES: readonly DistrictModule[] = [SEAM_MODULE, CANALS_MODULE];

/** The assembled registries (rules, pieces, offer kinds, hearing kinds, steps, shapes). */
export const KIT = buildKit(DISTRICT_MODULES);
