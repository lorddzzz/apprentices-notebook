import { expect, test } from 'vitest';
import {
  aimTargets,
  applyAction,
  IllegalActionError,
  isLegal,
  legalAims,
  memberById,
  parseLabel,
} from '$engine';
import {
  cast,
  expectLog,
  expectLogIncludes,
  unitAtLabel,
  withLattices,
} from '../scenarios/harness';

const boltRight = {
  type: 'cast',
  unit: 'draughtsman',
  spell: '0,0',
  aim: { kind: 'dir', dir: 'right' },
} as const;

test('spends a charge, not in lab', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt> Spark' });
  expect(memberById(s, 'draughtsman').charges['0,0']).toBe(5);
  const r = cast(s, 'draughtsman', 'right');
  const m = memberById(r.state, 'draughtsman');
  expect(m.charges['0,0']).toBe(4);
  expect(m.acted).toBe(true);
  expect(memberById(s, 'draughtsman').charges['0,0']).toBe(5); // input untouched

  const lab = withLattices('D . d', { draughtsman: 'Bolt> Spark' }, { lab: true });
  expect(memberById(cast(lab, 'draughtsman', 'right').state, 'draughtsman').charges['0,0']).toBe(5);
});

test('no charges → illegal', () => {
  const s = withLattices(
    'D . d',
    { draughtsman: 'Bolt>' },
    { party: { draughtsman: { charges: { '0,0': 0 } } } },
  );
  expect(isLegal(s, boltRight)).toBe('No charges left');
  expect(() => applyAction(s, boltRight)).toThrow(IllegalActionError);
});

test('cannot cast twice in a turn', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt>' });
  const r = cast(s, 'draughtsman', 'right');
  expect(isLegal(r.state, boltRight)).toBe('Draughtsman has already acted');
});

test('casting clears the move undo', () => {
  const s = withLattices('D . . d', { draughtsman: 'Bolt>' });
  const moved = applyAction(s, { type: 'move', unit: 'draughtsman', to: parseLabel('B1') });
  const r = applyAction(moved.state, boltRight);
  expect(memberById(r.state, 'draughtsman').undo).toBeNull();
});

test('legalAims: bolt dirs exclude off-board', () => {
  const s = withLattices('D . d\n. . .', { draughtsman: 'Bolt>' });
  expect(legalAims(s, 'draughtsman', '0,0')).toEqual([
    { kind: 'dir', dir: 'right' },
    { kind: 'dir', dir: 'down' },
  ]);
});

test('legalAims: splash reaches chebyshev range 3', () => {
  const s = withLattices('D . . . . .\n. . . . . .\n. . . . . .\n. . . . . d\n. . . . . .', {
    draughtsman: 'Splash>',
  });
  const tiles = legalAims(s, 'draughtsman', '0,0').map((a) => (a.kind === 'tile' ? a.at : null));
  expect(tiles).toHaveLength(16);
  expect(tiles).toContainEqual(parseLabel('D4'));
  expect(tiles).not.toContainEqual(parseLabel('E1'));
});

test('legalAims: touch takes yourself or an adjacent tile, unit or not', () => {
  const s = withLattices('. D S\n. . .', { draughtsman: 'Touch>' });
  expect(legalAims(s, 'draughtsman', '0,0')).toEqual([
    { kind: 'self' },
    { kind: 'tile', at: parseLabel('A1') },
    { kind: 'tile', at: parseLabel('C1') },
    { kind: 'tile', at: parseLabel('B2') },
  ]);
});

// ── Resolution: aim, then the steps act in wiring order ──

test('a cast logs who casts, where it aims and how the line flies, then a silent trace', () => {
  const s = withLattices('D . r . S', { draughtsman: 'Bolt> Strike' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'bolt aims at rat-1',
    'Bolt lands at C1',
    'Strike hits rat at C1 for 2',
    'rat at C1 dies',
    'The party wins',
  ]);
  expect(r.events.map((e) => e.type)).toEqual([
    'cast',
    'aimed',
    'lands',
    'damage',
    'died',
    'trace',
    'won',
  ]);
  const aimed = r.events.find((e) => e.type === 'aimed');
  expect(aimed).toMatchObject({ targets: [{ kind: 'unit', unit: 'rat-1' }], heading: 'right' });
});

test('every event of a cast carries its origin; casts count up', () => {
  const s = withLattices('D . r\nS . .', { draughtsman: 'Bolt>', stoker: 'Bolt>' });
  const first = cast(s, 'draughtsman', 'right');
  const origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
  for (const e of first.events) expect(e.origin).toEqual(origin);
  expect(first.state.castSeq).toBe(1);
  const second = cast(first.state, 'stoker', 'right');
  expect(second.events[0]?.origin).toMatchObject({ caster: 'stoker', cast: 2 });
  // Unison's record of this player phase (P26): each cast and what it aimed at.
  expect(second.state.landed).toEqual([
    { caster: 'draughtsman', targets: ['u:rat-1'] },
    { caster: 'stoker', targets: ['t:2,1'] },
  ]);
});

test('bolt with no unit in its line aims at the last tile in range (P21), range 4', () => {
  const s = withLattices('D . . . . r', { draughtsman: 'Bolt>' });
  expectLog(cast(s, 'draughtsman', 'right').events, [
    'Draughtsman casts Bolt right',
    'bolt aims at E1',
    'Bolt lands at E1',
  ]);
});

test('a gifted Bolt reaches one tile further (P36: the Stoker is gifted in the Seam)', () => {
  const s = withLattices('S . . . . .', { stoker: 'Bolt>' });
  expectLogIncludes(cast(s, 'stoker', 'right').events, ['bolt aims at F1']);
});

test('a cloud or a plate stops the line and is the target', () => {
  const cloud = withLattices('D . ~ r', { draughtsman: 'Bolt>' });
  expectLog(cast(cloud, 'draughtsman', 'right').events, [
    'Draughtsman casts Bolt right',
    'bolt aims at C1',
    'Bolt is stopped by the cloud at C1',
  ]);
  const plate = withLattices('D = r', { draughtsman: 'Bolt>' });
  expectLogIncludes(cast(plate, 'draughtsman', 'right').events, [
    'bolt aims at B1',
    'Bolt is stopped by the brass plate at B1',
  ]);
});

test('splash freezes its targets in reading order with headings from the centre (P22, P23)', () => {
  const s = withLattices('D . . .\n. r . .\n. . . .', { draughtsman: 'Splash>' });
  const aimed = cast(s, 'draughtsman', { kind: 'tile', at: parseLabel('C2') }).events.find(
    (e) => e.type === 'aimed',
  );
  expect(
    aimed?.type === 'aimed' && aimed.targets.map((t) => (t.kind === 'unit' ? t.unit : t.at)),
  ).toEqual([
    parseLabel('B1'),
    parseLabel('C1'),
    parseLabel('D1'),
    'rat-1',
    parseLabel('C2'),
    parseLabel('D2'),
    parseLabel('B3'),
    parseLabel('C3'),
    parseLabel('D3'),
  ]);
  const { headings } = aimTargets(
    s,
    unitAtLabel(s, 'A1'),
    'splash',
    { kind: 'tile', at: parseLabel('C2') },
    false,
  );
  expect(headings.get('u:rat-1')).toBe('left'); // B2 is left of the centre
  expect(headings.get('t:2,0')).toBe('up'); // C1 is above it
  expect(headings.get('t:2,1')).toBe('right'); // the centre takes the caster's heading (A1 → C2)
  expect(headings.get('t:3,2')).toBe('right'); // a diagonal too
});

test('touch on yourself heads where you last moved, else nowhere (P22)', () => {
  const s = withLattices('D . .\n. . r', { draughtsman: 'Touch>' });
  const still = aimTargets(s, unitAtLabel(s, 'A1'), 'touch', { kind: 'self' }, false);
  expect(still.targets).toEqual([{ kind: 'unit', unit: 'draughtsman' }]);
  expect(still.headings.get('u:draughtsman')).toBeNull();
  const moved = applyAction(s, { type: 'move', unit: 'draughtsman', to: parseLabel('B1') });
  const m = unitAtLabel(moved.state, 'B1');
  expect(
    aimTargets(moved.state, m, 'touch', { kind: 'self' }, false).headings.get('u:draughtsman'),
  ).toBe('right');
  const adjacent = aimTargets(
    moved.state,
    m,
    'touch',
    { kind: 'tile', at: parseLabel('B2') },
    false,
  );
  expect(adjacent.targets).toEqual([{ kind: 'tile', at: parseLabel('B2') }]);
  expect(adjacent.headings.get('t:1,1')).toBe('down');
});

test('vat aims the 2×2 whose top-left is the aimed tile', () => {
  const s = withLattices('D . .\n. r .', { draughtsman: 'Vat>' });
  const { targets } = aimTargets(
    s,
    unitAtLabel(s, 'A1'),
    'vat',
    { kind: 'tile', at: parseLabel('A1') },
    false,
  );
  expect(targets).toEqual([
    { kind: 'unit', unit: 'draughtsman' },
    { kind: 'tile', at: parseLabel('B1') },
    { kind: 'tile', at: parseLabel('A2') },
    { kind: 'unit', unit: 'rat-1' },
  ]);
});
