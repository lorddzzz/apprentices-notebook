/** Phone-sized floor boards and the UX-G1 repeat check. */
import { lum, sharp } from './common.mjs';

export const CELL = 51;
export const BOARD_COLS = 7;
export const BOARD_ROWS = [7, 9];
export const REPEAT_SEED = 0x2b461eda;
export const LATTICE_LIMIT = 3;
export const CELL_SPREAD_LIMIT = 4;
const BINS = 7;

export function boardPicks(cols, rows, count, seed = REPEAT_SEED) {
  let state = seed;
  return Array.from({ length: cols * rows }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor((state / 2 ** 32) * count);
  });
}

export async function resizeTile({ data, w, h }) {
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .resize(CELL, CELL, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();
}

export function drawTileBoard(tiles, picks, cols, rows) {
  return sharp({
    create: { width: cols * CELL, height: rows * CELL, channels: 4, background: '#101820' },
  })
    .composite(
      picks.map((pick, i) => ({
        input: tiles[pick],
        raw: { width: CELL, height: CELL, channels: 4 },
        left: (i % cols) * CELL,
        top: Math.floor(i / cols) * CELL,
      })),
    )
    .png()
    .toBuffer();
}

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

function luminanceBins(tile) {
  const sums = new Float64Array(BINS ** 2);
  const counts = new Uint16Array(sums.length);
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const bin = Math.floor((y * BINS) / CELL) * BINS + Math.floor((x * BINS) / CELL);
      const i = (y * CELL + x) * 4;
      sums[bin] += lum(tile[i], tile[i + 1], tile[i + 2]);
      counts[bin]++;
    }
  }
  return sums.map((sum, i) => sum / counts[i]);
}

/** At each one-cell lag, compare matching positions after removing each cell's mean. */
export function repeatReport(tiles, picks, cols, rows) {
  const fields = tiles.map(luminanceBins);
  const means = fields.map(mean);
  const residuals = fields.map((field, i) => field.map((value) => value - means[i]));
  const cellMeans = picks.map((pick) => means[pick]);
  const boardMean = mean(cellMeans);
  const between = Math.sqrt(mean(cellMeans.map((value) => (value - boardMean) ** 2)));
  const variances = residuals.map((field) => mean(field.map((value) => value ** 2)));
  const within = Math.sqrt(mean(picks.map((pick) => variances[pick])));

  let peak = 0;
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
  ]) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y < rows - dy; y++) {
      for (let x = Math.max(0, -dx); x < cols - Math.max(0, dx); x++) {
        const a = residuals[picks[y * cols + x]];
        const b = residuals[picks[(y + dy) * cols + x + dx]];
        for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
        count += a.length;
      }
    }
    peak = Math.max(peak, sum / count);
  }

  const score = Math.sqrt(peak);
  return { score, between, within, pass: score <= LATTICE_LIMIT && between <= CELL_SPREAD_LIMIT };
}
