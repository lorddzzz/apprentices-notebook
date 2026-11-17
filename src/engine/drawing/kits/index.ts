import type { GenKit } from '../types';
import { CANALS_KIT } from './canals';
import { SEAM_KIT } from './seam';

/**
 * P34: every district's adapter, one line per kit. A kit pack adds its line here; the generator
 * and the palette read this list and nothing else.
 */
export const GEN_KITS: readonly GenKit[] = [SEAM_KIT, CANALS_KIT];
