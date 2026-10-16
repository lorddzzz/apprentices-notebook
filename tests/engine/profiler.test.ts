import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  type CastSample,
  deadCells,
  economyOf,
  emptyRecord,
  foldRecord,
  type GlyphDef,
  type GlyphRecord,
  type Profile,
  recordOf,
  reliabilityOf,
  rewardsOf,
  tierUps,
  versionKey,
  windowTiers,
} from '$engine';

const c = (x: number, y: number) => ({ x, y });
const s = (harm: number, cost: number, meaningful = true): CastSample => ({
  harm,
  cost,
  meaningful,
});
const times = (n: number, x: CastSample): CastSample[] => Array.from({ length: n }, () => x);

const fold = (r: GlyphRecord, samples: readonly CastSample[], fired: string[] = []): GlyphRecord =>
  samples.reduce((acc, x) => foldRecord(acc, x, fired), r);

const def = (id: string, version = 1): GlyphDef => ({
  id,
  name: `Glyph ${id}`,
  kind: 'payload',
  cells: [
    { at: c(0, 0), rune: 'ink' },
    { at: c(1, 0), rune: 'onInked' },
    { at: c(2, 0), rune: 'spark' },
  ],
  entry: c(0, 0),
  exits: [],
  idiom: null,
  version,
  params: [],
  extraExit: null,
});

describe('tiers', () => {
  test('economy is Σ harm ÷ Σ cost, reliability the share of meaningful samples', () => {
    expect(economyOf([s(3, 2), s(1, 2)])).toBe(1);
    expect(economyOf([])).toBe(0);
    expect(reliabilityOf([s(0, 1, true), s(0, 1, false), s(0, 1, true), s(0, 1, true)])).toBe(0.75);
    expect(reliabilityOf([])).toBe(0);
  });

  test('no tier below a full window', () => {
    expect(windowTiers(times(TUNING.tierWindow - 1, s(9, 1)))).toEqual({
      economy: 0,
      reliability: 0,
    });
    expect(windowTiers(times(TUNING.tierWindow, s(9, 1)))).toEqual({
      economy: 3,
      reliability: 3,
    });
  });

  test('thresholds: reliability 7 / 9 / 10 of 10, economy from TUNING', () => {
    const [b, sv, g] = TUNING.economyTiers;
    const reliab = (hits: number): number =>
      windowTiers([...times(hits, s(0, 1)), ...times(10 - hits, s(0, 1, false))]).reliability;
    expect([6, 7, 8, 9, 10].map(reliab)).toEqual([0, 1, 1, 2, 3]);
    const econ = (ratio: number): number =>
      windowTiers(times(10, s(Math.round(ratio * 10), 10))).economy;
    expect([b - 0.1, b, sv, g, g + 1].map((v) => econ(v as number))).toEqual([0, 1, 2, 3, 3]);
  });

  test('only the last window counts', () => {
    const recent = [...times(5, s(0, 1, false)), ...times(10, s(0, 1))];
    expect(windowTiers(recent).reliability).toBe(3);
  });
});

describe('foldRecord', () => {
  test('lifetime sums, a window capped at ten, fired counted once per cast', () => {
    const r = fold(emptyRecord(), [s(2, 1), s(4, 1, false)], ['0,0', '0,0', '1,0']);
    expect(r.casts).toBe(2);
    expect(r.harm).toBe(6);
    expect(r.meaningful).toBe(1);
    expect(r.fired).toEqual({ '0,0': 2, '1,0': 2 });
    expect(fold(emptyRecord(), times(25, s(1, 1))).recent).toHaveLength(10);
  });

  test('a tier only after ten casts', () => {
    const nine = fold(emptyRecord(), times(9, s(9, 1)));
    expect(nine.best).toEqual({ economy: 0, reliability: 0 });
    expect(foldRecord(nine, s(9, 1), []).best).toEqual({ economy: 3, reliability: 3 });
  });

  test('the best tier never drops, and the best window is kept', () => {
    const gold = fold(emptyRecord(), times(10, s(9, 1)));
    const worse = fold(gold, times(10, s(0, 1, false)));
    expect(windowTiers(worse.recent)).toEqual({ economy: 0, reliability: 0 });
    expect(worse.best).toEqual({ economy: 3, reliability: 3 });
    // A middling window afterwards doesn't lower it, a better one raises it
    const silver = fold(emptyRecord(), [...times(9, s(2, 1)), s(0, 1, false)]);
    expect(silver.best.reliability).toBe(2);
    const again = fold(silver, times(10, s(2, 1)));
    expect(again.best.reliability).toBe(3);
    expect(fold(again, times(3, s(0, 1, false))).best.reliability).toBe(3);
  });

  test('the input record is not changed', () => {
    const r = emptyRecord();
    foldRecord(r, s(1, 1), ['0,0']);
    expect(r).toEqual(emptyRecord());
  });
});

describe('rewardsOf', () => {
  const best = (economy: 0 | 1 | 2 | 3, reliability: 0 | 1 | 2 | 3): GlyphRecord => ({
    ...emptyRecord(),
    best: { economy, reliability },
  });

  test('one ink per Economy tier', () => {
    expect([0, 1, 2, 3].map((e) => rewardsOf(best(e as 0 | 1 | 2 | 3, 0)).discount)).toEqual([
      0, 1, 2, 3,
    ]);
  });

  test('the extra exit at Reliability silver, a second parameter at gold', () => {
    const at = (r: 0 | 1 | 2 | 3) => rewardsOf(best(0, r));
    expect([0, 1, 2, 3].map((r) => at(r as 0 | 1 | 2 | 3).extraExit)).toEqual([
      false,
      false,
      true,
      true,
    ]);
    expect([0, 1, 2, 3].map((r) => at(r as 0 | 1 | 2 | 3).params)).toEqual([
      TUNING.paramSlots,
      TUNING.paramSlots,
      TUNING.paramSlots,
      TUNING.paramSlotsGold,
    ]);
  });
});

describe('tierUps', () => {
  const profile = (
    glyphs: GlyphDef[],
    records: Record<string, GlyphRecord>,
  ): Pick<Profile, 'glyphs' | 'glyphRecords'> => ({ glyphs, glyphRecords: records });
  const tiered = (economy: 0 | 1 | 2 | 3, reliability: 0 | 1 | 2 | 3): GlyphRecord => ({
    ...emptyRecord(),
    best: { economy, reliability },
  });

  test('lists each risen tier in Glyph order, economy before reliability', () => {
    const glyphs = [def('a'), def('b')];
    const before = profile(glyphs, { 'a@1': tiered(1, 0), 'b@1': tiered(0, 0) });
    const after = profile(glyphs, {
      'a@1': tiered(2, 2),
      'b@1': tiered(0, 1),
    });
    expect(tierUps(before, after)).toEqual([
      { glyph: 'a', name: 'Glyph a', version: 1, metric: 'economy', tier: 2 },
      { glyph: 'a', name: 'Glyph a', version: 1, metric: 'reliability', tier: 2 },
      { glyph: 'b', name: 'Glyph b', version: 1, metric: 'reliability', tier: 1 },
    ]);
  });

  test('nothing for no change, a drop, an old version or a missing record', () => {
    const glyphs = [def('a', 2)];
    const same = profile(glyphs, { 'a@2': tiered(2, 2) });
    expect(tierUps(same, same)).toEqual([]);
    expect(tierUps(same, profile(glyphs, { 'a@2': tiered(1, 1) }))).toEqual([]);
    expect(tierUps(same, profile(glyphs, { 'a@2': tiered(2, 2), 'a@1': tiered(3, 3) }))).toEqual(
      [],
    );
    expect(tierUps(profile(glyphs, {}), profile(glyphs, { 'a@2': tiered(0, 0) }))).toEqual([]);
    expect(recordOf(profile(glyphs, {}), 'a', 2)).toEqual(emptyRecord());
    expect(versionKey('a', 2)).toBe('a@2');
  });
});

describe('deadCells', () => {
  const g = def('a');

  test('no cell is dead before five casts', () => {
    const r = fold(emptyRecord(), times(TUNING.deadAfterCasts - 1, s(1, 1)), ['0,0']);
    expect(deadCells(g, r)).toEqual([]);
  });

  test('after five casts, the cells with no fire', () => {
    const r = fold(emptyRecord(), times(TUNING.deadAfterCasts, s(1, 1)), ['0,0', '1,0']);
    expect(deadCells(g, r)).toEqual([c(2, 0)]);
    expect(deadCells(g, foldRecord(r, s(1, 1), ['2,0']))).toEqual([]);
  });
});
