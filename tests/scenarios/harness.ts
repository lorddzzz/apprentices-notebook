import { type Coord, describeLog, type EventLog, label } from '$engine';

/**
 * ASCII board notation (same style as DESIGN.md). Legend grows with v0:
 *   .  empty floor      #  wall
 *   letters/digits  = units or items, named by the caller's legend
 * Cells are whitespace-separated tokens (so v0 can use multi-character cells); rows by newlines.
 */
export interface Board {
  width: number;
  height: number;
  cells: string[][];
  at(c: Coord): string | undefined;
  find(ch: string): Coord[];
}

export function parseBoard(ascii: string): Board {
  const lines = ascii.split('\n').filter((l) => l.trim() !== '');
  const cells = lines.map((l) => l.trim().split(/\s+/));
  const width = Math.max(...cells.map((r) => r.length));
  for (const row of cells) while (row.length < width) row.push('.');
  return {
    width,
    height: cells.length,
    cells,
    at: (c) => cells[c.y]?.[c.x],
    find: (ch) => cells.flatMap((row, y) => row.flatMap((v, x) => (v === ch ? [{ x, y }] : []))),
  };
}

/** Throws with a readable diff when the log doesn't match the expected plain-English lines. */
export function expectLog(log: EventLog, expected: readonly string[]): void {
  const actual = describeLog(log);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Event log mismatch\n  expected:\n    ${expected.join('\n    ')}\n  actual:\n    ${actual.join('\n    ')}`,
    );
  }
}

export { label };
