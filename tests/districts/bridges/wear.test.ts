import { describe, expect, test } from 'vitest';
import { withOrigin } from '$engine/ctx';
import { cracksOf } from '$engine/districts/bridges/support';
import { type BridgesState, COLLAPSE_RULE_ID } from '$engine/districts/bridges/types';
import { strikePiece } from '$engine/pieces';
import { push } from '$engine/push';
import { lands, tile } from '../../scenarios/chemHarness';
import { board, draft, unitAtLabel } from '../../scenarios/harness';

/** BR-2 (bridges P3, P7): crush and non-fire bursts wear stone; broken tiles leave the network. */
type S = ReturnType<typeof board>;
const own = (s: S) => s.rules?.[COLLAPSE_RULE_ID] as BridgesState;
const ofType = (events: { type: string }[], type: string) =>
  events.filter((e) => e.type === type) as unknown as {
    at: { x: number; y: number };
    data: Record<string, unknown>;
  }[];
const worn = (events: { type: string }[]) =>
  ofType(events, 'bridges:stoneWorn').map((e) => [
    e.at.x,
    e.at.y,
    e.data.from,
    e.data.to,
    e.data.cause,
    e.data.by,
  ]);
const crushB = (s: S) => draft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, 'B1'), 'right', 1, null));

describe('BR-2 crush wear', () => {
  test('a sound span (2) survives a crush with 1 stone left; rest and obstacle tiles both wear', () => {
    const s = board('{pier} d{span:2} d{span:2}');
    const r = crushB(s);
    expect(worn(r.events)).toEqual([
      [1, 0, 2, 1, 'crush', null],
      [2, 0, 2, 1, 'crush', null],
    ]);
    expect(own(r.state).stone).toEqual({ '1,0': 1, '2,0': 1 });
    expect(own(r.state).cuts).toEqual({});
    expect(cracksOf(r.state)).toEqual([]);
    expect(ofType(r.events, 'bridges:cracked')).toEqual([]);
  });

  test('a crumbling span (1) breaks at once: cut recorded, out of the network, far side cracks', () => {
    const s = board('{pier} {span:2} d{span:1} d{span:2}');
    const r = draft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, 'C1'), 'right', 1, null));
    expect(worn(r.events)).toEqual([
      [2, 0, 1, 0, 'crush', null],
      [3, 0, 2, 1, 'crush', null],
    ]);
    expect(own(r.state).cuts).toEqual({ '2,0': { by: null, cause: 'crush' } });
    expect(cracksOf(r.state)).toEqual([
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
    expect(ofType(r.events, 'bridges:cracked').map((e) => e.data.tiles)).toEqual([
      [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
    ]);
    // nothing falls yet (BR-3): the pieces and the unit are still there
    expect(r.state.tiles[2]?.piece?.id).toBe('bridges:span');
  });

  test('the cutter is the cast origin: `by` names the caster', () => {
    const s = board('{pier} {span:1}');
    const origin = { caster: 'draughtsman', spell: 'x', cast: 1 } as never;
    const r = draft(s, (ctx) =>
      withOrigin(ctx, origin, () => strikePiece(ctx, { x: 1, y: 0 }, 'push')),
    );
    expect(worn(r.events)).toEqual([[1, 0, 1, 0, 'crush', 'draughtsman']]);
    expect(own(r.state).cuts['1,0']).toEqual({ by: 'draughtsman', cause: 'crush' });
  });

  test('a broken tile takes no more wear', () => {
    const s = board('{pier} {span:1}');
    const a = draft(s, (ctx) => {
      strikePiece(ctx, { x: 1, y: 0 }, 'push');
      strikePiece(ctx, { x: 1, y: 0 }, 'push');
    });
    expect(worn(a.events)).toEqual([[1, 0, 1, 0, 'crush', null]]);
  });
});

describe('BR-2 burst wear', () => {
  test('a storm wears each covered span tile once with cause burst', () => {
    const s = board('D {pier} {span:2}~ {span:1}~ . .');
    const r = lands(s, [['spark', tile('C1')]]);
    expect(worn(r.events).map((w) => w.slice(0, 5))).toEqual([
      [2, 0, 2, 1, 'burst'],
      [3, 0, 1, 0, 'burst'],
    ]);
    expect(own(r.state).cuts['3,0']).toEqual({ by: null, cause: 'burst' });
    expect(cracksOf(r.state).map((c) => c.x)).toEqual([3]);
    expect(ofType(r.events, 'bridges:cracked')).toHaveLength(1);
  });

  test('fire does not wear', () => {
    const s = board('D {pier} {span:2}o {span:1}o');
    const r = lands(s, [['spark', tile('C1')]]);
    expect(r.events.some((e) => e.type === 'burst')).toBe(true);
    expect(worn(r.events)).toEqual([]);
    expect(own(r.state).stone).toEqual({ '2,0': 2, '3,0': 1 });
  });

  test('damage, Spark and Shove do not wear', () => {
    const s = board('{pier} {span:1}');
    const r = draft(s, (ctx) => {
      for (const by of ['damage', 'spark', 'shove'] as const) strikePiece(ctx, { x: 1, y: 0 }, by);
    });
    expect(worn(r.events)).toEqual([]);
  });
});

describe('BR-2 keystone', () => {
  test('wears the same way and breaks at 0 with a keystoneBreaks event; sections it held crack', () => {
    const s = board('{keystone:2} {span} {span}');
    const r = draft(s, (ctx) => {
      strikePiece(ctx, { x: 0, y: 0 }, 'push');
      strikePiece(ctx, { x: 0, y: 0 }, 'burst');
    });
    expect(worn(r.events)).toEqual([
      [0, 0, 2, 1, 'crush', null],
      [0, 0, 1, 0, 'burst', null],
    ]);
    expect(ofType(r.events, 'bridges:keystoneBreaks')).toHaveLength(1);
    expect(own(r.state).cuts['0,0']).toEqual({ by: null, cause: 'shatter' });
    expect(ofType(r.events, 'bridges:cracked').map((e) => e.data.tiles)).toEqual([
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ],
    ]);
  });
});
