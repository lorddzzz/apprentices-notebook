import { describe, expect, test } from 'vitest';
import { ENEMIES } from '$data';
import { behaviourPreview } from '$engine/behaviours';
import { MASON_FOE } from '$engine/districts/bridges/foes';
import { crackedSet } from '$engine/districts/bridges/preview';
import { type BridgesState, COLLAPSE_RULE_ID } from '$engine/districts/bridges/types';
import type { BattleState, EnemyUnit } from '$engine/types';
import { intentPhrase } from '../../src/app/describe';
import { act, board, expectLogIncludes, parseLabel } from './harness';

/**
 * BR-6 scenarios: the Mason (J) mends a fallen original span tile or lays a pier. `_` is fog. A
 * board built from text has no fallen history, so `fallen` marks fog tiles as originals.
 */

const at = parseLabel;
const mason = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'mason');
  if (u?.kind !== 'enemy') throw new Error('no mason');
  return u;
};
const tg = (e: EnemyUnit) => (e.intent?.kind === 'behaviour' ? e.intent.telegraph : null);
const cracks = (s: BattleState) => crackedSet(s).map((c) => `${c.x},${c.y}`);
const ownOf = (s: BattleState) => s.rules?.[COLLAPSE_RULE_ID] as BridgesState;

/** Round 1 telegraphed before the test edited the board: plan again from the edited state. */
function replan(s: BattleState): BattleState {
  const e = mason(s);
  const telegraph = MASON_FOE.plan(s, e);
  e.intent = telegraph ? { kind: 'behaviour', id: MASON_FOE.id, telegraph, order: 1 } : null;
  return s;
}

function fallen(text: string, ...labels: string[]): BattleState {
  const s = structuredClone(board(text));
  const own = ownOf(s);
  const extra = labels.map((l) => `${at(l).x},${at(l).y}`);
  s.rules = { ...s.rules, [COLLAPSE_RULE_ID]: { ...own, originals: [...own.originals, ...extra] } };
  return replan(s);
}

describe('the Mason: mend', () => {
  // The span at C1 and D1 is cut off by the fallen B1. The mason stands on C1 beside it.
  const LINK = '{pier} _ J{span} .\n. . . . S';

  test('telegraphs the mend of a link that rescues a cracked section, and shows it', () => {
    const s = fallen(LINK, 'B1');
    expect(cracks(s)).toEqual(['2,0']);
    expect(tg(mason(s))).toEqual({ label: 'mend', tiles: [at('B1')], units: [] });
    expect(intentPhrase(s, mason(s))).toContain('mend B1');
    expect(behaviourPreview(s)).toEqual([
      { kind: 'outline', cells: [at('B1')], label: 'mended' },
      { kind: 'pulse', at: at('B1') },
    ]);
  });

  test('a mended link saves the cracked section: nothing falls at dusk', () => {
    const r = act(fallen(LINK, 'B1'), { type: 'endTurn' });
    expectLogIncludes(r.events, ['The mason mends the span.']);
    const ev = r.events.find((e) => e.type === 'bridges:mended');
    expect(ev).toMatchObject({ at: at('B1'), data: { rescued: 1 } });
    expect(r.events.some((e) => e.type === 'bridges:collapse')).toBe(false);
    expect(cracks(r.state)).toEqual([]);
    expect(r.state.tiles[1]?.piece?.id).toBe('bridges:span');
    expect(r.state.tiles[1]?.terrain.drop).toBeFalsy();
  });

  test('without the mason the same section falls at dusk', () => {
    const r = act(board('{pier} _ {span} {span}\n. . . . S'), { type: 'endTurn' });
    expect(r.events.some((e) => e.type === 'bridges:collapse')).toBe(true);
  });

  test('a unit on the target tile blocks the mend', () => {
    // Fog B1 is not standable, so the blocker is a unit on the mason's other candidate: here the
    // fallen tile is D1, the apprentice stands on the standing tile the mason would stand on, and
    // the only fallen tile in reach has a flier-free unit placed on it directly.
    const s = fallen(LINK, 'B1');
    const t = structuredClone(s);
    t.units = t.units.map((u) => (u.kind === 'member' ? { ...u, pos: at('B1') } : u));
    expect(tg(mason(replan(t)))).toBeNull();
  });

  test('a unit that steps onto the telegraphed tile makes the mend a miss', () => {
    const s = fallen(LINK, 'B1');
    expect(tg(mason(s))?.label).toBe('mend');
    const t = structuredClone(s);
    t.units = t.units.map((u) => (u.kind === 'member' ? { ...u, pos: at('B1') } : u));
    const r = act(t, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Mend hits nothing']);
    expect(r.events.some((e) => e.type === 'bridges:mended')).toBe(false);
  });

  test('only original span tiles are mended', () => {
    expect(tg(mason(board(LINK)))).toBeNull();
  });
});

describe('the Mason: lay pier', () => {
  const FAR = '{pier} {span} {span} {span} J{span} {span}\n. . . . . . . S';

  test('lays a pier on a span tile three or more from any pier', () => {
    const s = board(FAR);
    expect(tg(mason(s))).toEqual({ label: 'lay pier', tiles: [at('D1')], units: [] });
    expect(intentPhrase(s, mason(s))).toContain('lay a pier on D1');
    expect(behaviourPreview(s)).toEqual([
      { kind: 'outline', cells: [at('D1')], label: 'pier' },
      { kind: 'pulse', at: at('D1') },
    ]);
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['The mason lays a pier.']);
    expect(r.state.tiles[3]?.piece?.id).toBe('bridges:pier');
  });

  test('a laid pier changes support: a cut at C1 drops less', () => {
    const cut = (s: BattleState): BattleState => {
      const t = structuredClone(s);
      t.rules = {
        ...t.rules,
        [COLLAPSE_RULE_ID]: { ...ownOf(t), stone: { ...ownOf(t).stone, '2,0': 0 } },
      };
      return t;
    };
    const laid = act(board(FAR), { type: 'endTurn' }).state;
    expect(cracks(cut(laid))).toEqual(['2,0']);
    expect(cracks(cut(board(FAR)))).toEqual(['2,0', '3,0', '4,0', '5,0']);
  });

  test('a span near a pier is left alone', () => {
    expect(tg(mason(board('{pier} J{span} {span}\n. . . S')))).toBeNull();
  });

  test('a unit on the span tile blocks the pier', () => {
    const s = board('{pier} {span} {span} S{span} J{span} D{span}\n. . . . . . .');
    expect(tg(mason(s))).toBeNull();
  });

  test('prefers a rescuing mend to a pier', () => {
    const s = fallen('{pier} _ J{span} {span} {span} {span}\n. . . . . . S', 'B1');
    expect(tg(mason(s))?.label).toBe('mend');
  });
});

describe('registration', () => {
  test('the Mason is an ordinary minion with the design numbers', () => {
    expect(ENEMIES.mason.behaviour).toBe('bridges:mason');
    expect(ENEMIES.mason).toMatchObject({ hp: 3, move: 2, elite: false, flies: false });
  });
});
