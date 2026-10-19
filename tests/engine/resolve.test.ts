import { describe, expect, test } from 'vitest';
import {
  type BattleState,
  type Dir,
  type Flow,
  type GameEvent,
  parseLabel,
  type Step,
  type Target,
  targetKey,
} from '$engine';
import { runDraft } from '$engine/ctx';
import { runStep, snapshotOf, withSeams } from '$engine/resolve';
import { forkSide } from '$engine/runes/flow';
import { castWith, fakes } from '../scenarios/fake-runes';
import { withLattices } from '../scenarios/harness';

/**
 * The pipeline's own bookkeeping (plan §2.4): the flow each rune receives, Seep and Toll, the
 * nesting guard, the trace and the `landed` record. The Actions and Kinds are fakes.
 */

describe('what a rune receives', () => {
  test('Lay sets the flow for what comes after it, not before', () => {
    const f = fakes();
    castWith(
      f,
      withLattices('D . r', { draughtsman: 'Bolt> Oil Lay Oil' }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['oil@C1', 'oil@C1:lay']);
    expect(f.flows.map((fl) => fl.lay)).toEqual([false, true]);
  });

  test('a Lay in one Fork branch does not leak into the other', () => {
    const f = fakes();
    castWith(
      f,
      withLattices('. r .\nD r .\n. r .', {
        draughtsman: '. Oil .\n. Lay .\nBolt> Fork .\n. Oil .',
      }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['oil@B1:lay', 'oil@B3']);
  });

  test('the gift follows the step, not the cast', () => {
    // The Stoker is gifted in the Seam: Oil (Seam) is gifted, Sentence (Contracts) is not.
    const stoker = fakes();
    castWith(
      stoker,
      withLattices('D . r\nS . .', { stoker: 'Bolt> Oil Sentence' }),
      'stoker',
      'up',
    );
    expect(stoker.flows.map((fl) => fl.gifted)).toEqual([true, false]);
    // The Draughtsman is the other way round.
    const draughtsman = fakes();
    castWith(
      draughtsman,
      withLattices('D . r', { draughtsman: 'Bolt> Oil Sentence' }),
      'draughtsman',
      'right',
    );
    expect(draughtsman.flows.map((fl) => fl.gifted)).toEqual([false, true]);
  });

  test('a step receives the auras that touch it', () => {
    const f = fakes();
    castWith(
      f,
      withLattices('D . r', { draughtsman: '. Afterglow .\nBolt> Oil Spark' }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['oil@C1', 'spark@C1']);
    expect(f.flows.map((fl) => fl.auras)).toEqual([['afterglow'], []]);
  });

  test('every rune sees the same snapshot, taken before the Source acted', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('D . r', { draughtsman: 'Bolt> Oil Spark' }),
      'draughtsman',
      'right',
    );
    const [first, second] = f.flows;
    expect(first?.snapshot).toBe(second?.snapshot);
    // The board has changed by now; the snapshot has not.
    expect(r.state.tiles[2]?.state?.id).toBe('fire');
    expect(first?.snapshot.tiles[2]?.state).toBeNull();
  });
});

describe('shapes', () => {
  test('Seep at a corner: the tile, then the neighbours that are on the board', () => {
    const f = fakes();
    castWith(
      f,
      withLattices('D . . . .\n. . . . .', { draughtsman: 'Bolt> Seep Oil' }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['oil@E1', 'oil@D1', 'oil@E2']);
  });

  test('Seep around a unit: the unit, then the four tiles, none twice', () => {
    const f = fakes();
    castWith(
      f,
      withLattices('. . . . .\n. . . . .\nD . r . .\n. . . . .', { draughtsman: 'Bolt> Seep Oil' }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['oil@C3', 'oil@C2', 'oil@B3', 'oil@D3', 'oil@C4']);
  });

  test('Toll: the target, then the rest of its network', () => {
    const f = fakes();
    f.net = (_s, at) => [at, { x: at.x + 1, y: at.y }, { x: at.x + 2, y: at.y }];
    castWith(
      f,
      withLattices('D . r . . .', { draughtsman: 'Bolt> Toll Oil' }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['oil@C1', 'oil@D1', 'oil@E1']);
  });

  test('a Fork after a Seep forks every target; a side off the board is dropped', () => {
    const f = fakes();
    castWith(
      f,
      withLattices('. . . . .\n. . . . .\nD . r . .\n. . . . .', {
        draughtsman: '. . Strike\nBolt> Seep Fork\n. . Oil',
      }),
      'draughtsman',
      'right',
    );
    // Targets C3 (the rat), C2, B3, D3, C4; heading right, so left is up and right is down.
    // C4's right side is off the board; the left Strike kills the rat on C3, so C2's right side
    // (that rat) has dropped out by the time the right branch runs (R7).
    expect(f.calls).toEqual([
      ...['C2', 'C1', 'B2', 'D2', 'C3'].map((c) => `strike@${c}`),
      ...['C4', 'B4', 'D4'].map((c) => `oil@${c}`),
    ]);
  });

  test('forkSide drops a duplicate: the first target in order wins', () => {
    const start = withLattices('. . . .\n. . . .\n. . . .', {});
    const a = { kind: 'tile', at: parseLabel('C1') } as const;
    const b = { kind: 'tile', at: parseLabel('B2') } as const;
    const headings = new Map<string, Dir | null>([
      [targetKey(a), 'up'], // its left is B1
      [targetKey(b), 'right'], // its left is B1 too
    ]);
    const left = forkSide(start, [a, b], headings, 'left');
    expect(left.targets).toEqual([{ kind: 'tile', at: parseLabel('B1') }]);
    expect(left.headings.get(targetKey(left.targets[0] as Target))).toBe('up');
  });
});

describe('the nesting guard', () => {
  /** A one-step tree and a flow to run it with, by hand (what an invention's parts get). */
  function run(depth: number): { events: GameEvent[]; calls: string[] } {
    const f = fakes();
    const start = withLattices('D . r', { draughtsman: 'Bolt> Oil' });
    const spell = start.units.find((u) => u.kind === 'member')?.spells[0];
    const first: Step | null = spell?.first ?? null;
    const r = withSeams(f.seams, () =>
      runDraft(start, (ctx) => {
        const flow: Flow = {
          caster: 'draughtsman',
          origin: { caster: 'draughtsman', spell: 'x', cast: 1 },
          snapshot: snapshotOf(ctx.s),
          headings: new Map([['t:2,0', 'right']]),
          lay: false,
          gifted: false,
          solvent: null,
          habit: null,
          depth,
          auras: [],
        };
        runStep(ctx, first, [{ kind: 'tile', at: parseLabel('C1') }], flow);
      }),
    );
    return { events: r.events, calls: f.calls };
  }

  test('one level of nesting runs', () => {
    expect(run(1).calls).toEqual(['oil@C1']);
  });

  test('a second level fizzles', () => {
    const r = run(2);
    expect(r.calls).toEqual([]);
    expect(r.events).toEqual([{ type: 'fizzles', reason: 'depth' }]);
  });
});

describe('the record of a cast', () => {
  test('trace: the cells that fired, and one span per step with its own events', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('D . r', { draughtsman: 'Bolt> Oil Spark' }),
      'draughtsman',
      'right',
    );
    const castAt = r.events.findIndex((e) => e.type === 'cast');
    const trace = r.events.find((e) => e.type === 'trace');
    if (trace?.type !== 'trace') throw new Error('no trace');
    expect(trace.cells.map((c) => c.rune)).toEqual(['bolt', 'oil', 'spark']);
    expect(trace.meaningful).toBe(true);
    expect(trace.spans).toHaveLength(3);
    const base = castAt + 1;
    const stretch = (i: number): string[] =>
      r.events
        .slice(base + (trace.spans[i]?.from ?? 0), base + (trace.spans[i]?.to ?? 0))
        .map((e) => e.type);
    expect(stretch(0)).toEqual(['aimed', 'lands']); // the Source: aiming and the flight
    expect(stretch(1)).toEqual(['landed']); // Oil
    expect(stretch(2)).toEqual(['damage', 'landed']); // Spark
    expect(trace.spans[1]?.from).toBe(trace.spans[0]?.to);
    expect(trace.spans[2]?.from).toBe(trace.spans[1]?.to);
  });

  test('landed: every target any step touched, once, for Unison', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('. r .\nD r .\n. r .', { draughtsman: '. Strike .\nBolt> Fork .\n. Oil .' }),
      'draughtsman',
      'right',
    );
    expect(r.state.landed).toEqual([
      { caster: 'draughtsman', targets: ['u:rat-2', 'u:rat-1', 'u:rat-3'] },
    ]);
  });

  test('a jar opened later runs the rest as a cast of its own, with a fresh snapshot', () => {
    const f = fakes();
    const sealed = castWith(
      f,
      withLattices('D . r', { draughtsman: 'Bolt> Ink Jar Spark Oil' }),
      'draughtsman',
      'right',
    );
    const jar = f.jars[0]?.jar;
    if (!jar) throw new Error('no jar');
    const g = fakes();
    let landed: BattleState['landed'] = [];
    const later = withSeams(g.seams, () =>
      runDraft(sealed.state, (ctx) => {
        const flow: Flow = {
          caster: jar.owner,
          origin: jar.origin,
          snapshot: snapshotOf(ctx.s),
          headings: new Map([['t:2,0', jar.heading]]),
          lay: false,
          gifted: false,
          solvent: null,
          habit: null,
          depth: 0,
          auras: [],
        };
        runStep(ctx, jar.rest, [{ kind: 'unit', unit: 'rat-1' }], flow);
        landed = ctx.s.landed;
      }),
    );
    expect(g.calls).toEqual(['spark@C1', 'oil@C1']);
    expect(later.events.map((e) => e.type)).toContain('damage');
    expect(landed.at(-1)).toEqual({ caster: 'draughtsman', targets: ['u:rat-1'] });
  });
});
