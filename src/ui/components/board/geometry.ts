import type { Coord, Dir } from '$engine';

/** Board drawing space: 100 units per cell, plus a label gutter on the left and top. */
export const CELL = 100;
export const GUTTER = 24;

export function cellOrigin(c: Coord): Coord {
  return { x: c.x * CELL, y: c.y * CELL };
}

export function cellCenter(c: Coord): Coord {
  return { x: c.x * CELL + CELL / 2, y: c.y * CELL + CELL / 2 };
}

export function boardViewBox(width: number, height: number): string {
  return `${-GUTTER} ${-GUTTER} ${width * CELL + GUTTER} ${height * CELL + GUTTER}`;
}

export function pointsAttr(points: readonly Coord[]): string {
  return points.map((p) => `${round(p.x)},${round(p.y)}`).join(' ');
}

const round = (n: number): number => Math.round(n * 10) / 10;

const UNIT_VECTORS: Record<Dir, Coord> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export const dirVector = (d: Dir): Coord => UNIT_VECTORS[d];

const along = (p: Coord, d: Dir, by: number): Coord => ({
  x: p.x + UNIT_VECTORS[d].x * by,
  y: p.y + UNIT_VECTORS[d].y * by,
});

/** Perpendicular offset (left of travel) used to flare an arrowhead. */
const sideways = (d: Dir): Coord => ({ x: -UNIT_VECTORS[d].y, y: UNIT_VECTORS[d].x });

export interface IntentArrow {
  tail: Coord;
  tip: Coord;
  /** Arrowhead triangle: tip + two back corners. */
  head: [Coord, Coord, Coord];
}

/**
 * The danger arrow of an intent: leaves the edge of the enemy's token and ends with its tip inside
 * the hit tile. `hit` is the tile the arrow points at (the adjacent tile for a bite).
 */
export function intentArrow(from: Coord, hit: Coord, dir: Dir): IntentArrow {
  const tail = along(cellCenter(from), dir, 34);
  const tip = along(cellCenter(hit), dir, 8);
  const base = along(tip, dir, -26);
  const s = sideways(dir);
  const flare = 15;
  return {
    tail,
    tip,
    head: [
      tip,
      { x: base.x + s.x * flare, y: base.y + s.y * flare },
      { x: base.x - s.x * flare, y: base.y - s.y * flare },
    ],
  };
}

/** A small ">" chevron beside a unit pointing along `dir` (playback-time intent marker). */
export function chevron(at: Coord, dir: Dir): Coord[] {
  const tipPos = along(cellCenter(at), dir, 44);
  const back = along(tipPos, dir, -14);
  const s = sideways(dir);
  return [
    { x: back.x + s.x * 11, y: back.y + s.y * 11 },
    tipPos,
    { x: back.x - s.x * 11, y: back.y - s.y * 11 },
  ];
}

/** A jagged line from a to b (cell centres), `teeth` alternating offsets of `amp` units. */
export function zigzag(a: Coord, b: Coord, teeth = 5, amp = 9): Coord[] {
  const pa = cellCenter(a);
  const pb = cellCenter(b);
  const dx = pb.x - pa.x;
  const dy = pb.y - pa.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [pa];
  const nx = -dy / len;
  const ny = dx / len;
  const pts: Coord[] = [pa];
  for (let i = 1; i < teeth; i++) {
    const t = i / teeth;
    const sign = i % 2 === 0 ? 1 : -1;
    pts.push({ x: pa.x + dx * t + nx * amp * sign, y: pa.y + dy * t + ny * amp * sign });
  }
  pts.push(pb);
  return pts;
}
