import { describe, expect, test } from 'vitest';
import { DRAFTS, type DraftDef } from '$data';
import { draftInside, draftTest, type GlyphInside, insideIssues, trayIssue } from '$engine';
import {
  both,
  checkFolio,
  OLD_FIXES,
  passesUpTo,
  patchCell,
  place,
  type Tweak,
} from '../helpers/folio';
import { SOLUTIONS } from '../helpers/folio-solutions';

/**
 * Task C1 (folios plan §4): the two tutorial folios. Solutions are one inside per page, built from
 * the owner's page. TEMPTING are plausible fixes (a tweak of the previous page's solution, judged on
 * the suite of its page) and the tests they fail.
 */

interface Tempting {
  page: number;
  tweak: Tweak;
  /** Indices of the tests that fail with the tweak. */
  breaks: number[];
  why: string;
}

const draft = (id: string): DraftDef => {
  const d = DRAFTS.find((x) => x.id === id);
  if (!d) throw new Error(`no draft ${id}`);
  return d;
};
const LAMPLIGHTER = draft('lamplighter');
const COLLECTION = draft('collection');
const DEFS = { lamplighter: LAMPLIGHTER, collection: COLLECTION };

const TEMPTING: Record<string, Tempting[]> = {
  lamplighter: [
    {
      page: 1,
      tweak: place([1, 2], 'oil'),
      breaks: [1],
      why: 'Oil after the Spark: the flame reaches bare floor and nothing lights',
    },
    {
      page: 1,
      tweak: place([2, 1], 'amplify'),
      breaks: [1],
      why: 'More force on a dry street: it hits harder but never lights',
    },
  ],
  collection: [
    {
      page: 1,
      tweak: place([4, 1], 'amplify'),
      breaks: [1],
      why: 'Stronger, but the bolt still stops at the first unit',
    },
    {
      page: 1,
      // Pierce on the broken order: reaching both units doesn't help while the door is first.
      tweak: both(
        patchCell([1, 0], { rune: 'onInked' }),
        patchCell([2, 0], { rune: 'ink' }),
        place([4, 0], 'pierce'),
      ),
      breaks: [0, 1],
      why: 'Pierce on the owner’s order: both tests still fail, the door is still before the knock',
    },
  ],
};

describe.each(Object.entries(DEFS))('%s', (id, def) => {
  const solutions = SOLUTIONS[id] ?? [];

  test('the folio is sound (tray, pages, sizes, tests, no free page)', () => {
    expect(checkFolio(def, solutions)).toEqual([]);
  });

  test('the final shape is a clean page that uses an aura', () => {
    const last = solutions[solutions.length - 1] as GlyphInside;
    expect(insideIssues(last)).toEqual([]);
    expect(last.cells.some((c) => c.rune === 'amplify')).toBe(true);
  });

  test("the 2026-10-16 one-page fix fails the folio's last page (F15)", () => {
    const old = (OLD_FIXES[id] as Tweak)(draftInside(def));
    const k = def.pages.length - 1;
    expect(trayIssue(def, k, old)).toBeNull();
    expect(passesUpTo(def, 0, old)).toBe(true);
    const last = def.pages[k];
    expect(last && draftTest(def, last.test, old).passed).toBe(false);
  });

  test.each(TEMPTING[id] ?? [])('tempting: $why', ({ page, tweak, breaks }) => {
    const base = solutions[page - 1] as GlyphInside;
    const tried = tweak(base);
    expect(trayIssue(def, page, tried)).toBeNull();
    const failing = def.pages
      .slice(0, page + 1)
      .map((p, i) => (draftTest(def, p.test, tried).passed ? -1 : i))
      .filter((i) => i >= 0);
    expect(failing).toEqual(breaks);
  });
});
