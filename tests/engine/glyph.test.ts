import { expect, test } from 'vitest';
import {
  baseGlyphCost,
  compileLattice,
  type GlyphDef,
  type GlyphLibrary,
  glyphCost,
  glyphRunes,
  inkUsed,
  type PlacedRune,
  parseLattice,
  placedInk,
  rotateLocal,
  type Step,
  serializeLattice,
  stepsOf,
  validateLattice,
  withOpenCell,
} from '$engine';

const c = (x: number, y: number) => ({ x, y });
const def = (
  id: string,
  kind: GlyphDef['kind'],
  cells: PlacedRune[],
  entry = c(0, 0),
): GlyphDef => ({
  id,
  name: id,
  kind,
  cells,
  entry,
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: null,
});

/** Ink → Tally → Spark (ink 1 + 1 + 1 − 1 = 2). */
const payload = def('p', 'payload', [
  { at: c(0, 0), rune: 'ink' },
  { at: c(1, 0), rune: 'tally' },
  { at: c(2, 0), rune: 'spark' },
]);
/** Bolt → Ink (ink 2 + 1 = 3). */
const spell = def('s', 'spell', [
  { at: c(0, 0), rune: 'bolt', dir: 'right' },
  { at: c(1, 0), rune: 'ink' },
]);
const lib: GlyphLibrary = { p: payload, s: spell };

const glyphIn = (l: ReturnType<typeof parseLattice>) => {
  const g = l.runes.find((r) => 'glyph' in r);
  if (!g) throw new Error('no glyph');
  return g;
};
const spellsOf = (ascii: string, library: GlyphLibrary = lib) =>
  compileLattice(parseLattice(ascii), library).spells;
const runes = (st: Step | null): string[] =>
  stepsOf(st).flatMap((s) => ('rune' in s ? [s.rune] : [s.role]));

test('rotateLocal turns the local frame so right points the placed direction', () => {
  const o = c(2, -1);
  expect(rotateLocal(o, 'right')).toEqual(c(2, -1));
  expect(rotateLocal(o, 'down')).toEqual(c(1, 2));
  expect(rotateLocal(o, 'left')).toEqual(c(-2, 1));
  expect(rotateLocal(o, 'up')).toEqual(c(-1, -2));
  expect(rotateLocal(c(0, 0), 'up')).toEqual(c(0, 0));
});

test('glyphCost = max(1, Σ inner − floor(cells / 3)), inner ink per role', () => {
  expect(glyphCost(payload)).toBe(2);
  expect(glyphCost(spell)).toBe(3);
  const cells = Array.from({ length: 8 }, (_, i) => ({ at: c(i, 0), rune: 'ink' as const }));
  expect(glyphCost(def('i8', 'payload', cells))).toBe(6); // 8 − 2
  expect(glyphCost(def('one', 'payload', [{ at: c(0, 0), rune: 'ink' }]))).toBe(1);
  expect(glyphCost(def('none', 'payload', []))).toBe(1); // never below 1
});

test('ink: a Glyph costs its glyphCost, +1 per outer aura next to its socket', () => {
  expect(inkUsed(parseLattice('Bolt> G:p> . .'), lib)).toBe(2 + 2);
  const l = parseLattice('. Coil . .\nBolt> G:p> Steep .\n. Coil . .');
  expect(placedInk(glyphIn(l), lib, l)).toBe(2 + 3); // three adjacent auras
  expect(placedInk(glyphIn(l), lib)).toBe(2); // no lattice: no aura count
  // Bolt 2 + Glyph (2 + 3) + three auras at 3 each
  expect(inkUsed(l, lib)).toBe(2 + 5 + 9);
});

test('ink: auras that do not touch the socket add nothing to the Glyph', () => {
  const l = parseLattice('Coil . . .\n. . G:p> .');
  expect(placedInk(glyphIn(l), lib, l)).toBe(2);
  expect(inkUsed(l, lib)).toBe(3 + 2);
});

test('validation rejects a Glyph whose id is not in the library', () => {
  const issues = validateLattice(parseLattice('Bolt> G:ghost> . .'), null, lib);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ kind: 'socket', at: c(1, 0) });
  expect(issues[0]?.message).toContain('ghost');
  expect(validateLattice(parseLattice('Bolt> G:p> . .'), null, lib)).toEqual([]);
  expect(validateLattice(parseLattice('Bolt> G:p> . .'), 3, lib)[0]?.kind).toBe('ink');
});

test('a payload Glyph is entered only along its arrow; any other direction stops like an empty socket', () => {
  const into = (g: string) => spellsOf(`Bolt> ${g} . .`)[0];
  expect(into('G:p>')?.first).not.toBeNull();
  for (const wrong of ['G:pv', 'G:p<', 'G:p^']) {
    expect(into(wrong)?.first).toBeNull();
    expect(into(wrong)?.path).toHaveLength(1);
  }
  // A Bend can turn the flow so that it enters a Glyph that points down.
  expect(spellsOf('Bolt> Bendv\n. G:pv')[0]?.first).not.toBeNull();
});

test('inner steps and path cells sit at the socket and name their local cell', () => {
  const [sp] = spellsOf('Bolt> G:p> Oil .');
  const [ink, tally, spark, oil] = stepsOf(sp?.first ?? null);
  expect(ink).toMatchObject({ role: 'kind', rune: 'ink', at: c(1, 0), inner: c(0, 0) });
  expect(tally).toMatchObject({ role: 'trigger', at: c(1, 0), inner: c(1, 0) });
  expect(spark).toMatchObject({ rune: 'spark', at: c(1, 0), inner: c(2, 0) });
  expect(oil).toMatchObject({ rune: 'oil', at: c(2, 0) });
  expect(oil && 'inner' in oil).toBe(false);
  expect(sp?.path.map((p) => [p.rune, p.at.x, p.inner?.x ?? null])).toEqual([
    ['bolt', 0, null],
    ['ink', 1, 0],
    ['tally', 1, 1],
    ['spark', 1, 2],
    ['oil', 2, null],
  ]);
});

test('a Spell Glyph is a Source: sorted with plain sources by socket reading order', () => {
  const spells = spellsOf('Bolt> . G:s>\nG:s> . Touch>');
  expect(spells.map((s) => [s.key, s.source, s.glyph ?? null])).toEqual([
    ['0,0', 'bolt', null],
    ['2,0', 'bolt', 's'],
    ['0,1', 'bolt', 's'],
    ['2,1', 'touch', null],
  ]);
  expect(spells[1]?.charges).toBe(spells[0]?.charges);
  expect(spells[1]?.first).toMatchObject({ rune: 'ink', at: c(2, 0), inner: c(1, 0) });
});

test('a Spell Glyph in the flow path insulates, like a plain Source', () => {
  expect(spellsOf('Bolt> G:s> Ink')[0]?.first).toBeNull();
});

test('outer auras ride on every inner step; inner auras only on the steps they touch', () => {
  const [one] = spellsOf('Coil . .\nG:s> Oil .');
  expect(one?.sourceAuras).toEqual(['coil']);
  expect(one?.first).toMatchObject({ rune: 'ink', auras: ['coil'] });
  const glowing = def('a', 'spell', [
    { at: c(0, 0), rune: 'bolt', dir: 'right' },
    { at: c(1, 0), rune: 'ink' },
    { at: c(1, -1), rune: 'afterglow' },
  ]);
  const [sp] = spellsOf('G:a> Oil .', { a: glowing });
  const [ink, oil] = stepsOf(sp?.first ?? null);
  expect(ink).toMatchObject({ rune: 'ink', auras: ['afterglow'] });
  expect(oil).toMatchObject({ rune: 'oil', auras: [] });
});

test('aura touches and reached cells are recorded against the socket', () => {
  const compiled = compileLattice(parseLattice('Coil .\nG:s> Spark'), lib);
  expect(compiled.auraTouches).toContainEqual({ aura: 'coil', from: c(0, 0), to: c(0, 1) });
  expect(compiled.reached).toContain('0,1');
});

test('an unknown Glyph id insulates and compiles to nothing', () => {
  expect(spellsOf('G:ghost>')).toEqual([]);
  expect(spellsOf('Bolt> G:ghost> Ink')[0]?.first).toBeNull();
});

test('exits fire in inner walk order, left branch first', () => {
  const forked = def('f', 'payload', [
    { at: c(0, 0), rune: 'fork' },
    { at: c(0, -1), rune: 'ink' }, // left of right-travelling flow: walks first
    { at: c(0, 1), rune: 'oil' },
  ]);
  const [sp] = spellsOf('. Spark .\nBolt> G:f> .\n. Spark .', { f: forked });
  const fork = sp?.first;
  expect(fork?.role).toBe('fork');
  if (fork?.role !== 'fork') return;
  expect(runes(fork.left)).toEqual(['ink', 'spark']);
  expect(runes(fork.right)).toEqual(['oil', 'spark']);
  expect(stepsOf(fork.left)[1]).toMatchObject({ rune: 'spark', at: c(1, 0) });
  expect(stepsOf(fork.right)[1]).toMatchObject({ rune: 'spark', at: c(1, 2) });
});

test('callers keep working without a library', () => {
  const l = parseLattice('Bolt> Ink');
  expect(compileLattice(l).spells).toHaveLength(1);
  expect(inkUsed(l)).toBe(3);
  expect(validateLattice(l, 3)).toEqual([]);
});

// ── Parameters (M21–M25; P7: open cells take a Kind or an Action) ──

/** The payload Ink → Tally → Spark with its first cell open (a Kind). */
const open = (id: string, params: string[], cells?: PlacedRune[]): GlyphDef => ({
  ...def(id, 'payload', cells ?? [...payload.cells]),
  params,
});
const openP = open('o', ['0,0']);

test('baseGlyphCost ignores the Economy discount, glyphCost applies it and never drops below 1', () => {
  expect(baseGlyphCost(payload)).toBe(2);
  expect(glyphCost({ ...payload, discount: 1 })).toBe(1);
  expect(baseGlyphCost({ ...payload, discount: 1 })).toBe(2);
  expect(glyphCost({ ...payload, discount: 9 })).toBe(1);
  expect(inkUsed(parseLattice('Bolt> G:o> .'), { o: { ...openP, discount: 2 } })).toBe(2 + 1);
});

test('withOpenCell opens one Kind or Action cell and clears with null', () => {
  expect(withOpenCell(payload, c(0, 0)).params).toEqual(['0,0']);
  expect(withOpenCell(payload, c(2, 0)).params).toEqual(['2,0']);
  expect(withOpenCell(withOpenCell(payload, c(0, 0)), null).params).toEqual([]);
  expect(withOpenCell(payload, c(0, 0)).cells).toBe(payload.cells); // the default stays in cells
  expect(() => withOpenCell(payload, c(5, 5))).toThrow(/No rune/);
  expect(() => withOpenCell(payload, c(1, 0))).toThrow(/open/); // a Trigger
  expect(() => withOpenCell(spell, c(0, 0))).toThrow(/open/); // a Source
  const shaped = def('b', 'payload', [{ at: c(0, 0), rune: 'bend', dir: 'up' }]);
  expect(() => withOpenCell(shaped, c(0, 0))).toThrow(/open/); // a Shape
  const action = def('a', 'payload', [{ at: c(0, 0), rune: 'strike' }]);
  expect(withOpenCell(action, c(0, 0)).params).toEqual(['0,0']);
});

test('glyphRunes: an argument stands in for the default; bad and closed arguments do not count', () => {
  const same = ['ink', 'tally', 'spark'];
  expect(glyphRunes(openP)).toEqual(same);
  expect(glyphRunes(openP, { '0,0': { rune: 'oil' } })).toEqual(['oil', 'tally', 'spark']);
  expect(glyphRunes(openP, { '0,0': { rune: 'spark' } })).toEqual(['spark', 'tally', 'spark']);
  expect(glyphRunes(openP, { '0,0': { rune: 'strike' } })).toEqual(same); // an Action for a Kind
  expect(glyphRunes(openP, { '2,0': { rune: 'oil' } })).toEqual(same);
  expect(glyphRunes(payload, { '0,0': { rune: 'oil' } })).toEqual(same);
  expect(glyphRunes(openP, { '9,9': { rune: 'oil' } })).toEqual(same);
});

test('ink: an argument costs what the default does, because ink is per role', () => {
  const plain = parseLattice('Bolt> G:o> .');
  const withArg = parseLattice('Bolt> G:o>[0,0:Brass] .');
  expect(inkUsed(withArg, { o: openP })).toBe(inkUsed(plain, { o: openP }));
});

test('args replace default cells in the compiled walk (and bad ones leave the default)', () => {
  const first = (src: string, library: GlyphLibrary = { o: openP }) =>
    spellsOf(src, library)[0]?.first;
  expect(first('Bolt> G:o> .')).toMatchObject({ rune: 'ink' });
  expect(first('Bolt> G:o>[0,0:Brass] .')).toMatchObject({ rune: 'brass' });
  expect(runes(first('Bolt> G:o>[0,0:Brass] .') ?? null)).toEqual(['brass', 'tally', 'spark']);
  // Wrong role, unknown slot and a closed cell all fall back to the default.
  expect(first('Bolt> G:o>[0,0:Shove] .')).toMatchObject({ rune: 'ink' });
  expect(first('Bolt> G:o>[7,7:Brass] .')).toMatchObject({ rune: 'ink' });
  expect(first('Bolt> G:p>[0,0:Brass] .', lib)).toMatchObject({ rune: 'ink' });
});

test('validateLattice flags an arg of the wrong role or for an unknown or closed slot as arg', () => {
  const lib2: GlyphLibrary = { o: openP };
  const issues = (src: string) => validateLattice(parseLattice(`Bolt> ${src} .`), null, lib2);
  expect(issues('G:o>[0,0:Brass]')).toEqual([]);
  expect(issues('G:o>')).toEqual([]);
  const wrong = issues('G:o>[0,0:Shove]');
  expect(wrong).toHaveLength(1);
  expect(wrong[0]).toMatchObject({ kind: 'arg', at: c(1, 0), rune: 'shove' });
  expect(issues('G:o>[1,0:Brass]')[0]?.kind).toBe('arg'); // a cell of the Glyph that is not open
  expect(issues('G:o>[9,9:Brass]')[0]?.kind).toBe('arg'); // not a cell at all
  expect(issues('G:o>[0,0:Bolt>]')[0]?.kind).toBe('arg'); // a Source is nobody's argument
  expect(issues('G:o>[0,0:Coil]')[0]?.kind).toBe('arg');
});

test('notation: Glyph arguments round-trip, arrows included', () => {
  const ascii =
    'Bolt> G:g1>[1,0:Brass] G:g2^[-1,2:Bend^][0,0:Ink] .\n. G:g3< G:fair-copy^[0,1:Fork] x';
  const l = parseLattice(ascii);
  expect(l.runes.find((r) => 'glyph' in r && r.glyph === 'g1')).toEqual({
    at: c(1, 0),
    glyph: 'g1',
    dir: 'right',
    args: { '1,0': { rune: 'brass' } },
  });
  expect(l.runes.find((r) => 'glyph' in r && r.glyph === 'g2')).toEqual({
    at: c(2, 0),
    glyph: 'g2',
    dir: 'up',
    args: { '-1,2': { rune: 'bend', dir: 'up' }, '0,0': { rune: 'ink' } },
  });
  expect('args' in (l.runes.find((r) => 'glyph' in r && r.glyph === 'g3') ?? {})).toBe(false);
  const out = serializeLattice(l);
  expect(out).toContain('G:g1>[1,0:Brass]');
  expect(out).toContain('G:g2^[0,0:Ink][-1,2:Bend^]'); // reading order of the local cells
  expect(parseLattice(out)).toEqual(l);
  expect(serializeLattice(parseLattice(out))).toBe(out);
});

test('notation: bad Glyph arguments name the cell', () => {
  expect(() => parseLattice('. G:g>[1,0:Nope]')).toThrow(/Nope.*B1/);
  expect(() => parseLattice('. G:g>[1,0:Ink^]')).toThrow(/no arrow/);
  expect(() => parseLattice('. G:g>[1;0:Ink]')).toThrow(/Bad Glyph argument/);
  expect(() => parseLattice('. G:g>[1,0:Ink][1,0:Oil]')).toThrow(/twice/);
  expect(() => parseLattice('. G:g[1,0:Ink]')).toThrow(/arrow/);
});
