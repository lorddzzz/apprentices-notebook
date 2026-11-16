/**
 * The hall's drawing vocabulary (CG-12): the three hands' silhouettes in a 100-wide cell, shared by
 * their tokens (`HallArt`) and by the dashed outlines of a foe drawn in pencil (`OutlinePiece`).
 */

/** Body paths by foe def id, in the cell's 100 x 100 space (tokens sit on `CY` 42). */
export const SILHOUETTE: Readonly<Record<string, string>> = {
  /** A narrow A-frame: the surveyor's tripod robe. */
  surveyor: 'M50 16L76 76H24Z',
  /** A rubber block. */
  eraser: 'M28 32H72Q80 32 80 40V74H20V40Q20 32 28 32Z',
  /** A shade with a ragged hem. */
  tracer: 'M28 76V42Q28 20 50 20Q72 20 72 42V76L64 69L57 76L50 69L43 76L36 69Z',
};

const PLAIN = 'M26 76V40Q26 22 50 22Q74 22 74 40V76Z';

/** The silhouette for a foe, or a plain rounded body for a foe the hall has no drawing for. */
export const silhouetteOf = (foe: string): string => SILHOUETTE[foe] ?? PLAIN;

/** Fixed wobble of the torn edge, so it never shimmers between frames. */
const JAG = [0, 3, -2, 4, -3, 2, -4, 3, -1, 4];

const r1 = (n: number): number => Math.round(n * 10) / 10;

/** A hand-torn edge round a cell (100 x 100), inset `m` from the sides. */
export function tornEdge(m = 5): string {
  const lo = m;
  const hi = 100 - m;
  const n = JAG.length;
  const at = (i: number, shift: number): number => JAG[(i + shift) % n] ?? 0;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) pts.push([lo + ((hi - lo) * i) / n, lo + at(i, 0)]);
  for (let i = 0; i < n; i++) pts.push([hi - at(i, 3), lo + ((hi - lo) * i) / n]);
  for (let i = 0; i < n; i++) pts.push([hi - ((hi - lo) * i) / n, hi - at(i, 5)]);
  for (let i = 0; i < n; i++) pts.push([lo + at(i, 7), hi - ((hi - lo) * i) / n]);
  return `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`;
}

/** Diagonal graphite strokes across a cell, `gap` apart, clipped by the caller. */
export function hatch(gap: number): string {
  const out: string[] = [];
  for (let o = -100; o <= 100; o += gap) out.push(`M${o} 100L${o + 100} 0`);
  return out.join('');
}
