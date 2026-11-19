import { expect, test } from 'vitest';
import { parseLabel, tileAt } from '$engine';
import { markUnit } from '$engine/bursts';
import { runDraft } from '$engine/ctx';
import { decayStates, landKind } from '$engine/mix';
import { ACTION_HANDLERS } from '$engine/runes/actions';
import { undoBoard } from '$engine/solvents';
import type { Step } from '$engine/types';
import { flowFor, heading, tile, unit } from './chemHarness';
import { withFootnotes } from './footnoteHarness';
import { board, unitAtLabel } from './harness';

const step: Step = { at: { x: 1, y: 0 }, role: 'action', rune: 'shove', auras: [], next: null };

test('CAL-N: burst footnotes keep their damage and fire duration', () => {
  const s = board('D . .\n. do .');
  const fire = runDraft(s, (ctx) => landKind(ctx, 'spark', tile('B2'), flowFor(s)), {
    footnotes: withFootnotes(['spark-slick-hot']),
  });
  expect(fire.events.filter((e) => e.type === 'damage' && e.source === 'Fire')).toMatchObject([
    { type: 'damage', amount: 3, source: 'Fire' },
  ]);
  const long = runDraft(
    s,
    (ctx) => {
      landKind(ctx, 'spark', tile('B2'), flowFor(s));
      decayStates(ctx);
      decayStates(ctx);
    },
    { footnotes: withFootnotes(['spark-slick-long']) },
  );
  expect(tileAt(long.state, parseLabel('B2')).state).toMatchObject({ id: 'fire', rounds: 1 });
  const faded = runDraft(long.state, (ctx) => decayStates(ctx), {
    footnotes: withFootnotes(['spark-slick-long']),
  });
  expect(faded.events).toContainEqual(expect.objectContaining({ type: 'stateFades' }));

  const marked = board('D . .\n. d d');
  const keep = runDraft(
    marked,
    (ctx) => {
      markUnit(ctx, unitAtLabel(ctx.s, 'B2'), null);
      landKind(ctx, 'spark', unit('dummy-1'), flowFor(marked));
    },
    { footnotes: withFootnotes(['spark-mark-keep']) },
  );
  expect(keep.events.filter((e) => e.type === 'damage' && e.source === 'Detonation')).toMatchObject(
    [{ amount: 2, source: 'Detonation' }],
  );
  const wide = runDraft(
    marked,
    (ctx) => {
      markUnit(ctx, unitAtLabel(ctx.s, 'B2'), null);
      landKind(ctx, 'spark', unit('dummy-1'), flowFor(marked));
    },
    { footnotes: withFootnotes(['spark-mark-wide']) },
  );
  expect(wide.events.filter((e) => e.type === 'damage' && e.source === 'Detonation')).toMatchObject(
    [
      { amount: 3, source: 'Detonation' },
      { amount: 1, source: 'Detonation' },
    ],
  );
});

test('CAL-N: runup and thick shield keep their cap', () => {
  const s = board('D . . . . .');
  const target = unit('draughtsman');
  const result = runDraft(
    s,
    (ctx) => {
      const caster = unitAtLabel(ctx.s, 'A1');
      if (caster.kind === 'member') caster.run = 7;
      const flow = flowFor(ctx.s, { src: 'touch', headings: new Map([heading(target, 'right')]) });
      ACTION_HANDLERS.shove(ctx, target, flow, step);
      ACTION_HANDLERS.guard(ctx, target, flow, step);
      ACTION_HANDLERS.guard(ctx, target, flow, step);
    },
    { footnotes: withFootnotes(['touch-member-runup', 'guard-shielded-thick']) },
  );
  expect(result.state.units.find((u) => u.id === 'draughtsman')?.pos).toEqual(parseLabel('D1'));
  expect(result.events.filter((e) => e.type === 'shieldGained')).toMatchObject([
    { amount: 2 },
    { amount: 3, line: 'guard:shielded' },
  ]);
});

test('CAL-N: graphite pin keeps two rounds', () => {
  const s = board('D . d .');
  const result = runDraft(
    s,
    (ctx) =>
      undoBoard(ctx, {
        tiles: [],
        units: [{ id: 'dummy-1', pos: parseLabel('B1') }],
      }),
    { footnotes: withFootnotes(['graphite-cap-pin']) },
  );
  expect(result.events.filter((e) => e.type === 'moveUndone' || e.type === 'held')).toMatchObject([
    { type: 'moveUndone', to: parseLabel('B1') },
    { type: 'held', rounds: 2, line: 'graphite:unit' },
  ]);
});
