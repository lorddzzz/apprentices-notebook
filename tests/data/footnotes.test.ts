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
  expect(VARIANTS).toHaveLength(10);
  for (const v of VARIANTS) {
    expect(variantLevel(v), v.id).toBe(1);
    expect(v.text.length, v.id).toBeGreaterThan(10);
    expect(isFootnoteSubject(v.subject), v.id).toBe(true);
    expect(v.id.startsWith(`${v.subject}-`), v.id).toBe(true);
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
