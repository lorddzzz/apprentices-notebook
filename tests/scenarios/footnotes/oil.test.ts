import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { memberById, parseLabel } from '$engine';
import { type Ctx, runDraft } from '$engine/ctx';
import { decayStates, landKind } from '$engine/mix';
import { moveMember } from '$engine/movement';
import { tileAt } from '$engine/queries';
import { flowFor, heading, tile } from '../chemHarness';
import { type Combo, fourCombos } from '../footnoteHarness';
import { board } from '../harness';

const at = (l: string) => parseLabel(l);

/** Oil on the slick C2 heading right, a blot at C3: the pool, then its aftermath. */
function poolLine(combo: Combo) {
  const s = board('D . . . .\n. . o . .\n. . i . .');
  let pool: { id?: string; rounds?: number } = {};
  let blotSide: string | null = null;
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      const heads = new Map([heading(tile('C2'), 'right')]);
      landKind(ctx, 'oil', tile('C2'), flowFor(s, { headings: heads }));
      const layer = tileAt(ctx.s, at('C2')).state;
      pool = { id: layer?.id, rounds: layer?.rounds };
      blotSide = tileAt(ctx.s, at('C3')).state?.id ?? null;
      for (let i = 0; i < 4 && tileAt(ctx.s, at('C2')).state?.id === 'pool'; i++) decayStates(ctx);
    },
    { footnotes: combo.footnotes },
  );
  const id = (l: string) => tileAt(r.state, at(l)).state?.id ?? null;
  return {
    pool,
    diagonals: ['B1', 'D1', 'B3', 'D3'].map(id),
    ahead: id('E2'),
    blotSide,
    after: id('C2'),
    fade: r.events.findLast((e) => e.type === 'stateFades')?.line,
  };
}

test('oil:slick fourCombos: corners or short, then lane or seep', () => {
  const runs = fourCombos(
    'oil:slick',
    ['oil-slick-corners', 'oil-slick-short'],
    ['oil-slick-lane', 'oil-slick-seep'],
    poolLine,
  );
  const [cornLane, cornSeep, shortLane, shortSeep] = runs.map((r) => r.result);
  for (const r of [cornLane, cornSeep]) {
    expect(r?.diagonals).toEqual(['slick', 'slick', 'slick', 'slick']);
    expect(r?.pool).toMatchObject({ id: 'pool', rounds: TUNING.compoundRounds });
    expect(r?.after).toBeNull(); // a full pool clears bare
  }
  for (const r of [shortLane, shortSeep]) {
    expect(r?.diagonals).toEqual([null, null, null, null]);
    expect(r?.pool).toMatchObject({ id: 'pool', rounds: TUNING.compoundRounds - 1 });
    expect(r?.after).toBe('blot'); // the short pool leaves a blot
    expect(r?.fade).toBe('oil:slick');
  }
  // lane: one more tile ahead; seep: the neighbouring blot becomes a stain.
  for (const r of [cornLane, shortLane]) {
    expect(r?.ahead).toBe('slick');
    expect(r?.blotSide).toBe('slick');
  }
  for (const r of [cornSeep, shortSeep]) {
    expect(r?.ahead).toBeNull();
    expect(r?.blotSide).toBe('stain');
  }
});

/** Oil on the cloud B2-D2, then fog fading, then a member walking into fog. */
function fogLine(combo: Combo) {
  const { footnotes } = combo;
  const s = board('D . . . .\n. ~ ~ ~ .');
  let fogRounds = 0;
  const r = runDraft(
    s,
    (ctx: Ctx) => {
      landKind(ctx, 'oil', tile('B2'), flowFor(s));
      fogRounds = tileAt(ctx.s, at('B2')).state?.rounds ?? 0;
    },
    { footnotes },
  );
  const sd = board('D . . . .\n. {fog} {fog} . .');
  const rd = runDraft(
    sd,
    (ctx: Ctx) => {
      const live = () => ['B2', 'C2'].some((l) => tileAt(ctx.s, at(l)).state?.id === 'greaseFog');
      for (let i = 0; i < 6 && live(); i++) decayStates(ctx);
    },
    { footnotes },
  );
  const sw = board('D {fog} . .');
  const rw = runDraft(
    sw,
    (ctx: Ctx) => moveMember(ctx, memberById(ctx.s, 'draughtsman'), at('B1')),
    { footnotes },
  );
  return {
    states: ['B2', 'C2', 'D2'].map((l) => tileAt(r.state, at(l)).state?.id ?? null),
    fogRounds,
    drip: ['B2', 'C2'].map((l) => tileAt(rd.state, at(l)).state?.id ?? null),
    dripLine: rd.events.find((e) => e.type === 'landed' && e.makes === 'slick')?.line,
    slipped: memberById(rw.state, 'draughtsman').pos.x,
    slipLine: rw.events.find((e) => e.type === 'push')?.line,
  };
}

test('oil:cloud fourCombos: wide or long, then drip or slip', () => {
  const runs = fourCombos(
    'oil:cloud',
    ['oil-cloud-wide', 'oil-cloud-long'],
    ['oil-cloud-drip', 'oil-cloud-slip'],
    fogLine,
  );
  const [wideDrip, wideSlip, longDrip, longSlip] = runs.map((r) => r.result);
  // wide greases the whole cloud; long (alone) greases one tile but keeps it a round longer.
  for (const r of [wideDrip, wideSlip]) {
    expect(r?.states).toEqual(['greaseFog', 'greaseFog', 'greaseFog']);
    expect(r?.fogRounds).toBe(TUNING.compoundRounds);
  }
  for (const r of [longDrip, longSlip]) {
    expect(r?.states).toEqual(['greaseFog', 'cloud', 'cloud']);
    expect(r?.fogRounds).toBe(TUNING.compoundRounds + 1);
  }
  // drip: a slick where each fog faded; slip: a walker stepping into fog slides one more tile.
  for (const r of [wideDrip, longDrip]) {
    expect(r?.drip).toEqual(['slick', 'slick']);
    expect(r?.dripLine).toBe('oil:cloud');
    expect(r?.slipped).toBe(1);
  }
  for (const r of [wideSlip, longSlip]) {
    expect(r?.drip).toEqual([null, null]);
    expect(r?.slipped).toBe(2);
    expect(r?.slipLine).toBe('oil:cloud');
  }
});
