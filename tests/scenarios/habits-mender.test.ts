import { describe, expect, test } from 'vitest';
import type { InventionDef } from '$data';
import { APPRENTICES } from '$data';
import { type BattleState, libraryOf, parseLabel, tileAt, unitAt } from '$engine';
import { act, cast, expectLogIncludes, withLattices } from './harness';

/**
 * EN-9 (ending plan P18, P19): the owner's `mender` habit. On the owner's own casts, two network
 * tiles in a straight line with exactly one empty tile between them join (no state, unit or
 * blocking piece in the gap); the gap tile is not in the network; never diagonal, never round-end.
 * The same page cast by anyone else behaves as it always has.
 */

const at = parseLabel;
/** A unit's hp by id, dead ones included (a Storm kills a rat). */
const hpOf = (s: BattleState, id: string): number => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`No unit ${id}`);
  return u.hp;
};
const impulse: InventionDef = {
  id: 'inv:impulse',
  name: 'impulse',
  method: 'conduct',
  parts: ['shove'],
  solvent: null,
};
const inventions = libraryOf([impulse]);

describe('mender: networks join across one empty tile (P19)', () => {
  const spark = { owner: 'Bolt> Spark', draughtsman: 'Bolt> Spark' };

  test('EN-9: mender joins Storm across one gap', () => {
    // Bolt stops at the first cloud (C1); the rat stands in the cloud beyond one empty tile.
    const s = withLattices('O . ~ . r~', spark);
    const r = cast(s, 'owner', 'right');
    expect(hpOf(r.state, 'rat-1')).toBeLessThan(hpOf(s, 'rat-1'));
    expect(unitAt(r.state, at('D1'))).toBeNull();
  });

  test('EN-9: mender joins Conduct across one gap', () => {
    // Impulse conducts along brass: the plates at B2 and D2 are one empty tile apart.
    const page = { owner: 'Bolt> inv:impulse', draughtsman: 'Bolt> inv:impulse' };
    const board = 'O r . r .\n. = . = .';
    const owner = cast(withLattices(board, page, { inventions }), 'owner', 'right');
    expectLogIncludes(owner.events, ['shove travels the brass to rat at B1, rat at D1']);
    const other = cast(
      withLattices(board.replace('O', 'D'), page, { inventions }),
      'draughtsman',
      'right',
    );
    expectLogIncludes(other.events, ['shove travels the brass to rat at B1']);
  });

  test('EN-9: mender ignites fire across one gap', () => {
    // Spark on the slick at C1: the oil at E1 is one empty tile beyond, with a rat on it.
    const s = withLattices('O . o . ro', spark);
    const r = cast(s, 'owner', 'right');
    expect(tileAt(r.state, at('C1')).state?.id).toBe('fire');
    expect(tileAt(r.state, at('E1')).state?.id).toBe('fire');
    expect(tileAt(r.state, at('D1')).state).toBeNull();
    const plain = cast(withLattices('D . o . ro', spark), 'draughtsman', 'right');
    expect(tileAt(plain.state, at('C1')).state?.id).toBe('slick');
  });

  test('EN-9: mender joins Toll across one gap', () => {
    // Toll takes the slick's network: the second rat sits on slick across the gap.
    const page = { owner: 'Bolt> Toll Strike', draughtsman: 'Bolt> Toll Strike' };
    const s = withLattices('O . ro . ro', page);
    const r = cast(s, 'owner', 'right');
    expect(hpOf(r.state, 'rat-1')).toBeLessThan(hpOf(s, 'rat-1'));
    expect(hpOf(r.state, 'rat-2')).toBeLessThan(hpOf(s, 'rat-2'));
    const plain = cast(
      withLattices('D . ro . ro', { draughtsman: page.draughtsman }),
      'draughtsman',
      'right',
    );
    expect(hpOf(plain.state, 'rat-2')).toBe(hpOf(s, 'rat-2'));
  });

  test('EN-9: a unit in the gap blocks the join', () => {
    const s = withLattices('O . ~ r . r~', spark);
    const r = cast(s, 'owner', 'right');
    expect(hpOf(r.state, 'rat-2')).toBe(hpOf(s, 'rat-2'));
  });

  test('EN-9: no diagonal join', () => {
    const s = withLattices('O . ~ .\n. . . r~', spark);
    const r = cast(s, 'owner', 'right');
    expect(hpOf(r.state, 'rat-1')).toBe(hpOf(s, 'rat-1'));
  });

  test('EN-9: dusk fire does not jump the gap', () => {
    const s = withLattices('O . * . o', { owner: 'Bolt> Spark' });
    const r = act(s, { type: 'endTurn' });
    expect(tileAt(r.state, at('E1')).state?.id).toBe('slick');
  });

  test('EN-9: the same page cast by another apprentice behaves as today', () => {
    const s = withLattices('D . ~ . r~', spark);
    const r = cast(s, 'draughtsman', 'right');
    expect(hpOf(r.state, 'rat-1')).toBe(hpOf(s, 'rat-1'));
  });

  test("EN-9: the owner's starter page fires a Storm", () => {
    const s = withLattices('O . r . .', { owner: APPRENTICES.owner.starterPage });
    const r = cast(s, 'owner', { kind: 'tile', at: at('C1') });
    expect(r.events.some((e) => e.type === 'burst' && e.burst === 'storm')).toBe(true);
    expect(hpOf(r.state, 'rat-1')).toBeLessThan(hpOf(s, 'rat-1'));
  });
});

describe('mender: the fine print stamps its lines (EN-9b)', () => {
  const spark = { owner: 'Bolt> Spark', draughtsman: 'Bolt> Spark' };
  const lineOf = (events: readonly { type: string; line?: string }[], id: string) =>
    events.some((e) => e.type === 'miss' && e.line === id);

  test('EN-9: mender:unit fires when a unit stands in the gap', () => {
    const r = cast(withLattices('O . ~ r ~', spark), 'owner', 'right');
    expect(lineOf(r.events, 'mender:unit')).toBe(true);
  });

  test('EN-9: mender:diagonal fires on a diagonal pair', () => {
    const r = cast(withLattices('O . ~ .\n. . . r~', spark), 'owner', 'right');
    expect(lineOf(r.events, 'mender:diagonal')).toBe(true);
  });

  test('EN-9: mender:dusk fires when dusk fire meets a gap', () => {
    // The owner's fire stands at C1; oil lies one empty tile beyond it.
    const lit = withLattices('O . * . .', spark);
    const owner = lit.units.find((u) => u.kind === 'member' && u.pos.x === 0);
    if (!owner) throw new Error('no owner');
    tileAt(lit, at('C1')).state = {
      id: 'fire',
      rounds: 2,
      origin: { caster: owner.id, spell: 'owner', cast: 1 } as never,
    };
    tileAt(lit, at('E1')).state = { id: 'slick', rounds: 0, origin: null };
    const r = act(lit, { type: 'endTurn' });
    expect(lineOf(r.events, 'mender:dusk')).toBe(true);
  });
});
