import { describe, expect, test } from 'vitest';
import { RIVAL_PAGES, RIVALS } from '$data/rivals';
import { type BattleState, describeLog, type EnemyUnit, newProfile, parseLabel } from '$engine';
import { dealDamage } from '$engine/damage';
import {
  CLOCK_RULE_ID,
  canServe,
  clockStaggered,
  openClock,
} from '$engine/districts/inkQuarter/clock';
import { CLOCK_WRIT_TRICK_ID } from '$engine/districts/inkQuarter/postmaster';
import { bankPages, pagesHeld } from '$engine/rivals/pages';
import { listRules } from '$engine/rules';
import { awardsPage } from '$engine/standIn';
import { act, board, draft, expectLogIncludes } from '../scenarios/harness';

/**
 * The postmaster as a rival (ink-quarter plan P9, P10; IQ-22): `p` is him, the clock writ is his
 * trick, *Serve notice* (`Bolt> Ink Sentence`) and *Collect* (`Splash> Levy`) are his kit. Each
 * board lists the clock rule as the heart does. He serves in round 1; the seal is the open tile
 * nearest him, the stamp the free tile nearest the nearest apprentice.
 */

const at = parseLabel;
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });

function heart(ascii: string): BattleState {
  const s = structuredClone(board(ascii));
  s.rules = listRules(s, [CLOCK_RULE_ID]);
  return s;
}
const pm = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'postmaster');
  if (u?.kind !== 'enemy') throw new Error('no postmaster');
  return u;
};
const hp = (s: BattleState, id: string): number => s.units.find((u) => u.id === id)?.hp ?? 0;
const breakSeal = (s: BattleState) =>
  draft(s, (ctx) => {
    const seal = ctx.s.units.find((u) => u.def === 'clockSeal');
    if (!seal) throw new Error('no seal');
    dealDamage(ctx, seal, 3, 'Strike');
  });

/** Stoker in his row, two tiles of floor behind her: his Serve notice has room to push. */
const IN_LINE = '. . . . . .\n. . S . . p\n. . . . . .';

describe('the clock writ, his trick', () => {
  test('serve-telegraphs-then-resolves: the writ is telegraphed and served through the trick', () => {
    const s = heart(IN_LINE);
    expect(RIVALS.postmaster?.trick).toBe(CLOCK_WRIT_TRICK_ID);
    expect(pm(s).intent).toMatchObject({
      kind: 'trick',
      trick: CLOCK_WRIT_TRICK_ID,
      data: { seal: at('F1'), stamp: at('C1') },
    });
    const r = endTurn(s);
    expectLogIncludes(r.events, [
      'postmaster at F2 uses the clock writ',
      "postmaster at F2 calls postmaster's seal at F1",
      'a clock writ is served due by round 4 (stamp at C1)',
    ]);
    expect(openClock(r.state)).toMatchObject({ by: 'postmaster-1', stamp: at('C1'), deadline: 4 });
    // One writ at a time: with it open he turns to his kit.
    expect(pm(r.state).intent).toMatchObject({ kind: 'cast', spell: 'serveNotice' });
  });

  test('broken-seal-stuns: his telegraphed notice is skipped; the stagger clears at dusk', () => {
    const served = endTurn(heart(IN_LINE)).state;
    expect(pm(served).intent).toMatchObject({ kind: 'cast', spell: 'serveNotice' });
    const broken = breakSeal(served);
    expectLogIncludes(broken.events, [
      "postmaster's seal at F1 dies",
      'the seal is broken: the clock writ lifts',
      'postmaster at F2 is stunned',
    ]);
    expect(pm(broken.state).stunned).toBe(true);
    expect(clockStaggered(broken.state, 'postmaster-1')).toBe(true);

    const next = endTurn(broken.state);
    expectLogIncludes(next.events, ['postmaster at F2 waits']);
    expect(describeLog(next.events).some((l) => l.includes('casts Bolt'))).toBe(false);
    expect(pm(next.state).stunned).toBe(false);
    expect(clockStaggered(next.state, 'postmaster-1')).toBe(false);
    expect(canServe(next.state, 'postmaster-1')).toBe(false); // the cooldown runs to round 4
  });

  test('expiry-collects: unanswered at the deadline, every mark collects 3', () => {
    let s = heart('. . . . . .\nS! . . . . .\n. . . . . p');
    for (let i = 0; i < 3; i++) s = endTurn(s).state;
    expect(openClock(s)).not.toBeNull();
    const r = endTurn(s);
    expectLogIncludes(r.events, [
      'the clock runs out: 1 mark collect',
      "Stoker's mark is spent",
      'Clock hits Stoker for 3',
      "postmaster's seal at F2 dies",
    ]);
    expect(hp(r.state, 'stoker')).toBe(hp(s, 'stoker') - 3);
    expect(openClock(r.state)).toBeNull();
  });

  test('death-withdraws: killing him takes the writ and its seal off the board', () => {
    const s = endTurn(heart('S . . . p')).state;
    expect(openClock(s)).not.toBeNull();
    const r = draft(s, (ctx) => dealDamage(ctx, pm(ctx.s), 99, 'Strike'));
    expectLogIncludes(r.events, ['postmaster at E1 dies', "postmaster's seal at D1 dies"]);
    expect(openClock(r.state)).toBeNull();
    expect(clockStaggered(r.state, 'postmaster-1')).toBe(false);
    expect(r.state.units.some((u) => u.kind === 'enemy' && u.hp > 0)).toBe(false);
  });
});

describe('his kit and routine', () => {
  test('serve-notice-marks-and-pushes: Bolt, Ink, Sentence push the marked apprentice 2', () => {
    const s = endTurn(heart(IN_LINE)).state;
    const r = endTurn(s);
    expectLogIncludes(r.events, [
      'postmaster at F2 casts Bolt left',
      'bolt aims at stoker',
      'Bolt lands at C2',
      'Stoker is marked',
      "Stoker's mark is spent",
      'Stoker is pushed left to A2',
    ]);
    expect(r.state.units.find((u) => u.id === 'stoker')?.pos).toEqual(at('A2'));
  });

  test('collect-at-two-marks: two marks together are levied for a shield each', () => {
    const s = endTurn(heart('. . . . . .\nS . . d! d! .\n. . . . . p')).state;
    expect(pm(s).intent).toMatchObject({ kind: 'cast', spell: 'collect', aim: { at: at('D1') } });
    const r = endTurn(s);
    expectLogIncludes(r.events, [
      'postmaster at F3 casts Splash at D1',
      'splash aims at C1, D1, E1, C2, dummy-1, dummy-2',
      "dummy at D2's mark is spent",
      'postmaster at F3 gains a shield of 1',
      "dummy at E2's mark is spent",
      'postmaster at F3 gains a shield of 1',
    ]);
    // Levy's shield lasts to the next player phase (P27), so read the total off the log.
    expect(r.events.filter((e) => e.type === 'shieldGained').at(-1)).toMatchObject({ total: 2 });
  });

  test('one mark is not enough to Collect', () => {
    const s = endTurn(heart('. . . . . .\nS . . d! . .\n. . . . . p')).state;
    expect(pm(s).intent).toBeNull();
  });
});

describe('his page', () => {
  test('won-heart-banks-the-page: clearing him banks Serve notice', () => {
    const s = endTurn(heart('S . . . p')).state;
    const won = draft(s, (ctx) => dealDamage(ctx, pm(ctx.s), 99, 'Strike')).state;
    expect(awardsPage(pm(won))).toBe(true);
    const p = bankPages(newProfile(), won, 'inkQuarter', awardsPage);
    expect(pagesHeld(p)).toEqual(['postmaster:serveNotice']);
    expect(RIVAL_PAGES['postmaster:serveNotice']).toMatchObject({
      rival: 'postmaster',
      spell: 'serveNotice',
      lattice: 'Bolt> Ink Sentence',
    });
  });
});
