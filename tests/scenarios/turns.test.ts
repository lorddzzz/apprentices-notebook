import { describe, expect, test } from 'vitest';
import {
  type Action,
  applyAction,
  type BattleState,
  createBattle,
  describeLog,
  IllegalActionError,
  parseLabel,
  tileAt,
} from '$engine';
import { act, board, expectLogIncludes, unitAtLabel } from './harness';

/** The turn loop: intent resolution, hazards, round advance, enemy phase. */

const endTurn: Action = { type: 'endTurn' };
const tile = (s: BattleState, lbl: string) => tileAt(s, parseLabel(lbl));

describe('intents resolve', () => {
  test('bite resolves', () => {
    const r = act(board('r D'), endTurn);
    expectLogIncludes(r.events, [
      'Enemies act',
      'rat at A1 bites right',
      'Bite hits Draughtsman for 1',
    ]);
    expect(unitAtLabel(r.state, 'B1').hp).toBe(5);
  });

  test('spit damages and inks', () => {
    const r = act(board('f D'), endTurn);
    expectLogIncludes(r.events, [
      'familiar at A1 spits right',
      'Spit hits Draughtsman for 1',
      'Draughtsman is inked',
    ]);
  });

  test('spit that lands on empty floor leaves a puddle', () => {
    const r = act(board('f . . . D', { intents: { A1: 'right' } }), endTurn);
    expectLogIncludes(r.events, [
      'familiar at A1 spits right',
      'Spit lands at C1',
      'ink pools at C1',
    ]);
  });

  test('spit into steam diffuses through the cloud', () => {
    const r = act(board('f . ~ r~ . D', { intents: { A1: 'right' } }), endTurn);
    expectLogIncludes(r.events, [
      'familiar at A1 spits right',
      'Spit is stopped by the steam at C1',
      'ink diffuses through the steam at C1',
      'rat at D1 is inked',
    ]);
  });

  test('a line stopped by a brass plate stays stopped', () => {
    const r = act(board('b = D', { intents: { A1: 'right' } }), endTurn);
    expectLogIncludes(r.events, [
      'sentry at A1 fires right',
      'Line is stopped by the brass plate at B1',
    ]);
    expect(unitAtLabel(r.state, 'C1').hp).toBe(6);
  });

  test('a bite at nothing misses', () => {
    const r = act(board('r . D', { intents: { A1: 'down' } }), endTurn);
    expectLogIncludes(r.events, ['rat at A1 bites down']);
    expect(describeLog(r.events)).toContain('Bite hits nothing');
  });

  test('sentry-steam-block: steam stops the line', () => {
    const r = act(board('b . ~ . D', { intents: { A1: 'right' } }), endTurn);
    expectLogIncludes(r.events, [
      'Enemies act',
      'sentry at A1 fires right',
      'Line is stopped by the steam at C1',
    ]);
    expect(unitAtLabel(r.state, 'E1').hp).toBe(6);
  });

  test('sentry-steam-block control: without steam the line hits', () => {
    const r = act(board('b . . . D', { intents: { A1: 'right' } }), endTurn);
    expectLogIncludes(r.events, [
      'Enemies act',
      'sentry at A1 fires right',
      'Line hits Draughtsman for 2',
    ]);
  });

  test('shove moves the intent', () => {
    const s = board('. . . . .\nb . . . D\nS . . . .', { intents: { A2: 'right' } });
    const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'up' });
    const r = act(shoved.state, endTurn);
    expectLogIncludes(r.events, ['sentry at A1 fires right', 'Line lands at E1']);
    expect(unitAtLabel(r.state, 'E2').hp).toBe(6);
  });

  test('attacks hit whoever stands there', () => {
    const s = board('. r .\nr . .\nS . .', { intents: { A2: 'right' } });
    const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'up' });
    const r = act(shoved.state, endTurn);
    expectLogIncludes(r.events, ['rat at A1 bites right', 'Bite hits rat at B1 for 1']);
    const hit = r.events.find((e) => e.type === 'damage');
    expect(hit?.type === 'damage' && hit.hpLeft).toBe(1);
  });

  test('intents resolve in order and clear', () => {
    const r = act(board('r D r'), endTurn);
    expectLogIncludes(r.events, [
      'Enemies act',
      'rat at A1 bites right',
      'Bite hits Draughtsman for 1',
      'rat at C1 bites left',
      'Bite hits Draughtsman for 1',
    ]);
  });

  test('a dead enemy does not resolve its intent', () => {
    // The first rat's bite kills the (1 hp) second rat before it can act.
    const s = board('r r D', { intents: { A1: 'right', B1: 'right' }, hp: { B1: 1 } });
    const r = act(s, endTurn);
    expectLogIncludes(r.events, [
      'rat at A1 bites right',
      'Bite hits rat at B1 for 1',
      'rat at B1 dies',
    ]);
    expect(describeLog(r.events)).not.toContain('rat at B1 bites right');
  });
});

describe('hazards', () => {
  test('fire burns for 2 rounds', () => {
    const first = act(board('D . d*'), endTurn);
    expectLogIncludes(first.events, ['Enemies act', 'Fire hits dummy at C1 for 1']);
    expect(tile(first.state, 'C1').fire).toBe(1);
    const second = act(first.state, endTurn);
    expectLogIncludes(second.events, ['Fire hits dummy at C1 for 1', 'the fire at C1 burns out']);
    expect(tile(second.state, 'C1').fire).toBe(0);
    expect(tile(second.state, 'C1').oil).toBe(false);
  });

  test('fire that kills the last enemy wins the battle', () => {
    const r = act(board('D . r*'), endTurn);
    expectLogIncludes(r.events, [
      'Fire hits rat at C1 for 2 (oil-soaked +1)',
      'rat at C1 dies',
      'The party wins',
    ]);
    expect(r.state.phase).toBe('won');
    expect(describeLog(r.events)).not.toContain('Round 2');
  });

  test('steam lasts 2 rounds', () => {
    const first = act(board('D d ~'), endTurn);
    expect(describeLog(first.events).some((l) => l.includes('fades'))).toBe(false);
    expect(tile(first.state, 'C1').steam).toBe(1);
    const second = act(first.state, endTurn);
    expectLogIncludes(second.events, ['the steam at C1 fades']);
    expect(tile(second.state, 'C1').steam).toBe(0);
  });

  test('vent refills steam', () => {
    const first = act(board('D d @'), endTurn);
    expectLogIncludes(first.events, ['the vent at C1 puffs steam']);
    expect(tile(first.state, 'C1').steam).toBe(2);
    const second = act(first.state, endTurn);
    expect(describeLog(second.events)).not.toContain('the vent at C1 puffs steam');
    const third = act(second.state, endTurn);
    expectLogIncludes(third.events, ['the steam at C1 fades', 'the vent at C1 puffs steam']);
    expect(tile(third.state, 'C1').steam).toBe(2);
  });

  test('a vent puts out fire on its tile', () => {
    const r = act(board('D d *@'), endTurn);
    expectLogIncludes(r.events, ['the vent at C1 puffs steam', 'steam puts out the fire at C1']);
    expect(tile(r.state, 'C1').fire).toBe(0);
    expect(tile(r.state, 'C1').oil).toBe(true);
  });
});

describe('the round', () => {
  test('the round advances with enemies moving, then the party', () => {
    const r = act(board('D d'), endTurn);
    expect(describeLog(r.events)).toEqual([
      'Enemies act',
      'Round 2',
      'Enemies move',
      'dummy at B1 waits',
      'Your turn',
    ]);
    expect(r.state.round).toBe(2);
  });

  test('members reset each round', () => {
    const s = board('D d .\n. . .');
    const shoved = act(s, { type: 'shove', unit: 'draughtsman', dir: 'right' }).state;
    const moved = act(shoved, { type: 'move', unit: 'draughtsman', to: { x: 0, y: 1 } }).state;
    const d = unitAtLabel(moved, 'A2');
    expect(d.kind === 'member' && [d.moved, d.acted]).toEqual([true, true]);
    const after = act(moved, endTurn).state;
    const m = unitAtLabel(after, 'A2');
    expect(m.kind === 'member' && [m.moved, m.acted, m.undo]).toEqual([false, false, null]);
  });

  test('party wipe', () => {
    const s = board('b . D\nb . .', { hp: { C1: 1 }, intents: { A1: 'right', A2: 'right' } });
    const r = act(s, endTurn);
    expect(describeLog(r.events)).toEqual([
      'Enemies act',
      'sentry at A1 fires right',
      'Line hits Draughtsman for 2',
      'Draughtsman is down',
      'The party is wiped out',
    ]);
    expect(r.state.phase).toBe('lost');
  });

  test('no actions once the battle is over', () => {
    const lost = act(board('r D', { hp: { B1: 1 } }), endTurn).state;
    expect(lost.phase).toBe('lost');
    expect(() => applyAction(lost, endTurn)).toThrow(IllegalActionError);
  });

  test('an enemy killed by its own oil trail ends the battle in the enemy phase', () => {
    // The rat's trail touches the fire at A2, ignites under it, and burns it to death.
    const r = act(board('r . D\n* . .', { hp: { A1: 1 } }), endTurn);
    expectLogIncludes(r.events, [
      'rat at A1 moves to B1',
      'oil coats A1, B1',
      'oil at A1 ignites, fire spreads to B1',
      'Fire hits rat at B1 for 2 (oil-soaked +1)',
      'rat at B1 dies',
      'The party wins',
    ]);
    expect(r.state.phase).toBe('won');
  });

  test('applyAction never mutates the input', () => {
    const s = board('r . D\n. . .');
    const snapshot = structuredClone(s);
    act(s, endTurn);
    expect(s).toEqual(snapshot);
  });

  test('determinism: same board + same actions give identical logs', () => {
    const play = () => {
      let s = createBattle({
        title: 'det',
        seed: 7,
        board: 'r . . f . .\n. . . . r .\nb . . . . .\n. D . . S .',
      }).state;
      const lines: string[] = [];
      for (let i = 0; i < 4 && s.phase === 'player'; i++) {
        const r = act(s, endTurn);
        s = r.state;
        lines.push(...r.lines);
      }
      return lines;
    };
    expect(play()).toEqual(play());
    expect(play().length).toBeGreaterThan(20);
  });
});
