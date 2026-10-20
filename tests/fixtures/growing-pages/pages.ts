import type { PlacedRune } from '$engine';

/** Sparse notation/parser/viewport fixtures. No dense rectangle exists between distant entries. */
export const EMPTY_PAGE: readonly PlacedRune[] = [];
export const DISTANT_PAGE: readonly PlacedRune[] = [
  { at: { x: -1_000_000_000, y: -100 }, rune: 'bolt', dir: 'right' },
  { at: { x: 1_000_000_000, y: 100 }, rune: 'ink' },
];

export function straightPage(length: number): PlacedRune[] {
  return Array.from({ length }, (_, x) =>
    x === 0 ? { at: { x, y: 0 }, rune: 'bolt', dir: 'right' } : { at: { x, y: 0 }, rune: 'ink' },
  );
}

/** Repeated Forks: upper two-cell branches; lower Bends continue right to the next Fork. */
export function forkPage(branches: number): PlacedRune[] {
  const runes: PlacedRune[] = [{ at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' }];
  for (let i = 0; i < branches; i++) {
    const x = i * 2 + 1;
    runes.push(
      { at: { x, y: 0 }, rune: 'fork' },
      { at: { x, y: -1 }, rune: 'ink' },
      { at: { x, y: -2 }, rune: 'strike' },
      { at: { x, y: 1 }, rune: 'bend', dir: 'right' },
      { at: { x: x + 1, y: 1 }, rune: 'bend', dir: 'up' },
      { at: { x: x + 1, y: 0 }, rune: 'bend', dir: 'right' },
    );
  }
  runes.push({ at: { x: branches * 2 + 1, y: 0 }, rune: 'ink' });
  return runes;
}
