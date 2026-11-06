import type { DistrictUi } from '..';
import BellPiece from './BellPiece.svelte';

/** The foundry's UI module. BF-1: the bell's tone glyph set (P14); later tasks add the rest. */
export const FOUNDRY_UI: DistrictUi = {
  pieceArt: {
    'foundry:bell': BellPiece,
  },
};
