import type { DistrictUi } from '..';
import MooringPiece from './MooringPiece.svelte';

/** The canals' UI module (CN-10): the mooring's board art. The crate itself is a unit token. */
export const CANALS_UI: DistrictUi = {
  pieceArt: { 'canal-moor': MooringPiece },
};

export { default as BonusLine } from './BonusLine.svelte';
export { default as CrateToken } from './CrateToken.svelte';
export { default as MoorFx } from './MoorFx.svelte';
export { default as RuinFx } from './RuinFx.svelte';
