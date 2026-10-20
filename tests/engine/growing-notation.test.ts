import { expect, test } from 'vitest';
import {
  assertImportStructure,
  type GlyphDef,
  type GlyphLibrary,
  growingLattice,
  IMPORT_POLICY,
  labSetLattice,
  type PlacedRune,
  parseBoard,
  parseLattice,
  ResourceLimitError,
  scenarioBattle,
  scenarioSpec,
  serializeLattice,
} from '$engine';

const header = '@lattice 1 growing';
test('empty and distant signed paper roundtrip sparsely in reading order', () => {
  expect(serializeLattice(growingLattice([]))).toBe(header);
  expect(parseLattice(header)).toEqual(growingLattice([]));
  const text = `${header}\n1000000000,2000000000 G:g1^[0,-1:Oil]\n-1000000000,-2000000000 Bolt>`;
  const page = parseLattice(text);
  const exported = serializeLattice(page);
  expect(exported).toHaveLength(text.length);
  expect(exported.split('\n')[1]).toBe('-1000000000,-2000000000 Bolt>');
  expect(parseLattice(exported)).toEqual(growingLattice([...page.runes].reverse()));
});

test.each(['+1,0', '01,0', '-0,0', '1e3,0', '0,0,1', '9007199254740992,0', '0.5,0'])(
  'rejects noncanonical or unsafe coordinate %s',
  (coord) => {
    expect(() => parseLattice(`${header}\n${coord} Ink`)).toThrow(/coordinate/);
  },
);
test.each([
  '0,0 .',
  '0,0 x',
  '0,0 Ink garbage',
  '0,0 G:g>garbage',
  '0,0 G:g>[01,0:Oil]',
  '0,0 G:g>[0,0:Oil][0,0:Ink]',
])('rejects malformed sparse entry %s', (entry) =>
  expect(() => parseLattice(`${header}\n${entry}`)).toThrow(),
);
test('rejects duplicate cells, unsupported versions and unresolved references', () => {
  expect(() => parseLattice(`${header}\n0,0 Ink\n0,0 Oil`)).toThrow(/Duplicate/);
  expect(() => parseLattice('@lattice 2 growing')).toThrow(/header/);
  expect(() => parseLattice(`${header}\n0,0 G:missing>`, { glyphs: {} })).toThrow(/Unknown Glyph/);
  for (const id of ['toString', 'constructor', '__proto__']) {
    expect(() => parseLattice(`${header}\n0,0 G:${id}>`, { glyphs: {} })).toThrow(/Unknown Glyph/);
  }
  expect(() => parseLattice('inv:missing', { inventions: {} })).toThrow(/Unknown invention/);
});
test('rejects input before excessive sparse work', () => {
  expect(() =>
    parseLattice(
      `${header}\n${Array.from({ length: IMPORT_POLICY.maxCollectionEntries + 1 }, (_, x) => `${x},0 Ink`).join('\n')}`,
    ),
  ).toThrow(ResourceLimitError);
  expect(() => parseLattice(' '.repeat(IMPORT_POLICY.maxBytes + 1))).toThrow(ResourceLimitError);
});
test('scenario compiles the sparse text with its signed Source identity', () => {
  const battle = scenarioBattle({
    board: 'D . r',
    lattices: { draughtsman: `${header}\n-1,-2 Bolt>\n0,-2 Strike` },
  });
  expect(battle.units.find((u) => u.kind === 'member' && u.def === 'draughtsman')).toMatchObject({
    spells: [
      {
        key: '-1,-2',
        path: [
          { at: { x: -1, y: -2 }, rune: 'bolt' },
          { at: { x: 0, y: -2 }, rune: 'strike' },
        ],
      },
    ],
  });
});

function argumentGlyph(id = 'g'): GlyphDef {
  return {
    id,
    name: 'Argument',
    kind: 'payload',
    version: 1,
    cells: [
      { at: { x: 0, y: 0 }, rune: 'ink' },
      { at: { x: 1, y: 0 }, rune: 'strike' },
    ],
    entry: { x: 0, y: 0 },
    exits: [],
    idiom: null,
    params: ['0,0'],
    extraExit: null,
  };
}

test('indexed argument validation keeps missing-cell, open-cell and rune-family checks', () => {
  const glyphs = { g: argumentGlyph() };
  expect(parseLattice('G:g>[0,0:Oil]', { glyphs }).runes).toMatchObject([
    { args: { '0,0': { rune: 'oil' } } },
  ]);
  expect(() => parseLattice('G:g>[2,0:Oil]', { glyphs })).toThrow(/has no cell/);
  expect(() => parseLattice('G:g>[1,0:Strike]', { glyphs })).toThrow(/not open/);
  expect(() => parseLattice('G:g>[0,0:Strike]', { glyphs })).toThrow(/not a kind/);
});

test('many placements index a referenced library once, rather than rescanning per argument', () => {
  const def = argumentGlyph();
  const cells = Array.from(
    { length: IMPORT_POLICY.maxCollectionEntries },
    (_, x): PlacedRune => ({ at: { x, y: 0 }, rune: 'ink' }),
  );
  let scans = 0;
  Object.defineProperty(cells, Symbol.iterator, {
    value: function* () {
      scans++;
      for (const cell of cells.values()) yield cell;
    },
  });
  def.cells = cells;
  def.params = [`${cells.length - 1},0`];
  const entry = `G:g>[${cells.length - 1},0:Oil]`;
  const text = [header, ...Array.from({ length: 1000 }, (_, x) => `${x},0 ${entry}`)].join('\n');
  expect(parseLattice(text, { glyphs: { g: def } }).runes).toHaveLength(1000);
  expect(scans).toBe(1);
});

test('referenced indexes share the aggregate entry budget and refuse before constructing an excessive index', () => {
  let secondScans = 0;
  const cell: PlacedRune = { at: { x: 0, y: 0 }, rune: 'ink' };
  const count = IMPORT_POLICY.maxCollectionEntries;
  const cells: PlacedRune[] = Array.from({ length: count }, () => cell);
  const secondCells = [...cells];
  Object.defineProperty(secondCells, Symbol.iterator, {
    value: function* () {
      secondScans++;
      for (const c of secondCells.values()) yield c;
    },
  });
  const first = {
    ...argumentGlyph('first'),
    cells,
    params: Array.from({ length: count }, () => '0,0'),
  };
  // Two placements and two arguments consume four entries; the remaining slots index libraries.
  const remaining = IMPORT_POLICY.maxTotalEntries - count * 3 - 4;
  const second = {
    ...argumentGlyph('second'),
    cells: secondCells,
    params: Array.from({ length: remaining }, () => '0,0'),
  };
  const text = `${header}\n0,0 G:first>[0,0:Oil]\n1,0 G:second>[0,0:Oil]`;
  expect(parseLattice(text, { glyphs: { first, second } }).runes).toHaveLength(2);
  expect(secondScans).toBe(1);
  secondScans = 0;
  const excessive = { ...second, params: [...second.params, '0,0'] };
  expect(() => parseLattice(text, { glyphs: { first, second: excessive } })).toThrow(
    expect.objectContaining({ resource: 'entries', limit: IMPORT_POLICY.maxTotalEntries }),
  );
  expect(secondScans).toBe(0);
});

test('the exact occupied-plus-argument token budget is accepted and one extra argument is refused', () => {
  const placements = IMPORT_POLICY.maxCollectionEntries;
  const extras = IMPORT_POLICY.maxTokens - placements * 3;
  const lines = Array.from(
    { length: placements },
    (_, x) => `${x},0 G:g>[0,0:Oil][1,0:Ink]${x < extras ? '[2,0:Oil]' : ''}`,
  );
  const text = [header, ...lines].join('\n');
  expect(parseLattice(text).runes).toHaveLength(placements);
  lines[extras] += '[2,0:Oil]';
  expect(() => parseLattice([header, ...lines].join('\n'))).toThrow(
    expect.objectContaining({ resource: 'tokens', limit: IMPORT_POLICY.maxTokens }),
  );
});

test('dense storage and padded-board area are bounded before rectangular construction', () => {
  expect(parseLattice('. '.repeat(IMPORT_POLICY.maxCollectionEntries)).shape.width).toBe(
    IMPORT_POLICY.maxCollectionEntries,
  );
  expect(() => parseLattice('. '.repeat(IMPORT_POLICY.maxCollectionEntries + 1))).toThrow(
    ResourceLimitError,
  );
  expect(parseBoard('. '.repeat(IMPORT_POLICY.maxCollectionEntries)).tiles).toHaveLength(
    IMPORT_POLICY.maxCollectionEntries,
  );
  // Only 400 tokens, but padding these short rows would produce 40,000 board cells.
  const uneven = `${'. '.repeat(200)}\n${'.\n'.repeat(200)}`;
  expect(() => parseBoard(uneven)).toThrow(expect.objectContaining({ resource: 'collection' }));
});

test('resource refusal leaves the current Lab battle and supplied libraries untouched', () => {
  const battle = scenarioBattle({ board: 'D . r', lattices: { draughtsman: 'Bolt> Ink' } });
  const before = structuredClone(battle);
  const glyphs: GlyphLibrary = { g: argumentGlyph() };
  const definitions = structuredClone(glyphs);
  const excessive = `${header}\n${Array.from({ length: IMPORT_POLICY.maxCollectionEntries + 1 }, (_, x) => `${x},0 Ink`).join('\n')}`;
  expect(() => labSetLattice(battle, 'draughtsman', excessive)).toThrow(ResourceLimitError);
  expect(battle).toEqual(before);
  expect(() => parseLattice('G:g>[0,0:Strike]', { glyphs })).toThrow();
  expect(glyphs).toEqual(definitions);
  expect(() =>
    scenarioBattle({ board: 'D S r', lattices: { draughtsman: 'Bolt> Ink', stoker: excessive } }),
  ).toThrow(ResourceLimitError);
  expect(scenarioBattle({ board: 'D . r', lattices: { draughtsman: 'Bolt> Ink' } })).toEqual(
    battle,
  );
});

test('text work limit is inclusive, with refusal before token parsing above it', () => {
  const token = `inv:${'a'.repeat(IMPORT_POLICY.maxWork - 4)}`;
  expect(parseLattice(`${header}\n0,0 ${token}`).runes).toHaveLength(1);
  expect(() => parseLattice(`${header}\n0,0 ${token}a`)).toThrow(
    expect.objectContaining({ resource: 'work', limit: IMPORT_POLICY.maxWork }),
  );
});

test('scenario imports share the byte limit across both lattices, including field names', () => {
  const fixed = ['board', 'D S r', 'lattices', 'draughtsman', 'stoker', header, header].join(
    '',
  ).length;
  const firstPadding = Math.floor((IMPORT_POLICY.maxBytes - fixed) / 2);
  const secondPadding = IMPORT_POLICY.maxBytes - fixed - firstPadding;
  const def = {
    board: 'D S r',
    lattices: {
      draughtsman: header + '\n'.repeat(firstPadding),
      stoker: header + '\n'.repeat(secondPadding),
    },
  };
  expect(scenarioBattle(def).units).toHaveLength(3);
  const excessive = { ...def, lattices: { ...def.lattices, stoker: `${def.lattices.stoker}\n` } };
  // Both pages fit individually; their combined scenario is one byte beyond its allowance.
  expect(parseLattice(excessive.lattices.draughtsman).runes).toEqual([]);
  expect(parseLattice(excessive.lattices.stoker).runes).toEqual([]);
  expect(() => scenarioBattle(excessive)).toThrow(
    expect.objectContaining({ resource: 'bytes', limit: IMPORT_POLICY.maxBytes }),
  );
});

test('scenario budget combines board tokens with both pages before compilation', () => {
  const count = 20000;
  const page = (extras: number): string =>
    [
      header,
      ...Array.from(
        { length: count },
        (_, x) => `${x},0 G:g>[0,0:Oil]${x < extras ? '[1,0:Ink]' : ''}`,
      ),
    ].join('\n');
  // Six board tokens plus 99,995 page tokens exceed the token limit, while entries still fit.
  const first = page(0);
  const second = page(count - 5);
  expect(parseLattice(first).runes).toHaveLength(count);
  expect(parseLattice(second).runes).toHaveLength(count);
  expect(() =>
    scenarioSpec({ board: 'D S . . . r', lattices: { draughtsman: first, stoker: second } }),
  ).toThrow(expect.objectContaining({ resource: 'tokens' }));
});

test('trusted profile fallback pages can exceed external aggregate import budgets', () => {
  const runes: PlacedRune[] = Array.from(
    { length: IMPORT_POLICY.maxCollectionEntries },
    (_, x) => ({
      at: { x: x - 16000, y: -2 },
      rune: 'ink',
    }),
  );
  const page = growingLattice(runes);
  const options = { lattices: { draughtsman: page }, seed: 17, lab: true };
  // The occupied entries fit a collection, but their coordinate fields exceed external aggregate limits.
  expect(() => assertImportStructure(options)).toThrow(
    expect.objectContaining({ resource: 'entries' }),
  );
  const spec = scenarioSpec({ board: 'D . r' }, options);
  expect(spec.party?.draughtsman?.spells).toEqual([]);
  expect(spec).toMatchObject({ seed: 17, lab: true });
  expect(options.lattices.draughtsman).toBe(page);
  expect(page.runes).toBe(runes);
  expect(page.runes).toHaveLength(IMPORT_POLICY.maxCollectionEntries);
});
