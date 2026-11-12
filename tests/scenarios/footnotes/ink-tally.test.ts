import { describe, expect, test } from 'vitest';
import { type BattleState, type GameEvent, parseLabel } from '$engine';
import { tileAt } from '$engine/queries';
import type { Unit } from '$engine/types';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { draft, withLattices } from '../harness';
import { castWith } from './castHelper';

/** IQ-F3: Tally's margin line (`tally:collar`) and its two capstones. */

const RIGHT = { kind: 'dir', dir: 'right' } as const;

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const passedOf = (events: readonly GameEvent[]): boolean[] =>
  events.flatMap((e) => (e.type === 'triggered' ? [e.passed] : []));

/**
 * Bolt Tally Strike at the rat (C1). The rat is collared (`twice`) or shackled (`shackle`); a
 * second collared dummy under it (C2) is the `net` neighbour.
 */
function collarRun(combo: Combo) {
  const net = combo.l2 === 'tally-collar-net';
  const twice = combo.l1 === 'tally-collar-twice';
  const ascii = net ? 'D . r&\n. . d&' : 'D . r&';
  const s = draft(
    withLattices(ascii, { draughtsman: 'Bolt> Tally Strike' }, { hp: { C1: 9 } }),
    (ctx) => {
      if (!twice) {
        const rat = unit(ctx.s, 'rat-1');
        rat.collar = false;
        rat.shackle = 2;
      }
    },
  ).state;
  const r = castWith(s, RIGHT, combo.footnotes);
  const rat = unit(r.state, 'rat-1');
  return {
    passed: passedOf(r.events)[0],
    hit: rat.hp < 9,
    collar: rat.collar === false ? 'off' : 'on',
    shackle: rat.shackle,
  };
}

test('tally:collar fourCombos: twice or shackle, then net or spend', () => {
  const runs = fourCombos(
    'tally:collar',
    ['tally-collar-twice', 'tally-collar-shackle'],
    ['tally-collar-net', 'tally-collar-spend'],
    collarRun,
  );
  const [twiceNet, twiceSpend, shackleNet, shackleSpend] = runs.map((r) => r.result);
  // Twice: the collar alone passes (two things); net keeps the collar, spend strikes it off.
  expect(twiceNet).toEqual({ passed: true, hit: true, collar: 'on', shackle: 0 });
  expect(twiceSpend).toEqual({ passed: true, hit: true, collar: 'off', shackle: 0 });
  // Shackle: the shackle alone passes (two things); spend strikes the shackle off, not a collar.
  expect(shackleNet).toEqual({ passed: true, hit: true, collar: 'off', shackle: 2 });
  expect(shackleSpend).toEqual({ passed: true, hit: true, collar: 'off', shackle: 0 });
});

describe('Tally capstones', () => {
  test('tally-cap-surplus: four things on the target, the rest acts on it twice', () => {
    // A mark, a collar, a shackle and a slick: four things, so Tally counts four.
    const s = draft(
      withLattices('D . r!&o', { draughtsman: 'Bolt> Tally Strike' }, { hp: { C1: 9 } }),
      (ctx) => {
        unit(ctx.s, 'rat-1').shackle = 2;
      },
    ).state;
    const hit = (ids: string[]) =>
      9 - unit(castWith(s, RIGHT, withFootnotes(ids)).state, 'rat-1').hp;
    const once = hit([]);
    expect(once).toBeGreaterThan(0);
    expect(hit(['tally-cap-surplus'])).toBe(2 * once);
  });

  test('tally-cap-refund: a gate that stops the cast leaves a blot on the target tile', () => {
    const s = withLattices('D . r', { draughtsman: 'Bolt> Tally Strike' });
    const refused = castWith(s, RIGHT, withFootnotes(['tally-cap-refund']));
    expect(passedOf(refused.events)).toEqual([false]);
    expect(tileAt(refused.state, parseLabel('C1')).state?.id).toBe('blot');
    const plain = castWith(s, RIGHT, withFootnotes([]));
    expect(tileAt(plain.state, parseLabel('C1')).state).toBeNull();
  });
});
