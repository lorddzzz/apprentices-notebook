import { describe, expect, test } from 'vitest';
import { type GlyphInside, insideIssues } from '$engine';
import {
  canvasCells,
  insideInk,
  liftCell,
  paletteSlots,
  placeRune,
  sameInside,
  tapCell,
  turnCell,
  usedRunes,
} from '../../src/app/revision';
import type { PaletteSlot } from '../../src/app/study';

const spell: GlyphInside = {
  kind: 'spell',
  entry: { x: 0, y: 0 },
  cells: [
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 1, y: 0 }, rune: 'ink' },
    { at: { x: 2, y: 0 }, rune: 'spark' },
  ],
};
const payload: GlyphInside = {
  kind: 'payload',
  entry: { x: 0, y: 0 },
  cells: [
    { at: { x: 0, y: 0 }, rune: 'ink' },
    { at: { x: 1, y: 0 }, rune: 'oil' },
    { at: { x: 2, y: 0 }, rune: 'spark' },
  ],
};
const palette: PaletteSlot[] = [
  { rune: 'bolt', count: 1 },
  { rune: 'ink', count: 2 },
  { rune: 'spark', count: 1 },
  { rune: 'bend', count: 2 },
  { rune: 'oil', count: null },
];
const cellOf = (i: GlyphInside, x: number, y: number) =>
  i.cells.find((c) => c.at.x === x && c.at.y === y);

describe('placing and replacing', () => {
  test('places a rune on an empty cell, without touching the original', () => {
    const r = placeRune(spell, { x: 3, y: 0 }, 'ink', palette);
    expect(r.message).toBeNull();
    expect(cellOf(r.inside, 3, 0)?.rune).toBe('ink');
    expect(spell.cells).toHaveLength(3);
    expect(r.inside.cells).toHaveLength(4);
  });

  test('an arrow rune comes down pointing right; replacing arrow with arrow keeps the turn', () => {
    const bend = placeRune(spell, { x: 3, y: 0 }, 'bend', palette).inside;
    expect(cellOf(bend, 3, 0)?.dir).toBe('right');
    const turned = turnCell(bend, { x: 3, y: 0 }).inside;
    expect(cellOf(turned, 3, 0)?.dir).toBe('down');
    const plain = placeRune(turned, { x: 3, y: 0 }, 'ink', palette).inside;
    expect(cellOf(plain, 3, 0)).toEqual({ at: { x: 3, y: 0 }, rune: 'ink' });
  });

  test('replaces the rune under it', () => {
    const r = placeRune(spell, { x: 1, y: 0 }, 'oil', palette).inside;
    expect(cellOf(r, 1, 0)?.rune).toBe('oil');
    expect(r.cells).toHaveLength(3);
  });

  test('refuses past the count the palette holds, and runes it lacks', () => {
    const once = placeRune(spell, { x: 3, y: 0 }, 'spark', palette);
    expect(once.message).toBe('No Spark left');
    expect(once.inside).toBe(spell);
    expect(placeRune(spell, { x: 3, y: 0 }, 'fork', palette).message).toMatch(/hold/);
    // swapping a rune for itself doesn't count it twice
    expect(placeRune(spell, { x: 2, y: 0 }, 'spark', palette).message).toBeNull();
  });

  test('null count is no limit', () => {
    let i = spell;
    for (const x of [3, 4, 5]) i = placeRune(i, { x, y: 0 }, 'oil', palette).inside;
    expect(usedRunes(i).oil).toBe(3);
  });

  test('accepts signed cells beyond the old canvas and rejects unsafe coordinates', () => {
    expect(placeRune(spell, { x: 1000000, y: -1000000 }, 'ink', palette).message).toBeNull();
    expect(placeRune(spell, { x: Infinity, y: 0 }, 'ink', palette).message).toMatch(/coordinate/);
  });
});

describe('the entry is locked', () => {
  test("a Spell Glyph's Source can't be replaced, lifted or turned", () => {
    const at = { x: 0, y: 0 };
    expect(placeRune(spell, at, 'ink', palette).inside).toBe(spell);
    expect(placeRune(spell, at, 'ink', palette).message).toMatch(/entry/);
    expect(liftCell(spell, at).inside).toBe(spell);
    expect(turnCell(spell, at).message).toMatch(/fixed/);
    expect(tapCell(spell, at, { kind: 'none' }, palette).inside).toBe(spell);
  });

  test("a Payload's entry can change its rune but never lift", () => {
    const at = { x: 0, y: 0 };
    expect(liftCell(payload, at).message).toMatch(/entry/);
    expect(liftCell(payload, at).inside).toBe(payload);
    const r = placeRune(payload, at, 'bend', palette);
    expect(cellOf(r.inside, 0, 0)?.rune).toBe('bend');
    expect(turnCell(r.inside, at).inside.cells.find((c) => c.rune === 'bend')?.dir).toBe('down');
  });
});

describe('turning and lifting', () => {
  test('turning goes right, a quarter at a time, and ignores runes without an arrow', () => {
    let i = placeRune(spell, { x: 3, y: 0 }, 'bend', palette).inside;
    const dirs: (string | undefined)[] = [];
    for (let n = 0; n < 4; n++) {
      i = turnCell(i, { x: 3, y: 0 }).inside;
      dirs.push(cellOf(i, 3, 0)?.dir);
    }
    expect(dirs).toEqual(['down', 'left', 'up', 'right']);
    expect(turnCell(spell, { x: 1, y: 0 }).inside).toBe(spell);
  });

  test('lifts a rune and leaves an empty cell; lifting nothing is nothing', () => {
    const r = liftCell(spell, { x: 2, y: 0 });
    expect(r.inside.cells.map((c) => c.rune)).toEqual(['bolt', 'ink']);
    expect(liftCell(spell, { x: 3, y: 0 }).inside).toBe(spell);
  });
});

describe('tapping with a tool', () => {
  test('a held rune places; tapping the same arrow rune turns it; Erase lifts', () => {
    const tool = { kind: 'rune', rune: 'bend' } as const;
    const a = tapCell(spell, { x: 3, y: 0 }, tool, palette).inside;
    expect(cellOf(a, 3, 0)?.rune).toBe('bend');
    const b = tapCell(a, { x: 3, y: 0 }, tool, palette).inside;
    expect(cellOf(b, 3, 0)?.dir).toBe('down');
    const c = tapCell(b, { x: 3, y: 0 }, { kind: 'erase' }, palette).inside;
    expect(cellOf(c, 3, 0)).toBeUndefined();
  });

  test('with nothing held an arrow turns and a plain rune does nothing', () => {
    const bend = placeRune(spell, { x: 3, y: 0 }, 'bend', palette).inside;
    const none = { kind: 'none' } as const;
    expect(cellOf(tapCell(bend, { x: 3, y: 0 }, none, palette).inside, 3, 0)?.dir).toBe('down');
    expect(tapCell(spell, { x: 1, y: 0 }, none, palette).inside).toBe(spell);
  });
});

describe('the canvas and the palette', () => {
  test('the bounded compatibility canvas follows the inside', () => {
    const cells = canvasCells(spell);
    expect(cells).toHaveLength(5 * 3);
    expect(cells[0]).toEqual({ x: -1, y: -1 });
    const grown = placeRune(spell, { x: 3, y: 1 }, 'ink', palette).inside;
    expect(canvasCells(grown)).toHaveLength(6 * 4);
  });

  test('slots count what the inside still has to spend', () => {
    const slots = paletteSlots(palette, spell);
    const by = (r: string) => slots.find((s) => s.rune === r);
    expect(by('bolt')).toMatchObject({ owned: 1, free: 0, usable: false });
    expect(by('ink')).toMatchObject({ owned: 2, free: 1, usable: true });
    expect(by('oil')).toMatchObject({ owned: null, free: null, usable: true });
    expect(slots.map((s) => s.rune)).toEqual(palette.map((p) => p.rune));
  });
});

describe('ink and change', () => {
  test('ink follows the cells', () => {
    const before = insideInk(spell);
    const after = insideInk(placeRune(spell, { x: 3, y: 0 }, 'ink', palette).inside);
    expect(after).toBeGreaterThan(before);
  });

  test('sameInside sees any change, and ignores order', () => {
    expect(sameInside(spell, { ...spell, cells: [...spell.cells].reverse() })).toBe(true);
    expect(sameInside(spell, placeRune(spell, { x: 1, y: 0 }, 'oil', palette).inside)).toBe(false);
    const bend = placeRune(spell, { x: 3, y: 0 }, 'bend', palette).inside;
    expect(sameInside(bend, turnCell(bend, { x: 3, y: 0 }).inside)).toBe(false);
    expect(sameInside(bend, liftCell(bend, { x: 3, y: 0 }).inside)).toBe(false);
  });

  test('an edit hands the engine something it can judge', () => {
    expect(insideIssues(spell)).toEqual([]);
    const stranded = placeRune(spell, { x: 2, y: 1 }, 'ink', palette).inside;
    expect(insideIssues(stranded).map((i) => i.kind)).toEqual(['stranded']);
  });
});
