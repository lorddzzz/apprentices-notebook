import { describe, expect, test } from 'vitest';
import type { BattleState } from '$engine/types';
import { act, board } from '../scenarios/harness';

/**
 * A wipe in the middle of the enemy phase ends it early: a foe that spent its behaviour intent
 * is left with none, and the log says so (the projection drift guard runs over this scenario too).
 */
const intentOf = (s: BattleState, def: string) => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === def);
  return u?.kind === 'enemy' ? u.intent : undefined;
};

describe('a wipe mid-phase', () => {
  test('the Warden chalks, then a rat wipes the party: the Warden keeps no spent intent', () => {
    const s = board('j S r', { hp: { B1: 1 } });
    expect(intentOf(s, 'warden')?.kind).toBe('behaviour');
    const r = act(s, { type: 'endTurn' });
    expect(r.state.phase).toBe('lost');
    expect(intentOf(r.state, 'warden')).toBeNull();
    const types = r.events.map((e) => e.type);
    expect(types.indexOf('idle')).toBeGreaterThan(types.indexOf('lost'));
  });

  test('a plain wipe by the first of two foes is unchanged', () => {
    const s = board('r S r', { hp: { B1: 1 } });
    const r = act(s, { type: 'endTurn' });
    expect(r.state.phase).toBe('lost');
    expect(r.events.some((e) => e.type === 'idle')).toBe(false);
  });
});
