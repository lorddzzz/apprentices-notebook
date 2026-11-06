import { describe, expect, test } from 'vitest';
import { grantRightOfWay } from '$engine/districts/bridges/rightOfWay';
import { strikePiece } from '$engine/pieces';
import { push } from '$engine/push';
import { roundEnd } from '$engine/turn';
import type { BattleState } from '$engine/types';
import { board, cast, draft, unitAtLabel, withLattices } from '../../scenarios/harness';

/** BR-8 (bridges P17): the stand-in right of way holds while the keystone has HP. */
const whats = (events: readonly { type: string }[]) =>
  (
    events.filter((e) => e.type === 'bridges:trickResists') as unknown as {
      data: { what: string };
    }[]
  ).map((e) => e.data.what);

type C = Parameters<Parameters<typeof draft>[1]>[0];
const breakKeystone = (ctx: C, x: number) => {
  strikePiece(ctx, { x, y: 0 }, 'push');
  strikePiece(ctx, { x, y: 0 }, 'burst');
};

describe('BR-8 right of way', () => {
  const shoved = (s: BattleState, id: string, brk: boolean) =>
    draft(s, (ctx) => {
      grantRightOfWay(ctx.s, id);
      if (brk) breakKeystone(ctx, 0);
      const u = ctx.s.units.find((x) => x.id === id);
      if (u) push(ctx, u, 'right', 1, null);
    });

  test('Shove: unmoved and logged while the keystone has HP; moves after it breaks', () => {
    const s = board('{keystone:2} r . S');
    const id = unitAtLabel(s, 'B1').id;
    const held = shoved(s, id, false);
    expect(held.state.units.find((u) => u.id === id)?.pos).toEqual({ x: 1, y: 0 });
    expect(whats(held.events)).toEqual(['push']);
    const freed = shoved(s, id, true);
    expect(freed.state.units.find((u) => u.id === id)?.pos).toEqual({ x: 2, y: 0 });
    expect(whats(freed.events)).toEqual([]);
  });

  test('an unflagged unit is shoved as before', () => {
    const s = board('{keystone:2} r . S');
    const id = unitAtLabel(s, 'B1').id;
    const r = draft(s, (ctx) => {
      const u = ctx.s.units.find((x) => x.id === id);
      if (u) push(ctx, u, 'right', 1, null);
    });
    expect(r.state.units.find((u) => u.id === id)?.pos).toEqual({ x: 2, y: 0 });
    expect(whats(r.events)).toEqual([]);
  });

  test('Hold: refused while the keystone stands, lands after it breaks', () => {
    const page = { draughtsman: 'Bolt> Hold' };
    const make = () => withLattices('D r . {keystone:2}', page);
    const s = make();
    const id = unitAtLabel(s, 'B1').id;
    const flag = (st: BattleState, brk: boolean) =>
      draft(st, (ctx) => {
        grantRightOfWay(ctx.s, id);
        if (brk) breakKeystone(ctx, 3);
      }).state;
    const held = cast(flag(s, false), 'draughtsman', 'right');
    expect(held.state.units.find((u) => u.id === id)?.held).toBe(0);
    expect(whats(held.events)).toEqual(['hold']);
    const freed = cast(flag(make(), true), 'draughtsman', 'right');
    expect(freed.state.units.find((u) => u.id === id)?.held).toBeGreaterThan(0);
    expect(whats(freed.events)).toEqual([]);
  });

  test('a dusk drop: he is set on a standing tile, then falls once the keystone breaks', () => {
    const s = board('r{span} . S{keystone:2}');
    const id = unitAtLabel(s, 'A1').id;
    const run = (brk: boolean) =>
      draft(s, (ctx) => {
        grantRightOfWay(ctx.s, id);
        if (brk) breakKeystone(ctx, 2);
        roundEnd(ctx);
      });
    const held = run(false);
    const u = held.state.units.find((x) => x.id === id);
    expect(u?.hp).toBeGreaterThan(0);
    expect(u?.out ?? null).toBeNull();
    expect(held.state.tiles[0]?.terrain.drop).toBe(true);
    expect(u?.pos).not.toEqual({ x: 0, y: 0 });
    expect(whats(held.events)).toEqual(['fall']);
    const freed = run(true);
    expect(freed.state.units.find((x) => x.id === id)?.out).toBe('fell');
    expect(whats(freed.events)).toEqual([]);
  });
});
