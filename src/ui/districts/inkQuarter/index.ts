import type { DistrictUi } from '..';
import ReturnedArt from './ReturnedArt.svelte';
import WaxPiece from './WaxPiece.svelte';

/** The ink quarter's UI module (IQ-16): the wax seal's board art; the solved office's map art. */
export const INK_QUARTER_UI: DistrictUi = {
  pieceArt: { 'inkQuarter:wax': WaxPiece },
  solvedArt: { 'ink-returned': ReturnedArt },
};

export { default as StaffToken } from './StaffToken.svelte';
