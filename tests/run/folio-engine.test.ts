import { afterEach, describe, expect, test } from 'vitest';
import { DRAFTS, type DraftDef, TUNING } from '$data';
import {
  draftInside,
  draftRecord,
  editDraft,
  type GlyphDef,
  type GlyphInside,
  lastPage,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  recordGlyphCasts,
  recordOf,
  repairDraft,
  resetDraft,
  revertGlyph,
  reviseGlyph,
  rewardsOf,
  tierUps,
  turnPage,
  versionKey,
} from '$engine';
import { parse, serialize } from '../../src/app/save';
import { OLD_FIXES, patchCell, place } from '../helpers/folio';

/**
 * E1 of the folios plan (BL-14): turning pages, the tray on edit, the bronze reward. The shipped
 * folios may have any page count, so these tests swap the Lamplighter's pages in place.
 */

const INDEX = DRAFTS.findIndex((d) => d.id === 'lamplighter');
const REAL = DRAFTS[INDEX] as DraftDef;
/** The Lamplighter's first test with an empty drawer, so each test sets the scraps it needs. */
const PAGE: DraftDef['pages'][number] = {
  ...(REAL.pages[0] as DraftDef['pages'][number]),
  scraps: {},
};
const IMPOSSIBLE: DraftDef['pages'][number] = {
  ...PAGE,
  test: { ...PAGE.test, goal: { hurt: 'dummy-1', atLeast: 999 } },
};

/** Gives the Lamplighter these pages for the rest of the test. */
function withPages(...pages: DraftDef['pages']): DraftDef {
  const d = { ...REAL, pages };
  (DRAFTS as DraftDef[])[INDEX] = d;
  return d;
}
afterEach(() => {
  (DRAFTS as DraftDef[])[INDEX] = REAL;
});

const fix = (d: DraftDef): GlyphInside =>
  (OLD_FIXES.lamplighter as (i: GlyphInside) => GlyphInside)(draftInside(d));

const STUB: GlyphDef = {
  id: 'g1',
  name: 'Stub',
  kind: 'spell',
  cells: [{ at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' }],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: null,
};
const owning = (d: DraftDef): Profile => ({
  ...newProfile(),
  glyphs: [STUB],
  drafts: [{ id: d.id, inside: draftInside(d), page: 0, repaired: false }],
});

describe('turnPage (F2, F7)', () => {
  test('refuses while a test fails', () => {
    const d = withPages(PAGE, PAGE);
    expect(() => turnPage(owning(d), d.id)).toThrow(/fails a test/);
  });

  test('turns once every unlocked test passes, keeping the inside', () => {
    const d = withPages(PAGE, PAGE);
    const p = editDraft(owning(d), d.id, fix(d));
    const out = turnPage(p, d.id);
    expect(out.drafts[0]?.page).toBe(1);
    expect(out.drafts[0]?.inside).toEqual(fix(d));
    expect(out.drafts[0]?.repaired).toBe(false);
    expect(p.drafts[0]?.page).toBe(0);
  });

  test('refuses on the last page', () => {
    const d = withPages(PAGE);
    const p = editDraft(owning(d), d.id, fix(d));
    expect(lastPage(d)).toBe(0);
    expect(() => turnPage(p, d.id)).toThrow(/last page/);
  });

  test('refuses on a mended copy', () => {
    const d = withPages(PAGE);
    const mended = repairDraft(editDraft(owning(d), d.id, fix(d)), d.id);
    expect(() => turnPage(mended, d.id)).toThrow(/already mended/);
  });

  test('a later test that fails keeps the page shut (earlier tests still count)', () => {
    const d = withPages(PAGE, IMPOSSIBLE, PAGE);
    const on1 = turnPage(editDraft(owning(d), d.id, fix(d)), d.id);
    expect(on1.drafts[0]?.page).toBe(1);
    expect(() => turnPage(on1, d.id)).toThrow(/fails a test/);
  });
});

describe('resetDraft and editDraft on a folio (F1, F3)', () => {
  test('reset keeps the page and restores the owner start', () => {
    const d = withPages(PAGE, PAGE);
    const on1 = turnPage(editDraft(owning(d), d.id, fix(d)), d.id);
    const back = resetDraft(on1, d.id);
    expect(back.drafts[0]?.page).toBe(1);
    expect(back.drafts[0]?.inside).toEqual(draftInside(d));
  });

  test('edit refuses a rune the tray lacks, allows it once a scrap brings it', () => {
    const start = draftInside(REAL);
    const withOil = place([3, 3], 'oil')(start);
    const d = withPages(PAGE, { ...PAGE, scraps: { oil: 1 } });
    expect(() => editDraft(owning(d), d.id, withOil)).toThrow('The drawer has no Oil');
    const on1 = turnPage(editDraft(owning(d), d.id, fix(d)), d.id);
    expect(editDraft(on1, d.id, place([3, 3], 'oil')(fix(d))).drafts[0]?.inside.cells).toHaveLength(
      4,
    );
  });

  test('edit stays lenient about stranded cells', () => {
    const stranded = place([0, 3], 'spark')(draftInside(REAL));
    const d = withPages(PAGE);
    expect(() => editDraft(owning(d), d.id, stranded)).toThrow(/no more Spark/);
    // A scrap Spark puts the stranded rune in the tray, and the edit is saved.
    const d2 = withPages({ ...PAGE, scraps: { spark: 1 } });
    expect(editDraft(owning(d2), d2.id, stranded).drafts[0]?.inside).toEqual(stranded);
  });
});

describe('repair on a folio (F8, F9)', () => {
  test('refuses before the last page, when a test fails and when the tray is broken', () => {
    const d = withPages(PAGE, PAGE);
    expect(() => repairDraft(editDraft(owning(d), d.id, fix(d)), d.id)).toThrow(/more pages/);
    const on1 = turnPage(editDraft(owning(d), d.id, fix(d)), d.id);
    // Fails the last page's test.
    const hard = withPages(PAGE, IMPOSSIBLE);
    expect(() => repairDraft(on1, hard.id)).toThrow(/fails a test/);
    // Tray: a rune the drawer doesn't hold (stored directly, as a save could hold it).
    const over: Profile = {
      ...on1,
      drafts: [
        {
          ...(on1.drafts[0] as Profile['drafts'][number]),
          inside: patchCell([1, 1], { rune: 'oil' })(fix(d)),
        },
      ],
    };
    withPages(PAGE, PAGE);
    expect(() => repairDraft(over, d.id)).toThrow('The drawer has no Oil');
  });

  test('refuses a page with a stranded cell', () => {
    const d = withPages(PAGE, { ...PAGE, scraps: { spark: 1 } });
    const on1 = turnPage(editDraft(owning(d), d.id, fix(d)), d.id);
    const stranded = editDraft(on1, d.id, place([0, 3], 'spark')(fix(d)));
    expect(() => repairDraft(stranded, d.id)).toThrow(/never reached/);
  });

  test('mends on the last page: Glyph with draft set and the bronze record', () => {
    const d = withPages(PAGE, PAGE);
    const on1 = turnPage(editDraft(owning(d), d.id, fix(d)), d.id);
    const out = repairDraft(on1, d.id);
    const g = out.glyphs.find((x) => x.draft === d.id);
    expect(g).toBeDefined();
    expect(out.glyphRecords[versionKey(g?.id ?? '', 1)]).toEqual(draftRecord());
    expect(out.drafts[0]?.repaired).toBe(true);
    expect(out.drafts[0]?.page).toBe(1);
  });

  test('draftRecord is empty but for the bronze tier', () => {
    const r = draftRecord();
    expect(r.best).toEqual({ economy: 0, reliability: TUNING.draftRewardTier.reliability });
    expect(r.casts).toBe(0);
    expect(r.recent).toEqual([]);
    expect(r.fired).toEqual({});
  });

  test('bronze gives no extra exit or discount; no tier-up is reported; a save accepts it', () => {
    const d = withPages(PAGE);
    const out = repairDraft(editDraft(owning(d), d.id, fix(d)), d.id);
    const g = out.glyphs.find((x) => x.draft === d.id) as GlyphDef;
    const rewards = rewardsOf(recordOf(out, g.id, 1));
    expect(rewards.discount).toBe(0);
    expect(rewards.extraExit).toBe(false);
    expect(rewards.params).toBe(TUNING.paramSlots);
    // A trip that does not cast it: nothing rises.
    expect(tierUps(out, recordGlyphCasts(out, []))).toEqual([]);
    // A best tier with an empty window parses and round-trips.
    const save = { ...newSave(1), profile: out };
    expect(parseSaveData(parse(serialize(save)).data)).toEqual(save);
  });
});

describe('revising a mended folio Glyph', () => {
  test('keeps draft on v2 with an empty record; revert brings bronze back', () => {
    const d = withPages(PAGE);
    const out = repairDraft(editDraft(owning(d), d.id, fix(d)), d.id);
    const g = out.glyphs.find((x) => x.draft === d.id) as GlyphDef;
    const v2 = reviseGlyph(out, g.id, patchCell([1, 1], { rune: 'ink' })(fix(d)));
    const cur = v2.glyphs.find((x) => x.id === g.id);
    expect(cur?.version).toBe(2);
    expect(cur?.draft).toBe(d.id);
    expect(recordOf(v2, g.id, 2).best.reliability).toBe(0);
    const back = revertGlyph(v2, g.id, 1);
    expect(back.glyphs.find((x) => x.id === g.id)?.version).toBe(1);
    expect(recordOf(back, g.id, 1)).toEqual(draftRecord());
  });
});
