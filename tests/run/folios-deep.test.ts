import { describe, expect, test } from 'vitest';
import { DRAFTS, type DraftDef, RUNES } from '$data';
import { draftInside, draftTest, type GlyphInside, insideIssues, trayCounts } from '$engine';
import {
  both,
  checkFolio,
  lift,
  moveCell,
  OLD_FIXES,
  oneEditNeighbours,
  passesUpTo,
  patchCell,
  place,
  type Tweak,
} from '../helpers/folio';
import { SOLUTIONS } from '../helpers/folio-solutions';

/**
 * Task C2 (folios plan §3, §4.3–4.5): the deep and heart folios. The fixes live here, never in
 * the data. Local cells: the entry is (0,0), flow enters rightward, y grows downward.
 */

const draft = (id: string): DraftDef => {
  const d = DRAFTS.find((x) => x.id === id);
  if (!d) throw new Error(`no draft ${id}`);
  return d;
};

/**
 * Fixes a player is likely to try on `page` (0-based), applied to the previous page's solution:
 * each passes that page's own test, and `breaks` lists exactly the earlier tests it fails.
 */
interface Tempting {
  page: number;
  why: string;
  tweak: Tweak;
  breaks: number[];
}
const TEMPTING: Record<string, Tempting[]> = {
  'wet-work': [
    {
      page: 2,
      why: 'both Amplifies on the finishing Spark: it hits the puddle too and kills the bystander',
      tweak: both(place([4, 0], 'amplify'), place([4, 2], 'amplify')),
      breaks: [1],
    },
    {
      page: 2,
      why: 'one Amplify on each Spark: the finishing one still burns the bystander',
      tweak: both(place([2, 0], 'amplify'), place([5, 1], 'amplify')),
      breaks: [1],
    },
  ],
  'left-hand-first': [
    {
      page: 2,
      why: 'the Bend folds left, so the Amplify also feeds the Bolt: page 1 dies before its mark pays',
      tweak: both(
        patchCell([1, -2], { rune: 'bend', dir: 'left' }),
        place([0, -2], 'ink'),
        place([0, -1], 'amplify'),
      ),
      breaks: [0],
    },
  ],
  'foundry-bell': [
    {
      page: 2,
      why: 'lift the Amplify off the Ink: the watcher lives, but page 2 loses its loud Spark',
      tweak: lift([1, -1]),
      breaks: [1],
    },
    {
      page: 3,
      why: 'Etch straight after the Splash: it marks first, so Smear has nobody new to pass from',
      tweak: both(
        moveCell([2, -2], [3, -2]),
        moveCell([3, -1], [4, -1]),
        moveCell([3, 0], [4, 0]),
        moveCell([2, -1], [3, -1]),
        moveCell([2, 0], [3, 0]),
        patchCell([1, 0], { rune: 'etch' }),
        place([2, 0], 'smear'),
        place([0, -1], 'amplify'),
      ),
      breaks: [1, 2],
    },
  ],
};

const IDS = ['wet-work', 'left-hand-first', 'foundry-bell'];

describe.each(IDS)('%s', (id) => {
  const d = draft(id);
  const sols = SOLUTIONS[id] as GlyphInside[];
  const last = d.pages.length - 1;

  test('the folio and its solutions are sound', () => {
    expect(checkFolio(d, sols)).toEqual([]);
  });

  test('the final shape is a clean page that fits the canvas', () => {
    const final = sols[last] as GlyphInside;
    expect(insideIssues(final)).toEqual([]);
    const flow = final.cells.filter((c) => RUNES[c.rune].family !== 'aura');
    expect(flow.length).toBeLessThanOrEqual(8);
  });

  test('every page from the second needs more than one edit', () => {
    for (let k = 1; k <= last; k++) {
      const from = sols[k - 1] as GlyphInside;
      const shortcut = oneEditNeighbours(from, trayCounts(d, k)).find((n) => passesUpTo(d, k, n));
      expect(shortcut, `page ${k + 1} has a one-edit fix`).toBeUndefined();
    }
  });

  test('the 2026-10-16 fix no longer mends the folio (F15)', () => {
    const old = (OLD_FIXES[id] as Tweak)(draftInside(d));
    expect(passesUpTo(d, last, old)).toBe(false);
  });

  test('decoys are drawer scraps and the final shape leaves them be', () => {
    const scraps = new Set(d.pages.flatMap((p) => Object.keys(p.scraps)));
    for (const r of d.decoys) expect(scraps.has(r)).toBe(true);
  });

  const tempting = TEMPTING[id] ?? [];
  test('at least one tempting fix is a designed regression', () => {
    expect(tempting.some((t) => t.breaks.length > 0)).toBe(true);
  });

  test.each(tempting.map((t) => [t.page + 1, t.why, t] as const))(
    'page %i, tempting: %s',
    (_page, _why, t) => {
      const inside = t.tweak(sols[t.page - 1] as GlyphInside);
      expect(draftTest(d, (d.pages[t.page] as DraftDef['pages'][number]).test, inside).passed).toBe(
        true,
      );
      const failing = d.pages
        .slice(0, t.page)
        .map((p, j) => (draftTest(d, p.test, inside).passed ? -1 : j))
        .filter((j) => j >= 0);
      expect(failing).toEqual(t.breaks);
    },
  );
});

test('decoy counts per folio (F13)', () => {
  expect(draft('wet-work').decoys).toEqual([]);
  expect(draft('left-hand-first').decoys).toHaveLength(1);
  expect(draft('foundry-bell').decoys).toHaveLength(2);
});
