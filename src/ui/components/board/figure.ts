import { CELL } from './geometry';

/** Figure art is drawn at cell/128 per canvas pixel whatever the canvas (FT-D8). */
export const FIGURE_SCALE = CELL / 128;

/** Where a figure's feet stand in its cell: the 176-high canvas then rises ~1/3 cell into the row above. */
export const FEET = 90;

/** Unit order for drawing: by row, then column, so a lower row overdraws the one above (FT-D10). */
export function byRow<T extends { pos: { x: number; y: number } }>(units: readonly T[]): T[] {
  return [...units].sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
}
