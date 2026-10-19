import { expect, test } from 'vitest';
import { LINES, SHOVE_WALL_SOFT, VARIANTS } from '$data';

test('footnote variants are level I, unique, and sit on written lines (P39)', () => {
  const ids = VARIANTS.map((v) => v.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(VARIANTS).toHaveLength(10);
  for (const v of VARIANTS) {
    expect(v.level, v.id).toBe(1);
    expect(v.text.length, v.id).toBeGreaterThan(10);
    const row = LINES.find((l) => l.id === v.line);
    expect(row, v.id).toBeDefined();
    expect(row?.pending, v.id).toBeUndefined();
  }
});

test('the soft wall variant exists for shove:wall', () => {
  expect(VARIANTS.find((v) => v.id === SHOVE_WALL_SOFT)?.line).toBe('shove:wall');
});
