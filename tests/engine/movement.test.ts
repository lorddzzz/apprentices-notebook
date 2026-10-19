import { expect, test } from 'vitest';
import { canUndoMove, IllegalActionError, isLegal, memberById, parseLabel, tileAt } from '$engine';
import { enemyWalk } from '$engine/movement';
import { act, board, draft, expectLog, unitAtLabel } from '../scenarios/harness';

const to = (lbl: string) => parseLabel(lbl);
const move = (unit: string, lbl: string) => ({ type: 'move', unit, to: to(lbl) }) as const;
const shove = (unit: string, dir: 'up' | 'right' | 'down' | 'left') =>
  ({ type: 'shove', unit, dir }) as const;

test('member moves along BFS path and remembers its last step (P22)', () => {
  const r = act(board('D . . .\n. . . d'), move('draughtsman', 'C2'));
  expectLog(r.events, ['Draughtsman moves to C2']);
  expect(r.events[0]).toMatchObject({ path: [to('B1'), to('C1'), to('C2')] });
  expect(memberById(r.state, 'draughtsman')).toMatchObject({
    pos: to('C2'),
    moved: true,
    lastMove: 'down',
    undo: { from: to('A1') },
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
  expect(isLegal(board('D {wall} .\n. . .\n. . d'), move('draughtsman', 'B2'))).toBeNull();
  expect(isLegal(board('D {wall} .\n= . .\n. . d'), move('draughtsman', 'B2'))).toMatch(
    /can't reach/,
  );
});

test('a shackled member cannot move by itself', () => {
  expect(isLegal(board('D$ . .\n. . d'), move('draughtsman', 'B1'))).toMatch(/can't reach/);
});

test('undo restores the position and forgets the last step', () => {
  const s = board('D . i\n. . d');
  const moved = act(s, move('draughtsman', 'C1'));
  const back = act(moved.state, { type: 'undoMove', unit: 'draughtsman' });
  expectLog(back.events, ['Draughtsman steps back to A1']);
  expect(memberById(back.state, 'draughtsman')).toMatchObject({
    pos: to('A1'),
    moved: false,
    lastMove: null,
    undo: null,
  });
  // A blot does nothing on its own (P13): it is still there.
  expect(tileAt(back.state, to('C1')).state?.id).toBe('blot');
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

test("another member's shove clears every pending undo", () => {
  const s = board('D . . .\nS r . .\n. . . d');
  const moved = act(s, move('draughtsman', 'B1'));
  const shoved = act(moved.state, shove('stoker', 'right'));
  expect(canUndoMove(shoved.state, 'draughtsman')).toBe(false);
});

test("another member's move keeps the undo", () => {
  const s = board('D . . .\nS . . .\n. . . d');
  const moved = act(s, move('draughtsman', 'B1'));
  const both = act(moved.state, move('stoker', 'B3'));
  expect(canUndoMove(both.state, 'draughtsman')).toBe(true);
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
  expectLog(pushed.events, [
    'Stoker shoves Draughtsman right',
    'Draughtsman is pushed right to C2',
  ]);
  expect(memberById(pushed.state, 'draughtsman').undo).toBeNull();
});

test('shove pushes one tile and uses the action (P12)', () => {
  const r = act(board('S r . . d'), shove('stoker', 'right'));
  expectLog(r.events, ['Stoker shoves rat at B1 right', 'rat at B1 is pushed right to C1']);
  expect(memberById(r.state, 'stoker').acted).toBe(true);
  expect(isLegal(r.state, shove('stoker', 'right'))).toBe('Stoker has already acted');
});

test('a shove into a unit crushes: 1 to the pushed unit, 1 to what it hit (P19)', () => {
  const r = act(board('S r b'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 is crushed against sentry at C1 for 1',
    'Crush hits rat at B1 for 1',
    'Crush hits sentry at C1 for 1',
  ]);
});

test('a shove into the edge of a walled district crushes against the wall (P3)', () => {
  const edge = act(board('. S r\n. . d'), shove('stoker', 'right'));
  expectLog(edge.events, [
    'Stoker shoves rat at C1 right',
    'rat at C1 is crushed against the wall for 1',
    'Crush hits rat at C1 for 1',
  ]);
});

test('a shove into a plate hurts only the pushed unit', () => {
  const r = act(board('S r =\n. . d'), shove('stoker', 'right'));
  expectLog(r.events, [
    'Stoker shoves rat at B1 right',
    'rat at B1 is crushed against the plate for 1',
    'Crush hits rat at B1 for 1',
  ]);
});

test('enemy walk leaves a slick trail on bare tiles only', () => {
  const walk = draft(board('r . i D'), (ctx) => {
    const rat = unitAtLabel(ctx.s, 'A1');
    if (rat.kind === 'enemy') enemyWalk(ctx, rat, [to('B1'), to('C1')]);
  });
  expectLog(walk.events, [
    'rat at A1 moves to C1',
    'oil lands at A1 as slick',
    'oil lands at B1 as slick',
  ]);
  expect(tileAt(walk.state, to('C1')).state?.id).toBe('blot');

  const fam = draft(board('f . . D'), (ctx) => {
    const f = unitAtLabel(ctx.s, 'A1');
    if (f.kind === 'enemy') enemyWalk(ctx, f, [to('B1'), to('C1')]);
  });
  expectLog(fam.events, ['familiar at A1 moves to C1']);
});
