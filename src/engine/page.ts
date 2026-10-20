import { PAPER } from '$data/tuning';
import { type Coord, isLatticeCoord } from './grid';
import type { GrowingLatticeShape, Lattice, Placed } from './types';

export interface CellBounds {
  origin: Coord;
  width: number;
  height: number;
}

function safe(n: number): number {
  if (!Number.isSafeInteger(n)) throw new Error('Unsafe lattice bounds');
  return n;
}

/** O(occupied cells), constant auxiliary memory; never enumerates the bounding rectangle. */
export function pageBounds(cells: Iterable<Coord>, margin: number = PAPER.margin): CellBounds {
  if (!Number.isSafeInteger(margin) || margin < 0) throw new Error('Invalid paper margin');
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const at of cells) {
    if (!isLatticeCoord(at)) throw new Error('Invalid lattice coordinate');
    minX = Math.min(minX, at.x);
    minY = Math.min(minY, at.y);
    maxX = Math.max(maxX, at.x);
    maxY = Math.max(maxY, at.y);
  }
  if (minX === Infinity) {
    return {
      origin: { x: -PAPER.emptyRadius, y: -PAPER.emptyRadius },
      width: PAPER.emptyRadius * 2 + 1,
      height: PAPER.emptyRadius * 2 + 1,
    };
  }
  return {
    origin: { x: safe(minX - margin), y: safe(minY - margin) },
    width: safe(safe(maxX - minX + 1) + safe(margin * 2)),
    height: safe(safe(maxY - minY + 1) + safe(margin * 2)),
  };
}

/** Sparse placements remain in their original coordinate space; framing is disposable. */
export function growingLattice(runes: readonly Placed[]): Lattice & { shape: GrowingLatticeShape } {
  const bounds = pageBounds(
    (function* () {
      for (const rune of runes) yield rune.at;
    })(),
  );
  return { shape: { kind: 'growing', ...bounds, holes: [] }, runes };
}

/** Editor boundary for fixed scenarios: keeps placements and makes former holes writable. */
export function toGrowingLattice(lattice: Lattice): Lattice & { shape: GrowingLatticeShape } {
  return growingLattice(lattice.runes);
}

/** Explicit caller budget prevents accidentally iterating a content/Fit rectangle. */
export function* cellsInWindow(window: CellBounds, maxCells: number): Generator<Coord> {
  const { origin, width, height } = window;
  if (
    !Number.isSafeInteger(maxCells) ||
    maxCells < 0 ||
    !Number.isSafeInteger(width) ||
    width < 0 ||
    !Number.isSafeInteger(height) ||
    height < 0 ||
    !isLatticeCoord(origin) ||
    width > maxCells ||
    (width !== 0 && height > Math.floor(maxCells / width))
  )
    throw new Error('Invalid or excessive lattice window');
  if (width === 0 || height === 0) return;
  if (!isLatticeCoord({ x: origin.x + width - 1, y: origin.y + height - 1 })) {
    throw new Error('Invalid lattice window coordinates');
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) yield { x: origin.x + x, y: origin.y + y };
  }
}
