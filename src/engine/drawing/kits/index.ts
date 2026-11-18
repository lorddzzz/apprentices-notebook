import type { GenKit } from '../types';
import { BATH_KIT } from './bathhouses';
import { BRIDGES_KIT } from './bridges';
import { CANALS_KIT } from './canals';
import { CARTOGRAPHERS_KIT } from './cartographers';
import { FOUNDRY_KIT } from './foundry';
import { INK_KIT } from './inkQuarter';
import { SEAM_KIT } from './seam';

/**
 * P34: every district's adapter, one line per kit. A kit pack adds its line here; the generator
 * and the palette read this list and nothing else.
 */
export const GEN_KITS: readonly GenKit[] = [
  SEAM_KIT,
  CANALS_KIT,
  INK_KIT,
  BATH_KIT,
  BRIDGES_KIT,
  FOUNDRY_KIT,
  CARTOGRAPHERS_KIT,
];
