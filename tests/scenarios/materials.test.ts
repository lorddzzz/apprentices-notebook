import { expect, test } from 'vitest';
import { parseLabel, tileAt } from '$engine';
import { applyInk, applyOil, applySpark, ignite } from '$engine/materials';
import { board, draft, expectLog, unitAtLabel } from './harness';

/** Material chain reactions, driven directly on a draft (casting arrives in step 5). */

const cells = (...labels: string[]) => labels.map(parseLabel);

test('spark hits, then detonates an inked survivor', () => {
  const r = draft(board('S d!'), (ctx) => applySpark(ctx, cells('B1'), 2));
  expectLog(r.events, [
    'Spark hits dummy at B1 for 3 (inked +1)',
    'the ink on dummy at B1 detonates',
    'Detonation hits dummy at B1 for 2',
  ]);
});

test('spark on a killed inked unit does not detonate', () => {
  const r = draft(board('S r!'), (ctx) => applySpark(ctx, cells('B1'), 1));
  expectLog(r.events, ['Spark hits rat at B1 for 2 (inked +1)', 'rat at B1 dies']);
});

test('ink then spark: the mark from this cast detonates', () => {
  const r = draft(board('S . d'), (ctx) => {
    applyInk(ctx, cells('C1'));
    applySpark(ctx, cells('C1'), 1);
  });
  expectLog(r.events, [
    'dummy at C1 is inked',
    'Spark hits dummy at C1 for 2 (inked +1)',
    'the ink on dummy at C1 detonates',
    'Detonation hits dummy at C1 for 2',
  ]);
});

test('oil chain: spark ignites connected oil and burns oil-soaked rats', () => {
  const r = draft(board('. . . . . d\nS . ro o ro o'), (ctx) => applySpark(ctx, cells('C2'), 2));
  expectLog(r.events, [
    'Spark hits rat at C2 for 2',
    'rat at C2 dies',
    'oil at C2 ignites, fire spreads to D2, E2, F2',
    'Fire hits rat at E2 for 2 (oil-soaked +1)',
    'rat at E2 dies',
  ]);
  for (const c of cells('C2', 'D2', 'E2', 'F2')) expect(tileAt(r.state, c).fire).toBe(2);
});

test('fire region stops at steam', () => {
  const s = board(`
    . . o o ~o o
    D . . . .  d
  `);
  const r = draft(s, (ctx) => applySpark(ctx, cells('C1'), 1));
  expectLog(r.events, ['oil at C1 ignites, fire spreads to D1', 'steam puts out the fire at E1']);
  expect(tileAt(r.state, parseLabel('E1')).fire).toBe(0);
  expect(tileAt(r.state, parseLabel('F1'))).toMatchObject({ oil: true, fire: 0 });
});

test('spark on oil under steam is put out at once', () => {
  const r = draft(board('o~ d'), (ctx) => applySpark(ctx, cells('A1'), 1));
  expectLog(r.events, ['steam puts out the fire at A1']);
});

test('fire damage +1 to oil-soaked', () => {
  const r = draft(board('ro do'), (ctx) => ignite(ctx, parseLabel('A1')));
  expectLog(r.events, [
    'oil at A1 ignites, fire spreads to B1',
    'Fire hits rat at A1 for 2 (oil-soaked +1)',
    'rat at A1 dies',
    'Fire hits dummy at B1 for 1',
  ]);
});

test('oil poured next to fire spreads the blaze', () => {
  const r = draft(board('* . ro'), (ctx) => applyOil(ctx, cells('B1')));
  expectLog(r.events, [
    'oil coats B1',
    'oil at B1 ignites, fire spreads to C1',
    'Fire hits rat at C1 for 2 (oil-soaked +1)',
    'rat at C1 dies',
  ]);
});

test('brass conduction reaches plates, sentries and coated units', () => {
  const r = draft(board('S . = = b\n. . . . r&'), (ctx) => applySpark(ctx, cells('C1'), 2));
  expectLog(r.events, [
    'Spark conducts through the brass from C1 (4 tiles)',
    'Spark hits sentry at E1 for 2',
    'Spark hits rat at E2 for 2',
    'rat at E2 dies',
  ]);
});

test('steam arc hits everyone in the cloud', () => {
  const r = draft(board('D . ~ ~ ~\n. . r~ . f~'), (ctx) => applySpark(ctx, cells('C1'), 1));
  expectLog(r.events, [
    'Spark arcs through the steam from C1 (5 tiles)',
    'Spark hits rat at C2 for 1',
    'Spark hits familiar at E2 for 1',
    'familiar at E2 dies',
  ]);
});

test('mixed network: brass sentry in steam bridges arc and conduct', () => {
  const s = board(`
    . ~ b~ = .
    S . .  r& d
  `);
  const r = draft(s, (ctx) => applySpark(ctx, cells('B1'), 1));
  expectLog(r.events, [
    'Spark arcs through the steam from B1 (2 tiles)',
    'Spark hits sentry at C1 for 1',
    'Spark conducts through the brass from C1 (3 tiles)',
    'Spark hits rat at D2 for 1',
  ]);
  expect(unitAtLabel(r.state, 'E2').hp).toBe(12);
});

test('each unit sparked once per application', () => {
  const s = board(`
    ~   ~
    r&~ =
    S   d
  `);
  const r = draft(s, (ctx) => applySpark(ctx, cells('A1', 'B1', 'A2'), 1));
  expectLog(r.events, [
    'Spark arcs through the steam from A1 (3 tiles)',
    'Spark hits rat at A2 for 1',
    'Spark conducts through the brass from A2 (2 tiles)',
  ]);
  expect(unitAtLabel(r.state, 'A2').hp).toBe(1);
});
