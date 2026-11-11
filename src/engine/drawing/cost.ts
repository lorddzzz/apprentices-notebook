import type { Drawing } from '$data';
import { notBuilt } from './stub';
import type { WeightBand } from './types';

/** P6, P7: the drawing's total cost on the pen (element costs in `src/data/drawing.ts`). EN-5. */
export function costOf(_d: Drawing): number {
  return notBuilt('EN-5');
}

/** P7: light up to 9, medium 10-14, heavy 15 and over. EN-5. */
export function weightBand(_d: Drawing): WeightBand {
  return notBuilt('EN-5');
}
