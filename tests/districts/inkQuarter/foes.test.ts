import { describe, expect, test } from 'vitest';
import { type BattleState, unitAt } from '$engine';
import { candidatesOf } from '$engine/ai';
import { dealDamage } from '$engine/damage';
import { spendMark } from '$engine/marks';
import { intentPhrase } from '../../../src/app/describe';
import {
  act,
  board,
  draft,
  expectLog,
  expectLogIncludes,
  parseLabel,
} from '../../scenarios/harness';

/**
 * The postal staff (ink-quarter plan P8; IQ-5a): the dead letter's delivery and its blot, the
 * Sorter's forwarding and its fizzle, and both foes keeping off the return stamp. Tokens: `x` the
 * dead letter, `u` the Sorter.
 */

const at = parseLabel;
const foe = (s: BattleState, def: string) => {
  const u = s.units.find((v) => v.kind === 'enemy' && v.def === def);
  if (!u || u.kind !== 'enemy') throw new Error(`no ${def}`);
  return u;
};
const stateAt = (s: BattleState, lbl: string) =>
  s.tiles[at(lbl).y * s.width + at(lbl).x]?.state?.id;
const hpOf = (s: BattleState, id: string) => s.units.find((u) => u.id === id)?.hp;

describe('the dead letter', () => {
  test('delivery: beside its addressee it is addressed, then bursts for 2 and leaves a blot', () => {
    const s = board('S x . .', { hp: { A1: 6 } });
    expect(intentPhrase(s, foe(s, 'deadLetter'))).toBe(
      'will deliver to Stoker and burst for 2 (1st)',
    );
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, [
      'dead letter at B1 bursts',
      'dead letter at B1 dies',
      'ink lands at B1 as blot',
      'Dead letter hits Stoker for 2',
    ]);
    expect(hpOf(r.state, 'stoker')).toBe(4);
    expect(stateAt(r.state, 'B1')).toBe('blot');
    expect(foe(r.state, 'deadLetter').hp).toBe(0);
  });

  test('flies at the nearest apprentice, two tiles a round, and is only addressed beside them', () => {
    const s = board('S . . . x', { hp: { A1: 6 } });
    expect(foe(s, 'deadLetter').intent).toBeNull();
    const r = act(s, { type: 'endTurn' });
    expect(unitAt(r.state, at('C1'))?.def).toBe('deadLetter');
    expect(foe(r.state, 'deadLetter').intent).toBeNull(); // two away: no address yet
    const r2 = act(r.state, { type: 'endTurn' });
    expect(unitAt(r2.state, at('B1'))?.def).toBe('deadLetter');
    expect(foe(r2.state, 'deadLetter').intent).toMatchObject({
      kind: 'behaviour',
      id: 'inkQuarter:deadLetter',
      telegraph: { label: 'deliver', units: ['stoker'] },
    });
  });

  test('an addressee shoved out of reach is not delivered to: it hits nothing and lives on', () => {
    const s = board('S x . . .', { hp: { A1: 6 } });
    const gone = structuredClone(s);
    const stoker = gone.units.find((u) => u.id === 'stoker');
    if (!stoker) throw new Error('board');
    stoker.pos = at('D1');
    const r = act(gone, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Dead letter hits nothing']);
    expect(hpOf(r.state, 'stoker')).toBe(6);
    expect(foe(r.state, 'deadLetter').hp).toBe(1);
  });

  test('a kill leaves a blot on its tile and nothing else', () => {
    const s = board('S x . .');
    const r = draft(s, (ctx) => {
      dealDamage(ctx, foe(ctx.s, 'deadLetter'), 1, 'Strike');
    });
    expectLog(r.events, [
      'Strike hits dead letter at B1 for 1',
      'dead letter at B1 dies',
      'ink lands at B1 as blot',
    ]);
    expect(stateAt(r.state, 'B1')).toBe('blot');
    expect(hpOf(r.state, 'stoker')).toBe(hpOf(s, 'stoker')); // a death is not a delivery
  });

  test('fire kills it too, and the blot is left on the burning tile', () => {
    const s = board('S x . .');
    const r = draft(s, (ctx) => {
      dealDamage(ctx, foe(ctx.s, 'deadLetter'), 1, 'Fire');
    });
    expect(stateAt(r.state, 'B1')).toBe('blot');
  });
});

describe('the Sorter', () => {
  test('forwards the mark on a foe onto the apprentice (Lift-style move)', () => {
    const s = board('S u . d!', { hp: { A1: 6 } });
    expect(intentPhrase(s, foe(s, 'sorter'))).toBe(
      'will forward the mark on dummy D1 to Stoker (1st)',
    );
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['the mark moves from dummy at D1 to Stoker']);
    expect(r.state.units.find((u) => u.id === 'stoker')?.mark).not.toBeNull();
    expect(r.state.units.find((u) => u.id === 'dummy-1')?.mark).toBeNull();
  });

  test('forwards its own mark when it is the nearest marked foe', () => {
    const s = board('S u! . d!');
    expect(foe(s, 'sorter').intent).toMatchObject({
      telegraph: { label: 'forward', units: ['sorter-1', 'stoker'] },
    });
  });

  test('fizzles when the mark is spent before it resolves', () => {
    const s = board('S u . d!');
    const spent = draft(s, (ctx) => spendMark(ctx, foe(ctx.s, 'dummy'))).state;
    const r = act(spent, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Forwarding hits nothing']);
    expect(r.state.units.find((u) => u.id === 'stoker')?.mark).toBeNull();
    expect(r.lines.some((l) => l.includes('the mark moves'))).toBe(false);
  });

  test('fizzles when the apprentice is marked meanwhile (the mark stays where it is)', () => {
    const s = board('S u . d!');
    const marked = board('S! u . d!');
    const swapped = structuredClone(s);
    const stoker = swapped.units.find((u) => u.id === 'stoker');
    const theirs = marked.units.find((u) => u.id === 'stoker');
    if (!stoker || !theirs) throw new Error('board');
    stoker.mark = theirs.mark;
    const r = act(swapped, { type: 'endTurn' });
    expectLogIncludes(r.events, ['Forwarding hits nothing']);
    expect(r.state.units.find((u) => u.id === 'dummy-1')?.mark).not.toBeNull();
  });

  test('with no mark to forward it files a 1-damage hit at an adjacent apprentice', () => {
    const s = board('S u . .', { hp: { A1: 6 } });
    expect(intentPhrase(s, foe(s, 'sorter'))).toBe('will file Stoker for 1 (1st)');
    const r = act(s, { type: 'endTurn' });
    expectLogIncludes(r.events, ['File hits Stoker for 1']);
    expect(hpOf(r.state, 'stoker')).toBe(5);
  });

  test('a file at an apprentice no longer beside it hits nothing', () => {
    const s = board('S u . .', { hp: { A1: 6 } });
    const away = structuredClone(s);
    const stoker = away.units.find((u) => u.id === 'stoker');
    if (!stoker) throw new Error('board');
    stoker.pos = at('D1');
    const r = act(away, { type: 'endTurn' });
    expectLogIncludes(r.events, ['File hits nothing']);
  });
});

describe('stamp avoidance (D7)', () => {
  const corridor = (token: string) => board(`S . . {return} ${token}`);
  const walker = (s: BattleState, def: string) => candidatesOf(s, foe(s, def), true);

  test.each([
    ['deadLetter', 'x'],
    ['sorter', 'u'],
  ])('%s never ends a walk on the return stamp', (def, token) => {
    const s = corridor(token);
    expect(walker(s, def).map((c) => `${c.at.x},${c.at.y}`)).not.toContain('3,0');
    const r = act(s, { type: 'endTurn' });
    const end = foe(r.state, def).pos;
    expect(end).toEqual(at('C1'));
    expect(r.lines.some((l) => l.includes('returns'))).toBe(false);
  });
});
