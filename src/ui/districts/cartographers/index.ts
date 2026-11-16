import type { DistrictUi } from '..';
import BlankPiece from './BlankPiece.svelte';
import CircleMark from './CircleMark.svelte';
import HallArt from './HallArt.svelte';
import { CIRCLE, LINK } from './highlights';
import LinkMark from './LinkMark.svelte';
import OutlinePiece from './OutlinePiece.svelte';
import PaperFx from './PaperFx.svelte';
import PencilPiece from './PencilPiece.svelte';

/**
 * The Cartographers' UI module (CG-12), all through the KIT-R2 slots; no board component is edited.
 * Pieces: pencil (graphite hatching, a fate mark and the due round), blank paper (a torn page) and
 * the outline (a dashed foe). Foes: the three hands' tokens (`HallArt`). Marks drawn from the battle
 * (`cartographersHighlights`, in `logic.ts`): circles with their holder lines (the Registrar's and the
 * household's, one drawing), the Surveyor's named pair and the Tracer's tether. Playback: `PaperFx`,
 * one `paper` effect for the six events. The "Next round" tiles (drawn, erased, warn) and the
 * Surveyor's ghosts are the generic rule previews the engine already returns.
 */
export const CARTOGRAPHERS_FOE_DEFS: readonly string[] = ['surveyor', 'eraser', 'tracer'];

export const CARTOGRAPHERS_UI: DistrictUi = {
  unitArt: Object.fromEntries(CARTOGRAPHERS_FOE_DEFS.map((def) => [def, HallArt])),
  fx: { paper: PaperFx },
  pieceArt: {
    'cartographers:pencil': PencilPiece,
    'cartographers:blank': BlankPiece,
    'cartographers:outline': OutlinePiece,
  },
  highlightArt: {
    [CIRCLE]: CircleMark,
    [LINK]: LinkMark,
  },
};
