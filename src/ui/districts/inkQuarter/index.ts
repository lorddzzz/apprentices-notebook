import type { DistrictUi } from '..';
import AddressPiece from './AddressPiece.svelte';
import ClockBanner from './ClockBanner.svelte';
import ClockCount from './ClockCount.svelte';
import ClockPiece from './ClockPiece.svelte';
import ForwardPiece from './ForwardPiece.svelte';
import ForwardRing from './ForwardRing.svelte';
import OrderPiece from './OrderPiece.svelte';
import ReturnedArt from './ReturnedArt.svelte';
import ReturnPiece from './ReturnPiece.svelte';
import SentBackGhost from './SentBackGhost.svelte';
import TermBanner from './TermBanner.svelte';
import TermCard from './TermCard.svelte';
import ThreadHighlight from './ThreadHighlight.svelte';
import WaxPiece from './WaxPiece.svelte';

/** The ink quarter's UI module (IQ-16): the wax seal's board art; the solved office's map art. */
export const INK_QUARTER_UI: DistrictUi = {
  banners: [TermBanner, ClockBanner],
  pieceArt: {
    'inkQuarter:wax': WaxPiece,
    'inkQuarter:return': ReturnPiece,
    'inkQuarter:order': OrderPiece,
    'inkQuarter:forward': ForwardPiece,
    'inkQuarter:address': AddressPiece,
    'inkQuarter:clockStamp': ClockPiece,
  },
  offerCards: { 'inkQuarter:termed': TermCard },
  highlightArt: {
    'inkQuarter:thread': ThreadHighlight,
    'inkQuarter:clockCount': ClockCount,
    'inkQuarter:sentBack': SentBackGhost,
    'inkQuarter:forwardRing': ForwardRing,
  },
  solvedArt: { 'ink-returned': ReturnedArt },
};

export { default as StaffToken } from './StaffToken.svelte';
