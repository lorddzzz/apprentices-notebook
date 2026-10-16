import { describe, expect, test } from 'vitest';
import { TUNING } from '$data';
import {
  baseGlyphCost,
  type CastSample,
  type GlyphDef,
  type GlyphRecord,
  newProfile,
  type Profile,
  revertGlyph,
  versionKey,
} from '$engine';
import { formOf, profilerView, suggestionOf, versionRows } from '../../src/app/profiler';

const cell = (x: number, y: number, rune: GlyphDef['cells'][number]['rune'], dir?: 'right') => ({
  at: { x, y },
  rune,
  ...(dir ? { dir } : {}),
});

const GLYPH: GlyphDef = {
  id: 'g1',
  name: 'Cashing In',
  kind: 'spell',
  cells: [
    cell(0, 0, 'bolt', 'right'),
    cell(1, 0, 'ink'),
    cell(2, 0, 'onInked'),
    cell(3, 0, 'spark'),
  ],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: null,
  version: 2,
  params: [],
  extraExit: null,
};

const sample = (harm: number, cost: number, meaningful = true): CastSample => ({
  harm,
  cost,
  meaningful,
});

function record(over: Partial<GlyphRecord> = {}): GlyphRecord {
  const recent = over.recent ?? Array.from({ length: 10 }, () => sample(4, 3));
  return {
    casts: recent.length,
    harm: recent.reduce((s, x) => s + x.harm, 0),
    meaningful: recent.filter((x) => x.meaningful).length,
    recent,
    best: { economy: 0, reliability: 0 },
    fired: { '0,0': 10, '1,0': 10, '2,0': 10, '3,0': 10 },
    ...over,
  };
}

function profileWith(
  def: GlyphDef,
  rec: GlyphRecord,
  others: Profile['glyphRecords'] = {},
): Profile {
  return {
    ...newProfile(),
    glyphs: [def],
    glyphRecords: { [versionKey(def.id, def.version)]: rec, ...others },
  };
}

describe('header, stats and form', () => {
  test('header names the version and both best tiers', () => {
    const rec = record({ casts: 34, harm: 143, best: { economy: 2, reliability: 3 } });
    const v = profilerView(profileWith(GLYPH, rec), GLYPH);
    expect(v.header).toBe('Cashing In v2 · Economy ◑ silver · Reliability ● gold');
    expect(v.casts).toBe(34);
    expect(v.avgHarm).toBe('4.2');
  });

  test('ink shows base, then base → discounted price once Economy earns it', () => {
    const base = baseGlyphCost(GLYPH);
    expect(profilerView(profileWith(GLYPH, record()), GLYPH).inkText).toBe(`${base}`);
    const rec = record({ best: { economy: 1, reliability: 0 } });
    expect(profilerView(profileWith(GLYPH, rec), GLYPH).inkText).toBe(`${base} → ${base - 1}`);
  });

  test('no casts: no average, empty form "0 / 10"', () => {
    const v = profilerView(
      profileWith(GLYPH, record({ recent: [], casts: 0, harm: 0, fired: {} })),
      GLYPH,
    );
    expect(v.avgHarm).toBeNull();
    expect(v.form.progress).toBe(`0 / ${TUNING.tierWindow}`);
    expect(v.form.full).toBe(false);
  });

  test('form below a full window counts casts and earns no tier', () => {
    const f = formOf(record({ recent: Array.from({ length: 6 }, () => sample(9, 1)) }));
    expect(f.full).toBe(false);
    expect(f.progress).toBe('6 / 10');
    expect(f.tiers.economy.tier).toBe(0);
  });

  test('a full window reads its own value and tiers', () => {
    const f = formOf(record({ recent: Array.from({ length: 10 }, () => sample(3, 1)) }));
    expect(f.full).toBe(true);
    expect(f.economy).toBe(3);
    expect(f.reliability).toBe(1);
    expect(f.tiers.economy.name).toBe('gold');
    expect(f.tiers.reliability.name).toBe('gold');
  });
});

describe('inside view', () => {
  test('dead cells, open cells and the entry are flagged; the extra exit only when earned', () => {
    const def: GlyphDef = { ...GLYPH, params: ['1,0'], extraExit: 'up' };
    const rec = record({
      casts: 8,
      fired: { '0,0': 8, '1,0': 8, '2,0': 8 },
      best: { economy: 0, reliability: 1 },
    });
    const v = profilerView(profileWith(def, rec), def).inside;
    expect(v.cells.find((c) => c.key === '3,0')?.dead).toBe(true);
    expect(v.cells.find((c) => c.key === '2,0')?.dead).toBe(false);
    expect(v.cells.find((c) => c.key === '1,0')?.open).toBe(true);
    expect(v.cells.find((c) => c.key === '0,0')?.entry).toBe(true);
    expect(v.extraExit).toBeNull();
    const silver = record({ ...rec, best: { economy: 0, reliability: 2 } });
    expect(profilerView(profileWith(def, silver), def).inside.extraExit).toBe('up');
  });

  test('nothing is dead before five casts', () => {
    const rec = record({ casts: 4, recent: [], fired: {} });
    const v = profilerView(profileWith(GLYPH, rec), GLYPH).inside;
    expect(v.cells.some((c) => c.dead)).toBe(false);
  });
});

describe('suggestion', () => {
  test('a dead cell names the rune, the row, the casts and the ink saved', () => {
    const rec = record({ casts: 12, fired: { '0,0': 12, '1,0': 12, '2,0': 12 } });
    const saved =
      baseGlyphCost(GLYPH) - baseGlyphCost({ ...GLYPH, cells: GLYPH.cells.slice(0, 3) });
    expect(suggestionOf(GLYPH, rec)).toBe(
      `The Spark on row 1 never fired in 12 casts. Lifting it saves ${saved} ink.`,
    );
  });

  test('a dead cell whose removal saves no ink says it frees the rune', () => {
    // Three inner runes: dropping one changes the 1-in-3 rebate, so cost stays level.
    const def: GlyphDef = {
      ...GLYPH,
      cells: [cell(0, 0, 'bolt', 'right'), cell(1, 0, 'ink'), cell(2, 0, 'ink')],
    };
    const rec = record({ casts: 6, fired: { '0,0': 6, '1,0': 6 } });
    expect(baseGlyphCost(def)).toBe(baseGlyphCost({ ...def, cells: def.cells.slice(0, 2) }));
    expect(suggestionOf(def, rec)).toBe(
      'The Ink on row 1 never fired in 6 casts. Lifting it saves no ink, frees a Ink.',
    );
  });

  test('a trigger that ran but never opened is named before a cell can count as dead', () => {
    const early = record({ casts: 3, fired: { '0,0': 3, '1,0': 3, '2,0': 3 } });
    expect(suggestionOf(GLYPH, early)).toBe('The On Inked ran but never opened.');
    // Five casts on, the cell behind it is dead and that line wins.
    const later = record({ casts: 5, fired: { '0,0': 5, '1,0': 5, '2,0': 5 } });
    expect(suggestionOf(GLYPH, later)).toMatch(/^The Spark on row 1 never fired in 5 casts/);
  });

  test('the first dead cell in reading order is the one named', () => {
    const def: GlyphDef = {
      ...GLYPH,
      cells: [
        cell(0, 0, 'bolt', 'right'),
        cell(1, 0, 'ink'),
        cell(0, 1, 'spark'),
        cell(1, 1, 'ink'),
      ],
    };
    const rec = record({ casts: 8, fired: { '0,0': 8, '1,0': 8 } });
    expect(suggestionOf(def, rec)).toMatch(/^The Spark on row 2 never fired in 8 casts/);
  });

  test('idle casts come last, counted over the window so far', () => {
    const recent = [
      ...Array.from({ length: 6 }, () => sample(3, 1)),
      ...Array.from({ length: 4 }, () => sample(0, 1, false)),
    ];
    expect(suggestionOf(GLYPH, record({ recent }))).toBe('4 of the last 10 casts did nothing.');
    const few = [sample(3, 1), sample(0, 1, false), sample(3, 1)];
    expect(suggestionOf(GLYPH, record({ recent: few, casts: 3 }))).toBe(
      '1 of the last 3 casts did nothing.',
    );
  });

  test('a clean Glyph has no suggestion', () => {
    expect(suggestionOf(GLYPH, record())).toBeNull();
  });
});

describe('versions', () => {
  const v1: GlyphDef = { ...GLYPH, version: 1 };
  const p: Profile = {
    ...profileWith(GLYPH, record({ casts: 34, best: { economy: 2, reliability: 3 } })),
    glyphArchive: [v1],
    glyphRecords: {
      [versionKey('g1', 1)]: record({ casts: 15, best: { economy: 1, reliability: 2 } }),
      [versionKey('g1', 2)]: record({ casts: 34, best: { economy: 2, reliability: 3 } }),
    },
  };

  test('newest first, the current one marked, each with its own best tiers', () => {
    const rows = versionRows(p, 'g1');
    expect(rows.map((r) => [r.version, r.current])).toEqual([
      [2, true],
      [1, false],
    ]);
    expect(rows[1]?.line).toBe('v1 · 15 casts · Economy ◔ · Reliability ◑');
  });

  test('after a revert the list swaps the current mark and keeps both records', () => {
    const rows = versionRows(revertGlyph(p, 'g1', 1), 'g1');
    expect(rows.map((r) => [r.version, r.current])).toEqual([
      [2, false],
      [1, true],
    ]);
    expect(rows.map((r) => r.casts)).toEqual([34, 15]);
  });

  test('a Glyph with one version lists one row', () => {
    expect(versionRows(profileWith(GLYPH, record()), 'g1')).toHaveLength(1);
  });
});
