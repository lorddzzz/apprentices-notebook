import { expect, test } from 'vitest';
import { type InventionDef, type LineId } from '$data';
import { type GameEvent, libraryOf, parseLabel } from '$engine';
import { cast, withLattices } from './harness';

/** CG-3: one firing scenario per new Cartographers line (Erase and Draw on paper). */

const touch = (lbl: string) => ({ kind: 'tile' as const, at: parseLabel(lbl) });
const fired = (events: readonly GameEvent[]): LineId[] =>
  events.flatMap((e) => (e.line ? [e.line] : []));
const silver: InventionDef = {
  id: 'inv:erase-quicksilver',
  name: 'erase-quicksilver',
  method: 'repeat',
  parts: ['erase'],
  solvent: 'quicksilver',
};

test('erase:unit fires when Erase un-draws pencil under a foe', () => {
  const s = withLattices('D r{pencil} . . r', { draughtsman: 'Touch> Erase' });
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('erase:unit');
});

test('erase:empty fires when Erase un-draws an outline', () => {
  const s = withLattices('D {outline:surveyor@2} . . r', { draughtsman: 'Touch> Erase' });
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('erase:empty');
});

test('draw:drop fires when Draw would carry a state onto blank paper', () => {
  const s = withLattices('D o {blank} . r', { draughtsman: 'Touch> Draw' });
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('draw:drop');
});

test('quicksilver:drop fires when the mirrored Erase un-draws pencil', () => {
  const s = withLattices(
    'D {pencil} . . . {pencil} .\n. . . . . . r',
    { draughtsman: 'Touch> inv:erase-quicksilver' },
    { inventions: libraryOf([silver]) },
  );
  expect(fired(cast(s, 'draughtsman', touch('B1')).events)).toContain('quicksilver:drop');
});
