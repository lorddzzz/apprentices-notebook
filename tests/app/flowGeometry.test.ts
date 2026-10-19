import { expect, test } from 'vitest';
import { compileLattice, parseLattice } from '$engine';
import {
  arrowHead,
  auraLinks,
  flowSegments,
  focusedCells,
  idleCells,
  linkLine,
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
