import { describe, expect, it, test } from 'vitest';
import { type InventionDef, LINES } from '$data';
import { type BattleState, type GameEvent, libraryOf, parseLabel } from '$engine';
import { applyMark } from '$engine/marks';
import type { Bound, Origin, Unit } from '$engine/types';
import { cast, draft, withLattices } from './harness';

/**
 * IQ-F1: the Contracts audit (footnotes audit, section 11). Sentence, Levy and Tally against marks,
 * collars and pieces. Each new row has a `behaviour` test (green today: the rule the row describes)
 * and a `fires` test. IQ-F3 stamped the rows at their engine sites and dropped their `pending`
 * flags and the `it.fails` markers. The Debt Collection scenario runs through Bind, the quarter's
 * treasure, with no engine change.
 */

const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
const HELD_ACTION: Bound = { action: 'shove', event: 'hit', solvent: null, heading: 'right' };
const at = parseLabel;

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const linesOf = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type).map((e) => e.line);
const count = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type).length;
const withHeld = (s: BattleState, id: string): BattleState => {
  const c = structuredClone(s);
  unit(c, id).held = 2;
  return c;
};
/** A battle where `id` carries a mark that holds a bound action (set by the draughtsman). */
const withBound = (s: BattleState, id: string, deep = false): BattleState =>
  draft(s, (ctx) => {
    applyMark(ctx, unit(ctx.s, id), { deep, bound: HELD_ACTION, origin: ORIGIN });
  }).state;

test('IQ-F1: the new Contracts rows exist, are Ink Quarter rows, and are stamped (not pending)', () => {
  const ids = [
    'sentence:mark',
    'levy:unit',
    'levy:mark',
    'levy:member',
    'levy:shielded',
    'tally:collar',
    'tally:stamp',
  ];
  for (const id of ids) {
    const row = LINES.find((l) => l.id === id);
    expect(row, id).toBeDefined();
    expect(row?.district, id).toBe('inkQuarter');
    expect(row?.pending, id).toBeUndefined();
  }
});

describe('Sentence', () => {
  const s0 = () => withLattices('D . r!', { draughtsman: 'Bolt> Sentence' });

  test('IQ-F1: sentence:mark behaviour: the mark is spent before the push, held units too, a bound action lost', () => {
    // A held rat cannot move, and still loses its mark.
    const held = cast(
      withHeld(withLattices('D r! .', { draughtsman: 'Bolt> Sentence' }), 'rat-1'),
      'draughtsman',
      'right',
    );
    expect(unit(held.state, 'rat-1').mark).toBeNull();
    expect(unit(held.state, 'rat-1').pos).toEqual(at('B1'));
    // A bound mark is lost, not released.
    const bound = cast(
      withBound(withLattices('D r . . . .', { draughtsman: 'Bolt> Sentence' }), 'rat-1'),
      'draughtsman',
      'right',
    );
    expect(count(bound.events, 'released')).toBe(0);
    expect(unit(bound.state, 'rat-1').mark).toBeNull();
    expect(count(bound.events, 'markSpent')).toBe(1);
    expect(unit(bound.state, 'rat-1').pos.x).toBeGreaterThan(1); // and it is still pushed
  });

  it('IQ-F1: sentence:mark fires', () => {
    const r = cast(s0(), 'draughtsman', 'right');
    expect(linesOf(r.events, 'markSpent')).toContain('sentence:mark');
  });
});

describe('Levy', () => {
  test('IQ-F1: levy:unit behaviour: an unmarked unit pays nothing and Levy does nothing', () => {
    const r = cast(withLattices('D . r', { draughtsman: 'Bolt> Levy' }), 'draughtsman', 'right');
    expect(count(r.events, 'shieldGained')).toBe(0);
    expect(count(r.events, 'markSpent')).toBe(0);
    expect(unit(r.state, 'draughtsman').shield).toBe(0);
  });

  it('IQ-F1: levy:unit fires', () => {
    const r = cast(withLattices('D . r', { draughtsman: 'Bolt> Levy' }), 'draughtsman', 'right');
    expect(linesOf(r.events, 'miss')).toContain('levy:unit');
  });

  test('IQ-F1: levy:mark behaviour: a deep mark pays one shield, a bound action is lost unreleased', () => {
    const deep = cast(
      withLattices('D . r!!', { draughtsman: 'Bolt> Levy' }),
      'draughtsman',
      'right',
    );
    expect(unit(deep.state, 'draughtsman').shield).toBe(1);
    expect(unit(deep.state, 'rat-1').mark).toBeNull();
    const bound = cast(
      withBound(withLattices('D . r', { draughtsman: 'Bolt> Levy' }), 'rat-1'),
      'draughtsman',
      'right',
    );
    expect(count(bound.events, 'released')).toBe(0);
    expect(unit(bound.state, 'draughtsman').shield).toBe(1);
  });

  it('IQ-F1: levy:mark fires', () => {
    const r = cast(withLattices('D . r!!', { draughtsman: 'Bolt> Levy' }), 'draughtsman', 'right');
    expect(linesOf(r.events, 'markSpent')).toContain('levy:mark');
  });

  test('IQ-F1: levy:member behaviour: your own marked ally is spent too, and the caster takes the shield', () => {
    const r = cast(withLattices('D . S!', { draughtsman: 'Bolt> Levy' }), 'draughtsman', 'right');
    expect(unit(r.state, 'stoker').mark).toBeNull();
    expect(unit(r.state, 'draughtsman').shield).toBe(1);
    expect(unit(r.state, 'stoker').shield).toBe(0);
  });

  it('IQ-F1: levy:member fires', () => {
    const r = cast(withLattices('D . S!', { draughtsman: 'Bolt> Levy' }), 'draughtsman', 'right');
    expect(linesOf(r.events, 'markSpent')).toContain('levy:member');
  });

  test('IQ-F1: levy:shielded behaviour: Levy on a shielded caster adds to the shield', () => {
    const start = structuredClone(withLattices('D . r!', { draughtsman: 'Bolt> Levy' }));
    const me = unit(start, 'draughtsman');
    me.shield = 2;
    me.guardUntil = 9;
    const r = cast(start, 'draughtsman', 'right');
    expect(unit(r.state, 'draughtsman').shield).toBe(3);
    expect(unit(r.state, 'draughtsman').guardUntil).toBe(9); // the longer of the two
  });

  it('IQ-F1: levy:shielded fires', () => {
    const start = structuredClone(withLattices('D . r!', { draughtsman: 'Bolt> Levy' }));
    unit(start, 'draughtsman').shield = 2;
    const r = cast(start, 'draughtsman', 'right');
    expect(linesOf(r.events, 'shieldGained')).toContain('levy:shielded');
  });
});

describe('Tally', () => {
  const passed = (events: readonly GameEvent[]): boolean[] =>
    events.flatMap((e) => (e.type === 'triggered' ? [e.passed] : []));
  const run = (ascii: string, prep?: (s: BattleState) => void): ReturnType<typeof cast> => {
    const s = structuredClone(withLattices(ascii, { draughtsman: 'Bolt> Tally Strike' }));
    prep?.(s);
    return cast(s, 'draughtsman', 'right');
  };

  test('IQ-F1: tally:collar behaviour: a collar and a shackle each count as a thing', () => {
    expect(passed(run('D . r&').events)).toEqual([false]); // a collar alone is one thing
    expect(passed(run('D . r&!').events)).toEqual([true]); // collar + mark
    expect(passed(run('D . r!$').events)).toEqual([true]); // shackle + mark
  });

  it('IQ-F1: tally:collar fires', () => {
    expect(linesOf(run('D . r&!').events, 'triggered')).toContain('tally:collar');
  });

  test('IQ-F1: tally:stamp behaviour: a piece on the tile is not a thing', () => {
    // A mark and a return stamp under the rat: one thing, not two.
    expect(passed(run('D . r!{return}').events)).toEqual([false]);
    // A mark and a slick (a state) are two.
    expect(passed(run('D . r!o').events)).toEqual([true]);
  });

  it('IQ-F1: tally:stamp fires', () => {
    expect(linesOf(run('D . r!{return}').events, 'triggered')).toContain('tally:stamp');
  });
});

describe('Sand (audited, no new row)', () => {
  const doomed = (solvent: Bound['solvent']) =>
    draft(withLattices('D r S', { stoker: 'Bolt> Strike' }, { hp: { B1: 1 } }), (ctx) => {
      applyMark(ctx, unit(ctx.s, 'rat-1'), {
        deep: false,
        bound: { action: 'shove', event: 'dies', solvent, heading: 'right' },
        origin: ORIGIN,
      });
    }).state;

  test('IQ-F1: Sand turns back only a hit: a "dies" mark acts as cast, with no Sand line (audit Sa1)', () => {
    const plain = cast(doomed(null), 'stoker', 'left');
    const sand = cast(doomed('sand'), 'stoker', 'left');
    expect(count(plain.events, 'released')).toBe(1);
    expect(count(sand.events, 'released')).toBe(1);
    expect(sand.events.filter((e) => e.line === 'sand:unit' || e.line === 'sand:noTarget')).toEqual(
      [],
    );
  });
});

describe('Debt Collection through the quarter (BL-101)', () => {
  const inv = (): InventionDef => ({
    id: 'inv:recoil',
    name: 'recoil',
    method: 'bind',
    parts: ['ink', 'shove'],
    solvent: null,
    event: 'hit',
  });
  const opts = { inventions: libraryOf([inv()]) };
  const named = (events: readonly GameEvent[]): string[] =>
    events.flatMap((e) => (e.type === 'named' && e.what === 'idiom' ? [e.id] : []));
  const bindThen = (collector: string) => {
    const s = withLattices(
      'D r S\n. . .',
      { draughtsman: 'Touch> inv:recoil', stoker: collector },
      { ...opts, hp: { B1: 9 } },
    );
    const bound = cast(s, 'draughtsman', { kind: 'tile', at: at('B1') });
    expect(unit(bound.state, 'rat-1').mark?.bound).not.toBeNull();
    return bound.state;
  };

  test('IQ-F1: debtCollection: the draughtsman binds, the stoker collects with a Strike', () => {
    const r = cast(bindThen('Bolt> Strike'), 'stoker', 'left');
    expect(count(r.events, 'released')).toBe(1);
    expect(named(r.events)).toEqual(['debtCollection']);
  });

  test('IQ-F1: a Sentence by the other apprentice spends the bound mark and collects no debt', () => {
    const r = cast(bindThen('Bolt> Sentence'), 'stoker', 'left');
    expect(count(r.events, 'released')).toBe(0);
    expect(named(r.events)).toEqual([]);
    expect(unit(r.state, 'rat-1').mark).toBeNull();
  });
});
