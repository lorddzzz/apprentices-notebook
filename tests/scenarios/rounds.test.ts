import { describe, expect, test } from 'vitest';
import { type BattleState, IllegalActionError, memberById, parseLabel, tileAt } from '$engine';
import { schedule } from '$engine/schedule';
import { act, cast, draft, expectLog, expectLogIncludes, withLattices } from './harness';

/** The round order (design §3, plan E6): player phase, dusk, enemy phase, next player phase. */

const at = parseLabel;
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no unit ${id}`);
  return u;
};
const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const layer = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).state;

describe('durations', () => {
  test('afterglow-plus-one-round', () => {
    // Ink then Oil make a stain (2 rounds); Afterglow above the Oil buys one more.
    const plain = withLattices('D . . .\nd . . .', { draughtsman: 'Bolt> Ink Oil' });
    const glow = withLattices('D . . .\nd . . .', {
      draughtsman: '. . Afterglow\nBolt> Ink Oil',
    });
    const lasts = (start: BattleState): number => {
      let s = cast(start, 'draughtsman', 'right').state;
      let rounds = 0;
      while (layer(s, 'D1') && rounds < 6) {
        s = endTurn(s).state;
        if (layer(s, 'D1')) rounds++;
      }
      return rounds;
    };
    expect(lasts(glow)).toBe(lasts(plain) + 1);
  });

  test('steep-spreads-each-round', () => {
    const start = withLattices('D . . .\n. . . .\nd . . .', {
      draughtsman: '. . Steep\nBolt> Steam Oil',
    });
    const made = cast(start, 'draughtsman', 'right').state;
    expect(layer(made, 'D1')).toMatchObject({ id: 'greaseFog', steep: true });
    const one = endTurn(made);
    expectLogIncludes(one.events, ['it spreads from D1 to C1, D2']);
    for (const lbl of ['D1', 'C1', 'D2']) expect(layer(one.state, lbl)?.id, lbl).toBe('greaseFog');
  });
});

describe('stun, hold and guard', () => {
  test('stunned-skips-next-action', () => {
    const start = withLattices('D . r', {});
    const s = structuredClone(start);
    unit(s, 'rat-1').stunned = true;
    const r = endTurn(s);
    expect(r.lines.join('\n')).not.toContain('rat at C1 moves');
    expect(unit(r.state, 'rat-1').pos).toEqual(at('C1'));
    expect(unit(r.state, 'rat-1').stunned).toBe(false);
    expectLogIncludes(r.events, ['rat at C1 waits']);
    // The turn after, it acts again.
    const again = endTurn(r.state);
    expectLogIncludes(again.events, ['rat at C1 moves to B1']);
  });

  test('a stunned telegraphed attack does not land, and a stunned apprentice sits a turn out', () => {
    const start = withLattices('D r', {}, { intents: { B1: 'left' } });
    const s = structuredClone(start);
    unit(s, 'rat-1').stunned = true;
    unit(s, 'draughtsman').stunned = true;
    const r = endTurn(s);
    expect(r.lines.join('\n')).not.toContain('bites');
    expect(unit(r.state, 'draughtsman').hp).toBe(unit(s, 'draughtsman').hp);
    expect(unit(r.state, 'rat-1').stunned).toBe(false);
    const m = memberById(r.state, 'draughtsman');
    expect(m.stunned).toBe(false);
    expect(m.moved && m.acted).toBe(true);
    expect(() => act(r.state, { type: 'move', unit: 'draughtsman', to: at('A2') })).toThrow(
      IllegalActionError,
    );
    // And the turn after that, it is free again.
    const free = endTurn(r.state).state;
    expect(memberById(free, 'draughtsman').moved).toBe(false);
  });

  test('hold-lasts-through-enemy-phase', () => {
    const start = withLattices('D . r', { draughtsman: 'Bolt> Hold' });
    const held = cast(start, 'draughtsman', 'right');
    expect(unit(held.state, 'rat-1').held).toBe(1);
    const r = endTurn(held.state);
    // The rat was held through the enemy phase: it did not walk.
    expect(r.lines.join('\n')).not.toContain('rat at C1 moves');
    expect(unit(r.state, 'rat-1').pos).toEqual(at('C1'));
    // The next player phase begins with the hold gone.
    expect(unit(r.state, 'rat-1').held).toBe(0);
    expectLogIncludes(endTurn(r.state).events, ['rat at C1 moves to B1']);
  });

  test('a shackled foe does not walk either', () => {
    const start = withLattices('D . r$', {});
    const r = endTurn(start);
    expect(r.lines.join('\n')).not.toContain('rat at C1 moves');
  });

  test('guard-ends-at-next-turn', () => {
    const start = withLattices('D r', { draughtsman: 'Touch> Guard' }, { intents: { B1: 'left' } });
    const guarded = cast(start, 'draughtsman', { kind: 'self' });
    expect(unit(guarded.state, 'draughtsman').shield).toBe(2);
    const r = endTurn(guarded.state);
    // The telegraphed bite is soaked, and what is left of the shield lapses with the turn.
    expect(r.lines.join('\n')).toContain('Bite hits Draughtsman for 1');
    expect(unit(r.state, 'draughtsman').hp).toBe(unit(guarded.state, 'draughtsman').hp);
    expect(unit(r.state, 'draughtsman').shield).toBe(0);
    expect(unit(r.state, 'draughtsman').guardUntil).toBeNull();
  });
});

describe('the scheduled queue', () => {
  test('an owner-turn entry runs at the next player phase, once', () => {
    const start = withLattices('D . d', {});
    const s = draft(start, (ctx) =>
      schedule(ctx, {
        when: 'ownerTurn',
        owner: 'draughtsman',
        step: 'strike',
        target: { kind: 'tile', at: at('C1') },
        heading: 'right',
        origin: { caster: 'draughtsman', spell: 'x', cast: 1 },
        kind: 'repeat',
      }),
    );
    expectLog(s.events, ['repeat waits at C1']);
    const r = endTurn(s.state);
    expectLogIncludes(r.events, ['strike happens again', 'Strike hits dummy at C1 for 2']);
    expect(r.state.scheduled).toEqual([]);
    const later = endTurn(r.state);
    expect(later.lines.join('\n')).not.toContain('Strike hits');
  });

  test('a round-end entry runs at dusk; a thunderhead is left to the chemistry', () => {
    const start = withLattices('D . . .\nd . . .', {});
    const q = draft(start, (ctx) => {
      for (const kind of ['wick', 'thunderhead'] as const) {
        schedule(ctx, {
          when: 'roundEnd',
          owner: 'draughtsman',
          step: 'oil',
          target: { kind: 'tile', at: at('C1') },
          heading: null,
          origin: { caster: 'draughtsman', spell: 'x', cast: 1 },
          kind,
        });
      }
    });
    const r = endTurn(q.state);
    expectLogIncludes(r.events, ['oil lands at C1 as slick']);
    expect(r.state.scheduled.map((e) => e.kind)).toEqual([]);
  });
});

describe('round order', () => {
  test('round-order-golden', () => {
    // A dusk jar (oil on D1), a rat standing in fire, a stain wearing down: one round in full.
    const start = withLattices(
      'D . . . . .\n. . . . . .\n. d r* . {stain} .',
      { draughtsman: 'Bolt> Fuse Oil' },
      { intents: { C3: 'left' } },
    );
    const rounds = layer(start, 'E3')?.rounds ?? 0;
    const jarred = cast(start, 'draughtsman', 'right').state;
    const r = endTurn(jarred);
    expectLog(r.events, [
      'Enemies act',
      'rat at C3 bites left',
      'Bite hits dummy at B3 for 1',
      'the jar at E1 opens',
      'oil lands at E1 as slick',
      'Fire hits rat at C3 for 1',
      'Round 2',
      'Enemies move',
      'dummy at B3 waits',
      'rat at C3 moves to B1',
      'oil lands at C2 as slick',
      'oil lands at C1 as slick',
      'oil lands at B1 as slick',
      'rat at B1 will bite left',
      'Your turn',
    ]);
    // The compound wore down one round at dusk, and the fire's own clock ticked too.
    expect(layer(r.state, 'E3')?.rounds).toBe(rounds - 1);
  });
});
