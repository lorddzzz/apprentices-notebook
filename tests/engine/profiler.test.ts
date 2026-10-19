import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  accumulateStats,
  type CastSample,
  compileLattice,
  deadCells,
  economyOf,
  emptyRecord,
  emptyStats,
  foldRecord,
  type GlyphDef,
  type GlyphRecord,
  glyphSamples,
  libraryOf,
  newProfile,
  type Profile,
  parseLattice,
  recordGlyphCasts,
  recordOf,
  reliabilityOf,
  rewardsOf,
  tierUps,
  versionKey,
  windowTiers,
} from '$engine';

import { act, board, cast } from '../scenarios/harness';

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
    { at: c(1, 0), rune: 'tally' },
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

/** Real traces and stored objects: elegance follows their cast through the whole fight. */
describe('lifetime elegance', () => {
  const glyph = (id: string, text: string, kind: GlyphDef['kind'] = 'spell'): GlyphDef => ({
    ...def(id),
    kind,
    cells: parseLattice(text).runes.flatMap((r) => ('glyph' in r ? [] : [r])),
  });
  const profileFor = (g: GlyphDef): Profile => ({ ...newProfile(), glyphs: [g] });

  test('fuse-harm-credits-sealing-glyph', () => {
    const g = glyph('fuse', 'Bolt> Fuse Oil Spark');
    const spells = compileLattice(parseLattice('G:fuse>'), { fuse: g }).spells;
    const sealed = cast(
      board('D . d', { party: { draughtsman: { spells } } }),
      'draughtsman',
      'right',
    );
    const dusk = act(sealed.state, { type: 'endTurn' });
    const events = [...sealed.events, ...dusk.events];
    const damage = dusk.events.filter((e) => e.type === 'damage' && !e.target.member);
    expect(damage.length).toBeGreaterThan(0);
    expect(damage.every((e) => e.origin?.glyph === g.id)).toBe(true);
    const sample = glyphSamples(events, profileFor(g))[0];
    expect(sample?.sample.harm).toBe(
      damage.reduce((n, e) => n + (e.type === 'damage' ? e.amount : 0), 0),
    );
    expect(sample?.sample.harm).toBeGreaterThan(0);
    const ledger = accumulateStats(emptyStats(), events, profileFor(g));
    expect(ledger.spells[0]?.damage).toBe(sample?.sample.harm);
    expect(ledger.spells[0]?.casts).toBe(1);
  });

  test('bound-mark-harm-credits-binder', () => {
    const g = glyph('binder', 'Bolt> inv:sting');
    const inventions = libraryOf([
      {
        id: 'inv:sting',
        name: 'Sting',
        method: 'bind',
        parts: ['ink', 'strike'],
        event: 'hit',
        solvent: null,
      },
    ]);
    const spells = compileLattice(parseLattice('G:binder>'), { binder: g }, inventions).spells;
    const start = board('D . d\n. . S', {
      inventions,
      party: {
        draughtsman: { spells },
        stoker: { spells: compileLattice(parseLattice('Touch> Strike')).spells },
      },
    });
    const bound = cast(start, 'draughtsman', 'right');
    const hit = cast(bound.state, 'stoker', { kind: 'tile', at: c(2, 0) });
    const events = [...bound.events, ...hit.events];
    const damage = hit.events.filter((e) => e.type === 'damage');
    expect(damage.map((e) => e.origin?.caster).sort()).toEqual(['draughtsman', 'stoker']);
    expect(glyphSamples(events, profileFor(g))[0]?.sample.harm).toBe(2);
    expect(
      accumulateStats(emptyStats(), events, profileFor(g)).spells.map((s) => s.damage),
    ).toEqual([2, 2]);
  });

  test('payload-glyph-earns-economy', () => {
    const g = glyph('payload', 'Fuse Oil Spark', 'payload');
    const spells = compileLattice(parseLattice('Bolt> G:payload>'), { payload: g }).spells;
    const sealed = cast(
      board('D . d', { party: { draughtsman: { spells } } }),
      'draughtsman',
      'right',
    );
    const dusk = act(sealed.state, { type: 'endTurn' });
    const events = [...sealed.events, ...dusk.events];
    const sample = glyphSamples(events, profileFor(g))[0];
    expect(sample?.sample.harm).toBeGreaterThan(0);
    const p = Array.from({ length: TUNING.tierWindow }).reduce<Profile>(
      (p) => recordGlyphCasts(p, events),
      profileFor(g),
    );
    expect(recordOf(p, g.id, 1).harm).toBe((sample?.sample.harm ?? 0) * TUNING.tierWindow);
    expect(economyOf(recordOf(p, g.id, 1).recent)).toBeGreaterThan(0);
  });

  test('two sockets of the same payload keep separate lifetime samples', () => {
    const g = glyph('payload', 'Fuse Oil Spark', 'payload');
    const spells = compileLattice(parseLattice('. G:payload^ .\nBolt> Fork .\n. G:payloadv .'), {
      payload: g,
    }).spells;
    const sealed = cast(
      board('. . d\nD . .\n. . d', { party: { draughtsman: { spells } } }),
      'draughtsman',
      'right',
    );
    const dusk = act(sealed.state, { type: 'endTurn' });
    const events = [...sealed.events, ...dusk.events];
    const samples = glyphSamples(events, profileFor(g));
    expect(samples).toHaveLength(2);
    expect(samples.every((s) => s.sample.harm > 0)).toBe(true);
    const harm = dusk.events.reduce(
      (n, e) => n + (e.type === 'damage' && !e.target.member ? e.amount : 0),
      0,
    );
    expect(samples.reduce((n, s) => n + s.sample.harm, 0)).toBe(harm);
  });

  test('a payload first reached inside a jar earns one sample and no false dead cells', () => {
    const g = glyph('later', 'Oil Spark Strike', 'payload');
    const spells = compileLattice(parseLattice('Bolt> Fuse G:later>'), { later: g }).spells;
    const sealed = cast(
      board('D . d', { party: { draughtsman: { spells } } }),
      'draughtsman',
      'right',
    );
    expect(glyphSamples(sealed.events, profileFor(g))).toEqual([]);
    const dusk = act(sealed.state, { type: 'endTurn' });
    const events = [...sealed.events, ...dusk.events];
    const samples = glyphSamples(events, profileFor(g));
    expect(samples).toHaveLength(1);
    expect(samples[0]?.sample.harm).toBeGreaterThan(0);
    expect([...(samples[0]?.fired ?? [])].sort()).toEqual(['0,0', '1,0', '2,0']);
    const p = Array.from({ length: TUNING.deadAfterCasts }).reduce<Profile>(
      (p) => recordGlyphCasts(p, events),
      profileFor(g),
    );
    expect(deadCells(g, recordOf(p, g.id, 1))).toEqual([]);
    expect(accumulateStats(emptyStats(), events, profileFor(g)).proofCasts).toBe(1);
  });

  test('a different payload in the sealed tail receives its own harm', () => {
    const sealer = {
      ...glyph('sealer', 'Bolt> Fuse'),
      exits: [{ from: c(1, 0), dir: 'right' as const }],
    };
    const later = glyph('later', 'Oil Spark Strike', 'payload');
    const spells = compileLattice(parseLattice('G:sealer> G:later>'), { sealer, later }).spells;
    const sealed = cast(
      board('D . d', { party: { draughtsman: { spells } } }),
      'draughtsman',
      'right',
    );
    const dusk = act(sealed.state, { type: 'endTurn' });
    const p = { ...newProfile(), glyphs: [sealer, later] };
    const samples = glyphSamples([...sealed.events, ...dusk.events], p);
    expect(samples.map((s) => s.glyph)).toEqual(['sealer', 'later']);
    expect(samples[0]?.sample.harm).toBe(0);
    expect(samples[1]?.sample.harm).toBeGreaterThan(0);
  });
});
