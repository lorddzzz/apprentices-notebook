import { expect, test } from 'vitest';
import { compileLattice, parseLattice } from '$engine';
import {
  AURA_TRIM,
  AURA_TRIM_DIAGONAL,
  arrowHead,
  auraLine,
  auraLinks,
  flowSegments,
  focusedCells,
  idleCells,
  isDiagonal,
  linkLine,
  windowLinks,
} from '../../src/app/flowGeometry';

const compile = (ascii: string) => {
  const lattice = parseLattice(ascii);
  return { lattice, compiled: compileLattice(lattice) };
};
const pairs = (segs: ReturnType<typeof flowSegments>) =>
  segs.map((s) => `${s.from.x},${s.from.y}>${s.to.x},${s.to.y}`);

test('straight path gives segments between neighbours', () => {
  const { compiled } = compile('Bolt> Ink Spark');
  expect(pairs(flowSegments(compiled, null))).toEqual(['0,0>1,0', '1,0>2,0']);
});

test('a bend turns the segment direction', () => {
  const { compiled } = compile('Bolt> Bendv\n. Spark');
  const segs = flowSegments(compiled, null);
  expect(pairs(segs)).toEqual(['0,0>1,0', '1,0>1,1']);
  expect(segs.map((s) => s.dir)).toEqual(['right', 'down']);
});

test('fork branches start at the fork cell', () => {
  const { compiled } = compile('. Oil .\nBolt> Fork .\n. Spark .');
  const segs = flowSegments(compiled, null);
  expect(pairs(segs)).toEqual(['0,1>1,1', '1,1>1,0', '1,1>1,2']);
});

test('focus marks only the chosen spell as strong', () => {
  const { compiled } = compile('Bolt> Ink\nSplash> Oil');
  const [a, b] = compiled.spells;
  const segs = flowSegments(compiled, a?.key ?? null);
  expect(segs.filter((s) => s.focused)).toHaveLength(1);
  expect(segs.find((s) => s.focused)?.spell).toBe(a?.key);
  expect(flowSegments(compiled, null).every((s) => s.focused)).toBe(true);
  expect([...focusedCells(compiled, b?.key ?? null)]).toEqual(['0,1', '1,1']);
  expect(focusedCells(compiled, null).size).toBe(0);
});

test('aura touches link the aura to touched cells only', () => {
  const { compiled } = compile('Coil . .\nBolt> Ink Oil\n. . Coil');
  const links = auraLinks(compiled.auraTouches).map(
    (l) => `${l.from.x},${l.from.y}>${l.to.x},${l.to.y}`,
  );
  // First Coil touches the Bolt (below it); the corner Coil touches Oil (above it).
  expect(links.sort()).toEqual(['0,0>0,1', '2,2>2,1']);
});

test('unreached runes are idle; auras that touch something are not', () => {
  const { lattice, compiled } = compile('Bolt> Ink . Spark\nCoil . . Oil\n. . Steep .');
  const idle = [...idleCells(lattice, compiled)].sort();
  // Spark and Oil sit past a gap; Steep touches nothing. Coil touches the Bolt.
  expect(idle).toEqual(['2,2', '3,0', '3,1']);
});

test('linkLine trims both ends along the segment', () => {
  const l = linkLine({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.3);
  expect(l.x1).toBeCloseTo(0.8);
  expect(l.x2).toBeCloseTo(1.2);
  expect(l.y1).toBe(0.5);
  const v = linkLine({ x: 2, y: 1 }, { x: 2, y: 2 }, 0.3);
  expect([v.y1, v.y2].map((n) => Math.round(n * 10) / 10)).toEqual([1.8, 2.2]);
});

test('arrowHead points along dir from the segment midpoint', () => {
  const line = linkLine({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.3);
  const [tip, a, b] = arrowHead(line, 'right')
    .split(' ')
    .map((p) => p.split(',').map(Number));
  expect(tip?.[0]).toBeGreaterThan(a?.[0] ?? 0);
  expect(tip?.[0]).toBeGreaterThan(b?.[0] ?? 0);
  expect(tip?.[1]).toBeCloseTo(0.5);
  expect((a?.[1] ?? 0) + (b?.[1] ?? 0)).toBeCloseTo(1);
});

const coil = { diagonalAuras: ['coil' as const] };
const compileDiag = (ascii: string) => {
  const lattice = parseLattice(ascii);
  return { lattice, compiled: compileLattice(lattice, {}, {}, null, coil) };
};

test('diagonal aura touches are flagged, orthogonal ones are not', () => {
  const { compiled } = compileDiag('Coil . .\nBolt> Ink Oil');
  const links = auraLinks(compiled.auraTouches);
  const byTo = Object.fromEntries(links.map((l) => [`${l.to.x},${l.to.y}`, l.diagonal]));
  // Coil (0,0) touches the Bolt below it, and the Ink diagonally.
  expect(byTo).toEqual({ '0,1': false, '1,1': true });
  expect(isDiagonal({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(true);
  expect(isDiagonal({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(false);
  expect(isDiagonal({ x: 2, y: 2 }, { x: 1, y: 1 })).toBe(true);
});

test('without the capstone nothing is drawn diagonally', () => {
  const { compiled } = compile('Coil . .\nBolt> Ink Oil');
  expect(auraLinks(compiled.auraTouches).some((l) => l.diagonal)).toBe(false);
});

test('a diagonal aura line runs corner to corner, centred on the shared corner', () => {
  const link = { from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, diagonal: true };
  const l = auraLine(link);
  // symmetric about the corner (1, 1), moving down-right, equal on both axes
  expect(l.x1).toBeCloseTo(1 - (l.x2 - 1));
  expect(l.y1).toBeCloseTo(1 - (l.y2 - 1));
  expect(l.x2 - l.x1).toBeCloseTo(l.y2 - l.y1);
  expect(l.x2).toBeGreaterThan(l.x1);
  // trimmed by the diagonal trim along the line from each centre
  expect(Math.hypot(l.x1 - 0.5, l.y1 - 0.5)).toBeCloseTo(AURA_TRIM_DIAGONAL);
  expect(Math.hypot(l.x2 - 1.5, l.y2 - 1.5)).toBeCloseTo(AURA_TRIM_DIAGONAL);
  // the other three diagonals mirror it
  const up = auraLine({ from: { x: 1, y: 1 }, to: { x: 0, y: 0 }, diagonal: true });
  expect(up.x1).toBeCloseTo(l.x2);
  expect(up.y2).toBeCloseTo(l.y1);
  const anti = auraLine({ from: { x: 1, y: 0 }, to: { x: 0, y: 1 }, diagonal: true });
  expect(anti.x1).toBeGreaterThan(anti.x2);
  expect(anti.y1).toBeLessThan(anti.y2);
});

test('an orthogonal aura line keeps its short trim; a diagonal one never meets the other', () => {
  const o = auraLine({ from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, diagonal: false });
  expect(o.x1).toBeCloseTo(0.5 + AURA_TRIM);
  expect(o.y1).toBe(0.5);
  // The diagonal and an orthogonal link of the same cells pass through different points:
  // the orthogonal one crosses the shared edge midpoint, the diagonal one the shared corner.
  const d = auraLine({ from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, diagonal: true });
  expect((d.x1 + d.x2) / 2).toBeCloseTo(1);
  expect((d.y1 + d.y2) / 2).toBeCloseTo(1);
  expect((o.x1 + o.x2) / 2).toBeCloseTo(1);
  expect((o.y1 + o.y2) / 2).toBeCloseTo(0.5);
});

test('diagonal links are windowed like any other link', () => {
  const links = [
    { from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, diagonal: true },
    { from: { x: 40, y: 40 }, to: { x: 41, y: 41 }, diagonal: true },
  ];
  const kept = windowLinks(links, { origin: { x: 0, y: 0 }, width: 4, height: 4 });
  expect(kept).toHaveLength(1);
  expect(kept[0]?.diagonal).toBe(true);
});
