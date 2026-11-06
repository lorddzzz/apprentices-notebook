import { describe, expect, test } from 'vitest';
import type { BattleState, EnemyUnit } from '$engine';
import { dealDamage } from '$engine/damage';
import { act, board, cast, draft, withLattices } from './harness';

/**
 * Levy's shield timing (P27): a member's shield lapses when the next player phase begins, an
 * enemy's lasts one round longer so it still stands for the party's coming turn (IQ-22 follow-up).
 */

const endTurn = (s: BattleState) => act(s, { type: 'endTurn' });
const pm = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === 'postmaster');
  if (!u) throw new Error('no postmaster');
  return u as EnemyUnit;
};

describe('levy shield timing', () => {
  test('member-cast-levy-unchanged: the shield lapses when the next player phase begins', () => {
    const s = withLattices('D . d!', { draughtsman: 'Bolt> Levy' });
    const c = cast(s, 'draughtsman', 'right');
    const me = (st: BattleState) => st.units.find((u) => u.id === 'draughtsman')?.shield;
    expect(me(c.state)).toBe(1);
    expect(me(endTurn(c.state).state)).toBe(0);
  });

  test('enemy-cast-levy-blocks-then-ends: it stands through the party turn, then lapses', () => {
    const s = endTurn(structuredClone(board('. . . . . .\nS . . d! d! .\n. . . . . p'))).state;
    expect(pm(s).intent).toMatchObject({ kind: 'cast', spell: 'collect' });
    const next = endTurn(s).state; // he casts Collect; the party's turn begins
    expect(pm(next).shield).toBe(2);
    const hit = draft(next, (ctx) => dealDamage(ctx, pm(ctx.s), 2, 'Strike'));
    expect(pm(hit.state).hp).toBe(pm(next).hp);
    expect(pm(hit.state).shield).toBe(0);
    expect(pm(endTurn(next).state).shield).toBe(0);
  });
});
