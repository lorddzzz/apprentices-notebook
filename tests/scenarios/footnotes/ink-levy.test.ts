import { describe, expect, test } from 'vitest';
import { type BattleState, type GameEvent, label, type Origin } from '$engine';
import { applyMark } from '$engine/marks';
import type { Bound, Unit } from '$engine/types';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { draft, withLattices } from '../harness';
import { castWith, tileAim } from './castHelper';

/** IQ-F3: Levy's margin lines (`levy:mark`, `levy:member`) and its two capstones. */

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

// A deep mark on the rat (C1) that Levy reaches from the draughtsman (A1); the combo's release is a bound mark.
test('levy:mark fourCombos: deep or peel, then release or ward', () => {
  const runs = fourCombos(
    'levy:mark',
    ['levy-mark-deep', 'levy-mark-peel'],
    ['levy-mark-release', 'levy-mark-ward'],
    (combo) => {
      const release = combo.l2 === 'levy-mark-release';
      const s = draft(withLattices('D . r', { draughtsman: 'Bolt> Levy' }), (ctx) => {
        applyMark(ctx, unit(ctx.s, 'rat-1'), {
          deep: true,
          bound: release ? GUARD : null,
          origin: ORIGIN,
        });
      }).state;
      const base = s.round + 1;
      const r = castWith(s, RIGHT, combo.footnotes);
      const me = unit(r.state, 'draughtsman');
      return {
        shield: me.shield,
        laterBy: (me.guardUntil ?? base) - base,
        mark: markOf(unit(r.state, 'rat-1')),
        released: count(r.events, 'released'),
      };
    },
  );
  const [deepRel, deepWard, peelRel, peelWard] = runs.map((r) => r.result);
  // A deep mark pays two; release spends the mark and runs the action; ward lasts a round longer.
  expect(deepRel).toEqual({ shield: 2, laterBy: 0, mark: null, released: 1 });
  expect(deepWard).toEqual({ shield: 2, laterBy: 1, mark: null, released: 0 });
  // Release wins over peel on a bound mark (the mark is spent whole); peel alone keeps it plain.
  expect(peelRel).toEqual({ shield: 1, laterBy: 0, mark: null, released: 1 });
  expect(peelWard).toEqual({ shield: 1, laterBy: 1, mark: 'plain', released: 0 });
});

/**
 * Splash at C2 (the rat): its cross is the draughtsman (B2), the stoker (C1, in the area) or the
 * stoker beside the draughtsman (B1, outside it), and the draughtsman's own mark is in the cross.
 */
function memberRun(combo: Combo) {
  const near = combo.l2 === 'levy-member-near';
  const ascii = near ? '. S! . . .\n. D! r . .' : '. . S! . .\n. D! r . .';
  const s = withLattices(ascii, { draughtsman: 'Splash> Levy' });
  const r = castWith(s, tileAim('C2'), combo.footnotes);
  const me = unit(r.state, 'draughtsman');
  const st = unit(r.state, 'stoker');
  return {
    casterShield: me.shield,
    stokerShield: st.shield,
    casterMark: me.mark !== null,
    stokerMark: st.mark !== null,
  };
}

test('levy:member fourCombos: self or share, then repay or near', () => {
  const runs = fourCombos(
    'levy:member',
    ['levy-member-self', 'levy-member-share'],
    ['levy-member-repay', 'levy-member-near'],
    memberRun,
  );
  const [selfRepay, selfNear, shareRepay, shareNear] = runs.map((r) => r.result);
  // Self: the caster's own mark stays; the stoker's pays the caster (repay adds 1 to the stoker).
  expect(selfRepay).toEqual({
    casterShield: 1,
    stokerShield: 1,
    casterMark: true,
    stokerMark: false,
  });
  expect(selfNear).toEqual({
    casterShield: 1,
    stokerShield: 0,
    casterMark: true,
    stokerMark: false,
  });
  // Share: the stoker's mark pays the stoker (plus repay's 1); the caster still pays for its own.
  expect(shareRepay).toEqual({
    casterShield: 1,
    stokerShield: 2,
    casterMark: false,
    stokerMark: false,
  });
  expect(shareNear).toEqual({
    casterShield: 1,
    stokerShield: 1,
    casterMark: false,
    stokerMark: false,
  });
});

describe('Levy capstones', () => {
  test('levy-cap-bank: the third mark in one cast shields every member of your party', () => {
    // Splash at C2 spends the three marks in its cross; the stoker stands out of it.
    const s = withLattices('. . d! . .\nD . r! . .\n. . d! . S', { draughtsman: 'Splash> Levy' });
    const banked = castWith(s, tileAim('C2'), withFootnotes(['levy-cap-bank']));
    expect(unit(banked.state, 'draughtsman').shield).toBe(4);
    expect(unit(banked.state, 'stoker').shield).toBe(1);
    const plain = castWith(s, tileAim('C2'), withFootnotes([]));
    expect(unit(plain.state, 'draughtsman').shield).toBe(3);
    expect(unit(plain.state, 'stoker').shield).toBe(0);
  });

  test('levy-cap-draw: a foe whose mark Levy spends is pulled one tile toward you', () => {
    const s = withLattices('D . r!', { draughtsman: 'Bolt> Levy' });
    const pulled = castWith(s, RIGHT, withFootnotes(['levy-cap-draw']));
    expect(label(unit(pulled.state, 'rat-1').pos)).toBe('B1');
    const plain = castWith(s, RIGHT, withFootnotes([]));
    expect(label(unit(plain.state, 'rat-1').pos)).toBe('C1');
    expect(unit(plain.state, 'draughtsman').shield).toBe(1);
  });
});
