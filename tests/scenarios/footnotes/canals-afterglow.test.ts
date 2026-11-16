import { expect, test } from 'vitest';
import { type KindId, TUNING } from '$data';
import type { BattleState, Flow, Target } from '$engine';
import { type Ctx, type FootnoteIds, runDraft } from '$engine/ctx';
import { drift } from '$engine/current';
import { decayStates, landKind } from '$engine/mix';
import { flowFor, stateAt, tile, unitIn } from '../chemHarness';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { board } from '../harness';
import { step } from './castHelper';

/** FU-5b: Afterglow's margin lines `afterglow:cloud` and `afterglow:water` (canals.md, approved 2026-11-16). */

const glow = { auras: ['afterglow' as const] };

/** `lands` of the chemistry harness, with footnotes written. */
function lands(
  s: BattleState,
  steps: readonly (readonly [KindId, Target])[],
  over: Partial<Flow>,
  footnotes: FootnoteIds,
) {
  const flow = flowFor(s, over);
  return runDraft(
    s,
    (ctx: Ctx) => {
      for (const [kind, t] of steps) landKind(ctx, kind, t, flow);
    },
    { footnotes },
  );
}

// ── afterglow:cloud ──────────────────────────────────────

function cloudFacts(footnotes: FootnoteIds) {
  // Steam through Afterglow on an empty tile, then on the tile D stands on.
  const open = lands(board('D . . .'), [['steam', tile('C1')]], glow, footnotes);
  const held = lands(board('D . . .'), [['steam', tile('A1')]], glow, footnotes);
  const after = runDraft(held.state, (ctx: Ctx) => decayStates(ctx), { footnotes });
  // Oil lands later on a cloud Afterglow touched earlier, with no Afterglow of its own.
  const mixed = lands(open.state, [['oil', tile('C1')]], {}, footnotes);
  // A foe's bite at the unit in the cloud.
  const biteScene = lands(board('D r . .'), [['steam', tile('A1')]], glow, footnotes);
  const bitten = step(biteScene.state, { type: 'endTurn' }, footnotes);
  return {
    openRounds: stateAt(open.state, 'C1')?.rounds,
    heldRounds: stateAt(held.state, 'A1')?.rounds,
    heldAfter: stateAt(after.state, 'A1')?.rounds,
    openAfter: stateAt(
      runDraft(open.state, (ctx: Ctx) => decayStates(ctx), { footnotes }).state,
      'C1',
    )?.rounds,
    mixedGlow: stateAt(mixed.state, 'C1')?.afterglow === true,
    dodge: unitIn(held.state, 'A1').dodge,
    unharmed: bitten.events.find((e) => e.type === 'unharmed'),
    bitten: bitten.events.some((e) => e.type === 'damage'),
  };
}

test('FU-5b: afterglow:cloud with no variant is the built line', () => {
  const f = cloudFacts({});
  expect(f.openRounds).toBe(TUNING.cloudRounds);
  expect(f.heldRounds).toBe(TUNING.cloudRounds);
  expect(f.mixedGlow).toBe(false);
  expect(f.dodge).toBeUndefined();
  expect(f.bitten).toBe(true);
});

test('afterglow-cloud-thin: a plain cloud thins a round sooner, unless a unit of yours stands in it', () => {
  const f = cloudFacts(withFootnotes(['afterglow-cloud-thin']));
  expect(f.openRounds).toBe(TUNING.cloudRounds - 1);
  expect(f.heldRounds).toBe(TUNING.cloudRounds);
});

test('afterglow-cloud-store: the kept gift becomes the compound’s Afterglow', () => {
  const f = cloudFacts(withFootnotes(['afterglow-cloud-store']));
  expect(f.openRounds).toBe(TUNING.cloudRounds); // the cloud's own rounds stay
  expect(f.mixedGlow).toBe(true);
});

test('afterglow-cloud-steam: the unit in the cloud is missed by the next foe attack, once', () => {
  const f = cloudFacts(withFootnotes(['afterglow-cloud-steam']));
  expect(f.dodge).toBe('afterglow:cloud');
  expect(f.bitten).toBe(false);
  expect(f.unharmed).toMatchObject({ source: 'Bite', line: 'afterglow:cloud' });
});

test('afterglow-cloud-hold: a cloud does not thin while a unit of yours stands in it', () => {
  const f = cloudFacts(withFootnotes(['afterglow-cloud-hold']));
  expect(f.heldAfter).toBe(TUNING.cloudRounds); // D stands in it
  expect(f.openAfter).toBe(TUNING.cloudRounds - 1); // nobody does
});

test('FU-5b: fourCombos reads for every margin line (afterglow:cloud)', () => {
  const runs = fourCombos(
    'afterglow:cloud',
    ['afterglow-cloud-thin', 'afterglow-cloud-store'],
    ['afterglow-cloud-steam', 'afterglow-cloud-hold'],
    (c: Combo) => cloudFacts(c.footnotes),
  );
  const [thinSteam, thinHold, storeSteam, storeHold] = runs.map((r) => r.result);
  for (const r of [thinSteam, thinHold]) {
    expect(r?.openRounds).toBe(TUNING.cloudRounds - 1);
    expect(r?.heldRounds).toBe(TUNING.cloudRounds); // thin yields to a unit standing there
    expect(r?.mixedGlow).toBe(false);
  }
  for (const r of [storeSteam, storeHold]) {
    expect(r?.openRounds).toBe(TUNING.cloudRounds);
    expect(r?.mixedGlow).toBe(true);
  }
  // thin + hold: hold wins while someone stands in it; the cloud thins once they have left.
  expect(thinHold?.heldAfter).toBe(TUNING.cloudRounds);
  expect(thinHold?.openAfter).toBeUndefined();
  for (const r of [thinSteam, storeSteam]) {
    expect(r?.dodge).toBe('afterglow:cloud');
    expect(r?.bitten).toBe(false);
  }
  for (const r of [thinHold, storeHold]) {
    expect(r?.dodge).toBeUndefined();
    expect(r?.bitten).toBe(true);
  }
  expect(storeHold?.heldAfter).toBe(TUNING.cloudRounds);
});

// ── afterglow:water ──────────────────────────────────────

const glowing = (ctx: Ctx, l: string) => {
  const layer = stateAt(ctx.s, l);
  if (layer) layer.afterglow = true;
};

function waterFacts(footnotes: FootnoteIds) {
  // A glowing stain whose Afterglow is spent at round end, then carried on.
  const renewed = runDraft(
    board('w>{stain} w> w> . D'),
    (ctx: Ctx) => {
      glowing(ctx, 'A1');
      decayStates(ctx);
      drift(ctx);
    },
    { footnotes },
  );
  // A glowing stain at the lane's last tile, on the board's edge.
  const edge = runDraft(
    board('D . . w>{stain}'),
    (ctx: Ctx) => {
      glowing(ctx, 'D1');
      drift(ctx);
    },
    { footnotes },
  );
  // A glowing stain meeting a slick, and fire, that stay where they are.
  const meet = (what: string) =>
    runDraft(
      board(`w>{stain} w>${what} . D`),
      (ctx: Ctx) => {
        glowing(ctx, 'A1');
        drift(ctx);
      },
      { footnotes },
    );
  const slick = meet('o');
  const fire = meet('*');
  return {
    renewed: stateAt(renewed.state, 'B1')?.afterglow === true,
    edgeStays: stateAt(edge.state, 'D1')?.id === 'stain',
    edgeGlow: stateAt(edge.state, 'D1')?.afterglow === true,
    slickGlow: stateAt(slick.state, 'B1')?.afterglow === true,
    slickDrifts: slick.events.filter((e) => e.type === 'afterglowDrifts').length,
    fireGlow: stateAt(fire.state, 'B1')?.afterglow === true,
    fireDrifts: fire.events.filter((e) => e.type === 'afterglowDrifts').length,
    fireStill: stateAt(fire.state, 'B1')?.id,
  };
}

test('FU-5b: afterglow:water with no variant is the built line', () => {
  const f = waterFacts({});
  expect(f.renewed).toBe(false);
  expect(f.edgeStays).toBe(false);
  expect(f.slickGlow).toBe(false);
  expect(f.fireGlow).toBe(false);
});

test('afterglow-water-renew: a drifting stain is given its extra round again', () => {
  const f = waterFacts(withFootnotes(['afterglow-water-renew']));
  expect(f.renewed).toBe(true);
});

test('afterglow-water-anchor: a glowing stain stops at the edge and keeps its Afterglow (not at a slick)', () => {
  const f = waterFacts(withFootnotes(['afterglow-water-anchor']));
  expect(f.edgeStays).toBe(true);
  expect(f.edgeGlow).toBe(true);
  expect(f.slickGlow).toBe(false); // a slick is joined, not stopped at
});

test('afterglow-water-slick: a glowing stain gives the slick it meets its Afterglow', () => {
  const f = waterFacts(withFootnotes(['afterglow-water-slick']));
  expect(f.slickGlow).toBe(true);
  expect(f.slickDrifts).toBe(1);
  expect(f.fireGlow).toBe(false);
});

test('afterglow-water-fire: a glowing stain meeting fire is carried on, lit', () => {
  const f = waterFacts(withFootnotes(['afterglow-water-fire']));
  expect(f.fireGlow).toBe(true);
  expect(f.fireStill).toBe('fire');
  expect(f.fireDrifts).toBe(1);
  expect(f.slickGlow).toBe(false);
});

test('FU-5b: fourCombos reads for every margin line (afterglow:water)', () => {
  const runs = fourCombos(
    'afterglow:water',
    ['afterglow-water-renew', 'afterglow-water-anchor'],
    ['afterglow-water-slick', 'afterglow-water-fire'],
    (c: Combo) => waterFacts(c.footnotes),
  );
  const [renewSlick, renewFire, anchorSlick, anchorFire] = runs.map((r) => r.result);
  for (const r of [renewSlick, renewFire]) {
    expect(r?.renewed).toBe(true);
    expect(r?.edgeStays).toBe(false);
  }
  for (const r of [anchorSlick, anchorFire]) {
    expect(r?.renewed).toBe(false);
    expect(r?.edgeStays).toBe(true);
    expect(r?.slickDrifts).toBe(r === anchorSlick ? 1 : 0); // anchor + slick: the stain joins the slick
  }
  for (const r of [renewSlick, anchorSlick]) {
    expect(r?.slickGlow).toBe(true);
    expect(r?.fireGlow).toBe(false);
  }
  for (const r of [renewFire, anchorFire]) {
    expect(r?.fireGlow).toBe(true);
    expect(r?.slickGlow).toBe(false);
  }
});
