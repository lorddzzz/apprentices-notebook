import { type Drawing, ENEMIES } from '$data';
import { BASE_LENGTH, COSTS, WEIGHT_BANDS } from '$data/drawing';
import type { WeightBand } from './types';

/** P6, P7: the drawing's total cost on the pen (element costs in `src/data/drawing.ts`). */
export function costOf(d: Drawing): number {
  const foes = d.foes.reduce((n, f) => n + (ENEMIES[f].elite ? COSTS.elite : COSTS.minion), 0);
  return (
    (d.rule === null ? 0 : COSTS.rule) +
    foes +
    d.pieces.length * COSTS.piece +
    (d.shape === 'plain' ? 0 : COSTS.shape) +
    Math.max(0, d.length - BASE_LENGTH) * COSTS.lengthStep +
    COSTS.hearts[d.heart]
  );
}

/** P7: light up to 9, medium 10-14, heavy 15 and over. */
export function weightBand(d: Drawing): WeightBand {
  const cost = costOf(d);
  return cost <= WEIGHT_BANDS.light ? 'light' : cost <= WEIGHT_BANDS.medium ? 'medium' : 'heavy';
}
