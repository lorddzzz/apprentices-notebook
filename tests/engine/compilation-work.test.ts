import { expect, test } from 'vitest';
import {
  assertCompilationWork,
  compileLattice,
  type GlyphDef,
  growingLattice,
  importBudget,
  type Lattice,
  type Placed,
  type PlacedRune,
  ResourceLimitError,
  scenarioSpec,
  serializeLattice,
  stepsOf,
} from '$engine';

function converging(count: number): Lattice {
  const runes: Placed[] = [];
  for (let y = 0; y < count; y++)
    runes.push(
      { at: { x: 0, y }, rune: 'bolt', dir: 'right' },
      { at: { x: 1, y }, rune: 'bend', dir: 'down' },
    );
  runes.push({ at: { x: 1, y: count }, rune: 'strike' });
  return growingLattice(runes);
}

const bendGlyph: GlyphDef = {
  id: 'bend',
  name: 'Bend',
  kind: 'payload',
  cells: [
    { at: { x: 0, y: 0 }, rune: 'bend', dir: 'right' },
    { at: { x: 1, y: 0 }, rune: 'bend', dir: 'right' },
  ],
  entry: { x: 0, y: 0 },
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: 'down',
};

function branchingGlyphs(count: number): Lattice {
  const runes: Placed[] = [{ at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' }];
  for (let x = 1; x <= count; x++)
    runes.push(
      { at: { x, y: 0 }, glyph: 'bend', dir: 'right' },
      { at: { x, y: 1 }, rune: 'strike' },
    );
  runes.push({ at: { x: count + 1, y: 0 }, rune: 'strike' });
  return growingLattice(runes);
}

test('converging Sources spend their repeated walks before retaining quadratic paths', () => {
  expect(() => assertCompilationWork(converging(1500), {}, {}, importBudget())).toThrow(
    expect.objectContaining({ resource: 'work' }),
  );
  const page = converging(3);
  const before = compileLattice(page);
  assertCompilationWork(page, {}, {}, importBudget());
  expect(compileLattice(page)).toEqual(before);
  expect(before.spells.map((s) => [s.key, s.path.length, s.charges])).toEqual([
    ['0,0', 5, 5],
    ['0,1', 4, 5],
    ['0,2', 3, 5],
  ]);
  expect(before.spells[0]?.first).toMatchObject({
    at: { x: 1, y: 3 },
    rune: 'strike',
    via: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  });
});

test('scenario pages share compilation work instead of each receiving a fresh allowance', () => {
  const page = converging(600);
  assertCompilationWork(page, {}, {}, importBudget());
  const text = serializeLattice(page);
  expect(() =>
    scenarioSpec({
      board: 'D S r',
      lattices: { draughtsman: text, stoker: text },
    }),
  ).toThrow(ResourceLimitError);
});

test('Glyph extra exits account for repeated inherited Bend trails even with one Source', () => {
  const glyphs = { bend: bendGlyph };
  // Only about 4,400 path cells, but over a million copied trail coordinates.
  expect(() => assertCompilationWork(branchingGlyphs(1100), glyphs, {}, importBudget())).toThrow(
    expect.objectContaining({ resource: 'work' }),
  );
  const page = branchingGlyphs(3);
  assertCompilationWork(page, glyphs, {}, importBudget());
  const spell = compileLattice(page, glyphs).spells[0];
  expect(spell?.key).toBe('0,0');
  expect(
    stepsOf(spell?.first ?? null)
      .filter((s) => s.role === 'action')
      .map((s) => s.via?.length),
  ).toEqual([6, 6, 4, 2]);
});

test('a shared eight-cell Spell Glyph remains valid at 256 sockets', () => {
  const glyph: GlyphDef = {
    ...bendGlyph,
    id: 'spell',
    kind: 'spell',
    extraExit: null,
    cells: Array.from({ length: 8 }, (_, x) =>
      x === 0
        ? { at: { x, y: 0 }, rune: 'bolt', dir: 'right' }
        : { at: { x, y: 0 }, rune: 'strike' },
    ),
  };
  const page = growingLattice(
    Array.from({ length: 256 }, (_, x) => ({
      at: { x, y: -2 },
      glyph: glyph.id,
      dir: 'right',
    })),
  );
  assertCompilationWork(page, { spell: glyph }, {}, importBudget());
  const spells = compileLattice(page, { spell: glyph }).spells;
  expect(spells).toHaveLength(256);
  expect(spells[255]).toMatchObject({ key: '255,-2', source: 'bolt', charges: 5, glyph: 'spell' });
  expect(spells.every((s) => s.path.length === 8)).toBe(true);
});

test('aliased Spell Glyphs include both outer and local copied Bend trails', () => {
  const glyph: GlyphDef = {
    ...bendGlyph,
    id: 'long',
    kind: 'spell',
    extraExit: null,
    cells: [
      { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
      ...Array.from(
        { length: 1000 },
        (_, x): PlacedRune => ({
          at: { x: x + 1, y: 0 },
          rune: 'bend',
          dir: 'right',
        }),
      ),
      { at: { x: 1001, y: 0 }, rune: 'strike' },
    ],
  };
  const page = growingLattice(
    Array.from({ length: 120 }, (_, x) => ({
      at: { x, y: -2 },
      glyph: glyph.id,
      dir: 'right',
    })),
  );
  expect(() => assertCompilationWork(page, { long: glyph }, {}, importBudget())).toThrow(
    expect.objectContaining({ resource: 'work' }),
  );
  const single = growingLattice(page.runes.slice(0, 1));
  assertCompilationWork(single, { long: glyph }, {}, importBudget());
  const action = compileLattice(single, { long: glyph }).spells[0]?.first;
  expect(action?.via).toHaveLength(1000);
  expect(action?.viaInner).toHaveLength(1000);
});
