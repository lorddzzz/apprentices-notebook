import { expect, test } from 'vitest';
import { flowSegments, linkLine, localCell, windowLinks } from '../../src/app/flowGeometry';
import { compileLattice, growingLattice, MAX_LATTICE_COORD, type Placed } from '../../src/engine';

const window = { origin: { x: -4, y: -3 }, width: 7, height: 6 };

test('signed flow and aura links retain neighbours crossing the visible edge', () => {
  const links = [
    { from: { x: -5, y: -2 }, to: { x: -4, y: -2 } },
    { from: { x: -2, y: -3 }, to: { x: -2, y: -2 } },
    { from: { x: -100, y: 0 }, to: { x: -99, y: 0 } },
    { from: { x: 0, y: 20 }, to: { x: 0, y: 21 } },
  ];
  expect(windowLinks(links, window)).toEqual(links.slice(0, 2));
  const from = localCell(links[0]?.from ?? { x: 0, y: 0 }, window.origin);
  const to = localCell(links[0]?.to ?? { x: 0, y: 0 }, window.origin);
  const line = linkLine(from, to, 0.33);
  expect(line.x1).toBeCloseTo(-0.17);
  expect(line.x2).toBeCloseTo(0.17);
  expect(line.y1).toBe(1.5);
  expect(line.y2).toBe(1.5);
});

test('a long accepted path mounts only links at the edit window', () => {
  const cells: Placed[] = [
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    ...Array.from({ length: 16000 }, (_, i): Placed => ({ at: { x: i + 1, y: 0 }, rune: 'ink' })),
  ];
  const compiled = compileLattice(growingLattice(cells));
  const all = flowSegments(compiled, null);
  expect(all.length).toBe(16000);
  const visible = windowLinks(
    all,
    { origin: { x: 8000, y: -2 }, width: 8, height: 5 },
    { width: 480, height: 300 },
  );
  expect(visible.length).toBeLessThan(12);
  expect(visible.some((link) => link.to.x === 8000)).toBe(true);
  expect(visible.some((link) => link.to.x === 15000)).toBe(false);
});

test('Fit pixel buckets bound SVG links while preserving complete source geometry', () => {
  const links = Array.from({ length: 16000 }, (_, x) => ({
    from: { x, y: 0 },
    to: { x: x + 1, y: 0 },
  }));
  const original = structuredClone(links);
  const fit = windowLinks(
    links,
    { origin: { x: -1, y: -1 }, width: 16003, height: 3 },
    { width: 375, height: 0.08 },
  );
  expect(fit.length).toBeLessThanOrEqual(375);
  expect(fit.length).toBeGreaterThan(300);
  expect(links).toEqual(original);
  expect(windowLinks(links, window, { width: 0, height: 0 })).toEqual([]);
});

test('overlay coordinates stay local and precise near numeric edges', () => {
  const origin = { x: MAX_LATTICE_COORD - 10, y: -MAX_LATTICE_COORD };
  const from = localCell({ x: MAX_LATTICE_COORD - 9, y: -MAX_LATTICE_COORD + 1 }, origin);
  const to = localCell({ x: MAX_LATTICE_COORD - 8, y: -MAX_LATTICE_COORD + 1 }, origin);
  expect(linkLine(from, to, 0.33)).toEqual({ x1: 1.83, y1: 1.5, x2: 2.17, y2: 1.5 });
});

test('shared spell edges keep only their final visual layer even at editing scale', () => {
  const links = Array.from({ length: 10000 }, (_, spell) => ({
    from: { x: 0, y: 0 },
    to: { x: 1, y: 0 },
    spell,
    focused: spell === 9999,
  }));
  const visible = windowLinks(links, window, { width: 420, height: 360 });
  expect(visible).toHaveLength(1);
  expect(visible[0]).toMatchObject({ spell: 9999, focused: true });
  expect(links).toHaveLength(10000);
});
