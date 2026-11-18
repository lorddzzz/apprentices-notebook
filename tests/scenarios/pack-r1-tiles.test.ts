import { expect, test } from 'vitest';
import { lands, stateAt, tile } from './chemHarness';
import { board, cast, withLattices } from './harness';

test('a Pool leaves a bell and blank dry', () => {
  const r = lands(board('D . . . .\n . {bell:mid} o {blank} .\n . . . . r'), [['oil', tile('C2')]]);
  expect(stateAt(r.state, 'B2')).toBeNull();
  expect(stateAt(r.state, 'D2')).toBeNull();
  expect(r.events.some((e) => e.type === 'landed' && e.at.x === 1 && e.at.y === 1)).toBe(false);
});

test('Draw cannot carry a slick onto a bell', () => {
  const s = withLattices('D o {bell:mid} . r', { draughtsman: 'Touch> Draw' });
  const r = cast(s, 'draughtsman', { kind: 'tile', at: { x: 1, y: 0 } });
  expect(stateAt(r.state, 'C1')).toBeNull();
  expect(r.events.some((e) => e.type === 'drawn' && e.to.x === 2)).toBe(false);
  expect(r.events.some((e) => e.type === 'miss' && e.source === 'Draw')).toBe(true);
});

test('Draw of a plate onto a bell retunes it without placing the plate', () => {
  const s = withLattices('D # {bell:mid} . r', { draughtsman: 'Touch> Draw' });
  const r = cast(s, 'draughtsman', { kind: 'tile', at: { x: 1, y: 0 } });
  expect(stateAt(r.state, 'C1')).toBeNull();
  expect(r.events.some((e) => e.type === 'foundry:retuned')).toBe(true);
});

test('Draw refuses a copied compound that is not a cloud on a bell', () => {
  const s = withLattices('D {stain} {bell:mid} . r', { draughtsman: 'Touch> Draw' });
  const r = cast(s, 'draughtsman', { kind: 'tile', at: { x: 1, y: 0 } });
  expect(stateAt(r.state, 'C1')).toBeNull();
  expect(stateAt(r.state, 'B1')?.id).toBe('stain');
  expect(r.events.some((e) => e.type === 'miss' && e.source === 'Draw')).toBe(true);
});

test('Draw can copy a cloud compound onto a bell', () => {
  const s = withLattices('D {fog} {bell:mid} . r', { draughtsman: 'Touch> Draw' });
  const r = cast(s, 'draughtsman', { kind: 'tile', at: { x: 1, y: 0 } });
  expect(stateAt(r.state, 'C1')?.id).toBe('greaseFog');
});
