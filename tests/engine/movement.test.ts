import { expect, test } from 'vitest';
import { canUndoMove, IllegalActionError, isLegal, memberById, parseLabel, tileAt } from '$engine';
import { enemyWalk } from '$engine/movement';
import { act, board, draft, expectLog, unitAtLabel } from '../scenarios/harness';

const to = (lbl: string) => parseLabel(lbl);
const move = (unit: string, lbl: string) => ({ type: 'move', unit, to: to(lbl) }) as const;
const shove = (unit: string, dir: 'up' | 'right' | 'down' | 'left') =>
  ({ type: 'shove', unit, dir }) as const;

test('member moves along BFS path', () => {
  const r = act(board('D . . .\n. . . d'), move('draughtsman', 'C2'));
  expectLog(r.events, ['Draughtsman moves to C2']);
  expect(r.events[0]).toMatchObject({ path: [to('B1'), to('C1'), to('C2')] });
  expect(memberById(r.state, 'draughtsman')).toMatchObject({
    pos: to('C2'),
    moved: true,
    undo: { from: to('A1'), puddle: false },
  });
});

test('cannot move twice', () => {
  const r = act(board('D . . .\n. . . d'), move('draughtsman', 'B1'));
  expect(() => act(r.state, move('draughtsman', 'C1'))).toThrow(IllegalActionError);
  expect(isLegal(r.state, move('draughtsman', 'C1'))).toBe('Draughtsman has already moved');
});

test('cannot move through units or plates, or beyond the move range', () => {
  const s = board('D r . . .\n= . . . d');
  expect(isLegal(s, move('draughtsman', 'C1'))).toMatch(/can't reach C1/);
  expect(isLegal(s, move('draughtsman', 'A2'))).toMatch(/can't reach A2/);
  expect(isLegal(board('D . . . .\n. . . . d'), move('draughtsman', 'E1'))).toMatch(/can't reach/);
});

test('stepping on a puddle inks and consumes it', () => {
  const r = act(board('D . i\n. . d'), move('draughtsman', 'C1'));
  expectLog(r.events, ['Draughtsman moves to C1', 'Draughtsman steps in ink and is inked']);
  expect(tileAt(r.state, to('C1')).ink).toBe(false);
  expect(memberById(r.state, 'draughtsman')).toMatchObject({
    inked: true,
    undo: { puddle: true },
  });
});

test('an inked unit leaves the puddle alone', () => {
  const r = act(board('D! . i\n.  . d'), move('draughtsman', 'C1'));
  expectLog(r.events, ['Draughtsman moves to C1']);
  expect(tileAt(r.state, to('C1')).ink).toBe(true);
});

test('undo restores position, puddle and ink', () => {
  const s = board('D . i\n. . d');
  const moved = act(s, move('draughtsman', 'C1'));
  const back = act(moved.state, { type: 'undoMove', unit: 'draughtsman' });
  expectLog(back.events, ['Draughtsman steps back to A1']);
  expect(memberById(back.state, 'draughtsman')).toMatchObject({
    pos: to('A1'),
    inked: false,
    moved: false,
    undo: null,
  });
  expect(tileAt(back.state, to('C1')).ink).toBe(true);
  expect(isLegal(back.state, move('draughtsman', 'B2'))).toBeNull();
});

test('undo cleared after acting', () => {
  const s = board('D . . .\n. r . .\n. . . d');
  const moved = act(s, move('draughtsman', 'B1'));
  const shoved = act(moved.state, shove('draughtsman', 'down'));
  expect(canUndoMove(shoved.state, 'draughtsman')).toBe(false);
  expect(isLegal(shoved.state, { type: 'undoMove', unit: 'draughtsman' })).toBe(
    'Draughtsman has no move to undo',
  );
});

test('a move made after acting can still be undone', () => {
  const s = board('D r . .\n. . . .\n. . . d');
  const shoved = act(s, shove('draughtsman', 'right'));
  const moved = act(shoved.state, move('draughtsman', 'A3'));
  expect(canUndoMove(moved.state, 'draughtsman')).toBe(true);
});

test('undo is blocked when the old tile is taken', () => {
  const s = board('D S . .\n. . . d');
  const dMoved = act(s, move('draughtsman', 'A2'));
  const sMoved = act(dMoved.state, move('stoker', 'A1'));
  expect(canUndoMove(sMoved.state, 'draughtsman')).toBe(false);
});

test('being pushed clears undo', () => {
  const s = board('. D . .\nS . . d');
  const dMoved = act(s, move('draughtsman', 'B2'));
  const pushed = act(dMoved.state, shove('stoker', 'right'));
  expectLog(pushed.events, ['Stoker shoves Draughtsman right', 'Draughtsman is pushed to C2']);
  expect(memberById(pushed.state, 'draughtsman').undo).toBeNull();
});

test('shove-slide', () => {
  const r = act(board('S r o o . .'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 is pushed to C1',
    'rat at C1 slides across the oil to E1',
  ]);
  expect(memberById(r.state, 'stoker').acted).toBe(true);
  expect(isLegal(r.state, shove('stoker', 'right'))).toBe('Stoker has already acted');
});

test('bump into unit damages both', () => {
  const r = act(board('S r b'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 bumps into sentry at C1',
    'Bump hits rat at B1 for 1',
    'Bump hits sentry at C1 for 1',
  ]);
});

test('bump into the edge', () => {
  const r = act(board('S r'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 bumps into the edge',
    'Bump hits rat at B1 for 1',
  ]);
});

test('bump into a brass plate hurts only the pushed unit', () => {
  const r = act(board('S r! ='), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 bumps into a brass plate',
    'Bump hits rat at B1 for 2 (inked +1)',
    'rat at B1 dies',
    'The party wins',
  ]);
});

test('slide stops before a blocker', () => {
  const r = act(board('S r o o b'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 is pushed to C1',
    'rat at C1 slides across the oil to D1',
  ]);
});

test('slide stops at the edge without a bump', () => {
  const r = act(board('S r o o'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 is pushed to C1',
    'rat at C1 slides across the oil to D1',
  ]);
  expect(unitAtLabel(r.state, 'D1').hp).toBe(2);
});

test('slide ends on puddle and inks', () => {
  const r = act(board('S r o i'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 is pushed to C1',
    'rat at C1 slides across the oil to D1',
    'rat at D1 steps in ink and is inked',
  ]);
});

test('enemy walk leaves an oil trail that catches fire', () => {
  const walk = draft(board('r . . D'), (ctx) => {
    const rat = unitAtLabel(ctx.s, 'A1');
    if (rat.kind === 'enemy') enemyWalk(ctx, rat, [to('B1'), to('C1')]);
  });
  expectLog(walk.events, ['rat at A1 moves to C1', 'oil coats A1, B1, C1']);

  const burning = draft(board('* r . D'), (ctx) => {
    const rat = unitAtLabel(ctx.s, 'B1');
    if (rat.kind === 'enemy') enemyWalk(ctx, rat, [to('C1')]);
  });
  expectLog(burning.events, [
    'rat at B1 moves to C1',
    'oil coats B1, C1',
    'oil at B1 ignites, fire spreads to C1',
    'Fire hits rat at C1 for 2 (oil-soaked +1)',
    'rat at C1 dies',
  ]);

  const inky = draft(board('f . i D'), (ctx) => {
    const fam = unitAtLabel(ctx.s, 'A1');
    if (fam.kind === 'enemy') enemyWalk(ctx, fam, [to('B1'), to('C1')]);
  });
  expectLog(inky.events, [
    'familiar at A1 moves to C1',
    'familiar at C1 steps in ink and is inked',
  ]);
});
