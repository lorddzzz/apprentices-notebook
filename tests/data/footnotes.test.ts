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
  // Line slots so far: levels I and II (Bolt, Shove, Spark, Ink, Oil, Splash, Touch, Strike, Guard, Fork, Steam and Brass, Jar, Fuse, Pitch, Wick, Vat, Seep, Steep, Bath salt and Fog jar, and the ink quarter's Sentence, Levy and Tally so far). Capstones (FN-11: the aura diagonals) sit on no line.
  const onLines = VARIANTS.filter((v) => variantLine(v) !== null);
  expect(onLines).toHaveLength(202);
  for (const v of VARIANTS) {
    expect(v.text.length, v.id).toBeGreaterThan(10);
    expect(isFootnoteSubject(v.subject), v.id).toBe(true);
    // A rival's note keeps its page's id (`lamplighter:wick`); every other variant is `<subject>-<slug>`.
    if (v.rival === undefined) expect(v.id.startsWith(`${v.subject}-`), v.id).toBe(true);
    else expect(v.id.startsWith(`${v.rival}:`), v.id).toBe(true);
  }
  for (const v of onLines) {
    expect([1, 2], v.id).toContain(variantLevel(v));
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
