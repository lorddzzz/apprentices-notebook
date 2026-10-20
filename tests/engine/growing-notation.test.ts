import { expect, test } from 'vitest';
import {
  growingLattice,
  IMPORT_POLICY,
  parseLattice,
  ResourceLimitError,
  scenarioBattle,
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
    parseLattice(`${header}\n${'0,0 Ink\n'.repeat(IMPORT_POLICY.maxCollectionEntries + 1)}`),
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
