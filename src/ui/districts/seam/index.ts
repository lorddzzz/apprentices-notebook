import type { DistrictUi } from '..';
import CycleBanner from './CycleBanner.svelte';
import HandTile from './HandTile.svelte';
import { HAND_HIGHLIGHT } from './hands';
import MarginaliaArt from './MarginaliaArt.svelte';
import SeamMargin from './SeamMargin.svelte';

/**
 * The Seam's UI module (SM-2): the Marginalia's cycle strip under the room header, and the mark
 * on each tile its next hand will write on.
 */
export const SEAM_UI: DistrictUi = {
  banners: [CycleBanner],
  unitArt: { marginalia: MarginaliaArt },
  highlightArt: { [HAND_HIGHLIGHT]: HandTile },
  mapSheet: { label: "The owner's margin", sheet: SeamMargin },
};

export { handHighlights, handOf } from './hands';
export { default as MarginaliaToken } from './MarginaliaToken.svelte';
export { unheardHints } from './margin';
