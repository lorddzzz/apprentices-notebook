import type { DistrictUi } from '..';
import DoorLine from './DoorLine.svelte';

/** The lower Seam's UI module: the sealed door's line on its bottom screen (SM-10). */
export const LOWER_SEAM_UI: DistrictUi = {
  crossroadsLine: DoorLine,
};

export { DOOR_PLACEHOLDER, type DoorLine, doorLine } from './door';
