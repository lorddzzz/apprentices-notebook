/** Coordinates and directions shared by the lattice and the battle grid. x → right, y → down. */
export interface Coord {
  x: number;
  y: number;
}

export type Dir = 'up' | 'right' | 'down' | 'left';

export const DIRS: readonly Dir[] = ['up', 'right', 'down', 'left'];

const DELTAS: Record<Dir, Coord> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function step(c: Coord, d: Dir): Coord {
  const delta = DELTAS[d];
  return { x: c.x + delta.x, y: c.y + delta.y };
}

export function turnRight(d: Dir): Dir {
  return DIRS[(DIRS.indexOf(d) + 1) % 4] as Dir;
}

export function turnLeft(d: Dir): Dir {
  return DIRS[(DIRS.indexOf(d) + 3) % 4] as Dir;
}

export function opposite(d: Dir): Dir {
  return DIRS[(DIRS.indexOf(d) + 2) % 4] as Dir;
}

export function inBounds(c: Coord, width: number, height: number): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < width && c.y < height;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Spreadsheet-style label: {x:0,y:0} → "A1", {x:2,y:3} → "C4". */
export function label(c: Coord): string {
  return `${String.fromCharCode(65 + c.x)}${c.y + 1}`;
}
