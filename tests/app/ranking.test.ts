import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  type CastSample,
  type GlyphDef,
  type GlyphRecord,
  newProfile,
  type Profile,
  versionKey,
} from '$engine';
import { rankGlyphs } from '../../src/app/ranking';

const glyph = (id: string, name: string, version = 1): GlyphDef => ({
  id,
  name,
  kind: 'spell',
  cells: [{ at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' }],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: null,
  version,
  params: [],
  extraExit: null,
});

/** A record of `casts` casts with `harm` in total; the window keeps the newest tierWindow samples. */
function record(
  casts: number,
  harm: number,
  best: GlyphRecord['best'] = { economy: 0, reliability: 0 },
): GlyphRecord {
  const sample: CastSample = { harm: casts > 0 ? harm / casts : 0, cost: 1, meaningful: true };
  return {
    casts,
    harm,
    meaningful: casts,
    recent: Array.from({ length: Math.min(casts, TUNING.tierWindow) }, () => sample),
    best,
    fired: {},
  };
}

function profileOf(entries: { def: GlyphDef; rec: GlyphRecord }[]): Profile {
  return {
    ...newProfile(),
    glyphs: entries.map((e) => e.def),
    glyphRecords: Object.fromEntries(
      entries.map((e) => [versionKey(e.def.id, e.def.version), e.rec]),
    ),
  };
}

describe('rankGlyphs (M14)', () => {
  test('sorts by best Economy, then best Reliability, then current Economy value', () => {
    const p = profileOf([
      { def: glyph('a', 'Alpha'), rec: record(12, 12, { economy: 1, reliability: 0 }) },
      { def: glyph('b', 'Bravo'), rec: record(12, 30, { economy: 2, reliability: 0 }) },
      { def: glyph('c', 'Charlie'), rec: record(12, 40, { economy: 1, reliability: 3 }) },
      { def: glyph('d', 'Delta'), rec: record(12, 20, { economy: 1, reliability: 0 }) },
    ]);
    expect(rankGlyphs(p).map((r) => r.name)).toEqual(['Bravo', 'Charlie', 'Delta', 'Alpha']);
  });

  test('a tie on best tiers falls to the current window Economy value', () => {
    const p = profileOf([
      { def: glyph('a', 'Low'), rec: record(10, 10) },
      { def: glyph('b', 'High'), rec: record(10, 30) },
    ]);
    expect(rankGlyphs(p).map((r) => r.name)).toEqual(['High', 'Low']);
  });

  test('Glyphs under a full window are listed below, with the casts to a tier', () => {
    const p = profileOf([
      { def: glyph('a', 'Newcomer'), rec: record(3, 90) },
      { def: glyph('b', 'Veteran'), rec: record(10, 5) },
    ]);
    const rows = rankGlyphs(p);
    expect(rows.map((r) => r.name)).toEqual(['Veteran', 'Newcomer']);
    expect(rows[0]?.toTier).toBeNull();
    expect(rows[1]?.toTier).toBe('3 / 10 casts to a tier');
  });

  test('a row carries name, version, tier views, average harm and casts of the current version', () => {
    const p = profileOf([
      { def: glyph('a', 'Cashing In', 2), rec: record(20, 84, { economy: 2, reliability: 3 }) },
    ]);
    expect(rankGlyphs(p)).toEqual([
      {
        id: 'a',
        name: 'Cashing In',
        version: 2,
        economy: { tier: 2, mark: '◑', name: 'silver' },
        reliability: { tier: 3, mark: '●', name: 'gold' },
        harm: '4.2',
        casts: 20,
        toTier: null,
      },
    ]);
  });

  test('a Glyph never cast has no harm and reads 0 / 10', () => {
    const p = profileOf([{ def: glyph('a', 'Fresh'), rec: record(0, 0) }]);
    const [row] = rankGlyphs(p);
    expect(row?.harm).toBeNull();
    expect(row?.toTier).toBe('0 / 10 casts to a tier');
  });

  test('an empty profile ranks nothing', () => {
    expect(rankGlyphs(newProfile())).toEqual([]);
  });
});
