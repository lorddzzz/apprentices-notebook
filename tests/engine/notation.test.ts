import { expect, test } from 'vitest';
import { MEMBER_IDS, MEMBERS, TUNING } from '$data';
import {
  parseBoard,
  parseCell,
  parseLattice,
  scenarioBattle,
  serializeBoard,
  serializeLattice,
} from '$engine';

const tileAt = (ascii: string, x: number, y: number) => {
  const b = parseBoard(ascii);
  const t = b.tiles[y * b.width + x];
  if (!t) throw new Error('no tile');
  return t;
};
const at = { x: 0, y: 0 };

test('parses units, mods and states', () => {
  const b = parseBoard(`
    r!o  *  @~
    =    r& D++
  `);
  expect(b.width).toBe(3);
  expect(b.height).toBe(2);
  expect(b.units).toEqual([
    {
      kind: 'enemy',
      def: 'rat',
      at: { x: 0, y: 0 },
      mark: 'plain',
      collar: false,
      shackle: false,
      shield: 0,
    },
    {
      kind: 'enemy',
      def: 'rat',
      at: { x: 1, y: 1 },
      mark: null,
      collar: true,
      shackle: false,
      shield: 0,
    },
    {
      kind: 'member',
      def: 'draughtsman',
      at: { x: 2, y: 1 },
      mark: null,
      collar: false,
      shackle: false,
      shield: 2,
    },
  ]);
  expect(b.tiles[0]?.state).toEqual({ id: 'slick', rounds: 0, origin: null });
  expect(b.tiles[1]?.state).toEqual({ id: 'fire', rounds: TUNING.fireRounds, origin: null });
  expect(b.tiles[2]).toMatchObject({
    terrain: { vent: true },
    state: { id: 'cloud', rounds: TUNING.cloudRounds },
  });
  // A layout plate is permanent and never breaks; a rune plate crumbles and takes one hit.
  expect(b.tiles[3]?.state).toEqual({ id: 'plate', rounds: 0, origin: null });
  expect(parseCell('#', at).tile.state).toEqual({
    id: 'plate',
    rounds: TUNING.plateRounds,
    origin: null,
    hits: 1,
  });
  expect(parseCell('i', at).tile.state?.id).toBe('blot');
  expect(parseCell('r!!', at).unit?.mark).toBe('deep');
  expect(parseCell('r$', at).unit?.shackle).toBe(true);
});

test('parses the eight tile compounds in braces', () => {
  const names = {
    stain: 'stain',
    brand: 'brandCloud',
    pool: 'pool',
    fog: 'greaseFog',
    skid: 'skidPlate',
    bank: 'bank',
    kettle: 'kettle',
    wall: 'wall',
  } as const;
  for (const [token, id] of Object.entries(names)) {
    const layer = parseCell(`{${token}}`, at).tile.state;
    expect(layer).toMatchObject({ id, rounds: TUNING.compoundRounds });
  }
  expect(parseCell('{wall}', at).tile.state?.hits).toBe(2);
  expect(parseCell('{skid}', at).tile.state?.hits).toBe(1);
  expect(parseCell('r{stain}', at).unit?.def).toBe('rat');
  expect(() => parseCell('r{wall}', at)).toThrow(/cannot stand on a plate/);
  expect(() => parseCell('{mud}', at)).toThrow(/Unknown compound "\{mud\}"/);
});

test('the drop `_` is terrain (P3)', () => {
  expect(parseCell('_', at).tile.terrain.drop).toBe(true);
  expect(parseCell('r_', at).unit?.def).toBe('rat');
  expect(serializeBoard(parseBoard('r_ _o .'))).toBe('r_ _o .');
});

test('rejects unknown chars / two states / unit on plate / mod without unit / duplicate member', () => {
  expect(() => parseBoard('. . z')).toThrow(/"z".*C1/);
  expect(() => parseBoard('.\n. r=')).toThrow(/plate.*B2/);
  expect(() => parseBoard('. .\n. . !')).toThrow(/needs a unit.*C2/);
  expect(() => parseBoard('D . .\n. . D')).toThrow(/Duplicate.*C2/);
  expect(() => parseBoard('. =o')).toThrow(/one state.*B1/);
  expect(() => parseBoard('o~')).toThrow(/one state/);
  expect(() => parseBoard('r!!!')).toThrow(/one mark/);
  expect(() => parseBoard('')).toThrow(/Empty/);
});

test('pads short rows with floor', () => {
  const b = parseBoard('r . .\nD');
  expect(b.width).toBe(3);
  expect(b.tiles).toHaveLength(6);
  expect(tileAt('r . .\nD', 2, 1).state).toBeNull();
  expect(b.units).toHaveLength(2);
});

test('serializeBoard round-trips every token', () => {
  const ascii = `
    b&   .        f!o     d!!$+  r++
    ~@   *        =       #      i
    S    {stain}  {brand} {pool} {fog}
    .    {skid}   {bank}  {kettle} {wall}
    w>o  wvh      g       l      _
  `;
  const once = parseBoard(ascii);
  const text = serializeBoard(once);
  expect(parseBoard(text)).toEqual(once);
  expect(serializeBoard(parseBoard(text))).toBe(text);
  // canonical order: unit, mods, then w h _ state @ g l
  expect(serializeBoard(parseBoard('@~ _o wvh'))).toBe('~@ _o wvh');
  expect(serializeBoard(parseBoard('@~'))).toBe('~@');
});

test('parses lattice tokens and arrows', () => {
  const l = parseLattice(`
    Bolt> Bendv x
    Ink   .    Coil
  `);
  expect(l.shape).toEqual({ width: 3, height: 2, holes: [{ x: 2, y: 0 }] });
  expect(l.runes).toEqual([
    { at: { x: 0, y: 0 }, rune: 'bolt', dir: 'right' },
    { at: { x: 1, y: 0 }, rune: 'bend', dir: 'down' },
    { at: { x: 0, y: 1 }, rune: 'ink' },
    { at: { x: 2, y: 1 }, rune: 'coil' },
  ]);
  const dirs = parseLattice('Bolt< Splash^ Touchv Vat>').runes.map((r) => r.dir);
  expect(dirs).toEqual(['left', 'up', 'down', 'right']);
});

test('every one of the 31 rune tokens and an invention round-trip', () => {
  const l = parseLattice(
    [
      'Bolt>  Splash> Touch>  Vat>   Strike Shove Guard Sentence',
      'Levy   Hold    Swap    Draw   Erase  Ink   Oil   Steam',
      'Brass  Spark   Fork    Bendv  Seep   Lay   Toll  Tally',
      'Brink  Unison  Jar     Fuse   Afterglow Steep Coil inv:recoil',
    ].join('\n'),
  );
  expect(new Set(l.runes.map((r) => ('rune' in r ? r.rune : ''))).size).toBe(32);
  expect(l.runes.at(-1)).toEqual({ at: { x: 7, y: 3 }, rune: 'inv:recoil' });
  expect(parseLattice(serializeLattice(l))).toEqual(l);
});

test('rejects arrow on Ink / missing arrow on Bolt / unknown token / ragged rows', () => {
  expect(() => parseLattice('. Ink>')).toThrow(/no arrow.*B1/);
  expect(() => parseLattice('.\nBolt')).toThrow(/needs an arrow.*A2/);
  expect(() => parseLattice('. Zap')).toThrow(/Unknown.*B1/);
  expect(() => parseLattice('. inv:x>')).toThrow(/no arrow/);
  expect(() => parseLattice('. .\n.')).toThrow(/row 2/);
});

test('serializeLattice round-trips', () => {
  const l = parseLattice('Bolt> Ink x\n. Tally Bendv\nCoil Jar Fork');
  const text = serializeLattice(l);
  expect(parseLattice(text)).toEqual(l);
  expect(text).toBe('Bolt> Ink   x\n.     Tally Bendv\nCoil  Jar   Fork');
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
  const args = parseLattice('G:g1>[1,0:Oil][2,0:Bend^]');
  expect(serializeLattice(args)).toBe('G:g1>[1,0:Oil][2,0:Bend^]');
});

test('water, grates, gates and lamps (K-6)', () => {
  const b = 'w> wv w< w^\new^ Mw> h? .\nwvh g l Sl';
  expect(() => parseBoard(b)).toThrow('Unknown character "?"');
  const ok = 'w> wv w< w^\new^ Mw> wv* .\nwvh g l Sl\nD!w> b wvi .';
  expect(tileAt(ok, 0, 0).terrain.water).toBe('right');
  expect(tileAt(ok, 3, 0).terrain.water).toBe('up');
  expect(tileAt(ok, 0, 1).terrain.water).toBe('up');
  expect(parseBoard(ok).units.map((u) => u.def)).toEqual([
    'eel',
    'mother',
    'stoker',
    'draughtsman',
    'sentry',
  ]);
  expect(tileAt(ok, 2, 1)).toMatchObject({
    terrain: { water: 'down' },
    state: { id: 'fire', rounds: TUNING.fireRounds },
  });
  expect(tileAt(ok, 0, 2).terrain).toMatchObject({ water: 'down', grate: true });
  expect(tileAt(ok, 1, 2).terrain.gate).toBe(true);
  expect(tileAt(ok, 2, 2).terrain.lamp).toBe(true);
  const spec = parseBoard(ok);
  expect(parseBoard(serializeBoard(spec))).toEqual(spec);
  expect(() => parseBoard('w')).toThrow('Water needs an arrow');
  expect(() => parseBoard('h')).toThrow('A grate needs water');
  expect(() => parseBoard('Dwvh')).toThrow('cannot stand on a grate');
  expect(() => parseBoard('Dg')).toThrow('cannot stand on a lock gate');
  expect(() => parseBoard('go')).toThrow('cannot share');
});

test('recruit tokens parse and print on boards and scenarios', () => {
  const board = 'D+ R r';
  const spec = parseBoard(board);
  expect(spec.units.map((u) => u.def)).toEqual(['draughtsman', 'runaway', 'rat']);
  expect(parseBoard(serializeBoard(spec))).toEqual(spec);
  expect(serializeBoard(spec)).toContain('R');
  expect(() => parseBoard('R R')).toThrow('Duplicate member');
  const battle = scenarioBattle({ board, lattices: { runaway: 'Bolt> . .' } });
  const unit = battle.units.find((u) => u.kind === 'member' && u.def === 'runaway');
  expect(unit?.kind === 'member' && unit.spells.length).toBeGreaterThan(0);
});
