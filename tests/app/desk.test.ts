import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { DRAFTS, type DraftDef, type DraftTest } from '$data';
import { draftInside, draftTest, folioRun, type GlyphInside, key, trayCounts } from '$engine';
import {
  brokeFlags,
  cellMarks,
  deskRows,
  draftStage,
  draftsLabel,
  drawerView,
  goalSentences,
  noteFragments,
  pageLabel,
  playedTest,
  scrapsLine,
  testChips,
  trayPalette,
} from '../../src/app/desk';
import { parseSaveText, saveText } from '../../src/app/save';
import { SOLUTIONS } from '../helpers/folio-solutions';

/** Page 1's test (a folio's first page). */
const first = (d: DraftDef): DraftTest => {
  const page = d.pages[0];
  if (!page) throw new Error(`${d.id} has no pages`);
  return page.test;
};

const draft = (id: string) => {
  const d = DRAFTS.find((x) => x.id === id);
  if (!d) throw new Error(`no draft ${id}`);
  return d;
};
const copyOf = (id: string, repaired = false) => ({
  id,
  inside: draftInside(draft(id)),
  page: 0,
  repaired,
});
/** The Lamplighter's Bend turned the right way (the fix lives in tests/run/drafts.test.ts too). */
const lamplighterFixed = (): GlyphInside => {
  const i = draftInside(draft('lamplighter'));
  return {
    ...i,
    cells: i.cells.map((c) => (c.rune === 'bend' ? { ...c, dir: 'down' as const } : c)),
  };
};

describe('goalSentences', () => {
  test('an event goal reads as a plain sentence', () => {
    expect(goalSentences({ happens: 'ignite' })).toEqual(['Something catches fire']);
    expect(goalSentences({ happens: 'detonate' })).toEqual(['Something detonates']);
  });

  test('atLeast adds a count only above one', () => {
    expect(goalSentences({ happens: 'ignite', atLeast: 1 })).toEqual(['Something catches fire']);
    expect(goalSentences({ happens: 'ignite', atLeast: 2 })).toEqual([
      'Something catches fire, at least twice',
    ]);
    expect(goalSentences({ happens: 'ignite', atLeast: 3 })).toEqual([
      'Something catches fire, at least 3 times',
    ]);
  });

  test('hurt, dies, spared and tile goals', () => {
    expect(goalSentences({ hurt: 'dummy-1', atLeast: 3 })).toEqual(['dummy-1 takes at least 3']);
    expect(goalSentences({ dies: 'rat-1' })).toEqual(['rat-1 dies']);
    expect(goalSentences({ spared: 'sentry-1' })).toEqual(['sentry-1 is left standing']);
    expect(goalSentences({ tile: 'B2', has: 'fire' })).toEqual(['B2 is burning']);
    expect(goalSentences({ tile: 'C1', has: 'oil' })).toEqual(['C1 is slick with oil']);
    expect(goalSentences({ tile: 'C1', has: 'ink' })).toEqual(['C1 is marked with ink']);
    expect(goalSentences({ tile: 'A3', has: 'steam' })).toEqual(['A3 is full of steam']);
    expect(goalSentences({ tile: 'A3', has: 'plate' })).toEqual(['A3 holds a pressure plate']);
  });

  test('all is flattened in order, including nested alls', () => {
    expect(
      goalSentences({
        all: [{ happens: 'ignite' }, { all: [{ dies: 'rat-1' }, { dies: 'rat-2' }] }],
      }),
    ).toEqual(['Something catches fire', 'rat-1 dies', 'rat-2 dies']);
  });

  test('every draft has one line per goal the test checks', () => {
    for (const d of DRAFTS) {
      const run = draftTest(d, first(d), draftInside(d));
      expect(goalSentences(first(d).goal)).toHaveLength(run.goals.length);
    }
  });
});

describe('the desk list', () => {
  test('rows come in story order whatever order they were banked in', () => {
    const rows = deskRows([copyOf('wet-work'), copyOf('lamplighter'), copyOf('collection', true)]);
    expect(rows.map((r) => r.def.id)).toEqual(['lamplighter', 'collection', 'wet-work']);
    expect(rows.map((r) => r.copy.repaired)).toEqual([false, true, false]);
  });

  test('a copy of a draft that no longer exists is dropped', () => {
    const rows = deskRows([copyOf('lamplighter'), { ...copyOf('lamplighter'), id: 'gone' }]);
    expect(rows.map((r) => r.def.id)).toEqual(['lamplighter']);
  });

  test('the Study link shows once any draft is banked', () => {
    expect(draftsLabel([])).toBeNull();
    expect(draftsLabel([copyOf('lamplighter')])).toBe('Drafts · 1');
    expect(draftsLabel([copyOf('lamplighter'), copyOf('collection', true)])).toBe('Drafts · 2');
  });
});

describe('the lit and faded cells', () => {
  test('before a run, only the cells the flow never reaches are faded', () => {
    const marks = cellMarks(draftInside(draft('lamplighter')), null);
    expect(Object.values(marks).every((m) => m === 'faded')).toBe(true);
    expect(Object.keys(marks).length).toBeGreaterThan(0);
    expect(marks[key({ x: 0, y: 0 })]).toBeUndefined();
  });

  test('after a failing run the entry is lit and the stranded rune is faded', () => {
    const d = draft('lamplighter');
    const inside = draftInside(d);
    const run = draftTest(d, first(d), inside);
    expect(run.passed).toBe(false);
    const marks = cellMarks(inside, run.events);
    expect(marks[key({ x: 0, y: 0 })]).toBe('lit');
    expect(Object.values(marks)).toContain('faded');
  });

  test('after a passing run every rune of the Lamplighter is lit', () => {
    const d = draft('lamplighter');
    const inside = lamplighterFixed();
    const run = draftTest(d, first(d), inside);
    expect(run.passed).toBe(true);
    const marks = cellMarks(inside, run.events);
    expect(Object.keys(marks)).toHaveLength(inside.cells.length);
    expect(Object.values(marks).every((m) => m === 'lit')).toBe(true);
  });
});

describe('the editor palette and the stage', () => {
  test("the palette is the tray: page runes and page 1's scraps, counted, nothing from the collection", () => {
    const d = draft('lamplighter');
    expect(trayPalette(d, 0)).toEqual([
      { rune: 'bolt', count: 1 },
      { rune: 'oil', count: 1 },
      { rune: 'spark', count: 1 },
      { rune: 'bend', count: 1 },
    ]);
  });

  test("the stage's events are the start of the test's log", () => {
    for (const d of DRAFTS) {
      const stage = draftStage(d, first(d));
      const run = draftTest(d, first(d), draftInside(d));
      expect(run.events.slice(0, stage.events.length)).toEqual(stage.events);
      expect(run.events[stage.events.length]?.type).toBe('cast');
    }
  });
});

describe('the folios fixture', () => {
  test('is a valid v6 save: five folios at mixed pages, one mended with its Glyph', () => {
    const text = readFileSync(new URL('../fixtures/folios-save.json', import.meta.url), 'utf8');
    expect((JSON.parse(text) as { version: number }).version).toBe(6);
    const save = parseSaveText(text);
    const drafts = save.profile.drafts;
    expect(drafts.map((c) => c.id).sort()).toEqual(DRAFTS.map((d) => d.id).sort());
    expect(new Set(drafts.map((c) => c.page)).size).toBeGreaterThan(2);
    const mended = drafts.filter((c) => c.repaired);
    expect(mended.map((c) => c.id)).toEqual(['lamplighter']);
    expect(save.profile.glyphs.some((g) => g.draft === 'lamplighter')).toBe(true);
    expect(parseSaveText(saveText(save))).toEqual(save);
  });
});

describe('the folio view', () => {
  const at = (id: string, page: number, repaired = false) => ({
    id,
    inside: SOLUTIONS[id]?.[page] ?? draftInside(draft(id)),
    page,
    repaired,
  });
  const solution = (id: string, page: number): GlyphInside => {
    const inside = SOLUTIONS[id]?.[page];
    if (!inside) throw new Error(`no solution ${id} ${page}`);
    return inside;
  };

  test('list rows say "page n / total" or "mended"', () => {
    const d = draft('wet-work');
    expect(pageLabel(d, at('wet-work', 0))).toBe(`page 1 / ${d.pages.length}`);
    expect(pageLabel(d, at('wet-work', 1))).toBe(`page 2 / ${d.pages.length}`);
    expect(pageLabel(d, at('wet-work', d.pages.length - 1, true))).toBe('mended');
  });

  test('note fragments grow with the page, and a mended folio shows them all', () => {
    const d = draft('foundry-bell');
    expect(noteFragments(d, at('foundry-bell', 0))).toEqual([d.pages[0]?.note]);
    expect(noteFragments(d, at('foundry-bell', 2))).toHaveLength(3);
    expect(noteFragments(d, at('foundry-bell', 3, true))).toHaveLength(d.pages.length);
  });

  test('the palette is the tray of the page and grows with the scraps', () => {
    for (const d of DRAFTS) {
      d.pages.forEach((_, p) => {
        const tray = trayCounts(d, p);
        const slots = trayPalette(d, p);
        expect(slots.every((s) => s.count === tray[s.rune])).toBe(true);
        expect(slots.reduce((n, s) => n + (s.count ?? 0), 0)).toBe(
          Object.values(tray).reduce((n, c) => n + (c ?? 0), 0),
        );
      });
    }
  });

  test('the drawer counts free runes and tags the latest page scraps as new', () => {
    const d = draft('lamplighter');
    const inside = solution('lamplighter', 1);
    const chips = drawerView(d, 1, inside);
    const total = chips.reduce((n, c) => n + c.total, 0);
    expect(total).toBe(inside.cells.length);
    expect(chips.every((c) => c.free === 0)).toBe(true);
    const dropped = Object.keys(d.pages[1]?.scraps ?? {});
    expect(
      chips
        .filter((c) => c.fresh)
        .map((c) => c.rune)
        .sort(),
    ).toEqual(dropped.sort());
    // Page 1's own scraps arrive with the folio, so nothing is new there.
    expect(drawerView(d, 0, draftInside(d)).some((c) => c.fresh)).toBe(false);
    // A page that uses fewer runes leaves them free.
    const bare = drawerView(d, 1, { ...inside, cells: inside.cells.slice(0, 1) });
    expect(bare.reduce((n, c) => n + c.free, 0)).toBe(total - 1);
  });

  test('the scraps line names what the page dropped', () => {
    const d = draft('lamplighter');
    expect(scrapsLine(d, 1)).toBe('+ Amplify');
    expect(scrapsLine(d, 0)).toBe('+ Oil');
    for (const f of DRAFTS) {
      f.pages.forEach((p, i) => {
        const kinds = Object.values(p.scraps).filter((n) => (n ?? 0) > 0).length;
        const line = scrapsLine(f, i);
        expect(line === null ? 0 : line.split(', ').length).toBe(kinds);
      });
    }
  });

  test('every unlocked test has one goal line per goal checked', () => {
    for (const d of DRAFTS) {
      d.pages.forEach((p, i) => {
        const run = draftTest(d, p.test, solution(d.id, i));
        expect(goalSentences(p.test.goal)).toHaveLength(run.goals.length);
      });
    }
  });

  test('a test that passed before and fails now reads "broke"; the first run never does', () => {
    const d = draft('lamplighter');
    const failing = folioRun(d, 0, draftInside(d));
    expect(failing.passed).toBe(false);
    expect(brokeFlags(null, failing)).toEqual([false]);
    expect(brokeFlags([false], failing)).toEqual([false]);
    expect(brokeFlags([true], failing)).toEqual([true]);
    expect(testChips(1, failing, [true]).map((c) => c.state)).toEqual(['broke', 'idle']);
  });

  test('chips: pass, fail, and idle for tests not run yet', () => {
    const d = draft('lamplighter');
    const run = folioRun(d, 1, solution('lamplighter', 0));
    expect(run.tests[0]?.passed).toBe(true);
    expect(run.tests[1]?.passed).toBe(false);
    expect(testChips(2, run, []).map((c) => c.state)).toEqual(['pass', 'fail', 'idle']);
    expect(testChips(0, null, []).map((c) => c.state)).toEqual(['idle']);
  });

  test('the first failing test plays, else the newest', () => {
    const d = draft('lamplighter');
    expect(playedTest(folioRun(d, 0, draftInside(d)))).toBe(0);
    expect(playedTest(folioRun(d, 1, solution('lamplighter', 0)))).toBe(1);
    const done = folioRun(d, 1, solution('lamplighter', 1));
    expect(done.passed).toBe(true);
    expect(playedTest(done)).toBe(1);
    // A regression on test 1 plays test 1 even though test 2 also fails.
    expect(playedTest(folioRun(d, 1, draftInside(d)))).toBe(0);
  });
});
