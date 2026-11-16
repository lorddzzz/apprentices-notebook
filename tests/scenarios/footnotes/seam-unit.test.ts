import { expect, test } from 'vitest';
import { type KindId, TUNING } from '$data';
import type { BattleState, Target } from '$engine';
import { type Ctx, type FootnoteIds, runDraft } from '$engine/ctx';
import { decayStates, landKind } from '$engine/mix';
import { damages, flowFor, stateAt, tile, unit, unitIn } from '../chemHarness';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { board } from '../harness';
import { step } from './castHelper';

/** FN-M2b: the margin lines `steam:unit` and `brass:unit` (seam.md §9, approved 2026-11-16). */

function land(
  s: BattleState,
  steps: readonly (readonly [KindId, Target])[],
  footnotes: FootnoteIds,
  after?: (ctx: Ctx) => void,
) {
  const flow = flowFor(s);
  return runDraft(
    s,
    (ctx: Ctx) => {
      for (const [kind, t] of steps) landKind(ctx, kind, t, flow);
      after?.(ctx);
    },
    { footnotes },
  );
}

// ── steam:unit ───────────────────────────────────────────

function steamFacts(footnotes: FootnoteIds) {
  // Steam aimed at D, with a rat beside it and a free tile below.
  const under = land(board('D r . .\n. . . .'), [['steam', tile('A1')]], footnotes);
  const bite = step(under.state, { type: 'endTurn' }, footnotes);
  // A marked D with a rat standing in a cloud beside it.
  const wet = land(board('D! r~ . .'), [['steam', tile('A1')]], footnotes);
  return {
    rounds: stateAt(under.state, 'A1')?.rounds,
    below: stateAt(under.state, 'A2'),
    ratTile: stateAt(under.state, 'B1'),
    dodge: unitIn(under.state, 'A1').dodge,
    unharmed: bite.events.find((e) => e.type === 'unharmed'),
    bitten: bite.events.some((e) => e.type === 'damage'),
    ratMarked: unitIn(wet.state, 'B1').mark !== null,
  };
}

test('FN-M2b: steam:unit with no variant is the built line', () => {
  const f = steamFacts({});
  expect(f.rounds).toBe(TUNING.cloudRounds);
  expect(f.below).toBeNull();
  expect(f.dodge).toBeUndefined();
  expect(f.bitten).toBe(true);
  expect(f.ratMarked).toBe(false);
});

test('steam-unit-ring: the empty tiles beside the unit are clouded for one round', () => {
  const f = steamFacts(withFootnotes(['steam-unit-ring']));
  expect(f.below).toMatchObject({ id: 'cloud', rounds: 1 });
  expect(f.ratTile).toBeNull(); // a tile with a unit on it is not empty
});

test('steam-unit-lift: a cloud landed under a unit lasts one round longer', () => {
  expect(steamFacts(withFootnotes(['steam-unit-lift'])).rounds).toBe(TUNING.cloudRounds + 1);
});

test('steam-unit-hide: the first foe attack on the unit in the cloud misses, once', () => {
  const f = steamFacts(withFootnotes(['steam-unit-hide']));
  expect(f.dodge).toBe('steam:unit');
  expect(f.bitten).toBe(false);
  expect(f.unharmed).toMatchObject({ source: 'Bite', line: 'steam:unit' });
});

test('steam-unit-wet: a mark on the unit spreads through the connected cloud at once', () => {
  expect(steamFacts(withFootnotes(['steam-unit-wet'])).ratMarked).toBe(true);
});

test('FN-M2b: fourCombos reads for every margin line (steam:unit)', () => {
  const runs = fourCombos(
    'steam:unit',
    ['steam-unit-ring', 'steam-unit-lift'],
    ['steam-unit-hide', 'steam-unit-wet'],
    (c: Combo) => steamFacts(c.footnotes),
  );
  const [ringHide, ringWet, liftHide, liftWet] = runs.map((r) => r.result);
  for (const r of [ringHide, ringWet]) {
    expect(r?.below).toMatchObject({ id: 'cloud', rounds: 1 });
    expect(r?.rounds).toBe(TUNING.cloudRounds);
  }
  for (const r of [liftHide, liftWet]) {
    expect(r?.below).toBeNull();
    expect(r?.rounds).toBe(TUNING.cloudRounds + 1);
  }
  for (const r of [ringHide, liftHide]) {
    expect(r?.bitten).toBe(false);
    expect(r?.ratMarked).toBe(false);
  }
  for (const r of [ringWet, liftWet]) {
    expect(r?.bitten).toBe(true);
    expect(r?.ratMarked).toBe(true);
  }
});

// ── brass:unit ───────────────────────────────────────────

const origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };

function brassFacts(footnotes: FootnoteIds) {
  // Brass on a foe, with a second foe beside it (and D below).
  const foe = land(board('r r . .\nD . . .'), [['brass', unit('rat-1')]], footnotes);
  const second = foe.state.units.filter((u) => u.kind === 'enemy');
  const worn = runDraft(foe.state, (ctx: Ctx) => decayStates(ctx), { footnotes });
  // Brass on D.
  const friend = land(board('D r . .'), [['brass', unit('draughtsman')]], footnotes);
  const d = friend.state.units.find((u) => u.id === 'draughtsman');
  // A Spark through a cast collar and a born-brass one.
  const spark = land(board('d d d .\n. . . .\nD . . .'), [], footnotes, (ctx) => {
    const flow = flowFor(ctx.s);
    const [a, b] = ctx.s.units.filter((u) => u.kind === 'enemy');
    if (a) a.collar = origin;
    if (b) b.collar = origin;
    const born = ctx.s.units.filter((u) => u.kind === 'enemy')[2];
    if (born) born.collar = null;
    landKind(ctx, 'spark', unit(a?.id ?? ''), flow);
  });
  const foes = spark.state.units.filter((u) => u.kind === 'enemy');
  return {
    firstCollared: second[0]?.collar !== false,
    secondCollared: second[1]?.collar !== false,
    wornOff: worn.state.units.filter((u) => u.kind === 'enemy' && u.collar !== false).length,
    shield: d?.shield,
    shieldLine: friend.events.find((e) => e.type === 'shieldGained')?.line,
    conduct: damages(spark.events).filter((x) => x.endsWith('Conduct')),
    collars: foes.map((u) => (u.collar === false ? 'off' : u.collar === null ? 'born' : 'cast')),
    burnLines: spark.events.filter((e) => e.type === 'damage' && e.line === 'brass:unit').length,
  };
}

test('FN-M2b: brass:unit with no variant is the built line', () => {
  const f = brassFacts({});
  expect(f.firstCollared).toBe(true);
  expect(f.secondCollared).toBe(false);
  expect(f.wornOff).toBe(1);
  expect(f.shield).toBe(0);
  expect(f.collars).toEqual(['cast', 'cast', 'born']);
});

test('brass-unit-light: a collar you put on wears off at round end', () => {
  const f = brassFacts(withFootnotes(['brass-unit-light']));
  expect(f.firstCollared).toBe(true);
  expect(f.wornOff).toBe(0);
});

test('brass-unit-pair: a bare unit beside it is collared too', () => {
  const f = brassFacts(withFootnotes(['brass-unit-pair']));
  expect(f.secondCollared).toBe(true);
});

test('brass-unit-ground: a friend you collar gains 1 shield', () => {
  const f = brassFacts(withFootnotes(['brass-unit-ground']));
  expect(f.shield).toBe(1);
  expect(f.shieldLine).toBe('brass:unit');
  expect(f.firstCollared).toBe(true); // a foe gets no shield
});

test('brass-unit-burn: a Spark burns a cast collar off, and that unit takes 1 more', () => {
  const base = brassFacts({});
  const f = brassFacts(withFootnotes(['brass-unit-burn']));
  expect(base.conduct).toEqual([
    'dummy@0,0 2 Conduct',
    'dummy@1,0 2 Conduct',
    'dummy@2,0 2 Conduct',
  ]);
  expect(f.conduct).toEqual(['dummy@0,0 3 Conduct', 'dummy@1,0 3 Conduct', 'dummy@2,0 2 Conduct']);
  expect(f.collars).toEqual(['off', 'off', 'born']); // born brass never burns
  expect(f.burnLines).toBe(2);
});

test('FN-M2b: fourCombos reads for every margin line (brass:unit)', () => {
  const runs = fourCombos(
    'brass:unit',
    ['brass-unit-light', 'brass-unit-pair'],
    ['brass-unit-ground', 'brass-unit-burn'],
    (c: Combo) => brassFacts(c.footnotes),
  );
  const [lightGround, lightBurn, pairGround, pairBurn] = runs.map((r) => r.result);
  for (const r of [lightGround, lightBurn]) {
    expect(r?.wornOff).toBe(0);
    expect(r?.secondCollared).toBe(false);
  }
  for (const r of [pairGround, pairBurn]) {
    expect(r?.wornOff).toBe(2);
    expect(r?.secondCollared).toBe(true);
  }
  for (const r of [lightGround, pairGround]) {
    expect(r?.shield).toBe(1);
    expect(r?.burnLines).toBe(0);
  }
  for (const r of [lightBurn, pairBurn]) {
    expect(r?.shield).toBe(0);
    expect(r?.burnLines).toBe(2);
    expect(r?.collars).toEqual(['off', 'off', 'born']);
  }
});
