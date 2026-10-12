import { expect, test } from 'vitest';
import { memberById, unitAt } from '$engine';
import { burn, dealDamage, sparkHit } from '$engine/damage';
import { board, draft, unitAtLabel } from '../scenarios/harness';

test('inked takes +1 and line shows (inked +1)', () => {
  const r = draft(board('D d!'), (ctx) => dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 2, 'Bolt'));
  expect(r.lines).toEqual(['Bolt hits dummy at B1 for 3 (inked +1)']);
  expect(r.events[0]).toMatchObject({ type: 'damage', amount: 3, hpLeft: 9 });
  expect(unitAtLabel(r.state, 'B1')).toMatchObject({ hp: 9, inked: true });
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
});

test('death: enemy dies line, unit off the board', () => {
  const s = board('D r', { intents: { B1: 'left' } });
  const r = draft(s, (ctx) => {
    ctx.cast = { kills: [] };
    dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 3, 'Bolt');
    expect(ctx.cast.kills).toEqual([{ unit: 'rat-1', at: { x: 1, y: 0 } }]);
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

test('spark detonates an inked survivor; detonation gets no inked bonus', () => {
  const r = draft(board('S d!'), (ctx) => sparkHit(ctx, unitAtLabel(ctx.s, 'B1'), 2));
  expect(r.lines).toEqual([
    'Spark hits dummy at B1 for 3 (inked +1)',
    'the ink on dummy at B1 detonates',
    'Detonation hits dummy at B1 for 2',
  ]);
  expect(unitAtLabel(r.state, 'B1')).toMatchObject({ hp: 7, inked: false });
});

test('fire: oil-soaked bonus, then inked, then detonation', () => {
  const r = draft(board('S r!', { hp: { B1: 5 } }), (ctx) => burn(ctx, unitAtLabel(ctx.s, 'B1')));
  expect(r.lines).toEqual([
    'Fire hits rat at B1 for 3 (oil-soaked +1, inked +1)',
    'the ink on rat at B1 detonates',
    'Detonation hits rat at B1 for 2',
    'rat at B1 dies',
  ]);
  const plain = draft(board('S d'), (ctx) => burn(ctx, unitAtLabel(ctx.s, 'B1')));
  expect(plain.lines).toEqual(['Fire hits dummy at B1 for 1']);
});
