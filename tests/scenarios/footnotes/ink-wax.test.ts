import { describe, expect, test } from 'vitest';
import type { InventionDef, InventionId } from '$data';
import { type BattleState, label, libraryOf, type Origin, parseLabel } from '$engine';
import { type Ctx, type FootnoteIds, runDraft } from '$engine/ctx';
import { notify } from '$engine/hooks';
import { applyMark } from '$engine/marks';
import { decayStates } from '$engine/mix';
import { tileAt } from '$engine/queries';
import { SOLVENT_RULES } from '$engine/solvents';
import type { Unit } from '$engine/types';
import { type Combo, fourCombos, withFootnotes } from '../footnoteHarness';
import { withLattices } from '../harness';
import { castWith, tileAim } from './castHelper';

/** IQ-F4: Wax's margin line (`wax:cloud`) and its two capstones. */

const ORIGIN: Origin = { caster: 'draughtsman', spell: '0,0', cast: 1 };

const unit = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
/** The rat carries a wax mark: a plain mark that never spreads, and that fire melts. */
const waxMark = (ctx: Ctx): void => {
  applyMark(ctx, unit(ctx.s, 'rat-1'), { deep: false, bound: null, origin: ORIGIN, wax: true });
};
const cloudRounds = (s: BattleState, at: string): number | null =>
  tileAt(s, parseLabel(at)).state?.rounds ?? null;

/**
 * A waxed rat on a cloud (B1): the round's decay keeps the cloud (or not), then a Touch Shove from
 * the draughtsman beside it (a cloud stops a Bolt, so the rat is touched, not shot).
 */
function cloudRun(footnotes: FootnoteIds) {
  const s = runDraft(withLattices('D r~ . . .', { draughtsman: 'Touch> Shove' }), waxMark, {
    footnotes,
  }).state;
  const before = cloudRounds(s, 'B1');
  const decayed = runDraft(s, (ctx) => decayStates(ctx), { footnotes }).state;
  const pushed = castWith(s, tileAim('B1'), footnotes).state;
  return {
    cloudKept: cloudRounds(decayed, 'B1') === before,
    rat: label(unit(pushed, 'rat-1').pos),
  };
}

/** A waxed rat on fire (C1), a dummy beside it (D1): a fire hit melts the wax, spilling onto the dummy. */
function fireRun(footnotes: FootnoteIds, ascii = 'D . r* d') {
  const s = runDraft(withLattices(ascii, { draughtsman: 'Bolt> Shove' }), waxMark, {
    footnotes,
  }).state;
  const melted = runDraft(
    s,
    (ctx) => notify(ctx, { kind: 'hit', unit: 'rat-1', heading: null, from: null }),
    { footnotes },
  ).state;
  return {
    melted: unit(melted, 'rat-1').mark === null,
    blot: tileAt(melted, parseLabel('C1')).state?.id ?? null,
    spattered: unit(melted, 'dummy-1').mark !== null,
  };
}

test('wax:cloud fourCombos: keep or stay on the cloud, then smother or drip on the fire', () => {
  const runs = fourCombos(
    'wax:cloud',
    ['wax-cloud-keep', 'wax-cloud-stay'],
    ['wax-cloud-smother', 'wax-cloud-drip'],
    (combo: Combo) => ({ cloud: cloudRun(combo.footnotes), fire: fireRun(combo.footnotes) }),
  );
  const [keepSmother, keepDrip, staySmother, stayDrip] = runs.map((r) => r.result);
  // Keep: the cloud does not thin while the wax stands, and stay holds the waxed rat in place.
  for (const r of [keepSmother, keepDrip]) expect(r?.cloud.cloudKept).toBe(true);
  for (const r of [staySmother, stayDrip]) expect(r?.cloud.rat).toBe('B1');
  // Smother: no cloud stands beside the fire here, so the fire still melts the wax.
  for (const r of [keepSmother, staySmother]) {
    expect(r?.fire).toEqual({ melted: true, blot: 'fire', spattered: false });
  }
  // Drip: the melted wax leaves a blot on its tile.
  for (const r of [keepDrip, stayDrip]) {
    expect(r?.fire).toEqual({ melted: true, blot: 'blot', spattered: false });
  }
});

test('wax:cloud baseline: without keep the cloud thins; without stay the waxed rat is pushed', () => {
  const plain = cloudRun(withFootnotes([]));
  expect(plain.cloudKept).toBe(false);
  expect(plain.rat).toBe('C1');
});

describe('FU-21: wax-cloud-smother reads a cloud beside the bearer', () => {
  test('FU-21: wax-cloud-smother keeps a wax mark from melting in fire beside a cloud', () => {
    // The cloud sits on B1, beside the fire on C1 (not under the rat).
    expect(fireRun(withFootnotes(['wax-cloud-smother']), 'D ~ r* d').melted).toBe(false);
  });

  test('FU-21: without a cloud beside it the mark melts as before', () => {
    // The cloud is two tiles off (E1), so no 4-neighbour of the fire holds one.
    expect(fireRun(withFootnotes(['wax-cloud-smother']), 'D . r* d ~')).toEqual({
      melted: true,
      blot: 'fire',
      spattered: false,
    });
  });

  test('FU-21: wax-cap-seal holds through a real wax invention cast', () => {
    const waxRecoil: InventionDef = {
      id: 'inv:recoil-wax',
      name: 'recoil-wax',
      method: 'bind',
      parts: ['ink', 'shove'],
      solvent: 'wax',
      event: 'hit',
    };
    const cast = (footnotes: FootnoteIds): BattleState =>
      castWith(
        withLattices(
          'D r . .',
          { draughtsman: 'Touch> inv:recoil-wax' },
          { inventions: libraryOf([waxRecoil]) },
        ),
        tileAim('B1'),
        footnotes,
      ).state;
    expect(unit(cast(withFootnotes(['wax-cap-seal'])), 'rat-1').held).toBe(1);
    expect(unit(cast(withFootnotes([])), 'rat-1').held).toBe(0);
  });
});

describe('Wax capstones', () => {
  test('wax-cap-spatter: when fire melts a wax mark, each unit beside its bearer is marked plain', () => {
    expect(fireRun(withFootnotes(['wax-cap-spatter'])).spattered).toBe(true);
    expect(fireRun(withFootnotes([])).spattered).toBe(false);
  });

  test('wax-cap-seal: a unit that takes a wax mark is held until your next turn', () => {
    const rule = SOLVENT_RULES.wax;
    const take = (footnotes: FootnoteIds): BattleState =>
      runDraft(
        withLattices('D . r', { draughtsman: 'Bolt> Shove' }),
        (ctx) => {
          const u = unit(ctx.s, 'rat-1');
          applyMark(ctx, u, { deep: false, bound: null, origin: ORIGIN, wax: true });
          // The Wax solvent's `after` runs once per target a wax invention marks (run.before: unmarked).
          rule?.after?.(ctx, { kind: 'unit', unit: u.id }, null as never, {
            inv: 'inv:waxRecoil' as InventionId,
            before: false,
          });
        },
        { footnotes },
      ).state;
    expect(unit(take(withFootnotes(['wax-cap-seal'])), 'rat-1').held).toBe(1);
    expect(unit(take(withFootnotes([])), 'rat-1').held).toBe(0);
  });
});
