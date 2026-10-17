import { describe, expect, test } from 'vitest';
import { DRAFTS, type DraftDef } from '$data';
import { draftInside, folioRun, trayCounts, trayIssue } from '$engine';
import { OLD_FIXES, oneEditNeighbours, passesUpTo, place } from '../helpers/folio';

/** W0 of the folios plan (BL-14): the tray, the suite run and the test helper, on the placeholders. */

const draft = (id: string): DraftDef => {
  const d = DRAFTS.find((x) => x.id === id);
  if (!d) throw new Error(`no draft ${id}`);
  return d;
};

describe('the tray (F1)', () => {
  test("the owner's page runes, counted", () => {
    expect(trayCounts(draft('lamplighter'), 0)).toEqual({ bolt: 1, bend: 1, spark: 1 });
  });

  test('scraps add up page by page', () => {
    const d: DraftDef = {
      ...draft('lamplighter'),
      pages: [
        { ...(draft('lamplighter').pages[0] as DraftDef['pages'][number]), scraps: { oil: 1 } },
        {
          ...(draft('lamplighter').pages[0] as DraftDef['pages'][number]),
          scraps: { oil: 1, amplify: 1 },
        },
      ],
    };
    expect(trayCounts(d, 0)).toMatchObject({ oil: 1 });
    expect(trayCounts(d, 1)).toMatchObject({ oil: 2, amplify: 1 });
  });

  test('a rune the drawer lacks, or one too many, is named', () => {
    const d = draft('lamplighter');
    const start = draftInside(d);
    expect(trayIssue(d, 0, start)).toBeNull();
    expect(trayIssue(d, 0, place([3, 3], 'oil')(start))).toBe('The drawer has no Oil');
    expect(trayIssue(d, 0, place([3, 3], 'spark')(start))).toBe('The drawer has no more Spark');
  });
});

describe('the suite run (F4)', () => {
  test('runs the unlocked tests in page order; the old fix still mends page 1 of a placeholder', () => {
    for (const d of DRAFTS) {
      const fixed = OLD_FIXES[d.id];
      if (!fixed) throw new Error(`no old fix for ${d.id}`);
      const run = folioRun(d, 0, fixed(draftInside(d)));
      expect(run.tests).toHaveLength(1);
      expect(run.passed).toBe(passesUpTo(d, 0, fixed(draftInside(d))));
      expect(folioRun(d, 0, draftInside(d)).passed).toBe(false);
    }
  });
});

describe('oneEditNeighbours', () => {
  test('places only free tray runes, never a second Source in a Spell, and keeps the entry', () => {
    const d = draft('lamplighter');
    const start = draftInside(d);
    const tray = { ...trayCounts(d, 0), oil: 1 };
    const next = oneEditNeighbours(start, tray);
    expect(next.length).toBeGreaterThan(0);
    for (const n of next) {
      expect(n.cells.some((c) => c.rune === 'bolt' && c.at.x === 0 && c.at.y === 0)).toBe(true);
      expect(n.cells.filter((c) => c.rune === 'oil').length).toBeLessThanOrEqual(1);
      expect(Math.abs(n.cells.length - start.cells.length)).toBeLessThanOrEqual(1);
    }
    expect(next.some((n) => n.cells.some((c) => c.rune === 'oil'))).toBe(true);
  });
});
