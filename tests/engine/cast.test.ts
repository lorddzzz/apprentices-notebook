import { expect, test } from 'vitest';
import {
  type Aim,
  applyAction,
  IllegalActionError,
  isLegal,
  legalAims,
  memberById,
  parseLabel,
} from '$engine';
import { runEchoes } from '$engine/cast';
import { cast, draft, expectLog, unitAtLabel, withLattices } from '../scenarios/harness';

const boltRight = {
  type: 'cast',
  unit: 'draughtsman',
  spell: '0,0',
  aim: { kind: 'dir', dir: 'right' },
} as const;

test('spends a charge, not in lab', () => {
  const s = withLattices('D . d', { draughtsman: 'Bolt> Spark' });
  expect(memberById(s, 'draughtsman').charges['0,0']).toBe(3);
  const r = cast(s, 'draughtsman', 'right');
  const m = memberById(r.state, 'draughtsman');
  expect(m.charges['0,0']).toBe(2);
  expect(m.acted).toBe(true);
  expect(memberById(s, 'draughtsman').charges['0,0']).toBe(3); // input untouched

  const lab = withLattices('D . d', { draughtsman: 'Bolt> Spark' }, { lab: true });
  expect(memberById(cast(lab, 'draughtsman', 'right').state, 'draughtsman').charges['0,0']).toBe(3);
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

test('legalAims: ward targets self and orthogonally adjacent members', () => {
  const s = withLattices('D S d', { draughtsman: 'Ward>' });
  expect(legalAims(s, 'draughtsman', '0,0')).toEqual([
    { kind: 'ally', unit: 'draughtsman' },
    { kind: 'ally', unit: 'stoker' },
  ]);
  const apart = withLattices('D . S d', { draughtsman: 'Ward>' });
  expect(legalAims(apart, 'draughtsman', '0,0')).toEqual([{ kind: 'ally', unit: 'draughtsman' }]);
});

test('echo queues an entry', () => {
  const s = withLattices('D . d', { draughtsman: 'Echo .\nBolt> Spark' });
  const r = cast(s, 'draughtsman', 'right');
  expectLog(r.events, [
    'Draughtsman casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'Spark hits dummy at C1 for 1',
    "Echo: Draughtsman's spell will repeat next turn",
  ]);
  expect(r.state.echoes).toEqual([
    { caster: 'draughtsman', spell: '0,1', aim: { kind: 'dir', dir: 'right' } },
  ]);
});

test('runEchoes recasts at half strength, once', () => {
  const s = withLattices('D . d', { draughtsman: 'Echo .\nBolt> Spark' });
  const queued = cast(s, 'draughtsman', 'right').state;
  const r = draft(queued, (ctx) => runEchoes(ctx));
  expectLog(r.events, [
    "Echo: Draughtsman's Bolt repeats right at half strength",
    'Bolt hits dummy at C1 for 1',
    'Spark hits dummy at C1 for 1',
  ]);
  expect(r.state.echoes).toEqual([]);
  expect(unitAtLabel(r.state, 'C1').hp).toBe(7);
  expect(memberById(r.state, 'draughtsman').charges['0,1']).toBe(2);
});

test('echo fizzles when caster is down', () => {
  const s = withLattices('D . d', { draughtsman: 'Echo .\nBolt> Spark' });
  const queued = cast(s, 'draughtsman', 'right').state;
  const r = draft(queued, (ctx) => {
    memberById(ctx.s, 'draughtsman').hp = 0;
    runEchoes(ctx);
  });
  expectLog(r.events, ["Echo: Draughtsman's spell fizzles"]);
  expect(r.state.echoes).toEqual([]);
});

test('echoed ward needs a living ally, not adjacency', () => {
  const s = withLattices('D S . d', { draughtsman: 'Echo .\nWard> .' });
  const aim: Aim = { kind: 'ally', unit: 'stoker' };
  const queued = cast(s, 'draughtsman', aim).state;
  const r = draft(queued, (ctx) => {
    memberById(ctx.s, 'stoker').pos = parseLabel('C1');
    runEchoes(ctx);
  });
  expectLog(r.events, [
    "Echo: Draughtsman's Ward repeats on Stoker at half strength",
    'Stoker gains a shield of 1',
  ]);
  expect(memberById(r.state, 'stoker').shield).toBe(3);
});

test('discovered accumulates interactions from the cast', () => {
  const s0 = withLattices('D . . d . .\n. . . . . .\n. . . S . .', {
    draughtsman: 'Bolt> Ink',
    stoker: 'Spark\nBolt^', // the flow leaves in the arrow's direction
  });
  const r1 = cast(s0, 'draughtsman', 'right');
  expect(r1.state.discovered).toEqual([]);
  const r2 = cast(r1.state, 'stoker', 'up');
  expect(r2.state.discovered).toEqual(['detonate']);
});
