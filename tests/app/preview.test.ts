import { expect, test } from 'vitest';
import { type Action, scenarioBattle } from '$engine';
import { previewOf } from '../../src/app/battleInput';
import { battleOf, CAST_BOARD, SHOVE_BOARD } from './battleFixtures';

const boltRight: Action = {
  type: 'cast',
  unit: 'draughtsman',
  spell: '0,1',
  aim: { kind: 'dir', dir: 'right' },
};

test('a Bolt that hits a unit previews its landing and marks the target tile', () => {
  const p = previewOf(battleOf(CAST_BOARD), boltRight);
  expect(p.damage).toEqual({ 'dummy-1': 2 });
  expect(p.kills).toEqual([]);
  expect(p.summary).toBe('Bolt right: dummy D1 −2 marked');
  expect(p.targets).toEqual([{ x: 3, y: 0 }]);
  expect(p.path.length).toBeGreaterThan(1);
});

test('a touch reads as what it does to the unit it aims at', () => {
  const s = scenarioBattle(
    { board: SHOVE_BOARD, lattices: { stoker: 'Touch> Strike' } },
    { lab: true },
  );
  const p = previewOf(s, {
    type: 'cast',
    unit: 'stoker',
    spell: '0,0',
    aim: { kind: 'tile', at: { x: 1, y: 0 } },
  });
  expect(p.summary).toBe('Touch at B1: rat B1 −2 dies');
  expect(p.targets).toEqual([{ x: 1, y: 0 }]);
});

test('a shove previews the pushed unit', () => {
  const s = battleOf(SHOVE_BOARD);
  const p = previewOf(s, { type: 'shove', unit: 'stoker', dir: 'right' });
  expect(p.targets).toEqual([{ x: 1, y: 0 }]);
  expect(p.summary).toMatch(/^Shove rat right: /);
});

test('preview never changes the session state', () => {
  const s = battleOf(CAST_BOARD);
  const snapshot = structuredClone(s);
  previewOf(s, boltRight);
  expect(s).toEqual(snapshot);
});
