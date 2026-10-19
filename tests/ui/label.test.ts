import { expect, test } from 'vitest';
import { parseBoard } from '$engine';
import { viewOfSpec } from '../../src/app/view';
import { cellLabel } from '../../src/ui/components/board/label';

const view = viewOfSpec(parseBoard('D! . ro\n. @~ *\n{stain} r!!&$ _'));

test('cell labels name units, status and states', () => {
  expect(cellLabel(view, { x: 0, y: 0 })).toBe('A1: Draughtsman, 6 of 6 HP, marked');
  expect(cellLabel(view, { x: 1, y: 0 })).toBe('B1: empty');
  expect(cellLabel(view, { x: 2, y: 0 })).toBe('C1: rat, 2 of 2 HP, oil slick');
  expect(cellLabel(view, { x: 1, y: 1 })).toBe('B2: steam vent, steam cloud (2 rounds)');
  expect(cellLabel(view, { x: 2, y: 1 })).toBe('C2: fire (2 rounds)');
});

test('compounds, deep marks, shackles and drops read plainly', () => {
  expect(cellLabel(view, { x: 0, y: 2 })).toBe('A3: stain (2 rounds)');
  expect(cellLabel(view, { x: 1, y: 2 })).toBe('B3: rat, 2 of 2 HP, deeply marked, shackled');
  expect(cellLabel(view, { x: 2, y: 2 })).toBe('C3: a drop');
});

test('dead units are not named', () => {
  const dead = structuredClone(view);
  const rat = dead.units.find((u) => u.id === 'rat-1');
  if (rat) rat.alive = false;
  expect(cellLabel(dead, { x: 2, y: 0 })).toBe('C1: oil slick');
});
