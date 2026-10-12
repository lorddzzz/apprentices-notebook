import { expect, test } from 'vitest';
import type { Coord, Dir } from '$engine';
import {
  boardViewBox,
  CELL,
  cellCenter,
  cellOrigin,
  chevron,
  dirVector,
  intentArrow,
  pointsAttr,
  zigzag,
} from '../../src/ui/components/board/geometry';

const DIRS: Dir[] = ['up', 'right', 'down', 'left'];
const inside = (p: Coord, cell: Coord): boolean => {
  const o = cellOrigin(cell);
  return p.x > o.x && p.x < o.x + CELL && p.y > o.y && p.y < o.y + CELL;
};

test('cell centers in viewBox units', () => {
  expect(cellOrigin({ x: 2, y: 3 })).toEqual({ x: 200, y: 300 });
  expect(cellCenter({ x: 0, y: 0 })).toEqual({ x: 50, y: 50 });
  expect(cellCenter({ x: 5, y: 7 })).toEqual({ x: 550, y: 750 });
});

test('viewBox leaves a label gutter on the left and top', () => {
  expect(boardViewBox(6, 8)).toBe('-24 -24 624 824');
  expect(boardViewBox(3, 2)).toBe('-24 -24 324 224');
});

test('arrow ends on the hit tile', () => {
  const from = { x: 3, y: 3 };
  for (const dir of DIRS) {
    const v = dirVector(dir);
    const hit = { x: from.x + v.x * 2, y: from.y + v.y * 2 };
    const a = intentArrow(from, hit, dir);
    expect(inside(a.tip, hit)).toBe(true);
    expect(inside(a.tail, from)).toBe(true);
    for (const corner of a.head) expect(inside(corner, hit) || corner === a.tip).toBe(true);
  }
});

test('arrow for an adjacent bite still has a visible shaft', () => {
  const a = intentArrow({ x: 3, y: 0 }, { x: 2, y: 0 }, 'left');
  const shaftEnd = (a.head[1].x + a.head[2].x) / 2;
  expect(a.tail.x).toBeGreaterThan(shaftEnd);
  expect(a.tail.x - shaftEnd).toBeGreaterThan(0);
});

test('arrowhead is symmetric about the shaft', () => {
  const a = intentArrow({ x: 0, y: 0 }, { x: 0, y: 2 }, 'down');
  expect(a.head[1].y).toBe(a.head[2].y);
  expect(a.tip.x - a.head[1].x).toBe(a.head[2].x - a.tip.x);
});

test('chevron sits on the near edge of the unit, pointing along dir', () => {
  const at = { x: 1, y: 1 };
  const c = chevron(at, 'right');
  expect(c).toHaveLength(3);
  expect(c[1]?.x).toBeGreaterThan(cellCenter(at).x);
  expect(c[0]?.x).toBeLessThan(c[1]?.x ?? 0);
  expect(c[0]?.x).toBe(c[2]?.x);
});

test('zigzag runs from centre to centre with alternating offsets', () => {
  const pts = zigzag({ x: 0, y: 0 }, { x: 3, y: 0 }, 5, 9);
  expect(pts[0]).toEqual(cellCenter({ x: 0, y: 0 }));
  expect(pts.at(-1)).toEqual(cellCenter({ x: 3, y: 0 }));
  expect(pts).toHaveLength(6);
  const ys = pts.slice(1, -1).map((p) => p.y - 50);
  expect(ys.map(Math.abs)).toEqual([9, 9, 9, 9]);
  expect(Math.sign(ys[0] ?? 0)).toBe(-Math.sign(ys[1] ?? 0));
});

test('pointsAttr formats svg points', () => {
  expect(
    pointsAttr([
      { x: 1, y: 2 },
      { x: 3.04, y: 4 },
    ]),
  ).toBe('1,2 3,4');
});
