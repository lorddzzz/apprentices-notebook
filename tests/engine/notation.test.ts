import { expect, test } from 'vitest';
import { MEMBER_IDS, MEMBERS, TUNING } from '$data';
import { parseBoard, parseCell, parseLattice, serializeBoard, serializeLattice } from '$engine';

const tileAt = (ascii: string, x: number, y: number) => {
  const b = parseBoard(ascii);
  const t = b.tiles[y * b.width + x];
  if (!t) throw new Error('no tile');
  return t;
};

test('parses units, mods and layers', () => {
  const b = parseBoard(`
    r!o  *  @~
    =    r& D
  `);
  expect(b.width).toBe(3);
  expect(b.height).toBe(2);
  expect(b.units).toEqual([
    {
      kind: 'enemy',
      def: 'rat',
      at: { x: 0, y: 0 },
      inked: true,
      brass: false,
      branded: false,
      heat: 0,
      etched: false,
    },
    {
      kind: 'enemy',
      def: 'rat',
      at: { x: 1, y: 1 },
      inked: false,
      brass: true,
      branded: false,
      heat: 0,
      etched: false,
    },
    {
      kind: 'member',
      def: 'draughtsman',
      at: { x: 2, y: 1 },
      inked: false,
      brass: false,
      branded: false,
      heat: 0,
      etched: false,
    },
  ]);
  expect(b.tiles[0]).toMatchObject({ oil: true, fire: 0 });
  expect(b.tiles[1]).toMatchObject({ oil: true, fire: TUNING.fireRounds });
  expect(b.tiles[2]).toMatchObject({ vent: true, steam: TUNING.steamRounds, oil: false });
  expect(b.tiles[3]).toMatchObject({ plate: true, oil: false });
  expect(parseCell('i', { x: 0, y: 0 }).tile.ink).toBe(true);
  expect(parseCell('r!%', { x: 0, y: 0 }).unit).toMatchObject({ inked: true, branded: true });
  expect(serializeBoard(parseBoard('r!&% .'))).toBe('r!&% .');
});

test('rejects unknown chars / unit on plate / mod without unit / duplicate member', () => {
  expect(() => parseBoard('. . z')).toThrow(/"z".*C1/);
  expect(() => parseBoard('.\n. r=')).toThrow(/plate.*B2/);
  expect(() => parseBoard('. .\n. . !')).toThrow(/needs a unit.*C2/);
  expect(() => parseBoard('D . .\n. . D')).toThrow(/Duplicate.*C2/);
  expect(() => parseBoard('. =o')).toThrow(/plate.*B1/);
  expect(() => parseBoard('')).toThrow(/Empty/);
});

test('pads short rows with floor', () => {
  const b = parseBoard('r . .\nD');
  expect(b.width).toBe(3);
  expect(b.tiles).toHaveLength(6);
  expect(tileAt('r . .\nD', 2, 1)).toMatchObject({ oil: false, plate: false });
  expect(b.units).toHaveLength(2);
});

test('serializeBoard round-trips', () => {
  const ascii = `
    b&  .  f!o
    @~  *  =
    S   i  r!~
  `;
  const once = parseBoard(ascii);
  const text = serializeBoard(once);
  expect(parseBoard(text)).toEqual(once);
  expect(serializeBoard(parseBoard(text))).toBe(text);
  // canonical layer order is o i ~ * = @, so a vent with steam is written `~@`
  expect(text).toBe('b& . f!o\n~@ * =\nS  i r!~');
});

test('parses lattice tokens and arrows', () => {
  const l = parseLattice(`
    Bolt> Bendv x
    Ink   .    Amp
  `);
  expect(l.shape).toEqual({ width: 3, height: 2, holes: [{ x: 2, y: 0 }] });
  expect(l.runes).toEqual([
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 1, y: 0 }, rune: 'bend', dir: 'down' },
    { at: { x: 0, y: 1 }, rune: 'ink' },
    { at: { x: 2, y: 1 }, rune: 'amplify' },
  ]);
  const dirs = parseLattice('Bolt< Splash^ Wardv').runes.map((r) => r.dir);
  expect(dirs).toEqual(['left', 'up', 'down']);
});

test('rejects arrow on Ink / missing arrow on Bolt / unknown token / ragged rows', () => {
  expect(() => parseLattice('. Ink>')).toThrow(/no arrow.*B1/);
  expect(() => parseLattice('.\nBolt')).toThrow(/needs an arrow.*A2/);
  expect(() => parseLattice('. Zap')).toThrow(/Unknown.*B1/);
  expect(() => parseLattice('. .\n.')).toThrow(/row 2/);
});

test('serializeLattice round-trips', () => {
  const l = parseLattice('Bolt> Ink x\n. OnInked Bendv\nAmp Echo Fork');
  const text = serializeLattice(l);
  expect(parseLattice(text)).toEqual(l);
  expect(text).toBe('Bolt> Ink     x\n.     OnInked Bendv\nAmp   Echo    Fork');
});

test('member start lattices serialize back to their data text', () => {
  for (const id of MEMBER_IDS) {
    const text = MEMBERS[id].startLattice;
    expect(serializeLattice(parseLattice(text))).toBe(text);
  }
});

test('a Glyph socket round-trips through lattice ASCII', () => {
  const ascii = 'Bolt> G:cashing>   .\n.     G:fair-copy^ x';
  const l = parseLattice(ascii);
  expect(l.runes).toEqual([
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 1, y: 0 }, glyph: 'cashing', dir: 'right' },
    { at: { x: 1, y: 1 }, glyph: 'fair-copy', dir: 'up' },
  ]);
  expect(serializeLattice(parseLattice(serializeLattice(l)))).toBe(serializeLattice(l));
  expect(serializeLattice(l)).toBe('Bolt> G:cashing>   .\n.     G:fair-copy^ x');
  expect(() => parseLattice('G:> .')).toThrow(/Glyph/);
  expect(() => parseLattice('G:abc .')).toThrow(/Glyph/);
});

test('stained oil, scalding steam, hot and etched brass round-trip', () => {
  const ascii = 'b^# =^ =#\n$ s r&^';
  const b = parseBoard(ascii);
  expect(b.units[0]).toMatchObject({ def: 'sentry', heat: TUNING.heatRounds, etched: true });
  expect(b.tiles[1]).toMatchObject({ plate: true, heat: TUNING.heatRounds, etched: false });
  expect(b.tiles[2]).toMatchObject({ plate: true, heat: 0, etched: true });
  expect(b.tiles[3]).toMatchObject({ oil: true, stain: true });
  expect(b.tiles[4]).toMatchObject({ steam: TUNING.steamRounds, scald: true });
  expect(b.units[1]).toMatchObject({ brass: true, heat: TUNING.heatRounds });
  expect(parseBoard(serializeBoard(b))).toEqual(b);
  expect(() => parseCell('r^', { x: 0, y: 0 })).toThrow('Only brass');
  expect(() => parseCell('o#', { x: 0, y: 0 })).toThrow('Only brass');
});
