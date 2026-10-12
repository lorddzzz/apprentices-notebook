import { expect, test } from 'vitest';
import {
  byReadingOrder,
  chebyshev,
  inBounds,
  key,
  label,
  neighbors4,
  opposite,
  parseKey,
  square,
  step,
  turnLeft,
  turnRight,
} from '$engine';

test('step moves one cell', () => {
  expect(step({ x: 2, y: 2 }, 'up')).toEqual({ x: 2, y: 1 });
  expect(step({ x: 2, y: 2 }, 'right')).toEqual({ x: 3, y: 2 });
});

test('turning', () => {
  expect(turnRight('up')).toBe('right');
  expect(turnRight('left')).toBe('up');
  expect(turnLeft('up')).toBe('left');
  expect(opposite('down')).toBe('up');
});

test('bounds and labels', () => {
  expect(inBounds({ x: 0, y: 0 }, 3, 2)).toBe(true);
  expect(inBounds({ x: 3, y: 0 }, 3, 2)).toBe(false);
  expect(inBounds({ x: 0, y: -1 }, 3, 2)).toBe(false);
  expect(label({ x: 2, y: 3 })).toBe('C4');
});

test('key/parseKey round-trip', () => {
  expect(key({ x: 3, y: 5 })).toBe('3,5');
  expect(parseKey(key({ x: 3, y: 5 }))).toEqual({ x: 3, y: 5 });
  expect(() => parseKey('nope')).toThrow();
});

test('byReadingOrder sorts rows then columns', () => {
  const cs = [
    { x: 2, y: 1 },
    { x: 0, y: 1 },
    { x: 5, y: 0 },
  ];
  expect([...cs].sort(byReadingOrder)).toEqual([
    { x: 5, y: 0 },
    { x: 0, y: 1 },
    { x: 2, y: 1 },
  ]);
});

test('square clips nothing itself', () => {
  const sq = square({ x: 0, y: 0 }, 1);
  expect(sq).toHaveLength(9);
  expect(sq[0]).toEqual({ x: -1, y: -1 });
  expect(square({ x: 2, y: 2 }, 0)).toEqual([{ x: 2, y: 2 }]);
});

test('chebyshev and neighbors4', () => {
  expect(chebyshev({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(3);
  expect(neighbors4({ x: 1, y: 1 })).toEqual([
    { x: 1, y: 0 },
    { x: 2, y: 1 },
    { x: 1, y: 2 },
    { x: 0, y: 1 },
  ]);
});
