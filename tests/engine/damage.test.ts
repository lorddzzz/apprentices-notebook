import { expect, test } from 'vitest';
import { memberById, unitAt } from '$engine';
import { dealDamage } from '$engine/damage';
import { board, draft, unitAtLabel } from '../scenarios/harness';

test('a mark adds nothing to plain damage (no damage bonuses any more)', () => {
  const r = draft(board('D d!'), (ctx) => dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 2, 'Strike'));
  expect(r.lines).toEqual(['Strike hits dummy at B1 for 2']);
  expect(unitAtLabel(r.state, 'B1')).toMatchObject({ hp: 10, mark: { deep: false } });
});

test('shield absorbs first', () => {
  const s = board('S d');
  const full = draft(s, (ctx) => {
    memberById(ctx.s, 'stoker').shield = 2;
    dealDamage(ctx, memberById(ctx.s, 'stoker'), 2, 'Bite');
  });
  expect(full.lines).toEqual(['Bite hits Stoker for 2', "Stoker's shield absorbs 2 (0 left)"]);
  expect(memberById(full.state, 'stoker')).toMatchObject({ hp: 8, shield: 0 });

  const partial = draft(s, (ctx) => {
    memberById(ctx.s, 'stoker').shield = 1;
    dealDamage(ctx, memberById(ctx.s, 'stoker'), 2, 'Line');
  });
  expect(partial.lines).toEqual(['Line hits Stoker for 2', "Stoker's shield absorbs 1 (0 left)"]);
  expect(memberById(partial.state, 'stoker').hp).toBe(7);
  // The board token `+` is shield too.
  expect(memberById(board('S++ d'), 'stoker').shield).toBe(2);
});

test('death: enemy dies line, unit off the board', () => {
  const s = board('D r', { intents: { B1: 'left' } });
  const r = draft(s, (ctx) => {
    dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 3, 'Bolt');
  });
  expect(r.lines).toEqual(['Bolt hits rat at B1 for 3', 'rat at B1 dies']);
  expect(unitAt(r.state, { x: 1, y: 0 })).toBeNull();
  expect(r.state.units.find((u) => u.id === 'rat-1')).toMatchObject({ hp: 0, intent: null });
  // a dead unit takes no further damage
  const again = draft(r.state, (ctx) => {
    const rat = ctx.s.units.find((u) => u.id === 'rat-1');
    if (rat) expect(dealDamage(ctx, rat, 1, 'Bolt')).toBe(false);
  });
  expect(again.lines).toEqual([]);
});

test('member is down', () => {
  const r = draft(board('D d', { hp: { A1: 1 } }), (ctx) =>
    dealDamage(ctx, memberById(ctx.s, 'draughtsman'), 1, 'Bite'),
  );
  expect(r.lines).toEqual(['Bite hits Draughtsman for 1', 'Draughtsman is down']);
  expect(memberById(r.state, 'draughtsman').hp).toBe(0);
});

test('a dying moth bursts and lights the slick it stood on', () => {
  const r = draft(board('D mo o\n. . r'), (ctx) =>
    dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 1, 'Strike'),
  );
  expect(r.lines).toEqual([
    'Strike hits lamp-moth at B1 for 1',
    'lamp-moth at B1 dies',
    'lamp-moth at B1 bursts',
    'fire bursts at B1',
    'Burst hits Draughtsman for 1',
  ]);
  expect(r.state.tiles[2]?.state?.id).toBe('fire');
});
