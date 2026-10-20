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

/** "x,y" map key. */
export function key(c: Coord): string {
  return `${c.x},${c.y}`;
}

export function parseKey(k: string): Coord {
  const [x, y] = k.split(',').map(Number);
  if (x === undefined || y === undefined || Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error(`Bad coordinate key: ${k}`);
  }
  return { x, y };
}

/** Arithmetic headroom for translated/rotated local frames and sparse bounds; not an ink budget. */
export const MAX_LATTICE_COORD = Math.floor(Number.MAX_SAFE_INTEGER / 4);

export function isLatticeCoord(value: unknown): value is Coord {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Partial<Coord>;
  return (
    Number.isSafeInteger(c.x) &&
    Number.isSafeInteger(c.y) &&
    Math.abs(c.x as number) <= MAX_LATTICE_COORD &&
    Math.abs(c.y as number) <= MAX_LATTICE_COORD
  );
}

/** Canonical signed decimal keys only; rejects whitespace, exponent notation and negative zero. */
export function parseLatticeKey(value: string): Coord {
  if (!/^(?:0|-?[1-9]\d*),(?:0|-?[1-9]\d*)$/.test(value)) {
    throw new Error(`Bad lattice coordinate key: ${value}`);
  }
  const [x, y] = value.split(',').map(Number);
  const at = { x, y };
  if (!isLatticeCoord(at)) throw new Error(`Bad lattice coordinate key: ${value}`);
  return at;
}

/** Page labels preserve A1..Z1, extend to AA1, and expose signed coordinates explicitly. */
export function latticeLabel(at: Coord): string {
  if (!isLatticeCoord(at)) throw new Error('Invalid lattice coordinate');
  if (at.x < 0 || at.y < 0) return `(${at.x},${at.y})`;
  let column = '';
  for (let n = at.x + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    column = String.fromCharCode(65 + ((n - 1) % 26)) + column;
  }
  return `${column}${at.y + 1}`;
}

/** Reading order: rows top to bottom, then columns left to right. */
export function byReadingOrder(a: Coord, b: Coord): number {
  return a.y - b.y || a.x - b.x;
}

/** Orthogonal neighbours in DIRS order (up, right, down, left). Not clipped to any board. */
export function neighbors4(c: Coord): Coord[] {
  return DIRS.map((d) => step(c, d));
}

/** All coords within Chebyshev `radius` of `c`, in reading order. Not clipped to any board. */
export function square(c: Coord, radius: number): Coord[] {
  const out: Coord[] = [];
  for (let y = c.y - radius; y <= c.y + radius; y++) {
    for (let x = c.x - radius; x <= c.x + radius; x++) out.push({ x, y });
  }
  return out;
}

export function chebyshev(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
