import { describe, expect, test } from 'vitest';
import { type BattleState, canUndoMove, legalMoves, parseLabel, unitAt } from '$engine';
import type { Ctx } from '$engine/ctx';
import { KIT } from '$engine/districts';
import { ORDER_PIECE, RETURN_PIECE } from '$engine/districts/inkQuarter/types';
import { sendBackTarget, WRITS_RULE_ID, type WritsState } from '$engine/districts/inkQuarter/writs';
import { enemyWalk, moveMember } from '$engine/movement';
import { push } from '$engine/push';
import { isRuleActive, listRules } from '$engine/rules';
import { roundEnd } from '$engine/turn';
import { board, draft, expectLog, expectLogIncludes } from '../../scenarios/harness';

/**
 * Return to sender and the standing order (ink-quarter plan P2, P4; IQ-1). No room uses the
 * pieces yet, so each board lists the writs rule itself: its start tiles are where the board begins.
 */

const at = parseLabel;
function withWrits(ascii: string): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [WRITS_RULE_ID]);
  return s;
}
const foeAt = (ctx: Ctx, lbl: string) => {
  const u = unitAt(ctx.s, at(lbl));
  if (u?.kind !== 'enemy') throw new Error(`no foe at ${lbl}`);
  return u;
};
const walk =
  (from: string, ...path: string[]) =>
  (ctx: Ctx) =>
    enemyWalk(ctx, foeAt(ctx, from), path.map(at));

describe('return to sender (P2)', () => {
  test('stamp-sends-a-walker-home: a foe walking onto the stamp goes back to its start tile', () => {
    const r = draft(withWrits('d . {return} .'), walk('A1', 'B1', 'C1'));
    expectLog(r.events, [
      'dummy at A1 moves to C1',
      'the stamp at C1 returns dummy at C1 to sender',
      'dummy at C1 moves to A1',
    ]);
    expect(unitAt(r.state, at('A1'))?.def).toBe('dummy');
    expect(r.events.find((e) => e.type === 'inkQuarter:sentBack')).toMatchObject({
      data: { from: at('C1'), to: at('A1'), cause: 'walk' },
    });
  });

  test('occupied-start-tile: the nearest free tile (Manhattan, then reading order)', () => {
    // The rat started the round on B2 and has since moved to C2; the dummy now stands on B2.
    // B1, A2, C2 and B3 are all 1 away: reading order picks B1.
    const s = withWrits('. . .\n. r .\nd . {return}');
    const rat = unitAt(s, at('B2'));
    const dummy = unitAt(s, at('A3'));
    if (!rat || !dummy) throw new Error('board');
    rat.pos = at('C2');
    dummy.pos = at('B2');
    const r = draft(s, walk('C2', 'C3'));
    expectLogIncludes(r.events, [
      'the stamp at C3 returns rat at C3 to sender',
      'rat at C3 moves to B1',
    ]);
    expect(unitAt(r.state, at('B1'))?.def).toBe('rat');
    expect(unitAt(r.state, at('B2'))?.def).toBe('dummy');
  });

  test('nearest-free skips plates and other stamps', () => {
    // The dummy started on A2, now a plate. A1 is a plate and B1 a stamp; B2 (1 away) wins
    // over A3 (1 away) by reading order.
    const s = withWrits('= {return} .\nd . .\n. . {return}');
    const dummy = unitAt(s, at('A2'));
    const tile = s.tiles[s.width];
    if (!dummy || !tile) throw new Error('board');
    dummy.pos = at('C2');
    tile.state = { id: 'plate', rounds: 0, origin: null };
    expect(sendBackTarget(s, dummy.id, at('C3'))).toEqual(at('B2'));
    const r = draft(s, walk('C2', 'C3'));
    expect(unitAt(r.state, at('B2'))?.def).toBe('dummy');
  });

  test('fliers: a lamp-moth pushed onto the stamp is sent back too (P1)', () => {
    const r = draft(withWrits('m {return} .'), (ctx) => {
      push(ctx, foeAt(ctx, 'A1'), 'right', 1, null);
    });
    expectLogIncludes(r.events, [
      'the stamp at B1 returns lamp-moth at B1 to sender',
      'lamp-moth at B1 moves to A1',
    ]);
    expect(unitAt(r.state, at('A1'))?.def).toBe('moth');
  });

  test('no-chain: a unit sent back onto another stamp stays there', () => {
    // The rat started the round on the left stamp (A1): it walks to the right one and is sent back
    // onto A1, which does not answer a return.
    const r = draft(withWrits('r{return} . {return}'), walk('A1', 'B1', 'C1'));
    expect(r.events.filter((e) => e.type === 'inkQuarter:sentBack')).toHaveLength(1);
    expect(unitAt(r.state, at('A1'))?.id).toBe('rat-1');
  });

  test('started-on-the-stamp: a unit whose start tile is this stamp stays', () => {
    const r = draft(withWrits('r{return} . .'), (ctx) => {
      push(ctx, foeAt(ctx, 'A1'), 'right', 1, null);
      push(ctx, foeAt(ctx, 'B1'), 'left', 1, null);
    });
    expect(r.events.some((e) => e.type === 'inkQuarter:sentBack')).toBe(false);
    expect(unitAt(r.state, at('A1'))?.id).toBe('rat-1');
  });

  test('no-snapshot: without the rule listed yet the unit stays on the stamp (P2 fallback)', () => {
    const s = structuredClone(board('r {return} .'));
    expect(sendBackTarget(s, 'rat-1', at('B1'))).toBeNull();
    const r = draft(s, walk('A1', 'B1'));
    expect(r.events.some((e) => e.type === 'inkQuarter:sentBack')).toBe(false);
    expect(unitAt(r.state, at('B1'))?.id).toBe('rat-1');
  });

  test('member-walk-spends-the-move: sent back, no undo, no second walk', () => {
    const s = withWrits('D . {return} .\n. . . r');
    const r = draft(s, (ctx) => {
      const d = unitAt(ctx.s, at('A1'));
      if (d?.kind !== 'member') throw new Error('no Draughtsman');
      moveMember(ctx, d, at('C1'));
    });
    expectLog(r.events, [
      'Draughtsman moves to C1',
      'the stamp at C1 returns Draughtsman to sender',
      'Draughtsman moves to A1',
    ]);
    expect(unitAt(r.state, at('A1'))?.id).toBe('draughtsman');
    expect(canUndoMove(r.state, 'draughtsman')).toBe(false);
    expect(legalMoves(r.state, 'draughtsman')).toEqual([]);
  });

  test('a cast push sends back under its origin', () => {
    const origin = { caster: 'draughtsman', spell: 'a', cast: 3 } as const;
    const r = draft(withWrits('r {return} .'), (ctx) => {
      push(ctx, foeAt(ctx, 'A1'), 'right', 1, origin);
    });
    expect(r.events.find((e) => e.type === 'inkQuarter:sentBack')).toMatchObject({ origin });
  });

  test('the stamp is avoided by planners and brings the writs rule', () => {
    const def = KIT.pieces[RETURN_PIECE];
    expect(def?.aiAvoid).toBe(true);
    expect(KIT.pieces[ORDER_PIECE]?.aiAvoid).toBeUndefined();
    const s = structuredClone(board('r {return} .'));
    const rule = KIT.rules[WRITS_RULE_ID];
    if (!rule) throw new Error('no writs rule');
    expect(rule.scope).toBe('piece');
    expect(isRuleActive(rule, s)).toBe(true);
    expect(isRuleActive(rule, structuredClone(board('r . .')))).toBe(false);
  });

  test.todo('planner-avoidance: a foe never ends its walk on a return stamp (after DK D7)');
  test.todo(
    'round-1-snapshot: a brought writs rule knows battle-start tiles without listing (after DK D8)',
  );
});

describe('the round snapshot (P2, late slot)', () => {
  test('dusk keeps every living unit’s tile as the next round’s start', () => {
    const s = withWrits('r . {return} .\n. . . .');
    const r = draft(s, (ctx) => {
      walk('A1', 'B1')(ctx);
      roundEnd(ctx);
      walk('B1', 'C1')(ctx);
    });
    const own = r.state.rules?.[WRITS_RULE_ID] as WritsState | undefined;
    expect(own?.start['rat-1']).toEqual(at('B1'));
    expect(unitAt(r.state, at('B1'))?.id).toBe('rat-1');
  });
});

describe('standing order (P4)', () => {
  test('order-marks-at-dusk: a plain mark, no owner, on whoever stands there', () => {
    const r = draft(withWrits('r{order} . D{order}'), (ctx) => roundEnd(ctx));
    expectLogIncludes(r.events, [
      'the standing order marks rat at A1',
      'rat at A1 is marked',
      'the standing order marks Draughtsman',
      'Draughtsman is marked',
    ]);
    const rat = unitAt(r.state, at('A1'));
    expect(rat?.mark).toMatchObject({ deep: false, bound: null, origin: null });
  });

  test('order-skips-marked-units: a bound mark is kept, never overwritten', () => {
    const s = withWrits('r{order} .');
    const rat = unitAt(s, at('A1'));
    if (!rat) throw new Error('no rat');
    const bound = { action: 'strike', event: 'enters', solvent: null, heading: null } as const;
    const origin = { caster: 'draughtsman', spell: 'a', cast: 1 } as const;
    rat.mark = { deep: false, lineage: 7, bound, origin };
    const r = draft(s, (ctx) => roundEnd(ctx));
    expect(r.events.some((e) => e.type === 'inkQuarter:ordered')).toBe(false);
    expect(r.events.some((e) => e.type === 'marked' || e.type === 'markSpent')).toBe(false);
    expect(unitAt(r.state, at('A1'))?.mark).toMatchObject({ lineage: 7, bound, origin });
  });

  test('an empty order and an anchored unit on one do nothing', () => {
    const r = draft(withWrits('M{order} {order} .'), (ctx) => roundEnd(ctx));
    expect(r.events.some((e) => e.type === 'inkQuarter:ordered')).toBe(false);
  });

  test('walking onto an order marks nothing until dusk', () => {
    const r = draft(withWrits('r {order} .'), walk('A1', 'B1'));
    expect(r.events.some((e) => e.type === 'marked')).toBe(false);
  });
});
