import { describe, expect, test } from 'vitest';
import { type BattleState, type GameEvent, label, type Origin, parseLabel } from '$engine';
import { applyMark } from '$engine/marks';
import { tileAt } from '$engine/queries';
import type { Bound, Unit } from '$engine/types';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { draft, withLattices } from '../harness';
import { castWith } from './castHelper';

/** IQ-F3: Sentence's margin lines (`sentence:mark`, `sentence:unit`) and its two capstones. */

const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
const GUARD: Bound = { action: 'guard', event: 'hit', solvent: null, heading: null };
const RIGHT = { kind: 'dir', dir: 'right' } as const;

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const count = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type).length;
const markOf = (u: Unit): string | null =>
  u.mark ? (u.mark.bound ? 'bound' : u.mark.deep ? 'deep' : 'plain') : null;

/** Sentence on a marked rat (B1) with a dummy beside where it lands (D2); the mark is set by the combo. */
function markBoard(combo: Combo): BattleState {
  const release = combo.l1 === 'sentence-mark-release';
  return draft(withLattices('D r . . .\n. . . . d', { draughtsman: 'Bolt> Sentence' }), (ctx) => {
    const rat = unit(ctx.s, 'rat-1');
    applyMark(ctx, rat, { deep: !release, bound: release ? GUARD : null, origin: ORIGIN });
    if (combo.l2 === 'sentence-mark-held') rat.held = 2;
  }).state;
}

test('sentence:mark fourCombos: release or peel, then held or pass', () => {
  const runs = fourCombos(
    'sentence:mark',
    ['sentence-mark-release', 'sentence-mark-peel'],
    ['sentence-mark-held', 'sentence-mark-pass'],
    (combo) => {
      const r = castWith(markBoard(combo), RIGHT, combo.footnotes);
      const rat = unit(r.state, 'rat-1');
      const dummy = unit(r.state, 'dummy-1');
      return {
        at: label(rat.pos),
        mark: markOf(rat),
        released: count(r.events, 'released'),
        passed: markOf(dummy),
      };
    },
  );
  const [relHeld, relPass, peelHeld, peelPass] = runs.map((r) => r.result);
  // A held unit keeps its mark: nothing is spent, so nothing is released or passed.
  expect(relHeld).toEqual({ at: 'B1', mark: 'bound', released: 0, passed: null });
  expect(peelHeld).toEqual({ at: 'B1', mark: 'deep', released: 0, passed: null });
  // Release spends the mark: the action runs on the rat and a plain mark (never the action) passes.
  expect(relPass).toEqual({ at: 'E1', mark: null, released: 1, passed: 'plain' });
  // Peel is not a spend: the rat is still pushed, its mark stays plain, and nothing passes.
  expect(peelPass).toEqual({ at: 'E1', mark: 'plain', released: 0, passed: null });
});

/** Sentence on a rat at B1 with no mark: bare, or covered by the collar or shield the combo names. */
function unitRun(combo: Combo, covered: boolean) {
  const collar = combo.l2 === 'sentence-unit-collar';
  // A `&` in the notation is a born-brass collar, which Erase cannot strike; the cover is put on by a cast.
  const s = withLattices('D r . . .', { draughtsman: 'Bolt> Sentence' });
  const start = covered
    ? draft(s, (ctx) => {
        const rat = unit(ctx.s, 'rat-1');
        if (collar) rat.collar = ORIGIN;
        else rat.shield = 2;
      }).state
    : s;
  const r = castWith(start, RIGHT, combo.footnotes);
  const rat = unit(r.state, 'rat-1');
  return {
    at: label(rat.pos),
    mark: markOf(rat),
    collar: rat.collar === false ? 'off' : 'on',
    shield: rat.shield,
  };
}

test('sentence:unit fourCombos: nudge or serve on a bare unit, then the cover counts as marked', () => {
  const runs = fourCombos(
    'sentence:unit',
    ['sentence-unit-nudge', 'sentence-unit-serve'],
    ['sentence-unit-collar', 'sentence-unit-shield'],
    (combo) => ({ bare: unitRun(combo, false), covered: unitRun(combo, true) }),
  );
  const [nudgeCollar, nudgeShield, serveCollar, serveShield] = runs.map((r) => r.result);
  // A bare unit: nudge moves it one tile and spends nothing; serve marks it and stays put.
  for (const r of [nudgeCollar, nudgeShield]) {
    expect(r?.bare).toEqual({ at: 'C1', mark: null, collar: 'off', shield: 0 });
  }
  for (const r of [serveCollar, serveShield]) {
    expect(r?.bare).toEqual({ at: 'B1', mark: 'plain', collar: 'off', shield: 0 });
  }
  // A covered unit counts as marked whichever variant is written: the cover goes, the push is full.
  expect(nudgeCollar?.covered).toEqual({ at: 'E1', mark: null, collar: 'off', shield: 0 });
  expect(serveCollar?.covered).toEqual({ at: 'E1', mark: null, collar: 'off', shield: 0 });
  expect(nudgeShield?.covered).toEqual({ at: 'E1', mark: null, collar: 'off', shield: 0 });
  expect(serveShield?.covered).toEqual({ at: 'E1', mark: null, collar: 'off', shield: 0 });
});

describe('Sentence capstones', () => {
  test('sentence-cap-blot: a spent mark leaves a blot where the unit was pushed from', () => {
    const s = withLattices('D r! . . .', { draughtsman: 'Bolt> Sentence' });
    const r = castWith(s, RIGHT, withFootnotes(['sentence-cap-blot']));
    expect(label(unit(r.state, 'rat-1').pos)).toBe('E1');
    expect(tileAt(r.state, parseLabel('B1')).state?.id).toBe('blot');
    const plain = castWith(s, RIGHT, withFootnotes([]));
    expect(tileAt(plain.state, parseLabel('B1')).state).toBeNull();
  });

  test('sentence-cap-cosign: the unit a push runs into is marked plain', () => {
    const s = withLattices('D r! d . .', { draughtsman: 'Bolt> Sentence' }, { hp: { C1: 9 } });
    const r = castWith(s, RIGHT, withFootnotes(['sentence-cap-cosign']));
    expect(markOf(unit(r.state, 'dummy-1'))).toBe('plain');
    const plain = castWith(s, RIGHT, withFootnotes([]));
    expect(markOf(unit(plain.state, 'dummy-1'))).toBeNull();
  });
});
