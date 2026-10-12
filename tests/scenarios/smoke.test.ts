import { expect, test } from 'vitest';
import type { GameEvent } from '$engine';
import { expectLog, label, parseBoard } from './harness';

test('board parses and the log compares to plain English', () => {
  const board = parseBoard(`
    r . #
    . B .
  `);
  expect([board.width, board.height]).toEqual([3, 2]);
  const [rat] = board.find('r');
  expect(rat).toEqual({ x: 0, y: 0 });

  const log: GameEvent[] = [
    { type: 'spawn', unit: 'rat', at: rat ?? { x: 0, y: 0 } },
    { type: 'damage', target: `rat at ${label({ x: 0, y: 0 })}`, amount: 3, source: 'Bolt' },
  ];
  expectLog(log, ['rat appears', 'Bolt hits rat at A1 for 3']);
  expect(() => expectLog(log, ['nope'])).toThrow(/mismatch/);
});
