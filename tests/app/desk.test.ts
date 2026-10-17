import { describe, expect, test } from 'vitest';
import { DRAFTS, type DraftDef, type DraftTest } from '$data';
import { draftInside, draftTest, type GlyphInside, key, newProfile } from '$engine';
import {
  cellMarks,
  deskRows,
  draftStage,
  draftsLabel,
  goalSentences,
  trayPalette,
} from '../../src/app/desk';

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
