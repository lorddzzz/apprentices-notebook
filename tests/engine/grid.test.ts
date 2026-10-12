import { expect, test } from 'vitest';
import { inBounds, label, opposite, step, turnLeft, turnRight } from '$engine';

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
