import { describe, expect, test, vi } from 'vitest';
import { MEMBERS, RUNE_IDS, TUNING } from '$data';
import {
  type Aim,
  type BattleState,
  type Coord,
  clustersOf,
  compileLattice,
  createBattle,
  type Dir,
  describeLog,
  emptyRecord,
  extraExitSides,
  type GlyphDef,
  type GlyphInside,
  type GlyphRecord,
  glyphLibrary,
  glyphVersions,
  innerMeta,
  insideFlow,
  insideIssues,
  insideOf,
  type Lattice,
  newProfile,
  type PlacedRune,
  type Profile,
  parseLattice,
  recordOf,
  revertGlyph,
  revertWarning,
  reviseGlyph,
  revisionCanvas,
  revisionWarning,
  roleOf,
  type Spell,
  setExtraExit,
  setOpenCells,
  stepShape,
  toGlyphDef,
  validateLoadout,
  versionKey,
} from '$engine';
import { cast } from '../scenarios/harness';

/**
 * Task E2 (plan M17–M20, M26, M34). `rewardsOf` is filled in by task E1 in parallel, so these
 * tests stand in for it with the rule M12 states (read from `record.best`), whatever the real
 * module returns today. What they pin is how revision.ts uses a record's rewards.
 */
vi.mock('../../src/engine/profiler', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/engine/profiler')>();
  return {
    ...real,
    rewardsOf: (r: GlyphRecord) => ({
      discount: r.best.economy,
      extraExit: r.best.reliability >= 2,
      params: r.best.reliability >= 3 ? 2 : 1,
    }),
  };
});

const c = (x: number, y: number): Coord => ({ x, y });
const rune = (r: PlacedRune['rune'], x: number, y: number, dir?: Dir): PlacedRune =>
  dir ? { at: c(x, y), rune: r, dir } : { at: c(x, y), rune: r };
const spellInside = (...cells: PlacedRune[]): GlyphInside => ({
  kind: 'spell',
  cells,
  entry: c(0, 0),
});
const payloadInside = (...cells: PlacedRune[]): GlyphInside => ({
  kind: 'payload',
  cells,
  entry: c(0, 0),
});

/** Bolt → Ink → Tally → Spark. */
const CASHING = spellInside(
  rune('bolt', 0, 0, 'right'),
  rune('ink', 1, 0),
  rune('tally', 2, 0),
  rune('spark', 3, 0),
);
/** Bolt → Oil → Spark → Ink. */
const OTHER = spellInside(
  rune('bolt', 0, 0, 'right'),
  rune('oil', 1, 0),
  rune('spark', 2, 0),
  rune('ink', 3, 0),
);

const best = (economy: 0 | 1 | 2 | 3, reliability: 0 | 1 | 2 | 3): GlyphRecord => ({
  ...emptyRecord(),
  best: { economy, reliability },
});

function defOf(inside: GlyphInside, extra: Partial<GlyphDef> = {}): GlyphDef {
  const meta = innerMeta(inside);
  return {
    id: 'g1',
    name: 'Strike',
    kind: inside.kind,
    cells: inside.cells,
    entry: inside.entry,
    exits: meta.exits,
    idiom: meta.idiom,
    version: 1,
    params: [],
    extraExit: null,
    ...extra,
  };
}

/** A profile owning plenty of every rune and one Glyph, unplaced. */
function profileWith(def: GlyphDef, records: Record<string, GlyphRecord> = {}): Profile {
  const p = newProfile();
  return {
    ...p,
    known: [...RUNE_IDS],
    glyphs: [def],
    glyphRecords: records,
  };
}

const messages = (inside: GlyphInside) => insideIssues(inside).map((i) => i.message);
const kinds = (inside: GlyphInside) => insideIssues(inside).map((i) => i.kind);
const only = (inside: GlyphInside, kind: string) =>
  insideIssues(inside).filter((i) => i.kind === kind);

// ── insideIssues ──

describe('insideIssues', () => {
  test('a clean Spell and a clean Payload have none', () => {
    expect(insideIssues(CASHING)).toEqual([]);
    expect(insideIssues(OTHER)).toEqual([]);
    expect(
      insideIssues(payloadInside(rune('ink', 0, 0), rune('tally', 1, 0), rune('spark', 2, 0))),
    ).toEqual([]);
  });

  test('the entry is pinned at (0,0)', () => {
    const moved: GlyphInside = { ...CASHING, entry: c(1, 0) };
    const [issue] = only(moved, 'entry');
    expect(issue).toMatchObject({ kind: 'entry', at: c(1, 0), blocking: true });
    const hollow = spellInside(rune('ink', 1, 0), rune('tally', 2, 0), rune('spark', 3, 0));
    expect(only(hollow, 'entry')[0]).toMatchObject({ at: c(0, 0), blocking: true });
    // The Source's arrow is fixed to the right.
    const turned = spellInside(
      ...CASHING.cells.map((x) => (x.rune === 'bolt' ? rune('bolt', 0, 0, 'up') : x)),
    );
    expect(only(turned, 'entry')[0]).toMatchObject({ at: c(0, 0), blocking: true });
  });

  test('kind: a Spell starts with a Source, a Payload with a rune that takes flow', () => {
    const blind = spellInside(rune('ink', 0, 0), rune('tally', 1, 0), rune('spark', 2, 0));
    expect(only(blind, 'kind')[0]).toMatchObject({ at: c(0, 0), blocking: true });
    const sourced = payloadInside(
      rune('bolt', 0, 0, 'right'),
      rune('ink', 1, 0),
      rune('spark', 2, 0),
    );
    expect(only(sourced, 'kind')[0]).toMatchObject({ at: c(0, 0), blocking: true });
    const auraed = payloadInside(rune('coil', 0, 0), rune('ink', 1, 0), rune('spark', 2, 0));
    expect(only(auraed, 'kind')[0]).toMatchObject({ at: c(0, 0), blocking: true });
    // A broken way in doesn't also list every cell as stranded.
    expect(kinds(blind)).not.toContain('stranded');
  });

  test('exactly one Source in a Spell, none in a Payload', () => {
    const two = spellInside(...CASHING.cells, rune('splash', 3, 1, 'right'));
    expect(only(two, 'source')).toEqual([
      expect.objectContaining({ kind: 'source', at: c(3, 1), blocking: true }),
    ]);
    const inPayload = payloadInside(
      rune('ink', 0, 0),
      rune('touch', 1, 0, 'right'),
      rune('spark', 2, 0),
    );
    expect(only(inPayload, 'source')[0]).toMatchObject({ at: c(1, 0), blocking: true });
  });

  test('3 to 8 flow cells; auras do not count', () => {
    const small = spellInside(rune('bolt', 0, 0, 'right'), rune('ink', 1, 0));
    expect(only(small, 'size')[0]).toMatchObject({ kind: 'size', blocking: true });
    const grid: PlacedRune[] = [rune('bolt', 0, 0, 'right')];
    for (let i = 1; i < 9; i++) grid.push(rune('ink', i % 3, Math.floor(i / 3)));
    expect(only(spellInside(...grid), 'size')).toHaveLength(1); // 9 flow cells
    expect(only(spellInside(...grid.slice(0, 8)), 'size')).toHaveLength(0); // 8 is the most
    const withAuras = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('ink', 1, 0),
      rune('oil', 2, 0),
      rune('coil', 0, 1),
      rune('coil', 1, 1),
      rune('coil', 2, 1),
    );
    expect(only(withAuras, 'size')).toHaveLength(0);
  });

  test('a stranded flow cell is reported, and does not block a draft test', () => {
    const stranded = spellInside(...CASHING.cells, rune('oil', 3, 2));
    const [issue] = insideIssues(stranded);
    expect(issue).toMatchObject({ kind: 'stranded', at: c(3, 2), blocking: false });
    // Behind a Bend that points back at the flow, nothing walks on.
    const walled = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('bend', 1, 0, 'left'),
      rune('ink', 2, 0),
      rune('oil', 3, 0),
    );
    expect(only(walled, 'stranded').map((i) => i.at)).toEqual([c(2, 0), c(3, 0)]);
    // A Payload's flow cells count the same way.
    const pay = payloadInside(rune('ink', 0, 0), rune('oil', 1, 0), rune('spark', 2, 2));
    expect(only(pay, 'stranded')[0]).toMatchObject({ at: c(2, 2), blocking: false });
  });

  test('a Fork reaches both sides; the walk is the compiler`s', () => {
    const forked = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('fork', 1, 0),
      rune('ink', 1, -1),
      rune('oil', 1, 1),
    );
    expect(insideIssues(forked)).toEqual([]);
  });

  test('a lone aura is reported, and does not block a draft test', () => {
    const lone = spellInside(...CASHING.cells, rune('coil', 3, 3));
    expect(insideIssues(lone)).toEqual([
      expect.objectContaining({ kind: 'aura', at: c(3, 3), blocking: false }),
    ]);
    const touching = spellInside(...CASHING.cells, rune('coil', 1, 1));
    expect(insideIssues(touching)).toEqual([]);
  });

  test('arrow runes need arrows, others take none', () => {
    const noArrow = spellInside(...CASHING.cells, rune('bend', 3, 1));
    expect(only(noArrow, 'arrow')[0]).toMatchObject({ at: c(3, 1), blocking: true });
    const extra = spellInside(
      rune('bolt', 0, 0, 'right'),
      { at: c(1, 0), rune: 'ink', dir: 'up' },
      rune('oil', 2, 0),
    );
    expect(only(extra, 'arrow')[0]).toMatchObject({ at: c(1, 0), blocking: true });
    const bareSource = spellInside(
      { at: c(0, 0), rune: 'bolt' },
      rune('ink', 1, 0),
      rune('oil', 2, 0),
    );
    expect(only(bareSource, 'arrow')[0]).toMatchObject({ at: c(0, 0), blocking: true });
  });

  test('the canvas: cells that fall off the 7 × 7 page', () => {
    const wide = spellInside(
      rune('bolt', 0, 0, 'right'),
      ...[1, 2, 3, 4, 5, 6, 7].map((x) => rune('ink', x, 0)),
    );
    // 8 cells in a row are 8 wide: past the cap, the ring goes first, then cells fall off.
    expect(only(wide, 'canvas')[0]).toMatchObject({ at: c(7, 0), blocking: true });
    const fits = spellInside(
      rune('bolt', 0, 0, 'right'),
      ...[1, 2, 3, 4, 5, 6].map((x) => rune('ink', x, 0)),
    );
    expect(only(fits, 'canvas')).toEqual([]);
  });

  test('overlapping cells', () => {
    const doubled = spellInside(...CASHING.cells, rune('oil', 3, 0));
    expect(only(doubled, 'overlap')[0]).toMatchObject({ at: c(3, 0), blocking: true });
  });

  test('only a stranded cell and a lone aura are non-blocking (M34)', () => {
    const every: GlyphInside[] = [
      { ...CASHING, entry: c(1, 0) },
      spellInside(rune('ink', 0, 0), rune('oil', 1, 0), rune('spark', 2, 0)),
      spellInside(...CASHING.cells, rune('splash', 3, 1, 'right')),
      spellInside(rune('bolt', 0, 0, 'right'), rune('ink', 1, 0)),
      spellInside(...CASHING.cells, rune('bend', 3, 1)),
      spellInside(...CASHING.cells, rune('oil', 3, 0)),
      spellInside(
        rune('bolt', 0, 0, 'right'),
        ...[1, 2, 3, 4, 5, 6, 7].map((x) => rune('ink', x, 0)),
      ),
    ];
    for (const inside of every) {
      const issues = insideIssues(inside);
      expect(issues.length).toBeGreaterThan(0);
      for (const i of issues) {
        expect(i.blocking, `${i.kind}: ${i.message}`).toBe(!['stranded', 'aura'].includes(i.kind));
      }
    }
  });

  test('every issue carries a readable message', () => {
    for (const m of messages(spellInside(rune('ink', 1, 0)))) expect(m.length).toBeGreaterThan(5);
  });
});

describe('insideFlow', () => {
  const walk = (inside: GlyphInside) =>
    insideFlow(inside).spells.map((s) =>
      s.path.map((p) => `${p.rune}@${p.at.x},${p.at.y}>${p.dir}`),
    );

  test('a Spell inside walks from its source in local cells', () => {
    expect(walk(CASHING)).toEqual([
      ['bolt@0,0>right', 'ink@1,0>right', 'tally@2,0>right', 'spark@3,0>right'],
    ]);
  });

  test('a Payload inside starts at its entry, with no outer cell in the path', () => {
    const pay = payloadInside(rune('ink', 0, 0), rune('tally', 1, 0), rune('spark', 2, 0));
    expect(walk(pay)).toEqual([['ink@0,0>right', 'tally@1,0>right', 'spark@2,0>right']]);
  });

  test('a Fork walks both branches with their local directions; stranded cells are not reached', () => {
    const forked = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('fork', 1, 0),
      rune('ink', 1, -1),
      rune('oil', 1, 1),
      rune('spark', 3, 3),
    );
    expect(walk(forked)).toEqual([
      ['bolt@0,0>right', 'fork@1,0>right', 'ink@1,-1>up', 'oil@1,1>down'],
    ]);
    expect(insideFlow(forked).reached).not.toContain('3,3');
  });

  test('auras touch like on the board: any path cell they sit beside', () => {
    const glowing = spellInside(...CASHING.cells, rune('coil', 1, 1), rune('steep', 0, 1));
    expect(insideFlow(glowing).auraTouches).toEqual(
      expect.arrayContaining([
        { aura: 'coil', from: c(1, 1), to: c(1, 0) },
        { aura: 'steep', from: c(0, 1), to: c(0, 0) },
      ]),
    );
    expect(insideFlow(glowing).auraTouches).toHaveLength(2);
  });
});

describe('revisionCanvas', () => {
  test('the bounding box plus a ring of 1', () => {
    expect(revisionCanvas(CASHING)).toEqual({ origin: c(-1, -1), width: 6, height: 3 });
    const up = spellInside(...CASHING.cells, rune('coil', 1, -1), rune('coil', 2, 1));
    expect(revisionCanvas(up)).toEqual({ origin: c(-1, -2), width: 6, height: 5 });
  });

  test('capped at 7 × 7: the ring is dropped before cells fall off', () => {
    const six = spellInside(
      rune('bolt', 0, 0, 'right'),
      ...[1, 2, 3, 4, 5].map((x) => rune('ink', x, 0)),
    );
    expect(revisionCanvas(six)).toEqual({ origin: c(0, -1), width: 7, height: 3 });
    const seven = spellInside(
      rune('bolt', 0, 0, 'right'),
      ...[1, 2, 3, 4, 5, 6].map((x) => rune('ink', x, 0)),
    );
    expect(revisionCanvas(seven).width).toBe(TUNING.revisionCanvasMax);
    const tall = spellInside(
      rune('bolt', 0, 0, 'right'),
      ...[1, 2, 3, 4, 5, 6, 7].map((y) => rune('ink', 0, y)),
    );
    expect(revisionCanvas(tall).height).toBe(TUNING.revisionCanvasMax);
  });

  test('an empty inside still has the entry and its ring', () => {
    expect(revisionCanvas({ kind: 'spell', cells: [], entry: c(0, 0) })).toEqual({
      origin: c(-1, -1),
      width: 3,
      height: 3,
    });
  });
});

// ── innerMeta ──

describe('innerMeta', () => {
  test('no inside carries an idiom: idioms are log patterns now (P7)', () => {
    expect(innerMeta(CASHING).idiom).toBeNull();
    expect(innerMeta(OTHER).idiom).toBeNull();
  });

  test('exits are where the flow leaves, in walk order (a Fork walks left first)', () => {
    expect(innerMeta(CASHING).exits).toEqual([{ from: c(3, 0), dir: 'right' }]);
    const forked = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('fork', 1, 0),
      rune('ink', 1, -1),
      rune('oil', 1, 1),
    );
    expect(innerMeta(forked).exits).toEqual([
      { from: c(1, -1), dir: 'up' },
      { from: c(1, 1), dir: 'down' },
    ]);
  });

  test('a Bend turns the flow; a Payload enters rightward', () => {
    const bent = payloadInside(rune('ink', 0, 0), rune('bend', 1, 0, 'down'), rune('oil', 1, 1));
    expect(innerMeta(bent).exits).toEqual([{ from: c(1, 1), dir: 'down' }]);
  });

  test('agrees with a Fair Copy of the same cluster (exits and idiom)', () => {
    const flat = parseLattice('. . . . . .\nBolt> Ink Tally Spark Oil .\n. . . . . .');
    const cluster = clustersOf(flat).find((k) => k.cells.length === 4 && k.kind === 'spell');
    if (!cluster) throw new Error('no cluster');
    const compiled = toGlyphDef(flat, cluster, 'Cashing', 'cx');
    const meta = innerMeta(insideOf(compiled));
    expect(meta.idiom).toBe(compiled.idiom);
    expect(meta.exits).toEqual(compiled.exits);
  });
});

// ── reviseGlyph, revertGlyph, glyphVersions ──

describe('versions', () => {
  const v1 = defOf(CASHING, { params: ['1,0'] });
  const base = profileWith(v1, { [versionKey('g1', 1)]: { ...best(2, 1), casts: 12, harm: 40 } });

  test('revise makes v2 with an empty record and archives v1 with its record', () => {
    const p = reviseGlyph(base, 'g1', OTHER);
    const [cur] = p.glyphs;
    expect(p.glyphs).toHaveLength(1);
    expect(cur).toMatchObject({ id: 'g1', name: 'Strike', kind: 'spell', version: 2, idiom: null });
    expect(cur?.cells).toEqual(OTHER.cells);
    expect(cur?.exits).toEqual(innerMeta(OTHER).exits);
    expect(p.glyphArchive).toEqual([v1]);
    expect(recordOf(p, 'g1', 2)).toEqual(emptyRecord());
    expect(recordOf(p, 'g1', 1)).toMatchObject({
      casts: 12,
      harm: 40,
      best: { economy: 2, reliability: 1 },
    });
    // The old profile is untouched.
    expect(base.glyphs[0]).toBe(v1);
    expect(base.glyphArchive).toEqual([]);
  });

  test('exits follow the new inside', () => {
    const p = reviseGlyph(base, 'g1', OTHER);
    expect(p.glyphs[0]?.exits).toEqual(innerMeta(OTHER).exits);
    expect(p.glyphs[0]?.idiom).toBeNull();
  });

  test('revert swaps the versions back and both keep their records', () => {
    const v2 = reviseGlyph(base, 'g1', OTHER);
    const withRecord: Profile = {
      ...v2,
      glyphRecords: { ...v2.glyphRecords, [versionKey('g1', 2)]: { ...best(1, 0), casts: 3 } },
    };
    const back = revertGlyph(withRecord, 'g1', 1);
    expect(back.glyphs[0]).toEqual(v1);
    expect(back.glyphArchive.map((g) => g.version)).toEqual([2]);
    expect(recordOf(back, 'g1', 1).casts).toBe(12);
    expect(recordOf(back, 'g1', 2)).toMatchObject({
      casts: 3,
      best: { economy: 1, reliability: 0 },
    });
    // And forward again.
    const fwd = revertGlyph(back, 'g1', 2);
    expect(fwd.glyphs[0]?.version).toBe(2);
    expect(fwd.glyphArchive).toEqual([v1]);
    expect(fwd.glyphRecords).toEqual(withRecord.glyphRecords);
  });

  test('versions keep their numbers: a revision after a revert is max + 1', () => {
    const v2 = reviseGlyph(base, 'g1', OTHER);
    const reverted = revertGlyph(v2, 'g1', 1);
    const v3 = reviseGlyph(reverted, 'g1', OTHER);
    expect(v3.glyphs[0]?.version).toBe(3);
    expect(v3.glyphArchive.map((g) => g.version).sort()).toEqual([1, 2]);
    expect(recordOf(v3, 'g1', 3)).toEqual(emptyRecord());
    expect(glyphVersions(v3, 'g1').map((v) => [v.def.version, v.current])).toEqual([
      [3, true],
      [2, false],
      [1, false],
    ]);
  });

  test('glyphVersions lists newest first with each record; unknown id is empty', () => {
    const p = reviseGlyph(base, 'g1', OTHER);
    const list = glyphVersions(p, 'g1');
    expect(list.map((v) => v.current)).toEqual([true, false]);
    expect(list[1]?.record.casts).toBe(12);
    expect(list[0]?.record).toEqual(emptyRecord());
    expect(glyphVersions(p, 'nope')).toEqual([]);
  });

  test('refusals are readable Errors', () => {
    expect(() => reviseGlyph(base, 'nope', OTHER)).toThrow('No Glyph nope');
    expect(() =>
      reviseGlyph(
        base,
        'g1',
        payloadInside(rune('ink', 0, 0), rune('oil', 1, 0), rune('spark', 2, 0)),
      ),
    ).toThrow("can't change its kind");
    const broken = spellInside(rune('bolt', 0, 0, 'right'), rune('ink', 1, 0));
    expect(() => reviseGlyph(base, 'g1', broken)).toThrow(messages(broken)[0] as string);
    // Non-blocking issues still stop a Save (M34 amended).
    const stranded = spellInside(...CASHING.cells, rune('oil', 3, 2));
    expect(() => reviseGlyph(base, 'g1', stranded)).toThrow('never reached');
    expect(() => revertGlyph(base, 'g1', 1)).toThrow('already the current');
    expect(() => revertGlyph(base, 'g1', 7)).toThrow('No version 7');
    expect(() => revertGlyph(base, 'nope', 1)).toThrow('No Glyph nope');
  });

  test('the revised profile is a valid v4 shape: archive holds only older versions of current Glyphs', () => {
    const p = reviseGlyph(reviseGlyph(base, 'g1', OTHER), 'g1', CASHING);
    const keys = new Set(p.glyphs.map((g) => versionKey(g.id, g.version)));
    for (const old of p.glyphArchive) {
      expect(keys.has(versionKey(old.id, old.version))).toBe(false);
      expect(p.glyphs.some((g) => g.id === old.id)).toBe(true);
    }
  });
});

// ── Settings carry over or drop (M20) ──

describe('settings on revise', () => {
  test('an open cell carries over while its cell is still a rune of the same family', () => {
    const p = profileWith(defOf(CASHING, { params: ['1,0'] }), { 'g1@1': best(0, 3) });
    // Ink becomes Oil: still a Material.
    const swapped = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('oil', 1, 0),
      rune('tally', 2, 0),
      rune('spark', 3, 0),
    );
    expect(reviseGlyph(p, 'g1', swapped).glyphs[0]?.params).toEqual(['1,0']);
    // Ink becomes an Action: the role changed, so it drops.
    const other = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('shove', 1, 0),
      rune('tally', 2, 0),
      rune('spark', 3, 0),
    );
    expect(reviseGlyph(p, 'g1', other).glyphs[0]?.params).toEqual([]);
    // The cell is gone.
    const gone = profileWith(defOf(CASHING, { params: ['3,0'] }));
    const short = spellInside(rune('bolt', 0, 0, 'right'), rune('spark', 1, 0), rune('oil', 2, 0));
    expect(reviseGlyph(gone, 'g1', short).glyphs[0]?.params).toEqual([]);
  });

  test('a second open cell is dropped: the new record has no gold', () => {
    const p = profileWith(defOf(CASHING, { params: ['1,0', '3,0'] }), { 'g1@1': best(0, 3) });
    const v2 = reviseGlyph(p, 'g1', CASHING);
    expect(v2.glyphs[0]?.params).toEqual(['1,0']);
    // The old version keeps both for a revert.
    expect(revertGlyph(v2, 'g1', 1).glyphs[0]?.params).toEqual(['1,0', '3,0']);
  });

  test('the extra exit is kept but inactive until the new version earns silver', () => {
    const p = profileWith(defOf(CASHING, { extraExit: 'up' }), { 'g1@1': best(0, 2) });
    expect(glyphLibrary(p).g1?.extraExit).toBe('up'); // active at silver
    const v2 = reviseGlyph(p, 'g1', CASHING);
    expect(v2.glyphs[0]?.extraExit).toBe('up'); // kept
    expect(glyphLibrary(v2).g1?.extraExit).toBeNull(); // inactive: fresh record
    const silver: Profile = { ...v2, glyphRecords: { ...v2.glyphRecords, 'g1@2': best(0, 2) } };
    expect(glyphLibrary(silver).g1?.extraExit).toBe('up');
  });

  test('the extra exit drops when the new inside already leaves on that side', () => {
    const p = profileWith(defOf(CASHING, { extraExit: 'right' }), { 'g1@1': best(0, 2) });
    // CASHING leaves right already, so only a stale 'right' could exist; the revision recomputes exits.
    expect(reviseGlyph(p, 'g1', CASHING).glyphs[0]?.extraExit).toBeNull();
    const up = defOf(CASHING, { extraExit: 'up' });
    const fork = spellInside(
      rune('bolt', 0, 0, 'right'),
      rune('fork', 1, 0),
      rune('ink', 1, -1),
      rune('oil', 1, 1),
    );
    expect(reviseGlyph(profileWith(up), 'g1', fork).glyphs[0]?.extraExit).toBeNull(); // up is taken
    expect(reviseGlyph(profileWith(up), 'g1', OTHER).glyphs[0]?.extraExit).toBe('up');
  });

  test('the name survives a revision', () => {
    const p = profileWith(defOf(CASHING, { name: 'Mine' }));
    const v2 = reviseGlyph(p, 'g1', OTHER).glyphs[0];
    expect(v2?.name).toBe('Mine');
    expect(v2 && 'discount' in v2).toBe(false);
  });
});

describe('setOpenCells', () => {
  const p = profileWith(defOf(CASHING), { 'g1@1': best(0, 1) });

  test('sets open cells in place: no new version, no reset', () => {
    const out = setOpenCells(p, 'g1', ['1,0']);
    expect(out.glyphs[0]).toMatchObject({ version: 1, params: ['1,0'] });
    expect(out.glyphArchive).toEqual([]);
    expect(out.glyphRecords).toEqual(p.glyphRecords);
    expect(setOpenCells(out, 'g1', []).glyphs[0]?.params).toEqual([]);
  });

  test('refuses Source and Aura cells, empty cells, and an unknown Glyph', () => {
    expect(() => setOpenCells(p, 'g1', ['0,0'])).toThrow("Bolt can't be an open cell");
    const aura = profileWith(defOf(spellInside(...CASHING.cells, rune('coil', 1, 1))));
    expect(() => setOpenCells(aura, 'g1', ['1,1'])).toThrow("Coil can't be an open cell");
    expect(() => setOpenCells(p, 'g1', ['5,5'])).toThrow('No rune at 5,5');
    expect(() => setOpenCells(p, 'nope', [])).toThrow('No Glyph nope');
  });

  test('one open cell, or two at Reliability gold', () => {
    expect(() => setOpenCells(p, 'g1', ['1,0', '3,0'])).toThrow('Only one open cell');
    const gold = profileWith(defOf(CASHING), { 'g1@1': best(0, 3) });
    expect(setOpenCells(gold, 'g1', ['1,0', '3,0']).glyphs[0]?.params).toEqual(['1,0', '3,0']);
    const roomy = profileWith(defOf(OTHER), { 'g1@1': best(0, 3) });
    expect(() => setOpenCells(roomy, 'g1', ['1,0', '2,0', '3,0'])).toThrow('Only 2 open cells');
    // The same cell twice is one cell.
    expect(setOpenCells(p, 'g1', ['1,0', '1,0']).glyphs[0]?.params).toEqual(['1,0']);
  });

  test('the allowance is the current version`s: a fresh version has no gold', () => {
    const gold = profileWith(defOf(CASHING), { 'g1@1': best(0, 3) });
    const v2 = reviseGlyph(gold, 'g1', CASHING);
    expect(() => setOpenCells(v2, 'g1', ['1,0', '3,0'])).toThrow('Only one open cell');
  });
});

describe('setExtraExit and extraExitSides', () => {
  const forked = spellInside(
    rune('bolt', 0, 0, 'right'),
    rune('fork', 1, 0),
    rune('ink', 1, -1),
    rune('oil', 1, 1),
  );

  test('sides are up, right or down minus the exits the inside uses', () => {
    expect(extraExitSides(defOf(CASHING))).toEqual(['up', 'down']);
    expect(extraExitSides(defOf(forked))).toEqual(['right']);
    expect(extraExitSides(defOf(CASHING, { exits: [] }))).toEqual(['up', 'right', 'down']);
  });

  test('refused below silver', () => {
    for (const reliability of [0, 1] as const) {
      const p = profileWith(defOf(CASHING), { 'g1@1': best(3, reliability) });
      expect(() => setExtraExit(p, 'g1', 'up')).toThrow('Reliability silver');
    }
    expect(() => setExtraExit(profileWith(defOf(CASHING)), 'g1', 'up')).toThrow(
      'Reliability silver',
    );
  });

  test('set at silver on a free side, changed and cleared for free', () => {
    const p = profileWith(defOf(CASHING), { 'g1@1': best(0, 2) });
    const up = setExtraExit(p, 'g1', 'up');
    expect(up.glyphs[0]).toMatchObject({ version: 1, extraExit: 'up' });
    expect(up.glyphArchive).toEqual([]);
    expect(setExtraExit(up, 'g1', 'down').glyphs[0]?.extraExit).toBe('down');
    expect(setExtraExit(up, 'g1', null).glyphs[0]?.extraExit).toBeNull();
    expect(glyphLibrary(up).g1?.extraExit).toBe('up');
  });

  test('refused on a taken side and on the way in', () => {
    const p = profileWith(defOf(CASHING), { 'g1@1': best(0, 3) });
    expect(() => setExtraExit(p, 'g1', 'right')).toThrow('already leaves right');
    expect(() => setExtraExit(p, 'g1', 'left')).toThrow('up, right or down');
    const f = profileWith(defOf(forked), { 'g1@1': best(0, 2) });
    expect(() => setExtraExit(f, 'g1', 'up')).toThrow('already leaves up');
    expect(() => setExtraExit(f, 'g1', 'down')).toThrow('already leaves down');
    expect(setExtraExit(f, 'g1', 'right').glyphs[0]?.extraExit).toBe('right');
  });

  test('clearing is always allowed, even below silver', () => {
    const p = profileWith(defOf(CASHING, { extraExit: 'up' }));
    expect(setExtraExit(p, 'g1', null).glyphs[0]?.extraExit).toBeNull();
    expect(() => setExtraExit(p, 'nope', null)).toThrow('No Glyph nope');
  });
});

// ── revisionWarning (M19) ──

describe('revisionWarning', () => {
  const placed = (def: GlyphDef, capacity: number, records: Record<string, GlyphRecord> = {}) => {
    const p = profileWith(def, records);
    return {
      ...p,
      inkCapacity: { ...p.inkCapacity, draughtsman: capacity },
      lattices: { ...p.lattices, draughtsman: [{ at: c(1, 2), glyph: 'g1', dir: 'right' as Dir }] },
    };
  };
  const v1Ink = 4; // Bolt 2 + Ink 1 + Tally 1 + Spark 1, less one for 4 cells

  test('null when the revision fits', () => {
    const p = placed(defOf(CASHING), v1Ink);
    expect(validateLoadout(p)).toEqual({});
    expect(revisionWarning(p, 'g1', CASHING)).toBeNull();
    expect(revisionWarning(p, 'nope', CASHING)).toBeNull();
  });

  test('names the page whose ink the new inside pushes over', () => {
    const p = placed(defOf(CASHING), v1Ink);
    const heavier = spellInside(...CASHING.cells, rune('coil', 1, 1));
    expect(revisionWarning(p, 'g1', heavier)).toBe("Pushes the Draughtsman's page ink over");
    // Roomy enough: no warning.
    expect(revisionWarning(placed(defOf(CASHING), 20), 'g1', heavier)).toBeNull();
  });

  test('names the page when the new inside needs runes you do not own', () => {
    const p = {
      ...placed(defOf(CASHING), 20),
      known: profileWith(defOf(CASHING)).known.filter((r) => r !== 'coil'),
    };
    const heavier = spellInside(...CASHING.cells, rune('coil', 1, 1));
    expect(revisionWarning(p, 'g1', heavier)).toBe(
      "Puts the Coil you don't know on the Draughtsman's page",
    );
  });

  test('the fresh record loses the Economy discount, and the warning says so', () => {
    const p = placed(defOf(CASHING), v1Ink - 1, { 'g1@1': best(1, 0) }); // fits only with 1 ink off
    expect(validateLoadout(p)).toEqual({});
    expect(revisionWarning(p, 'g1', CASHING)).toBe("Pushes the Draughtsman's page ink over");
  });

  test('a page already over before the revision is not blamed on it', () => {
    const p = placed(defOf(CASHING), 3);
    expect(validateLoadout(p).draughtsman?.some((i) => i.kind === 'ink')).toBe(true);
    expect(revisionWarning(p, 'g1', CASHING)).toBeNull();
  });

  test('a Glyph on no page warns nothing', () => {
    expect(revisionWarning(profileWith(defOf(CASHING)), 'g1', OTHER)).toBeNull();
  });
});

// ── revertWarning (BL-90) ──

describe('revertWarning', () => {
  const HEAVY = spellInside(...CASHING.cells, rune('coil', 1, 1));
  /** v2 (HEAVY) is current, v1 (CASHING) archived, a copy on the Draughtsman's page. */
  const twoVersions = (capacity: number, records: Record<string, GlyphRecord> = {}): Profile => {
    const v2 = reviseGlyph(profileWith(defOf(CASHING)), 'g1', HEAVY);
    return {
      ...v2,
      glyphRecords: { ...v2.glyphRecords, ...records },
      inkCapacity: { ...v2.inkCapacity, draughtsman: capacity },
      lattices: {
        ...v2.lattices,
        draughtsman: [{ at: c(1, 2), glyph: 'g1', dir: 'right' as Dir }],
      },
    };
  };
  const v1Ink = 4;

  test('null when the revert fits and no discount changes', () => {
    const p = twoVersions(20);
    expect(revertWarning(p, 'g1', 1)).toBeNull();
    // Refused reverts warn nothing: the confirm shows the refusal instead.
    expect(revertWarning(p, 'g1', 2)).toBeNull();
    expect(revertWarning(p, 'g1', 9)).toBeNull();
    expect(revertWarning(p, 'nope', 1)).toBeNull();
  });

  test('names the page whose ink the old inside pushes over', () => {
    // v1 is lighter, so going back to it fits; v2 forward from v1 does not.
    const back = revertGlyph(twoVersions(20), 'g1', 1);
    const tight = { ...back, inkCapacity: { ...back.inkCapacity, draughtsman: v1Ink } };
    expect(validateLoadout(tight)).toEqual({});
    expect(revertWarning(tight, 'g1', 2)).toBe("Pushes the Draughtsman's page ink over");
  });

  test('names the runes the old inside needs that you do not own', () => {
    const back = revertGlyph(twoVersions(20), 'g1', 1);
    const p = { ...back, known: back.known.filter((r) => r !== 'coil') };
    expect(validateLoadout(p)).toEqual({});
    expect(revertWarning(p, 'g1', 2)).toBe(
      "Puts the Coil you don't know on the Draughtsman's page",
    );
  });

  test('losing the Economy discount is said, and so is the ink it costs', () => {
    // v1 current with bronze Economy fits a page one ink short; v2 has no record.
    const back = revertGlyph(twoVersions(20, { 'g1@1': best(1, 0) }), 'g1', 1);
    const tight = { ...back, inkCapacity: { ...back.inkCapacity, draughtsman: v1Ink - 1 } };
    expect(validateLoadout(tight)).toEqual({});
    // Same inside both ways: only the record differs.
    const same = {
      ...tight,
      glyphArchive: tight.glyphArchive.map((g) => ({ ...g, cells: CASHING.cells })),
    };
    expect(revertWarning(same, 'g1', 2)).toBe(
      "Loses the 1-ink Economy discount; Pushes the Draughtsman's page ink over",
    );
  });

  test('a gained or changed discount is said too, with no page blamed', () => {
    expect(revertWarning(twoVersions(20, { 'g1@1': best(2, 0) }), 'g1', 1)).toBe(
      'Gains a 2-ink Economy discount',
    );
    expect(
      revertWarning(twoVersions(20, { 'g1@1': best(1, 0), 'g1@2': best(3, 0) }), 'g1', 1),
    ).toBe('The Economy discount drops from 3 to 1 ink');
    expect(
      revertWarning(twoVersions(20, { 'g1@1': best(3, 0), 'g1@2': best(1, 0) }), 'g1', 1),
    ).toBe('The Economy discount rises from 1 to 3 ink');
  });

  test('a page already over before the revert is not blamed on it', () => {
    const p = twoVersions(2);
    expect(validateLoadout(p).draughtsman?.some((i) => i.kind === 'ink')).toBe(true);
    expect(revertWarning(p, 'g1', 1)).toBeNull();
  });
});

// ── Identity: a revised inside behaves like the same cells stamped flat ──

const LEAN = MEMBERS.draughtsman.lean;
const ROOT = c(4, 4);
const SHAPE = { width: 12, height: 9, holes: [] };
const WORLD: Record<Dir, Coord> = {
  up: c(0, -1),
  right: c(1, 0),
  down: c(0, 1),
  left: c(-1, 0),
};
const TAILS = ['spark', 'oil', 'ink'] as const;

/**
 * The inside stamped flat on a roomy lattice at ROOT (a Payload fed by a Bolt on its left), with a
 * tail rune just outside each exit; and the Glyph lattice with the same tails beyond the socket.
 */
function twins(inside: GlyphInside, glyphId: string): { flat: Lattice; glued: Lattice } {
  const at = (o: Coord): Coord => c(ROOT.x + o.x, ROOT.y + o.y);
  const feeder =
    inside.kind === 'payload'
      ? [{ at: c(ROOT.x - 1, ROOT.y), rune: 'bolt' as const, dir: 'right' as Dir }]
      : [];
  const exits = innerMeta(inside).exits;
  const flatTails = exits.map((e, i) => ({
    at: at({ x: e.from.x + WORLD[e.dir].x, y: e.from.y + WORLD[e.dir].y }),
    rune: TAILS[i % TAILS.length] as (typeof TAILS)[number],
  }));
  const gluedTails = exits.map((e, i) => ({
    at: at(WORLD[e.dir]),
    rune: TAILS[i % TAILS.length] as (typeof TAILS)[number],
  }));
  return {
    flat: {
      shape: SHAPE,
      runes: [...feeder, ...inside.cells.map((x) => ({ ...x, at: at(x.at) })), ...flatTails],
    },
    glued: {
      shape: SHAPE,
      runes: [...feeder, { at: ROOT, glyph: glyphId, dir: 'right' as Dir }, ...gluedTails],
    },
  };
}

const BOARDS = [
  'D . . d . .\n. . . . . .\n. . . S . .',
  'D . ro o d .\n. r . . . .\n. . . . . .',
  'D . d . d .\n. r d . . .\n. . ~ . . .',
];

function battleWith(board: string, spells: Spell[]): BattleState {
  return createBattle({ title: 'test', seed: 1, board, party: { draughtsman: { spells } } }).state;
}
/** The cast's log, then its spell's Step tree with the page coordinates left out. */
function castLog(state: BattleState, aim: Aim): string[] {
  const spell = state.units.find((u) => u.kind === 'member')?.spells[0];
  const what = JSON.stringify([spell?.source, spell?.sourceAuras, stepShape(spell?.first ?? null)]);
  return [...describeLog(cast(state, 'draughtsman', aim).events), what];
}

describe('identity: a revised inside casts what the same cells stamped flat cast', () => {
  const forked = spellInside(
    rune('bolt', 0, 0, 'right'),
    rune('fork', 1, 0),
    rune('ink', 1, -1),
    rune('oil', 1, 1),
    rune('coil', 0, -1),
  );
  const bonfire = spellInside(
    rune('splash', 0, 0, 'right'),
    rune('oil', 1, 0),
    rune('spark', 2, 0),
  );
  const payload = payloadInside(rune('ink', 0, 0), rune('tally', 1, 0), rune('spark', 2, 0));
  const bent = payloadInside(
    rune('ink', 0, 0),
    rune('bend', 1, 0, 'down'),
    rune('oil', 1, 1),
    rune('spark', 1, 2),
  );
  const cases: [string, GlyphInside, GlyphInside][] = [
    ['a trigger, from another inside', CASHING, OTHER],
    ['a Fork with an inner aura', forked, CASHING],
    ['an area source (Splash)', bonfire, CASHING],
    [
      'a Payload',
      payload,
      payloadInside(rune('oil', 0, 0), rune('spark', 1, 0), rune('ink', 2, 0)),
    ],
    ['a Payload with a Bend', bent, payload],
  ];

  for (const [name, inside, from] of cases) {
    test(name, () => {
      const start = profileWith(defOf(from));
      const revised = reviseGlyph(start, 'g1', inside);
      const def = revised.glyphs[0];
      if (!def) throw new Error('no glyph');
      expect(def.version).toBe(2);
      const { flat, glued } = twins(inside, 'g1');
      const flatSpells = compileLattice(flat, {}, {}, LEAN).spells;
      const gluedSpells = compileLattice(glued, glyphLibrary(revised), {}, LEAN).spells;
      expect(flatSpells).toHaveLength(1);
      expect(gluedSpells).toHaveLength(1);
      const splash = inside.cells.some((x) => x.rune === 'splash');
      const logs = BOARDS.map((board) => {
        const aim: Aim = splash ? { kind: 'tile', at: c(2, 0) } : { kind: 'dir', dir: 'right' };
        const a = castLog(battleWith(board, flatSpells), aim);
        expect(castLog(battleWith(board, gluedSpells), aim)).toEqual(a);
        return a;
      });
      expect(logs.some((l) => l.length > 0)).toBe(true);
    });
  }

  test('reached cells agree with the compiler`s flat walk (no cell reported stranded that casts)', () => {
    for (const [, inside] of cases) {
      expect(insideIssues(inside).filter((i) => i.kind === 'stranded')).toEqual([]);
      const { flat } = twins(inside, 'g1');
      const reached = new Set(compileLattice(flat, {}, {}, LEAN).reached);
      for (const x of inside.cells) {
        if (['aura', 'source'].includes(RUNES_FAMILY(x.rune))) continue;
        expect(reached.has(`${ROOT.x + x.at.x},${ROOT.y + x.at.y}`)).toBe(true);
      }
    }
  });
});

const RUNES_FAMILY = (r: PlacedRune['rune']) => roleOf(r) ?? '';
