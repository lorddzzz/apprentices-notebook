import { describe, expect, test } from 'vitest';
import type { HabitId } from '$data';
import { type Aim, type BattleState, IllegalActionError, legalAims, parseLabel } from '$engine';
import { snapshotOf } from '$engine/resolve';
import { tallyCount } from '$engine/runes/flow';
import { castWith, fakes } from './fake-runes';
import { cast, expectLogIncludes, withLattices } from './harness';

/**
 * The lattice habits that bend a trigger or a source (actions-habits plan P11, P13, P16, P17;
 * party.md §2): the notary's `markTwice` (Tally), the tuner's `nearUnison` (Unison) and the
 * Copyist's `longTouch` (Touch). Each is given to the Draughtsman through the harness kits; the
 * same page cast without the habit behaves as it always has. Actions and Kinds are fakes.
 */

type Ev = { type: string; habit?: string; line?: string };
const kit = (habit: HabitId) => ({ kits: { draughtsman: { habit } } });
const triggered = (events: readonly Ev[]) => events.filter((e) => e.type === 'triggered');
const lines = (events: readonly Ev[]) => events.flatMap((e) => (e.line ? [e.line] : []));
const tile = (label: string): Aim => ({ kind: 'tile', at: parseLabel(label) });

describe('markTwice: a mark counts twice in Tally (P13)', () => {
  const page = { draughtsman: 'Bolt> Tally Strike' };

  test('one mark alone lets the rest through, and the verdict carries the habit', () => {
    const f = fakes();
    const r = castWith(f, withLattices('D . r!', page, kit('markTwice')), 'draughtsman', 'right');
    expect(f.calls).toEqual(['strike@C1']);
    expectLogIncludes(r.events, ['tally: the rest happens']);
    expect(triggered(r.events)).toEqual([expect.objectContaining({ habit: 'markTwice' })]);
    expect(lines(r.events)).toEqual([]);
  });

  test('without the habit the same page stops at one mark', () => {
    const f = fakes();
    const r = castWith(f, withLattices('D . r!', page), 'draughtsman', 'right');
    expect(f.calls).toEqual([]);
    expectLogIncludes(r.events, ['tally: the chain stops']);
    expect(triggered(r.events)[0]?.habit).toBeUndefined();
  });

  test('a Tally that passes anyway is not the habit at work', () => {
    const f = fakes();
    const r = castWith(f, withLattices('D . r!o', page, kit('markTwice')), 'draughtsman', 'right');
    expect(f.calls).toEqual(['strike@C1']);
    expect(triggered(r.events)[0]?.habit).toBeUndefined();
  });

  test('markTwice:deepMark: a deep mark is still one mark, so it counts 2, not 3', () => {
    const s = withLattices('D . r!!', page, kit('markTwice'));
    const rat = { kind: 'unit', unit: 'rat-1' } as const;
    expect(tallyCount(s, snapshotOf(s), rat, 2)).toBe(2);
    const f = fakes();
    const r = castWith(f, s, 'draughtsman', 'right');
    expect(f.calls).toEqual(['strike@C1']);
    expect(lines(r.events)).toEqual(['markTwice:deepMark']);
    expect(triggered(r.events)[0]).toMatchObject({
      habit: 'markTwice',
      line: 'markTwice:deepMark',
    });
  });

  test('marks on a tile target do not exist: an empty line still counts its states once', () => {
    const f = fakes();
    castWith(f, withLattices('D . . . i', page, kit('markTwice')), 'draughtsman', 'right');
    expect(f.calls).toEqual([]);
  });
});

describe('nearUnison: a cast beside the target counts (P16)', () => {
  const pages = { stoker: 'Bolt> Oil', draughtsman: 'Bolt> Unison Strike' };

  test('a landing on the tile beside the target lets the rest through', () => {
    // The Stoker's Bolt runs out at E1 (a tile target); the rat stands right below it at E2.
    const f = fakes();
    const first = castWith(
      f,
      withLattices('S . . . .\nD . . . r', pages, kit('nearUnison')),
      'stoker',
      'right',
    );
    expect(first.state.landed).toEqual([{ caster: 'stoker', targets: ['t:4,0'] }]);
    const r = castWith(f, first.state, 'draughtsman', 'right');
    expect(f.calls).toEqual(['oil@E1', 'strike@E2']);
    expectLogIncludes(r.events, ['unison: the rest happens']);
    expect(triggered(r.events)).toEqual([expect.objectContaining({ habit: 'nearUnison' })]);
    expect(lines(r.events)).toEqual([]);
  });

  test('without the habit the same two casts stop at Unison', () => {
    const f = fakes();
    const first = castWith(f, withLattices('S . . . .\nD . . . r', pages), 'stoker', 'right');
    const r = castWith(f, first.state, 'draughtsman', 'right');
    expect(f.calls).toEqual(['oil@E1']);
    expectLogIncludes(r.events, ['unison: the chain stops']);
  });

  test('nearUnison:unit: a unit entry counts where it stood when her cast began', () => {
    const board = 'S r . . .\n. r . . D';
    const f = fakes();
    const first = castWith(f, withLattices(board, pages, kit('nearUnison')), 'stoker', 'right');
    const r = castWith(f, first.state, 'draughtsman', 'left');
    expect(f.calls).toEqual(['oil@B1', 'strike@B2']);
    expect(triggered(r.events)[0]).toMatchObject({ habit: 'nearUnison', line: 'nearUnison:unit' });
  });

  test('a unit shoved away before her cast no longer stands beside the target', () => {
    const board = 'S r . . .\n. r . . D';
    const f = fakes();
    const first = castWith(
      f,
      withLattices(board, { ...pages, stoker: 'Bolt> Shove' }, kit('nearUnison')),
      'stoker',
      'right',
    );
    expect(first.state.units.find((u) => u.id === 'rat-1')?.pos).toEqual(parseLabel('C1'));
    castWith(f, first.state, 'draughtsman', 'left');
    expect(f.calls).toEqual(['shove@B1']);
  });

  test('a landing on the target itself is plain Unison, not the habit; diagonal is not beside', () => {
    const f = fakes();
    const first = castWith(
      f,
      withLattices('S . r . D', pages, kit('nearUnison')),
      'stoker',
      'right',
    );
    const r = castWith(f, first.state, 'draughtsman', 'left');
    expect(f.calls).toEqual(['oil@C1', 'strike@C1']);
    expect(triggered(r.events)[0]?.habit).toBeUndefined();

    const g = fakes();
    const diag = castWith(
      g,
      withLattices('S r . . .\n. . r . D', pages, kit('nearUnison')),
      'stoker',
      'right',
    );
    castWith(g, diag.state, 'draughtsman', 'left');
    expect(g.calls).toEqual(['oil@B1']);
  });

  test('a foe landing beside the target does not count', () => {
    const start = structuredClone(withLattices('. r . . .\nS r . . D', pages, kit('nearUnison')));
    start.landed.push({ caster: 'rat-1', targets: ['u:rat-1'] });
    const f = fakes();
    castWith(f, start, 'draughtsman', 'left');
    expect(f.calls).toEqual([]);
  });
});

describe('longTouch: Touch reaches two tiles away (P17)', () => {
  const page = { draughtsman: 'Touch> Strike' };
  const aimTiles = (s: BattleState) =>
    legalAims(s, 'draughtsman', '0,0').flatMap((a) => (a.kind === 'tile' ? [a.at] : []));

  test('she touches a rat two tiles away; the aim carries the habit and heads away from her', () => {
    const s = withLattices('. . . . .\n. . . . .\nD . r . .', page, kit('longTouch'));
    expect(aimTiles(s)).toEqual([
      parseLabel('A1'),
      parseLabel('A2'),
      parseLabel('B3'),
      parseLabel('C3'),
    ]);
    const f = fakes();
    const r = castWith(f, s, 'draughtsman', tile('C3'));
    expect(f.calls).toEqual(['strike@C3']);
    expectLogIncludes(r.events, ['Strike hits rat at C3 for 2']);
    const aimed = r.events.find((e) => e.type === 'aimed');
    expect(aimed).toMatchObject({ habit: 'longTouch', heading: 'right' });
    expect(lines(r.events)).toEqual([]);
  });

  test('without the habit Touch aims only beside her', () => {
    const s = withLattices('D . r', page);
    expect(aimTiles(s)).toEqual([parseLabel('B1')]);
    expect(() => cast(s, 'draughtsman', tile('C1'))).toThrow(IllegalActionError);
    const f = fakes();
    const r = castWith(f, s, 'draughtsman', tile('B1'));
    expect(r.events.find((e) => e.type === 'aimed')?.habit).toBeUndefined();
  });

  test('a Touch beside her is plain Touch even with the habit', () => {
    const f = fakes();
    const r = castWith(f, withLattices('D r .', page, kit('longTouch')), 'draughtsman', tile('B1'));
    expect(f.calls).toEqual(['strike@B1']);
    expect(r.events.find((e) => e.type === 'aimed')?.habit).toBeUndefined();
  });

  test('longTouch:unit: it reaches past a unit in between, where Bolt would stop', () => {
    const f = fakes();
    const r = castWith(f, withLattices('D S r', page, kit('longTouch')), 'draughtsman', tile('C1'));
    expect(f.calls).toEqual(['strike@C1']);
    expect(lines(r.events)).toEqual(['longTouch:unit']);
  });

  test('longTouch:cloud: it reaches past a cloud in between', () => {
    const f = fakes();
    const r = castWith(f, withLattices('D ~ r', page, kit('longTouch')), 'draughtsman', tile('C1'));
    expect(f.calls).toEqual(['strike@C1']);
    expect(r.events.find((e) => e.type === 'aimed')).toMatchObject({
      habit: 'longTouch',
      line: 'longTouch:cloud',
    });
  });

  test('it never reaches over a tile that blocks units (the reach rule, P3)', () => {
    const s = withLattices('D = r', page, kit('longTouch'));
    expect(aimTiles(s)).toEqual([parseLabel('B1')]);
    expect(() => cast(s, 'draughtsman', tile('C1'))).toThrow(IllegalActionError);
  });
});
