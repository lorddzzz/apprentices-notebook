import { expect, test } from 'vitest';
import { parseBoard } from '$engine';
import { viewOfSpec } from '../../src/app/view';
import { cellLabel } from '../../src/ui/components/board/label';

const view = viewOfSpec(parseBoard('D! . ro\n. @~ *'));

test('cell labels name units, status and layers', () => {
  expect(cellLabel(view, { x: 0, y: 0 })).toBe('A1: Draughtsman, 6 of 6 HP, inked');
  expect(cellLabel(view, { x: 1, y: 0 })).toBe('B1: empty');
  expect(cellLabel(view, { x: 2, y: 0 })).toBe('C1: rat, 2 of 2 HP, oil-soaked, oil');
  expect(cellLabel(view, { x: 1, y: 1 })).toBe('B2: steam vent, steam (2 rounds)');
  expect(cellLabel(view, { x: 2, y: 1 })).toBe('C2: oil, fire (2 rounds)');
});

test('dead units are not named', () => {
  const dead = structuredClone(view);
  const rat = dead.units.find((u) => u.id === 'rat-1');
  if (rat) rat.alive = false;
  expect(cellLabel(dead, { x: 2, y: 0 })).toBe('C1: oil');
});
