import { expect, test } from 'vitest';
import {
  type Action,
  type BattleState,
  describeLog,
  type EventLog,
  parseLabel,
  tileAt,
} from '$engine';
import { applyBrass, applyInk, heatBrass, ignite } from '$engine/materials';
import { pushUnit } from '$engine/movement';
import { act, board, draft, expectLog, unitAtLabel } from './harness';

/** Heated brass (S5) and stained oil (S6). */

const endTurn: Action = { type: 'endTurn' };
const cell = (s: BattleState, lbl: string) => tileAt(s, parseLabel(lbl));
const scalds = (events: EventLog) =>
  describeLog(events).filter((l) => l.startsWith('Heated brass hits'));

test('oil burning next to a brass dummy heats it; its neighbours are scalded at round end for 2 rounds, then it cools', () => {
  // The brass dummy (C1) is not on the oil; the fire is at B1. Rat at D1, dummy at C2.
  const start = board('D o d& r\n. . d .');
  const lit = draft(start, (ctx) => ignite(ctx, parseLabel('B1')));
  expect(lit.lines).toContain('the brass at C1 heats up');
  expect(unitAtLabel(lit.state, 'C1').heat).toBe(2);

  const r1 = act(lit.state, endTurn);
  expect(scalds(r1.events)).toEqual([
    'Heated brass hits rat at D1 for 1',
    'Heated brass hits dummy at C2 for 1',
  ]);
  expect(unitAtLabel(r1.state, 'C1').heat).toBe(1);

  const r2 = act(r1.state, endTurn);
  expect(scalds(r2.events)).toHaveLength(2);
  expect(r2.lines).toContain('the brass at C1 cools');
  expect(unitAtLabel(r2.state, 'C1').heat).toBe(0);

  const r3 = act(r2.state, endTurn);
  expect(scalds(r3.events)).toEqual([]);
});

test('a hot brass unit does not scald itself, and inked +1 applies to its neighbours', () => {
  const r = act(board('D . d&^ r!'), endTurn);
  expect(scalds(r.events)).toEqual(['Heated brass hits rat at D1 for 2 (inked +1)']);
});

test('burning oil next to a sentry heats it', () => {
  const lit = draft(board('D o b'), (ctx) => ignite(ctx, parseLabel('B1')));
  expect(lit.lines).toContain('the brass at C1 heats up');
});

test('fire under a brass unit heats it', () => {
  const lit = draft(board('D d&o'), (ctx) => ignite(ctx, parseLabel('B1')));
  expect(lit.lines).toContain('the brass at B1 heats up');
});

test('heat on a plate scalds both sides', () => {
  const lit = draft(board('D = d\n. o r'), (ctx) => ignite(ctx, parseLabel('B2')));
  expect(lit.lines).toContain('the brass at B1 heats up');
  expect(cell(lit.state, 'B1').heat).toBe(2);
  const lines = scalds(act(lit.state, endTurn).events);
  expect(lines).toContain('Heated brass hits Draughtsman for 1');
  expect(lines).toContain('Heated brass hits dummy at C1 for 1');
});

test('brass that comes to rest beside burning oil is heated at round end', () => {
  const r = act(board('D . d& *'), endTurn);
  expect(r.lines).toContain('the brass at C1 heats up');
});

test('re-heating refreshes the count without a new "heats up" line', () => {
  const r = draft(board('D d&^ o'), (ctx) => {
    unitAtLabel(ctx.s, 'B1').heat = 1;
    ignite(ctx, parseLabel('C1'));
  });
  expect(r.lines.some((l) => l.includes('heats up'))).toBe(false);
  expect(unitAtLabel(r.state, 'B1').heat).toBe(2);
});

test('a crumbling plate loses its heat', () => {
  const s = board('D =^');
  cell(s, 'B1').plateRounds = 1;
  const r = act(s, endTurn);
  expect(r.lines).toContain('the brass plate at B1 crumbles');
  expect(cell(r.state, 'B1').heat).toBe(0);
});

test('heatBrass heats plates and brass units, ignores the rest', () => {
  const r = draft(board('D = d& d'), (ctx) =>
    heatBrass(
      ctx,
      [parseLabel('B1'), parseLabel('D1')],
      [unitAtLabel(ctx.s, 'C1'), unitAtLabel(ctx.s, 'D1')],
    ),
  );
  expectLog(r.events, ['the brass at B1, C1 heats up']);
  expect(unitAtLabel(r.state, 'D1').heat).toBe(0);
});

test('ink landing on unlit oil stains it and still pools', () => {
  const r = draft(board('D . o'), (ctx) => applyInk(ctx, [parseLabel('C1')]));
  expectLog(r.events, ['ink pools at C1', 'ink stains the oil at C1']);
  expect(cell(r.state, 'C1').stain).toBe(true);
});

test('ink on a burning tile or on bare floor stains nothing', () => {
  const r = draft(board('D . *'), (ctx) => applyInk(ctx, [parseLabel('C1'), parseLabel('B1')]));
  expectLog(r.events, ['ink pools at B1, C1']);
});

test('a stain inks a rat that is shoved onto it, and the stain stays', () => {
  const r = draft(board('D r $'), (ctx) => pushUnit(ctx, unitAtLabel(ctx.s, 'B1'), 'right'));
  expect(r.lines).toContain('rat at C1 stops on stained oil and is inked');
  expect(unitAtLabel(r.state, 'C1').inked).toBe(true);
  expect(cell(r.state, 'C1').stain).toBe(true);
});

test('the shove action onto a stain inks the target', () => {
  const r = act(board('D r $ r'), { type: 'shove', unit: 'draughtsman', dir: 'right' });
  expect(r.lines).toContain('rat at C1 stops on stained oil and is inked');
});

test('a walk ending on a stain inks the walker, and the move can no longer be undone', () => {
  const r = act(board('D . $ . d'), { type: 'move', unit: 'draughtsman', to: parseLabel('C1') });
  expect(r.lines.at(-1)).toBe('Draughtsman stops on stained oil and is inked');
  expect(unitAtLabel(r.state, 'C1').inked).toBe(true);
  expect(() => act(r.state, { type: 'undoMove', unit: 'draughtsman' })).toThrow();
});

test('walking past a stain does not ink', () => {
  const r = act(board('D $ . . d'), { type: 'move', unit: 'draughtsman', to: parseLabel('D1') });
  expect(unitAtLabel(r.state, 'D1').inked).toBe(false);
});

test('an already inked unit on a stain is not re-inked', () => {
  const r = draft(board('D r! $'), (ctx) => pushUnit(ctx, unitAtLabel(ctx.s, 'B1'), 'right'));
  expect(r.lines.some((l) => l.includes('stained oil'))).toBe(false);
});

test('fire clears the stain', () => {
  const lit = draft(board('D $ $'), (ctx) => ignite(ctx, parseLabel('B1')));
  expect(cell(lit.state, 'B1').stain).toBe(false);
  expect(cell(lit.state, 'C1').stain).toBe(false);
});

test('a raised brass plate replaces the stain', () => {
  const r = draft(board('D $'), (ctx) => applyBrass(ctx, [parseLabel('B1')]));
  expect(cell(r.state, 'B1').stain).toBe(false);
});
