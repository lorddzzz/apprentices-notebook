import { expect, test } from 'vitest';
import {
  BATCHES,
  isFootnoteSubject,
  LINES,
  SHOVE_WALL_SOFT,
  VARIANTS,
  variantLevel,
  variantLine,
} from '$data';

test('footnote variants are unique, and line slots sit on written lines of their subject (P39)', () => {
  const ids = VARIANTS.map((v) => v.id);
  expect(new Set(ids).size).toBe(ids.length);
  // Line slots so far: level I only. Capstones (FN-11: the aura diagonals) sit on no line.
  const onLines = VARIANTS.filter((v) => variantLine(v) !== null);
  expect(onLines).toHaveLength(11);
  for (const v of VARIANTS) {
    expect(v.text.length, v.id).toBeGreaterThan(10);
    expect(isFootnoteSubject(v.subject), v.id).toBe(true);
    // A rival's note keeps its page's id (`lamplighter:wick`); every other variant is `<subject>-<slug>`.
    if (v.rival === undefined) expect(v.id.startsWith(`${v.subject}-`), v.id).toBe(true);
    else expect(v.id.startsWith(`${v.rival}:`), v.id).toBe(true);
  }
  for (const v of onLines) {
    expect(variantLevel(v), v.id).toBe(1);
    const line = variantLine(v);
    const row = LINES.find((l) => l.id === line);
    expect(row, v.id).toBeDefined();
    expect(row?.subject, v.id).toBe(v.subject);
    expect(row?.pending, v.id).toBeUndefined();
  }
});

test('the registry joins every batch in order', () => {
  expect(VARIANTS).toEqual(Object.values(BATCHES).flat());
  expect(Object.keys(BATCHES)).toContain('seam-runes');
});

test('the soft wall variant exists for shove:wall', () => {
  const v = VARIANTS.find((x) => x.id === SHOVE_WALL_SOFT);
  expect(v && variantLine(v)).toBe('shove:wall');
});
