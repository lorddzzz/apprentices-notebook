import { describe, expect, test } from 'vitest';
import { type BattleState, parseLabel, unitAt } from '$engine';
import type { Ctx } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { KIT } from '$engine/districts';
import {
  CLOCK_RULE_ID,
  canServe,
  clockRoundsLeft,
  clockStaggered,
  clockState,
  openClock,
  parseClock,
  serveClock,
  spendStagger,
  withdrawClock,
} from '$engine/districts/inkQuarter/clock';
import { CLOCK_STAMP_PIECE } from '$engine/districts/inkQuarter/types';
import { WRITS_RULE_ID } from '$engine/districts/inkQuarter/writs';
import type { RuleId } from '$engine/districts/types';
import { enemyWalk, moveMember } from '$engine/movement';
import { listRules, rulePreview } from '$engine/rules';
import { roundEnd } from '$engine/turn';
import type { MemberUnit, Unit } from '$engine/types';
import { act, board, draft, expectLog, expectLogIncludes } from '../scenarios/harness';

/**
 * The postmaster's clock writ (ink-quarter plan P9; IQ-6). The training dummy stands in for the
 * postmaster (`dummy-1`); each board lists the clock rule as the district would. `q` is his seal.
 */

const at = parseLabel;
const POSTMASTER = 'dummy-1';

function withClock(ascii: string, extra: readonly RuleId[] = []): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [CLOCK_RULE_ID, ...extra]);
  return s;
}
const serve = (seal: string, stamp: string) => (ctx: Ctx) => {
  if (!serveClock(ctx, POSTMASTER, at(seal), at(stamp))) throw new Error('not served');
};
const member = (s: BattleState, id: string): MemberUnit => {
  const u = s.units.find((v) => v.id === id);
  if (u?.kind !== 'member') throw new Error(`no ${id}`);
  return u;
};
const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((v) => v.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const plainMark = (u: Unit, lineage: number): void => {
  u.mark = { deep: false, lineage, bound: null, origin: null };
};
/** Round ends until the round counter reaches `round` (dusk runs at each). */
function duskUntil(s: BattleState, round: number): { state: BattleState; events: string[] } {
  let state = s;
  const lines: string[] = [];
  while (state.round < round) {
    const r = draft(state, (ctx) => {
      roundEnd(ctx);
      ctx.s.round++;
    });
    state = r.state;
    lines.push(...r.events.map((e) => e.type));
  }
  return { state, events: lines };
}

describe('serving the clock writ (P9)', () => {
  test('serve-places-seal-and-stamp: an anchored 3-HP seal, a stamp, deadline = round + 3', () => {
    const r = draft(withClock('S . . d'), serve('C1', 'B1'));
    expectLog(r.events, [
      "dummy at D1 calls postmaster's seal at C1",
      'a clock writ is served due by round 4 (stamp at B1)',
    ]);
    const seal = unitAt(r.state, at('C1'));
    expect(seal).toMatchObject({ kind: 'enemy', def: 'clockSeal', hp: 3, id: 'clockSeal-1' });
    expect(r.state.tiles[1]?.piece?.id).toBe(CLOCK_STAMP_PIECE);
    expect(openClock(r.state)).toEqual({
      by: POSTMASTER,
      seal: 'clockSeal-1',
      stamp: at('B1'),
      served: 1,
      deadline: 4,
    });
    expect(clockRoundsLeft(r.state)).toBe(3);
    expect(canServe(r.state, POSTMASTER)).toBe(false);
    expect(rulePreview(r.state).find((p) => p.rule === CLOCK_RULE_ID)?.shapes).toEqual([
      { kind: 'meter', label: 'Clock', value: 3, max: 3 },
      { kind: 'pulse', at: at('B1') },
    ]);
  });

  test('unfit tiles refuse the serve and change nothing', () => {
    const s = withClock('S . . d');
    const r = draft(s, (ctx) => {
      expect(serveClock(ctx, POSTMASTER, at('A1'), at('B1'))).toBe(false); // seal on a unit
      expect(serveClock(ctx, POSTMASTER, at('B1'), at('B1'))).toBe(false); // same tile
      expect(serveClock(ctx, 'nobody', at('B1'), at('C1'))).toBe(false);
    });
    expect(r.events).toEqual([]);
    expect(openClock(r.state)).toBeNull();
  });

  test('the seal is inert: it never plans or idles, and foes walk around the stamp', () => {
    const s = draft(withClock('S . . d'), serve('C1', 'B1')).state;
    const r = act(s, { type: 'endTurn' });
    expect(r.events.some((e) => e.type === 'idle' && e.unit.id === 'clockSeal-1')).toBe(false);
    expect(KIT.pieces[CLOCK_STAMP_PIECE]?.aiAvoid).toBe(true);
  });
});

describe('answering the writ (P9)', () => {
  test('seal-broken: the writ lifts, he loses his next action', () => {
    const s = draft(withClock('S . . d'), serve('C1', 'B1')).state;
    const r = draft(s, (ctx) => dealDamage(ctx, unit(ctx.s, 'clockSeal-1'), 3, 'Strike'));
    expectLogIncludes(r.events, [
      "postmaster's seal at C1 dies",
      'the seal is broken: the clock writ lifts',
    ]);
    expect(openClock(r.state)).toBeNull();
    expect(r.state.tiles[1]?.piece).toBeNull();
    expect(clockStaggered(r.state, POSTMASTER)).toBe(true);
    const spent = structuredClone(r.state);
    expect(spendStagger(spent, POSTMASTER)).toBe(true);
    expect(clockStaggered(spent, POSTMASTER)).toBe(false);
    expect(spendStagger(spent, POSTMASTER)).toBe(false);
  });

  test('stamp-landed: an apprentice walking onto the stamp answers it; the seal breaks', () => {
    const s = draft(withClock('S . . d'), serve('C1', 'B1')).state;
    const r = draft(s, (ctx) => moveMember(ctx, member(ctx.s, 'stoker'), at('B1')));
    expectLog(r.events, [
      'Stoker moves to B1',
      'the clock writ is answered on the stamp and lifts',
      "postmaster's seal at C1 dies",
    ]);
    expect(openClock(r.state)).toBeNull();
    expect(clockStaggered(r.state, POSTMASTER)).toBe(true);
    expect(unit(r.state, 'clockSeal-1').hp).toBe(0);
  });

  test('a foe walking onto the stamp does not answer it', () => {
    const s = draft(withClock('S . r d\n. . . .'), serve('A2', 'B1')).state;
    const r = draft(s, (ctx) => {
      const rat = unitAt(ctx.s, at('C1'));
      if (rat?.kind !== 'enemy') throw new Error('rat');
      enemyWalk(ctx, rat, [at('B1')]);
    });
    expect(r.events.some((e) => e.type === 'inkQuarter:clockLifted')).toBe(false);
    expect(openClock(r.state)).not.toBeNull();
  });

  test('return-does-not-answer: sent back onto the stamp by return to sender, the writ stands', () => {
    // The Stoker starts the round on A1, under the clock's stamp; it walks onto the return stamp
    // at C1 and is sent back to A1 with cause `return`, which the clock stamp ignores.
    const s = withClock('S . {return} .\n. . . d', [WRITS_RULE_ID]);
    const served = draft(s, serve('B2', 'A1')).state;
    const r = draft(served, (ctx) => moveMember(ctx, member(ctx.s, 'stoker'), at('C1')));
    expectLog(r.events, [
      'Stoker moves to C1',
      'the stamp at C1 returns Stoker to sender',
      'Stoker moves to A1',
    ]);
    expect(member(r.state, 'stoker').pos).toEqual(at('A1'));
    expect(openClock(r.state)).not.toBeNull();
    expect(clockStaggered(r.state, POSTMASTER)).toBe(false);
  });
});

describe('the deadline (P9)', () => {
  test('expiry-collects-both-sides: every mark collects for 3, spent unreleased, bound ones too', () => {
    const s = withClock('S . . d\nD . r .');
    plainMark(member(s, 'stoker'), 1);
    plainMark(unit(s, POSTMASTER), 2);
    const rat = unitAt(s, at('C2'));
    if (!rat) throw new Error('rat');
    rat.mark = {
      deep: false,
      lineage: 3,
      bound: { action: 'strike', event: 'hit', solvent: null, heading: null },
      origin: null,
    };
    s.nextLineage = 4;
    const served = draft(s, serve('B1', 'C1')).state;
    const before = duskUntil(served, 4).state; // dusks of rounds 1-3 pass quietly
    expect(openClock(before)).not.toBeNull();
    const r = draft(before, (ctx) => roundEnd(ctx));
    expectLogIncludes(r.events, ['the clock runs out: 3 marks collect']);
    const spent = r.events.filter((e) => e.type === 'markSpent');
    expect(spent).toHaveLength(3);
    expect(spent.every((e) => e.type === 'markSpent' && !e.released)).toBe(true);
    expect(r.events.some((e) => e.type === 'released')).toBe(false);
    const hp = (id: string) => unit(r.state, id);
    expect(hp('stoker').hp).toBe(unit(before, 'stoker').hp - 3);
    expect(hp(POSTMASTER).hp).toBe(unit(before, POSTMASTER).hp - 3);
    expect(r.state.units.find((u) => u.def === 'rat')?.hp).toBeLessThanOrEqual(0);
    expect(r.state.units.every((u) => !u.mark)).toBe(true);
    // The writ ends: seal and stamp are gone, no stagger.
    expect(openClock(r.state)).toBeNull();
    expect(unit(r.state, 'clockSeal-1').hp).toBe(0);
    expect(r.state.tiles[2]?.piece).toBeNull();
    expect(clockStaggered(r.state, POSTMASTER)).toBe(false);
  });

  test('unmarked-board: nothing collects, but the writ ends', () => {
    const served = draft(withClock('S . . d'), serve('C1', 'B1')).state;
    const before = duskUntil(served, 4).state;
    const r = draft(before, (ctx) => roundEnd(ctx));
    expectLogIncludes(r.events, [
      'the clock runs out: no marks to collect',
      "postmaster's seal at C1 dies",
    ]);
    expect(r.events.some((e) => e.type === 'damage')).toBe(false);
    expect(openClock(r.state)).toBeNull();
  });

  test('re-serve cooldown: two rounds after the writ ends', () => {
    const served = draft(withClock('S . . d'), serve('C1', 'B1')).state;
    const lifted = draft(served, (ctx) =>
      dealDamage(ctx, unit(ctx.s, 'clockSeal-1'), 3, 'Strike'),
    ).state; // ended in round 1
    expect(clockState(lifted).ready[POSTMASTER]).toBe(3);
    expect(canServe(lifted, POSTMASTER)).toBe(false);
    const round2 = duskUntil(lifted, 2).state;
    expect(canServe(round2, POSTMASTER)).toBe(false);
    const round3 = duskUntil(round2, 3).state;
    expect(canServe(round3, POSTMASTER)).toBe(true);
    const again = draft(round3, serve('C1', 'B1'));
    expect(openClock(again.state)).toMatchObject({ seal: 'clockSeal-2', served: 3, deadline: 6 });
  });

  test('a fallen server withdraws the writ: no collection, no stagger', () => {
    const s = withClock('S . . d');
    plainMark(member(s, 'stoker'), 1);
    const served = draft(s, serve('C1', 'B1')).state;
    const r = draft(served, (ctx) => withdrawClock(ctx, POSTMASTER));
    expectLog(r.events, ["postmaster's seal at C1 dies"]);
    expect(openClock(r.state)).toBeNull();
    expect(member(r.state, 'stoker').mark).not.toBeNull();
    expect(clockStaggered(r.state, POSTMASTER)).toBe(false);
  });

  test('state survives a save: the reader keeps a writ and drops junk', () => {
    const served = draft(withClock('S . . d'), serve('C1', 'B1')).state;
    const saved = JSON.parse(JSON.stringify(served)) as BattleState;
    expect(clockState(saved)).toEqual(clockState(served));
    expect(parseClock({ writ: { by: 1 }, stagger: [3, 'x'], ready: { a: 'b' } })).toEqual({
      writ: null,
      stagger: ['x'],
      ready: {},
    });
    expect(parseClock('nope')).toEqual({ writ: null, stagger: [], ready: {} });
  });
});
