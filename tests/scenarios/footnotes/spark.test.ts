import { expect, test } from 'vitest';
import { type Dir, type GameEvent, parseLabel } from '$engine';
import { chargeTrip, markUnit } from '$engine/bursts';
import { type Ctx, runDraft } from '$engine/ctx';
import { decayStates, landKind } from '$engine/mix';
import { push } from '$engine/push';
import { tileAt } from '$engine/queries';
import { flowFor, heading, tile, unit } from '../chemHarness';
import { type Combo, fourCombos } from '../footnoteHarness';
import { board, unitAtLabel } from '../harness';

const at = (l: string) => parseLabel(l);
const hpOf = (s: Parameters<typeof unitAtLabel>[0], l: string) => unitAtLabel(s, l).hp;

test('spark:slick fourCombos: hot or long, then smoke or soot', () => {
  const ascii = 'D . . . .\n. . o . .\n. . . . .';
  const runs = fourCombos(
    'spark:slick',
    ['spark-slick-hot', 'spark-slick-long'],
    ['spark-slick-smoke', 'spark-slick-soot'],
    ({ footnotes }) => {
      const s = board(ascii);
      let rounds = 0;
      let events: GameEvent[] = [];
      const r = runDraft(
        s,
        (ctx: Ctx) => {
          landKind(ctx, 'spark', tile('C2'), flowFor(s));
          while (tileAt(ctx.s, at('C2')).state?.id === 'fire' && rounds < 6) {
            rounds++;
            decayStates(ctx);
          }
          events = ctx.log;
        },
        { footnotes },
      );
      return {
        rounds,
        after: tileAt(r.state, at('C2')).state?.id ?? null,
        fades: events.find((e) => e.type === 'stateFades' && e.line === 'spark:slick'),
      };
    },
  );
  const [hotSmoke, hotSoot, longSmoke, longSoot] = runs.map((r) => r.result);
  expect(hotSmoke?.rounds).toBe(2);
  expect(longSmoke?.rounds).toBe(3); // long delays the aftermath a round
  expect(hotSmoke?.after).toBe('cloud');
  expect(longSmoke?.after).toBe('cloud');
  expect(hotSoot?.after).toBe('blot');
  expect(longSoot?.after).toBe('blot');
  // The aftermath reads under the Spark's slick line.
  for (const r of [hotSmoke, hotSoot, longSmoke, longSoot]) expect(r?.fades).toBeDefined();
});

/** Spark on the marked B2, a mark that spread through the cloud B2-D2; B3 is beside B2 only. */
function detonation(combo: Combo) {
  const s = board('D . . . .\n. d~ d~ d~ .\n. d . . .');
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      markUnit(ctx, unitAtLabel(ctx.s, 'B2'), null);
      landKind(
        ctx,
        'spark',
        unit('dummy-1'),
        flowFor(s, { headings: new Map([heading(unit('dummy-1'), 'up')]) }),
      );
    },
    { footnotes: combo.footnotes },
  );
  const id = (l: string) => unitAtLabel(s, l).id;
  const of = (l: string) => r.state.units.find((u) => u.id === id(l));
  const taken = (l: string, source: string) =>
    r.events.flatMap((e) =>
      e.type === 'damage' && e.target.id === id(l) && e.source === source ? [e.amount] : [],
    );
  return {
    events: r.events,
    b2: { mark: of('B2')?.mark, pos: of('B2')?.pos, det: taken('B2', 'Detonation') },
    c2: { mark: of('C2')?.mark, det: taken('C2', 'Detonation') },
    d2: { mark: of('D2')?.mark, det: taken('D2', 'Detonation') },
    b3: taken('B3', 'Detonation'),
  };
}

test('spark:mark fourCombos: wide or keep, then chain or blast', () => {
  const runs = fourCombos(
    'spark:mark',
    ['spark-mark-wide', 'spark-mark-keep'],
    ['spark-mark-chain', 'spark-mark-blast'],
    detonation,
  );
  const [wideChain, wideBlast, keepChain, keepBlast] = runs.map((r) => r.result);
  // Every detonation burst is the spark:mark line's.
  for (const r of [wideChain, wideBlast, keepChain, keepBlast]) {
    expect(
      r?.events.filter((e) => e.type === 'burst' && e.burst === 'detonation'),
    ).not.toHaveLength(0);
    for (const e of r?.events ?? []) {
      if (e.type === 'burst' && e.burst === 'detonation') expect(e.line).toBe('spark:mark');
    }
  }
  // wide + blast: only B2 detonates: 3 to it, 1 to each neighbour (C2 and B3); B2 is knocked up.
  expect(wideBlast?.b2.det).toEqual([3]);
  expect(wideBlast?.b3).toEqual([1]);
  expect(wideBlast?.c2.det).toEqual([1]);
  expect(wideBlast?.d2.det).toEqual([]);
  expect(wideBlast?.b2.mark).toBeNull();
  expect(wideBlast?.b2.pos).toEqual({ x: 1, y: 0 });
  // keep + blast: 2 and the mark stays; no neighbours.
  expect(keepBlast?.b2.det).toEqual([2]);
  expect(keepBlast?.b2.mark).not.toBeNull();
  expect(keepBlast?.b3).toEqual([]);
  expect(keepBlast?.c2.det).toEqual([]);
  expect(keepBlast?.b2.pos).toEqual({ x: 1, y: 0 });
  // keep + chain: each copy deals 2 and keeps its mark; nobody moves.
  expect(keepChain?.b2.det).toEqual([2]);
  expect(keepChain?.c2.det).toEqual([2]);
  expect(keepChain?.d2.det).toEqual([2]);
  expect(keepChain?.c2.mark).not.toBeNull();
  expect(keepChain?.b2.pos).toEqual({ x: 1, y: 1 });
  // wide + chain: every copy detonates for 3 and splashes its neighbours.
  expect(wideChain?.c2.mark).toBeNull();
  expect(wideChain?.d2.mark).toBeNull();
  expect(wideChain?.c2.det).toContain(3);
  expect(wideChain?.d2.det).toContain(3);
  expect(wideChain?.b3).toEqual([1]);
});

test('spark:mark chain stays in the cloud: a copy outside it does not detonate', () => {
  const s = board('D . . . .\n. d~ d~ . d\n. . . . .');
  const footnotes = fourCombos(
    'spark:mark',
    ['spark-mark-wide', 'spark-mark-keep'],
    ['spark-mark-chain', 'spark-mark-blast'],
    (c) => c.footnotes,
  )[0]?.result;
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      markUnit(ctx, unitAtLabel(ctx.s, 'B2'), null);
      const far = unitAtLabel(ctx.s, 'E2');
      markUnit(ctx, far, null); // its own lineage, not a copy
      landKind(ctx, 'spark', unit('dummy-1'), flowFor(s));
    },
    { footnotes: footnotes ?? {} },
  );
  expect(unitAtLabel(r.state, 'E2').mark).not.toBeNull();
  expect(r.events.filter((e) => e.type === 'burst' && e.burst === 'detonation')).toHaveLength(2);
});

/** Spark on the plate at A2 (heading `down`), the brass runs A2-B2 and the collared sentry at C2. */
function conduct(combo: Combo) {
  const s = board('D . . . . .\n# # b d . .\n. . . . d .');
  const heads = new Map([heading(tile('A2'), 'down' as Dir)]);
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      landKind(ctx, 'spark', tile('A2'), flowFor(s, { headings: heads }));
      // The dummy at E3 is shoved left to D3, C3 and B3 (beside the plate B2).
      push(ctx, unitAtLabel(ctx.s, 'E3'), 'left', 3, null);
    },
    { footnotes: combo.footnotes },
  );
  const id = (l: string) => unitAtLabel(s, l).id;
  const of = (l: string) => r.state.units.find((u) => u.id === id(l));
  const taken = (l: string, source: string) =>
    r.events.flatMap((e) =>
      e.type === 'damage' && e.target.id === id(l) && e.source === source ? [e.amount] : [],
    );
  return {
    events: r.events,
    sentry: { conduct: taken('C2', 'Conduct'), pos: of('C2')?.pos },
    dummy: { conduct: taken('D2', 'Conduct'), pos: of('D2')?.pos },
    caster: taken('A1', 'Conduct'),
    mover: taken('E3', 'Charge'),
  };
}

test('spark:plate fourCombos: focus or spare, then jolt or charge', () => {
  const runs = fourCombos(
    'spark:plate',
    ['spark-plate-focus', 'spark-plate-spare'],
    ['spark-plate-jolt', 'spark-plate-charge'],
    conduct,
  );
  const [focusJolt, focusCharge, spareJolt, spareCharge] = runs.map((r) => r.result);
  // focus: 3 to the sentry standing on the brass; no one only beside it (dummy, caster).
  expect(focusJolt?.sentry.conduct).toEqual([3]);
  expect(focusJolt?.dummy.conduct).toEqual([]);
  expect(focusJolt?.caster).toEqual([]);
  // jolt: the sentry on the brass goes one tile down, along the heading.
  expect(focusJolt?.sentry.pos).toEqual({ x: 2, y: 2 });
  // spare: 1 to foes beside or on it, none to the apprentice (the caster at A1 touches the brass).
  expect(spareJolt?.sentry.conduct).toEqual([1]);
  expect(spareJolt?.dummy.conduct).toEqual([1]);
  expect(spareJolt?.caster).toEqual([]);
  expect(spareJolt?.dummy.pos).toEqual({ x: 3, y: 2 });
  // charge: the brass holds; the next unit to step beside it takes 1, once, under spark:plate.
  expect(focusCharge?.mover).toEqual([1]);
  expect(spareCharge?.mover).toEqual([1]);
  expect(focusCharge?.sentry.pos).toEqual({ x: 2, y: 1 });
  expect(
    focusCharge?.events.filter((e) => e.type === 'damage' && e.source === 'Charge'),
  ).toMatchObject([{ line: 'spark:plate', amount: 1 }]);
  // Without charge nothing waits on the brass.
  expect(focusJolt?.mover).toEqual([]);
});

test('spark-plate-spare: the charge it leaves passes over an apprentice', () => {
  const s = board('D . .\n# . .');
  const hp = (ctx: Ctx) => unitAtLabel(ctx.s, 'A1').hp;
  const both = fourCombos(
    'spark:plate',
    ['spark-plate-focus', 'spark-plate-spare'],
    ['spark-plate-jolt', 'spark-plate-charge'],
    (c) => c.footnotes,
  );
  const lose = (footnotes: Combo['footnotes']) => {
    let before = 0;
    const r = runDraft(
      s,
      (ctx: Ctx) => {
        landKind(ctx, 'spark', tile('A2'), flowFor(s));
        before = hp(ctx);
        chargeTrip(ctx, unitAtLabel(ctx.s, 'A1'), at('A1'));
      },
      { footnotes },
    );
    return before - unitAtLabel(r.state, 'A1').hp;
  };
  const focusCharge = both[1]?.result;
  const spareCharge = both[3]?.result;
  expect(lose(focusCharge ?? {})).toBe(1);
  expect(lose(spareCharge ?? {})).toBe(0);
});
