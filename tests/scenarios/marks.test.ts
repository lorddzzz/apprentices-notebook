import { describe, expect, test } from 'vitest';
import {
  type BattleState,
  type Coord,
  type Dir,
  type GameEvent,
  parseLabel,
  type Unit,
} from '$engine';
import { arrive } from '$engine/arrival';
import type { Ctx } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { applyMark, expireMark, liftMark, spendMark } from '$engine/marks';
import { landKind } from '$engine/mix';
import { push } from '$engine/push';
import type { Bound, Mark, Origin, Target } from '$engine/types';
import { flowFor, type Run, run, unit as unitTarget } from './chemHarness';
import { board } from './harness';

/** Design D5, §6.4 limits 2, 3, 6 and plan P29–P31: marks spread through clouds and release on their event. */

const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };
const bound = (
  action: Bound['action'],
  event: Bound['event'],
  heading: Dir | null = null,
): Bound => ({ action, event, solvent: null, heading });
const find = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const mark = (b: Bound | null = null, over: Partial<Mark> = {}): Omit<Mark, 'lineage'> => ({
  deep: false,
  bound: b,
  origin: ORIGIN,
  ...over,
});
const count = (events: readonly GameEvent[], type: GameEvent['type']): number =>
  events.filter((e) => e.type === type).length;
const reachedOf = (s: BattleState, lineage: number): string[] => s.lineages[lineage]?.reached ?? [];
const marked = (s: BattleState): string[] => s.units.filter((u) => u.mark).map((u) => u.id);
const tileOf = (lbl: string): Target => ({ kind: 'tile', at: parseLabel(lbl) });
const hitFor = (
  ctx: Ctx,
  id: string,
  amount: number,
  from: Coord | null,
  heading: Dir | null = null,
) => dealDamage(ctx, find(ctx.s, id), amount, 'test', [], { heading, at: from });
const mark1 = (ctx: Ctx, b: Bound | null = null, id = 'rat-1') =>
  applyMark(ctx, find(ctx.s, id), mark(b));

describe('spreading (P29)', () => {
  test('mark-spreads-once-per-lineage', () => {
    const s = board('D . . .\nr~ r~ r~ . r');
    const first = run(s, (ctx) => mark1(ctx));
    expect(marked(first.state).sort()).toEqual(['rat-1', 'rat-2', 'rat-3']);
    expect(count(first.events, 'markSpread')).toBe(1);
    const lineage = find(first.state, 'rat-1').mark?.lineage as number;
    expect(find(first.state, 'rat-3').mark?.lineage).toBe(lineage);
    expect([...reachedOf(first.state, lineage)].sort()).toEqual(['rat-1', 'rat-2', 'rat-3']);

    // rat-2's copy is spent; the lineage has reached rat-2 already, so it is not copied again.
    const again = run(first.state, (ctx) => {
      spendMark(ctx, find(ctx.s, 'rat-2'));
      arrive(ctx, 'rat-1', [{ x: 0, y: 1 }], { cause: 'push', origin: null, landing: true });
    });
    expect(marked(again.state).sort()).toEqual(['rat-1', 'rat-3']);
    expect(count(again.events, 'markSpread')).toBe(0);
  });

  test('entering a cloud spreads the mark', () => {
    const s = board('D . . . .\nr . ~ r~ r~');
    const outside = run(s, (ctx) => mark1(ctx));
    expect(marked(outside.state)).toEqual(['rat-1']);
    const r = run(outside.state, (ctx) => {
      const rat = find(ctx.s, 'rat-1');
      arrive(ctx, rat.id, [{ x: 2, y: 1 }], { cause: 'push', origin: null, landing: true });
    });
    expect(count(r.events, 'markSpread')).toBe(1);
    expect(marked(r.state)).toHaveLength(3);
  });

  test('allies are marked too, and a unit with its own mark keeps it', () => {
    const s = board('r~ D~ r~');
    const own = run(s, (ctx) => applyMark(ctx, find(ctx.s, 'rat-2'), mark(null, { deep: true })));
    const r = run(own.state, (ctx) => mark1(ctx));
    expect(marked(r.state).sort()).toEqual(['draughtsman', 'rat-1', 'rat-2']);
    expect(find(r.state, 'rat-2').mark?.deep).toBe(true);
  });

  test('wax-never-spreads', () => {
    const s = board('D . .\nr~ r~ r~');
    const r = run(s, (ctx) => applyMark(ctx, find(ctx.s, 'rat-1'), mark(null, { wax: true })));
    expect(marked(r.state)).toEqual(['rat-1']);
    expect(count(r.events, 'markSpread')).toBe(0);
  });
});

describe('release (limit 2, P30, P31)', () => {
  test('recoil-spreads-through-brand-cloud', () => {
    // A mark bound with Shove on hit lands in a Brand cloud and spreads; a Spark storm then hits
    // everyone in the cloud and each copy shoves its bearer.
    const s = board('D . . . . .\n{brand} r{brand} r{brand} r{brand} . .', {
      hp: { B2: 9, C2: 9, D2: 9 },
    });
    const r = run(s, (ctx) => {
      mark1(ctx, bound('shove', 'hit', 'right'));
      landKind(ctx, 'spark', tileOf('A2'), flowFor(ctx.s));
    });
    expect(count(r.events, 'markSpread')).toBe(1);
    expect(count(r.events, 'released')).toBe(3);
    expect(count(r.events, 'markSpent')).toBe(3);
    expect(marked(r.state)).toEqual([]);
    expect(count(r.events, 'crush')).toBeGreaterThan(0); // the shoves crush the packed rats
  });

  test('copy-releases-once', () => {
    const s = board('D . . .\nr~ r~ r~ . .\n. . . . .');
    const spread = run(s, (ctx) => mark1(ctx, bound('shove', 'hit', 'down')));
    const r = run(spread.state, (ctx) => {
      hitFor(ctx, 'rat-2', 1, null);
      hitFor(ctx, 'rat-2', 1, null); // the copy is gone: nothing more to release
    });
    expect(count(r.events, 'released')).toBe(1);
    expect(marked(r.state).sort()).toEqual(['rat-1', 'rat-3']);
    expect(find(r.state, 'rat-1').mark?.bound?.action).toBe('shove');
  });

  test('release-heading-from-hit', () => {
    const base = board('. . . .\n. r . .\n. . . D');
    const release = (from: Coord | null, bind: Dir | null, heading: Dir | null = null) =>
      run(base, (ctx) => {
        mark1(ctx, bound('shove', 'hit', bind));
        hitFor(ctx, 'rat-1', 1, from, heading);
      });
    const pushOf = (r: Run) => r.events.find((e) => e.type === 'push');
    // From a tile to the west: shoved east.
    expect(pushOf(release({ x: 0, y: 1 }, 'up'))).toMatchObject({ dir: 'right' });
    // An effect with its own heading wins.
    expect(pushOf(release({ x: 0, y: 1 }, 'up', 'down'))).toMatchObject({ dir: 'down' });
    // No effect heading and no tile: the binding cast's heading.
    expect(pushOf(release(null, 'up'))).toMatchObject({ dir: 'up' });
  });

  test('anchor-on-pushed', () => {
    const s = board('D . . . .\nr . . . .');
    const r = run(s, (ctx) => {
      mark1(ctx, bound('hold', 'pushed'));
      push(ctx, find(ctx.s, 'rat-1'), 'right', 2, ORIGIN);
    });
    expect(count(r.events, 'released')).toBe(1);
    expect(find(r.state, 'rat-1').mark).toBeNull();
    expect(find(r.state, 'rat-1').held).toBeGreaterThan(0);
  });

  test('enters releases when the bearer steps in, dies releases on its tile', () => {
    const s = board('D . . .\nr . . .');
    const e = run(s, (ctx) => {
      mark1(ctx, bound('guard', 'enters'));
      arrive(ctx, 'rat-1', [{ x: 0, y: 1 }], { cause: 'push', origin: null, landing: true });
    });
    expect(count(e.events, 'released')).toBe(1);
    const d = run(s, (ctx) => {
      mark1(ctx, bound('guard', 'dies', 'up'));
      hitFor(ctx, 'rat-1', 99, null);
    });
    expect(count(d.events, 'released')).toBe(1);
  });

  test('transfer-hands-mark-back', () => {
    // The foe's bound mark moves to the member; it keeps what it holds and who bound it.
    const s = board('. D r . .');
    const placed = run(s, (ctx) => mark1(ctx, bound('shove', 'hit', 'right')));
    const r = run(placed.state, (ctx) => {
      expect(liftMark(ctx, find(ctx.s, 'rat-1'), find(ctx.s, 'draughtsman'))).toBe(true);
      hitFor(ctx, 'draughtsman', 1, { x: 4, y: 0 });
    });
    expect(count(r.events, 'markLifted')).toBe(1);
    expect(find(r.state, 'rat-1').mark).toBeNull();
    expect(r.events.find((e) => e.type === 'released')).toMatchObject({
      unit: { id: 'draughtsman' },
      origin: ORIGIN,
    });
    // Hit from the east: the member is shoved west.
    expect(r.events.find((e) => e.type === 'push')).toMatchObject({ dir: 'left' });
  });

  test('bound-in-bound-depth-limit', () => {
    // Each shove crushes the next marked rat, whose own mark releases in turn: three deep, no more.
    const s = board('D . . . . . .\nr r r r r r .');
    const r = run(s, (ctx) => {
      for (const id of ['rat-1', 'rat-2', 'rat-3', 'rat-4', 'rat-5']) {
        mark1(ctx, bound('shove', 'hit', 'right'), id);
      }
      hitFor(ctx, 'rat-1', 1, { x: 0, y: 1 });
    });
    expect(count(r.events, 'released')).toBeLessThanOrEqual(3);
    expect(r.events.some((e) => e.type === 'fizzles' && e.reason === 'depth')).toBe(true);
  });

  test('detonation-spends-without-release', () => {
    const s = board('D . . .\nr!');
    const r = run(s, (ctx) => {
      // The Spark's own hit would release a hit-bound mark first; this one waits to be pushed.
      find(ctx.s, 'rat-1').mark = { ...mark(bound('hold', 'pushed')), lineage: 0 };
      landKind(ctx, 'spark', unitTarget('rat-1'), flowFor(ctx.s));
    });
    expect(count(r.events, 'released')).toBe(0);
    expect(find(r.state, 'rat-1').held).toBe(0);
    expect(r.events.find((e) => e.type === 'markSpent')).toMatchObject({ released: false });
    expect(find(r.state, 'rat-1').mark).toBeNull();
  });

  test('expiry-does-not-release', () => {
    const s = board('D . . .\nr . . .');
    const expired = run(s, (ctx) => {
      mark1(ctx, bound('shove', 'hit', 'right'));
      expireMark(ctx, find(ctx.s, 'rat-1'));
      hitFor(ctx, 'rat-1', 1, { x: 0, y: 1 });
    });
    expect(count(expired.events, 'released')).toBe(0);
    // Replacing a mark spends the old one without release.
    const replaced = run(s, (ctx) => {
      mark1(ctx, bound('shove', 'hit', 'right'));
      mark1(ctx);
    });
    expect(count(replaced.events, 'released')).toBe(0);
    expect(find(replaced.state, 'rat-1').mark?.bound).toBeNull();
  });

  test('moving-mark-keeps-lifetime', () => {
    const s = board('D . . .\nr r~ r~ .');
    const placed = run(s, (ctx) => mark1(ctx, bound('shove', 'hit', 'right')));
    const before = find(placed.state, 'rat-1').mark as Mark;
    const reached = [...reachedOf(placed.state, before.lineage)];
    const r = run(placed.state, (ctx) => {
      // rat-2 stands in a cloud with rat-3, but a lifted mark does not spread.
      expect(liftMark(ctx, find(ctx.s, 'rat-1'), find(ctx.s, 'rat-2'))).toBe(true);
    });
    expect(find(r.state, 'rat-2').mark).toMatchObject({
      lineage: before.lineage,
      origin: ORIGIN,
      bound: before.bound,
    });
    expect(find(r.state, 'rat-1').mark).toBeNull();
    expect(reachedOf(r.state, before.lineage)).toEqual([...reached, 'rat-2']);
    expect(marked(r.state)).toEqual(['rat-2']);
    expect(count(r.events, 'markSpread')).toBe(0);
  });
});
