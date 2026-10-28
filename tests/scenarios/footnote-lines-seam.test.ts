import { describe, expect, test } from 'vitest';
import type { LineId } from '$data';
import { type BattleState, type GameEvent, parseLabel } from '$engine';
import { act, cast, unitAtLabel, withLattices } from './harness';

/**
 * FN-9: the audited Seam lines for Splash, Touch, Fork, Strike and Guard (footnotes audit FN-1A).
 * Each test plays the row's firing case and checks the line sits on the event it should.
 */

const at = parseLabel;
const tile = (label: string) => ({ kind: 'tile' as const, at: at(label) });
const lineOf = (events: readonly GameEvent[], type: GameEvent['type']): LineId | undefined =>
  events.find((e) => e.type === type)?.line;
const withType = (events: readonly GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type);
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

describe('Splash', () => {
  test('splash-unit: tiles point outward from the centre, so a Shove scatters the units', () => {
    const s = withLattices('. . . . . . .\nD . r r r . .\n. . . . . . .', {
      draughtsman: 'Splash> Shove',
    });
    const r = cast(s, 'draughtsman', tile('D2'));
    expect(lineOf(r.events, 'aimed')).toBe('splash:unit');
    expect(unit(r.state, 'rat-1').pos).toEqual(at('B2'));
    expect(unit(r.state, 'rat-3').pos).toEqual(at('F2'));
  });

  test('splash-noHeading: aimed at your own tile, the centre and corners have no way to point', () => {
    const s = withLattices('. . .\n. D .\n. r .', { draughtsman: 'Splash> Shove' });
    const r = cast(s, 'draughtsman', tile('B2'));
    expect(lineOf(r.events, 'aimed')).toBe('splash:noHeading');
    expect(r.lines).toContain('Shove hits nothing');
    expect(unit(r.state, 'rat-1').pos).toEqual(at('B3'));
  });

  test('splash-member: you can stand inside your own Splash and are struck like anyone', () => {
    const s = withLattices('D . .\n. . r\n. . .', { draughtsman: 'Splash> Strike' });
    const hp = unit(s, 'draughtsman').hp;
    const r = cast(s, 'draughtsman', tile('B1'));
    expect(lineOf(r.events, 'aimed')).toBe('splash:member');
    expect(unit(r.state, 'draughtsman').hp).toBeLessThan(hp);
  });

  test('splash-edge: near the edge the 3x3 is clipped to the board', () => {
    const s = withLattices('. . . D\n. . . .\n. . . .', { draughtsman: 'Splash> Strike' });
    const r = cast(s, 'draughtsman', tile('A1'));
    expect(lineOf(r.events, 'aimed')).toBe('splash:edge');
    const aimed = r.events.find((e) => e.type === 'aimed');
    expect(aimed?.type === 'aimed' && aimed.targets).toHaveLength(4);
  });
});

describe('Touch', () => {
  test('touch-member: on yourself it points the way of your last step', () => {
    const s = withLattices('D . . . r', { draughtsman: 'Touch> Shove' });
    const moved = act(s, { type: 'move', unit: 'draughtsman', to: at('C1') });
    const r = cast(moved.state, 'draughtsman', { kind: 'self' });
    expect(lineOf(r.events, 'aimed')).toBe('touch:member');
    expect(unitAtLabel(r.state, 'D1').id).toBe('draughtsman');
  });

  test('touch-unit: on a neighbouring unit it points away from you, so a Fork takes its sides', () => {
    const s = withLattices('. r .\nD r .\n. r .', {
      draughtsman: '. Strike\nTouch> Fork\n. Strike',
    });
    const r = cast(s, 'draughtsman', tile('B2'));
    expect(lineOf(r.events, 'aimed')).toBe('touch:unit');
    const hp = (id: string) => unit(r.state, id).hp;
    expect(hp('rat-1')).toBeLessThan(hp('rat-2'));
    expect(hp('rat-3')).toBeLessThan(hp('rat-2'));
  });
});

describe('Strike and Guard', () => {
  test('strike-empty: a Strike on a tile nobody stands on says it hit nothing', () => {
    const s = withLattices('D . . . . .', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right');
    const miss = withType(r.events, 'miss').find((e) => e.line === 'strike:empty');
    expect(miss).toBeDefined();
    expect(r.lines).toContain('Strike hits nothing');
  });

  test('strike-empty-once: a Splash Strike over empty floor misses once, not per tile', () => {
    const s = withLattices('D . . . .\n. . . . .\n. . . . .', { draughtsman: 'Splash> Strike' });
    const r = cast(s, 'draughtsman', tile('D2'));
    expect(withType(r.events, 'miss').filter((e) => e.line === 'strike:empty')).toHaveLength(1);
  });

  test('strike-empty-quiet: a Strike that finds someone does not miss', () => {
    const s = withLattices('D . r . . .', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.some((e) => e.line === 'strike:empty')).toBe(false);
  });

  test('guard-empty: a Guard on a tile nobody stands on says it did nothing', () => {
    const s = withLattices('D . . . . .', { draughtsman: 'Bolt> Guard' });
    const r = cast(s, 'draughtsman', 'right');
    expect(withType(r.events, 'miss').some((e) => e.line === 'guard:empty')).toBe(true);
  });

  test('guard-empty-quiet: a Splash Guard over your party misses nothing', () => {
    const s = withLattices('D S .\n. . .\n. . .', { draughtsman: 'Splash> Guard' });
    const r = cast(s, 'draughtsman', tile('A2'));
    expect(r.events.some((e) => e.line === 'guard:empty')).toBe(false);
  });
});

describe('Fork', () => {
  const fork = (shape: string) => `. ${shape}\nBolt> Fork\n. ${shape}`;

  test('fork-edge: a branch that would leave the room is dropped and says so', () => {
    const s = withLattices('D . r .\n. . . .\n. . . .', { draughtsman: fork('Strike') });
    const r = cast(s, 'draughtsman', 'right');
    expect(withType(r.events, 'miss').some((e) => e.line === 'fork:edge')).toBe(true);
    expect(r.lines).toContain('Fork hits nothing');
  });

  test('fork-edge-quiet: a Fork with both sides on the board does not miss', () => {
    const s = withLattices('. . .\nD . r\n. . .', { draughtsman: fork('Strike') });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.some((e) => e.line === 'fork:edge')).toBe(false);
  });

  test('fork-unit: a branch keeps the spell heading, so a Shove pushes along the line', () => {
    const s = withLattices('. . r .\nD . r .\n. . r .', { draughtsman: fork('Shove') });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.some((e) => e.line === 'fork:unit')).toBe(true);
    expect(unit(r.state, 'rat-1').pos).toEqual(at('D1'));
    expect(unit(r.state, 'rat-3').pos).toEqual(at('D3'));
  });

  test('fork-unit-quiet: with nobody on a side the branch has no unit and no line', () => {
    const s = withLattices('. . .\nD . r\n. . .', { draughtsman: fork('Shove') });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.some((e) => e.line === 'fork:unit')).toBe(false);
  });
});
