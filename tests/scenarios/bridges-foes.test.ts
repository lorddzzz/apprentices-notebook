import { describe, expect, test } from 'vitest';
import { behaviourPreview } from '$engine/behaviours';
import { crackedSet } from '$engine/districts/bridges/preview';
import type { BattleState, EnemyUnit } from '$engine/types';
import { intentPhrase } from '../../src/app/describe';
import { act, board, expectLogIncludes, parseLabel } from './harness';

/**
 * BR-5 scenarios: the Warden's chalk circle (j) and the Gargoyle's carry (y) on the span rule.
 * `_` is fog, `{pier}` and `{span}` the bridge pieces. The first intent is planned where the foes
 * stand (round 1 telegraphs without moving), and `endTurn` resolves it.
 */

const at = parseLabel;
const foe = (s: BattleState, def: string): EnemyUnit => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === def);
  if (u?.kind !== 'enemy') throw new Error(`no ${def}`);
  return u;
};
const tg = (e: EnemyUnit) => (e.intent?.kind === 'behaviour' ? e.intent.telegraph : null);
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((v) => v.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

describe('the Warden: chalk circle', () => {
  test('telegraphs the apprentice in line within 3, then holds her through the next turn', () => {
    const s = board('S . j . . .');
    expect(tg(foe(s, 'warden'))).toEqual({ label: 'chalk', tiles: [at('A1')], units: ['stoker'] });
    expect(intentPhrase(s, foe(s, 'warden'))).toContain('chalk circle on A1');
    expect(behaviourPreview(s)).toEqual([
      { kind: 'outline', cells: [at('A1')], label: 'held' },
      { kind: 'pulse', at: at('A1') },
    ]);
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Stoker is held']);
    // 2 on resolve, 1 left at the party's turn: she can't walk
    expect(unit(r.state, 'stoker').held).toBe(1);
    expect(() => act(r.state, { type: 'move', unit: 'stoker', to: at('B1') })).toThrow();
  });

  test('range 3 only: four tiles off it walks into line instead', () => {
    const s = board('S . . . j . .');
    expect(foe(s, 'warden').intent).toBeNull();
    const r = act(s, { type: 'endTurn' });
    expect(foe(r.state, 'warden').pos).toEqual(at('D1'));
    expect(tg(foe(r.state, 'warden'))?.label).toBe('chalk');
  });

  test('a victim who stepped off the tile is missed', () => {
    const s = board('S . j . . .');
    const m = act(s, { type: 'move', unit: 'stoker', to: at('B1') });
    const r = act(m.state, { type: 'endTurn' });
    expect(unit(r.state, 'stoker').held).toBe(0);
    expectLogIncludes(r.events, ['Chalk circle hits nothing']);
  });

  test('reads the cracked set: the one on a cracked tile is chalked before the nearer one', () => {
    // No pier: the span at G1 is cracked. Stoker (B1) is nearer than Draughtsman (G1).
    const s = board('. S . j . . D{span}');
    expect(crackedSet(s).map((c) => `${c.x},${c.y}`)).toEqual(['6,0']);
    expect(tg(foe(s, 'warden'))?.units).toEqual(['draughtsman']);
    const plain = board('. S . j . . D');
    expect(tg(foe(plain, 'warden'))?.units).toEqual(['stoker']);
  });

  test('chalk holds a unit on a cracked tile through the fall', () => {
    const s = board('{pier} _ {span} {span} S{span} j\n. . . . . .\nD . . . . .');
    expect(crackedSet(s).map((c) => `${c.x},${c.y}`)).toEqual(['2,0', '3,0', '4,0']);
    expect(tg(foe(s, 'warden'))?.tiles[0]).toEqual(at('E1'));
    const r = act(s, { type: 'endTurn' });
    const lines = r.lines;
    const held = lines.findIndex((l) => l.includes('Stoker is held'));
    const fall = lines.findIndex((l) => /falls|fall/i.test(l));
    expect(held).toBeGreaterThanOrEqual(0);
    expect(fall).toBeGreaterThan(held);
  });

  test('a supported span: chalk still holds, nothing falls', () => {
    const s = board('{pier} {span} S{span} . j');
    expect(crackedSet(s)).toEqual([]);
    const r = act(s, { type: 'endTurn' });
    expect(unit(r.state, 'stoker').held).toBe(1);
    expect(r.events.some((e) => e.type === 'bridges:collapse')).toBe(false);
  });
});

describe('the Gargoyle: carry', () => {
  // The Stoker stands on B1 (sound); D1 is cut off by the fog at C1 and cracked; y beside her.
  const CARRY = '{pier} S{span} _ {span} {span}\n. y . . .\n. . . . D';

  test('names the apprentice and the cracked tile it will set her on, and shows it', () => {
    const s = board(CARRY);
    expect(tg(foe(s, 'gargoyle'))).toEqual({
      label: 'carry',
      tiles: [at('B1'), at('D1')],
      units: ['stoker'],
    });
    expect(intentPhrase(s, foe(s, 'gargoyle'))).toContain('carry B1 to D1');
    expect(behaviourPreview(s)).toEqual([
      { kind: 'ghost', unit: 'stoker', from: at('B1'), to: at('D1') },
      { kind: 'tile', at: at('D1'), tone: 'warn' },
      { kind: 'pulse', at: at('D1') },
    ]);
  });

  test('resolves through the carry arrival: moved with cause carry, then she falls at dusk', () => {
    const s = board(CARRY);
    const r = act(s, { type: 'endTurn' });
    const moved = r.events.find((e) => e.type === 'moved' && e.cause === 'carry');
    expect(moved).toMatchObject({ from: at('B1'), to: at('D1') });
    expect(r.events.some((e) => e.type === 'bridges:collapse')).toBe(true);
  });

  test('a held apprentice refuses: Hold after the telegraph cancels the carry', () => {
    const s = structuredClone(board(CARRY));
    unit(s, 'stoker').held = 1;
    const r = act(s, { type: 'endTurn' });
    expect(r.events.some((e) => e.type === 'moved' && e.cause === 'carry')).toBe(false);
    expect(r.events.some((e) => e.type === 'held')).toBe(true);
    expect(unit(r.state, 'stoker').pos).toEqual(at('B1'));
  });

  test('a held apprentice is not chosen at all', () => {
    const s = structuredClone(board(CARRY));
    unit(s, 'stoker').held = 1;
    const r = act(s, { type: 'endTurn' });
    expect(tg(foe(r.state, 'gargoyle'))).toBeNull();
  });

  test('a victim who walked away is missed', () => {
    const s = board(CARRY);
    const m = act(s, { type: 'move', unit: 'stoker', to: at('A1') });
    const r = act(m.state, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Carry hits nothing']);
    expect(unit(r.state, 'stoker').pos).toEqual(at('A1'));
  });

  test('a flier is not dropped: the gargoyle over a falling span stays', () => {
    const s = board('{pier} _ {span} y{span} .\n. . . . .');
    const r = act(s, { type: 'endTurn' });
    expect(r.events.some((e) => e.type === 'bridges:collapse')).toBe(true);
    expect(foe(r.state, 'gargoyle').hp).toBeGreaterThan(0);
    expect(foe(r.state, 'gargoyle').pos).toEqual(at('D1'));
  });
});
