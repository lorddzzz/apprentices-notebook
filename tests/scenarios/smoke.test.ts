import { expect, test } from 'vitest';
import type { GameEvent, UnitRef } from '$engine';
import { expectLog, label, parseBoard } from './harness';

test('board parses and the log compares to plain English', () => {
  const board = parseBoard(`
    r . #
    . B .
  `);
  expect([board.width, board.height]).toEqual([3, 2]);
  const [rat] = board.find('r');
  expect(rat).toEqual({ x: 0, y: 0 });

  const at = rat ?? { x: 0, y: 0 };
  const ref: UnitRef = { id: 'rat-1', name: 'rat', at, member: false };
  const log: GameEvent[] = [
    { type: 'damage', target: ref, amount: 3, source: 'Bolt', bonus: [], hpLeft: 0 },
    { type: 'died', unit: ref },
  ];
  expectLog(log, [`Bolt hits rat at ${label(at)} for 3`, 'rat at A1 dies']);
  expect(() => expectLog(log, ['nope'])).toThrow(/mismatch/);
});
