import { expect, test } from 'vitest';
import { parseLabel, tileAt } from '$engine';
import { applySpark } from '$engine/materials';
import { board, cast, draft, expectLog, unitAtLabel, withLattices } from './harness';

/** The six Seam recipes' runes (research design §3.3). */

const at = (s: Parameters<typeof tileAt>[0], label: string) => tileAt(s, parseLabel(label));

test('smear: the mark passes one hop to each adjacent unit, no further', () => {
  const s = withLattices(
    `
    D . r r
    . . r .
    . . . r
  `,
    { draughtsman: 'Bolt> Smear' },
    { hp: { C1: 5 } },
  );
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 is inked',
    'the ink on rat at C1 smears to rat at D1, rat at C2',
    'rat at D1 is inked',
    'rat at C2 is inked',
  ]);
  expect(unitAtLabel(r.state, 'D3').inked).toBe(false); // two hops away
});

test('smear at the board edge: nothing beyond to pass to, nothing logged', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Smear' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 is inked',
  ]);
});

test('torch: oils the tile and the fire runs along connected oil', () => {
  const s = withLattices('S . . o o r', { stoker: 'Bolt> Torch' }, { hp: { F1: 5 } });
  const r = cast(s, 'stoker', 'right');
  expectLog(r.events, [
    'Stoker casts Bolt right',
    'Bolt hits rat at F1 for 2',
    'oil coats F1',
    'oil at F1 ignites, fire spreads to D1, E1',
    'Fire hits rat at F1 for 2 (oil-soaked +1)',
  ]);
  for (const c of ['D1', 'E1', 'F1']) expect(at(r.state, c).fire).toBe(2);
});

test('fog: oil then steam on the tile', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Fog' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'oil coats C1',
    'steam rises at C1',
  ]);
  expect(at(r.state, 'C1')).toMatchObject({ oil: true, steam: 2 });
});

test('mist: inks every unit in the whole cloud, then the steam is gone', () => {
  const s = withLattices(
    `
    . . . .
    . r~ r~ r~
    . . . .
    . S . .
  `,
    { stoker: 'Splash> Mist' },
    { hp: { B2: 5, C2: 5, D2: 5 } },
  );
  const r = cast(s, 'stoker', { kind: 'tile', at: parseLabel('B2') });
  expectLog(r.events, [
    'Stoker casts Splash at B2',
    'Splash bursts at B2',
    'Splash hits rat at B2 for 1',
    'Splash hits rat at C2 for 1',
    'mist drifts through the steam at B2, C2, D2',
    'rat at B2 is inked',
    'rat at C2 is inked',
    'rat at D2 is inked',
    'the steam at B2, C2, D2 fades',
  ]);
  expect(at(r.state, 'C2').steam).toBe(0);
});

test('mist with no steam does nothing and logs nothing', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Mist' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, ['Draughtsman casts Bolt right', 'Bolt hits rat at C1 for 2']);
  expect(unitAtLabel(r.state, 'C1').inked).toBe(false);
});

test('quill: hits the first unit, then pools ink under it', () => {
  const s = withLattices('D . r', { draughtsman: 'Quill>' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Quill right',
    'Quill hits rat at C1 for 2',
    'ink pools at C1',
  ]);
  expect(at(r.state, 'C1').ink).toBe(true);
});

test('quill that hits nothing flies like a bolt and pools nothing', () => {
  const s = withLattices('D . .\nr . .', { draughtsman: 'Quill>' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, ['Draughtsman casts Quill right', 'Quill lands at C1']);
  expect(at(r.state, 'C1').ink).toBe(false);
});

test('brand: marks the unit and brands it', () => {
  const s = withLattices('D . r', { draughtsman: 'Bolt> Brand' }, { hp: { C1: 5 } });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 is inked',
    'rat at C1 is branded',
  ]);
  expect(unitAtLabel(r.state, 'C1').branded).toBe(true);
});

test('brand never pools on empty floor', () => {
  const s = withLattices('D . .\nr . .', { draughtsman: 'Bolt> Brand' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, ['Draughtsman casts Bolt right', 'Bolt lands at C1']);
  expect(at(r.state, 'C1').ink).toBe(false);
});

test('brand + fire: a branded unit takes +2', () => {
  const r = draft(board('S d%o o'), (ctx) => applySpark(ctx, [parseLabel('C1')], 1));
  expectLog(r.events, [
    'oil at C1 ignites, fire spreads to B1',
    'Fire hits dummy at B1 for 3 (branded +2)',
  ]);
});

test('brand and oil-soaked do not stack: the larger applies', () => {
  const s = board('S r%o o', { hp: { B1: 9 } });
  const r = draft(s, (ctx) => applySpark(ctx, [parseLabel('C1')], 1));
  expectLog(r.events, [
    'oil at C1 ignites, fire spreads to B1',
    'Fire hits rat at B1 for 3 (branded +2)',
  ]);
});

test('notation: % round-trips as branded', () => {
  const s = board('S r!%');
  expect(unitAtLabel(s, 'B1')).toMatchObject({ inked: true, branded: true });
});
