import type { DistrictUi } from '..';
import CycleBanner from './CycleBanner.svelte';
import HandTile from './HandTile.svelte';
import { HAND_HIGHLIGHT } from './hands';

/**
 * The Seam's UI module (SM-2): the Marginalia's cycle strip under the room header, and the mark
 * on each tile its next hand will write on. Its token art is `MarginaliaToken` (unit tokens are
 * picked by foe id in `UnitToken`, not through this registry).
 */
export const SEAM_UI: DistrictUi = {
  banners: [CycleBanner],
  highlightArt: { [HAND_HIGHLIGHT]: HandTile },
};

export { handHighlights, handOf } from './hands';
export { default as MarginaliaToken } from './MarginaliaToken.svelte';
