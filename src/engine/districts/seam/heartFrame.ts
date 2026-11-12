import { SEAM_ROOMS } from '$data/districts/seam';
import { type BoardSpec, parseBoard } from '../../notation';
import { type Placement, placeFrame, placementsFrom } from '../frame';
import type { HeartSetup } from '../types';

/**
 * The Seam's heart frame (KIT-R3b; P7): the Marginalia, its familiars, the plates, vents and oil of
 * the first authored heart variant, placed by fraction. The Seam needs no stamped structure.
 */

const SALT = 7110;
/** Read from the authored heart on first use: the notation parser is not ready at module load. */
let placements: Placement[] | null = null;
function placementsOfHeart(): Placement[] {
  if (placements) return placements;
  const layout = SEAM_ROOMS.find((r) => r.heart)?.variants?.[0]?.layout;
  if (!layout) throw new Error('the Seam has no authored heart');
  placements = placementsFrom(parseBoard(layout));
  return placements;
}

export const seamHeartFrame = (board: BoardSpec, seed: number): BoardSpec =>
  placeFrame(board, seed, SALT, placementsOfHeart());

export const SEAM_HEART: HeartSetup = { foe: 'marginalia', rules: [], frame: seamHeartFrame };
