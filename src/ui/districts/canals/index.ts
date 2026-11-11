import type { DistrictUi } from '..';
import CanalFx from './CanalFx.svelte';
import CrateArt from './CrateArt.svelte';
import CrateGhost from './CrateGhost.svelte';
import LockOpen from './LockOpen.svelte';
import MooringPiece from './MooringPiece.svelte';
import RoomBonus from './RoomBonus.svelte';

/** The canals' UI module (CN-10): the mooring's board art; the solved lock's map art (CN-11). */
export const CANALS_UI: DistrictUi = {
  unitArt: { barge: CrateArt },
  ghostArt: { barge: CrateGhost },
  fx: { moor: CanalFx, ruin: CanalFx },
  roomLine: RoomBonus,
  pieceArt: { 'canal-moor': MooringPiece },
  solvedArt: { 'canal-gate': LockOpen },
};

export { default as BonusLine } from './BonusLine.svelte';
export { default as CrateToken } from './CrateToken.svelte';
export { default as MoorFx } from './MoorFx.svelte';
export { default as RuinFx } from './RuinFx.svelte';
