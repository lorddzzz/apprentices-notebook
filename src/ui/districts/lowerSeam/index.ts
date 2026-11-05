import type { DistrictUi } from '..';
import DoorLine from './DoorLine.svelte';
import StairSlot from './StairSlot.svelte';

/** The lower Seam's UI module: its stair under the Seam node (SM-11) and the sealed door's line on its bottom screen (SM-10). */
export const LOWER_SEAM_UI: DistrictUi = {
  crossroadsLine: DoorLine,
  underNode: StairSlot,
};

export { DOOR_PLACEHOLDER, type DoorLine, doorLine } from './door';
