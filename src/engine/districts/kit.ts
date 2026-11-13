import { BATHHOUSES_MODULE } from './bathhouses';
import { BRIDGES_MODULE } from './bridges';
import { CANALS_MODULE } from './canals';
import { CARTOGRAPHERS_MODULE } from './cartographers';
import { FOUNDRY_MODULE } from './foundry';
import { INK_QUARTER_MODULE } from './inkQuarter';
import { LOWER_SEAM_MODULE } from './lowerSeam';
import { buildKit } from './registry';
import { SEAM_MODULE } from './seam';
import type { DistrictModule } from './types';

/**
 * Every district's engine module, one line each (P1): the only shared edit a district build makes
 * here. Order is registry order (rule ties, contributor order). Kept apart from the api and
 * trip flow; the arrival pipeline and the piece triggers read `KIT` lazily (district modules import
 * the movers, so the kit is not ready while those files load).
 */
export const DISTRICT_MODULES: readonly DistrictModule[] = [
  SEAM_MODULE,
  CANALS_MODULE,
  INK_QUARTER_MODULE,
  BATHHOUSES_MODULE,
  BRIDGES_MODULE,
  FOUNDRY_MODULE,
  CARTOGRAPHERS_MODULE,
  LOWER_SEAM_MODULE,
];

/** The assembled registries (rules, pieces, offer kinds, hearing kinds, steps, shapes). */
export const KIT = buildKit(DISTRICT_MODULES);
