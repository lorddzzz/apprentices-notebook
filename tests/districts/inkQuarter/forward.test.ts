import { describe, expect, test } from 'vitest';
import type { InventionDef } from '$data';
import { type BattleState, libraryOf, parseLabel, type Unit } from '$engine';
import { dealDamage } from '$engine/damage';
import { addresseeOf, forwardTarget } from '$engine/districts/inkQuarter/forward';
import { applyMark } from '$engine/marks';
import { roundEnd } from '$engine/turn';
import {
  board,
  cast,
  draft,
  expectLog,
  expectLogIncludes,
  unitAtLabel,
  withLattices,
} from '../../scenarios/harness';

/**
 * Forwarding (ink-quarter plan P3; IQ-2). `{forward:a}` passes the first hit or mark aimed at the
 * unit on it each round to the unit on `{address:a}`. The rule that clears it at dusk is brought
 * by the board, so no board here lists anything.
 */

const at = parseLabel;
const ORIGIN = { caster: 'draughtsman', spell: '0,0', cast: 1 } as const;
const hit =
  (lbl: string, n = 2) =>
  (ctx: Parameters<Parameters<typeof draft>[1]>[0]) =>
    void dealDamage(ctx, unitAtLabel(ctx.s, lbl), n, 'test', [], { heading: null, at: at('A1') });
const markOn = (lbl: string) => (ctx: Parameters<Parameters<typeof draft>[1]>[0]) =>
  void applyMark(ctx, unitAtLabel(ctx.s, lbl), { deep: false, bound: null, origin: ORIGIN });
const hp = (s: BattleState, lbl: string): number => unitAtLabel(s, lbl).hp;

/** Bearer rat-1 on the stamp at B1, addressee rat-2 at D1; D is out of the way. */
const PAIR = 'D r{forward:a} . r{address:a}';
const HP = { hp: { B1: 6, D1: 6 } };

describe('forwarding (P3)', () => {
  test('damage: the hit lands on the addressee, the bearer is unhurt', () => {
    const r = draft(board(PAIR, HP), hit('B1'));
    expectLog(r.events, [
      'the stamp at B1 forwards the hit on rat at B1 to D1',
      'test hits rat at D1 for 2',
    ]);
    expect(hp(r.state, 'B1')).toBe(6);
    expect(hp(r.state, 'D1')).toBe(4);
    expect(r.events.find((e) => e.type === 'inkQuarter:forwarded')).toMatchObject({
      data: { to: 'rat-2', stamp: at('B1'), harm: 'hit', amount: 2 },
    });
  });

  test('mark: the mark lands on the addressee, keeping its origin', () => {
    const r = draft(board(PAIR), markOn('B1'));
    expectLog(r.events, [
      'the stamp at B1 forwards the mark on rat at B1 to D1',
      'rat at D1 is marked',
    ]);
    expect(unitAtLabel(r.state, 'B1').mark).toBeNull();
    expect(unitAtLabel(r.state, 'D1').mark?.origin).toEqual(ORIGIN);
    expect(r.events.find((e) => e.type === 'inkQuarter:forwarded')).toMatchObject({
      data: { harm: 'mark' },
    });
  });

  test('empty-address: nothing to redirect to, the hit lands normally and the stamp is not spent', () => {
    const r = draft(board('D r{forward:a} . {address:a}', { hp: { B1: 6 } }), (ctx) => {
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 2, 'test', [], { heading: null, at: at('A1') });
    });
    expectLog(r.events, ['test hits rat at B1 for 2']);
    expect(hp(r.state, 'B1')).toBe(4);
    expect(r.state.rules?.['inkQuarter:forwards']).toEqual({ used: [] });
  });

  test('empty-address-then-filled: the unspent stamp forwards once someone stands there', () => {
    const s = board('D r{forward:a} . {address:a}', { hp: { B1: 6 } });
    const r = draft(s, (ctx) => {
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 1, 'one', [], { heading: null, at: null });
      ctx.s.units.push({
        ...structuredClone(unitAtLabel(ctx.s, 'B1')),
        id: 'rat-9',
        pos: at('D1'),
      });
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 1, 'two', [], { heading: null, at: null });
    });
    expect(hp(r.state, 'B1')).toBe(5);
    expect(r.state.units.find((u) => u.id === 'rat-9')?.hp).toBe(4);
  });

  test('two-hits-in-a-round: the stamp forwards one, the second lands on the bearer; dusk resets it', () => {
    const r = draft(board(PAIR, HP), (ctx) => {
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 2, 'first', [], { heading: null, at: null });
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 1, 'second', [], { heading: null, at: null });
    });
    expectLog(r.events, [
      'the stamp at B1 forwards the hit on rat at B1 to D1',
      'first hits rat at D1 for 2',
      'second hits rat at B1 for 1',
    ]);
    expect(hp(r.state, 'D1')).toBe(4);
    expect(hp(r.state, 'B1')).toBe(5);

    const next = draft(r.state, (ctx) => {
      roundEnd(ctx);
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 2, 'third', [], { heading: null, at: null });
    });
    expectLogIncludes(next.events, [
      'the stamp at B1 forwards the hit on rat at B1 to D1',
      'third hits rat at D1 for 2',
    ]);
  });

  test('a hit and then a mark share the one forward', () => {
    const r = draft(board(PAIR, HP), (ctx) => {
      markOn('B1')(ctx);
      hit('B1')(ctx);
    });
    expect(unitAtLabel(r.state, 'D1').mark).not.toBeNull();
    expect(hp(r.state, 'B1')).toBe(4);
    expect(hp(r.state, 'D1')).toBe(6);
  });

  test('forwarded-kill: the addressee dies of the hit, credited to the original cast', () => {
    const s = board(PAIR, { hp: { B1: 6, D1: 1 } });
    const r = draft(s, (ctx) => {
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 3, 'Bolt', [], { heading: 'right', at: at('A1') });
    });
    expectLog(r.events, [
      'the stamp at B1 forwards the hit on rat at B1 to D1',
      'Bolt hits rat at D1 for 3',
      'rat at D1 dies',
    ]);
    expect(hp(r.state, 'B1')).toBe(6);
    expect(r.state.units.find((u) => u.id === 'rat-2')?.hp).toBe(0);
  });

  test('no re-forward: the addressee (one piece per tile, so on no stamp) takes it as is, once', () => {
    const r = draft(board(PAIR, HP), hit('B1'));
    expect(r.events.filter((e) => e.type === 'inkQuarter:forwarded')).toHaveLength(1);
    expect(r.state.rules?.['inkQuarter:forwards']).toEqual({ used: ['1,0'] });
  });
});

describe('forwarding guards and previews', () => {
  test('anchored units are exempt', () => {
    const r = draft(board('D M{forward:a} . r{address:a}'), (ctx) => {
      dealDamage(ctx, unitAtLabel(ctx.s, 'B1'), 2, 'test', [], { heading: null, at: null });
    });
    expect(r.events.some((e) => e.type === 'inkQuarter:forwarded')).toBe(false);
  });

  test('forwardTarget and addresseeOf read the board without changing it', () => {
    const s = board(PAIR, HP);
    const bearer: Unit = unitAtLabel(s, 'B1');
    expect(forwardTarget(s, bearer)?.id).toBe('rat-2');
    expect(addresseeOf(s, 'a', bearer)?.id).toBe('rat-2');
    expect(addresseeOf(s, 'b', bearer)).toBeNull();
    expect(forwardTarget(s, unitAtLabel(s, 'D1'))).toBeNull();
  });

  test('a different letter pairs a different address', () => {
    const s = board('D r{forward:b} r{address:a} r{address:b}', { hp: { B1: 6, C1: 6, D1: 6 } });
    const r = draft(s, hit('B1'));
    expect(hp(r.state, 'D1')).toBe(4);
    expect(hp(r.state, 'C1')).toBe(6);
  });

  test('a unit not on the stamp is not forwarded', () => {
    const r = draft(board(PAIR, HP), hit('D1'));
    expect(hp(r.state, 'D1')).toBe(4);
    expect(r.events.some((e) => e.type === 'inkQuarter:forwarded')).toBe(false);
  });
});

describe('forwarding and Bind', () => {
  const inv = (
    id: string,
    method: InventionDef['method'],
    parts: InventionDef['parts'],
    extra: Partial<InventionDef> = {},
  ): InventionDef => ({ id: `inv:${id}`, name: id, method, parts, solvent: null, ...extra });
  const lib = libraryOf([inv('recoil', 'bind', ['ink', 'shove'], { event: 'hit' })]);

  test('bind-hit-on-the-addressee: the forwarded mark holds the action, a hit on the addressee releases it', () => {
    const s = withLattices(
      'D r{forward:a} . r{address:a} .\n. . . S .',
      { draughtsman: 'Touch> inv:recoil', stoker: 'Touch> Spark' },
      { inventions: lib, hp: { B1: 9, D1: 9 } },
    );
    const marked = cast(s, 'draughtsman', { kind: 'tile', at: at('B1') });
    expect(unitAtLabel(marked.state, 'B1').mark).toBeNull();
    expect(unitAtLabel(marked.state, 'D1').mark?.bound).toMatchObject({
      action: 'shove',
      event: 'hit',
    });
    expectLogIncludes(marked.events, [
      'the stamp at B1 forwards the mark on rat at B1 to D1',
      'rat at D1 is marked',
      'rat at D1 is marked (holding shove)',
    ]);

    const hitIt = cast(marked.state, 'stoker', { kind: 'tile', at: at('D1') });
    expect(hitIt.events.some((e) => e.type === 'released')).toBe(true);
    expect(unitAtLabel(hitIt.state, 'D1').mark).toBeNull();
  });
});
