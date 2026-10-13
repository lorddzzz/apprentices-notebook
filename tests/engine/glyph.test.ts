import { expect, test } from 'vitest';
import {
  compileLattice,
  type GlyphDef,
  type GlyphLibrary,
  glyphCost,
  inkUsed,
  type PlacedRune,
  parseLattice,
  placedInk,
  rotateLocal,
  validateLattice,
} from '$engine';

const c = (x: number, y: number) => ({ x, y });
const def = (
  id: string,
  kind: GlyphDef['kind'],
  cells: PlacedRune[],
  entry = c(0, 0),
): GlyphDef => ({ id, name: id, kind, cells, entry, exits: [], idiom: null });

const payload = def('p', 'payload', [
  { at: c(0, 0), rune: 'ink' },
  { at: c(1, 0), rune: 'onInked' },
  { at: c(2, 0), rune: 'spark' },
]);
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

test('rotateLocal turns the local frame so right points the placed direction', () => {
  const o = c(2, -1);
  expect(rotateLocal(o, 'right')).toEqual(c(2, -1));
  expect(rotateLocal(o, 'down')).toEqual(c(1, 2));
  expect(rotateLocal(o, 'left')).toEqual(c(-2, 1));
  expect(rotateLocal(o, 'up')).toEqual(c(-1, -2));
  expect(rotateLocal(c(0, 0), 'up')).toEqual(c(0, 0));
});

test('glyphCost = max(1, Σ inner − floor(cells / 3))', () => {
  expect(glyphCost(payload)).toBe(3); // 1 + 2 + 1 − 1
  expect(glyphCost(spell)).toBe(3); // 2 + 1 − 0
  const cells = Array.from({ length: 8 }, (_, i) => ({ at: c(i, 0), rune: 'ink' as const }));
  expect(glyphCost(def('i8', 'payload', cells))).toBe(6); // 8 − 2
  expect(glyphCost(def('one', 'payload', [{ at: c(0, 0), rune: 'ink' }]))).toBe(1);
  expect(glyphCost(def('none', 'payload', []))).toBe(1); // never below 1
});

test('ink: a Glyph costs its glyphCost, +1 per outer aura next to its socket', () => {
  expect(inkUsed(parseLattice('Bolt> G:p> . .'), lib)).toBe(2 + 3);
  const l = parseLattice('. Amp . .\nBolt> G:p> Echo .\n. Amp . .');
  expect(placedInk(glyphIn(l), lib, l)).toBe(3 + 3); // three adjacent auras
  expect(placedInk(glyphIn(l), lib)).toBe(3); // no lattice: no aura count
  // Bolt 2 + Glyph (3 + 3) + three auras at 3 each
  expect(inkUsed(l, lib)).toBe(2 + 6 + 9);
});

test('ink: auras that do not touch the socket add nothing to the Glyph', () => {
  const l = parseLattice('Amp . . .\n. . G:p> .');
  expect(placedInk(glyphIn(l), lib, l)).toBe(3);
  expect(inkUsed(l, lib)).toBe(3 + 3);
});

test('validation rejects a Glyph whose id is not in the library', () => {
  const issues = validateLattice(parseLattice('Bolt> G:ghost> . .'), null, lib);
  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ kind: 'socket', at: c(1, 0) });
  expect(issues[0]?.message).toContain('ghost');
  expect(validateLattice(parseLattice('Bolt> G:p> . .'), null, lib)).toEqual([]);
  expect(validateLattice(parseLattice('Bolt> G:p> . .'), 4, lib)[0]?.kind).toBe('ink');
});

test('a payload Glyph is entered only along its arrow; any other direction stops like an empty socket', () => {
  const into = (g: string) => compileLattice(parseLattice(`Bolt> ${g} . .`), [], lib).spells[0];
  expect(into('G:p>')?.nodes).toHaveLength(1);
  for (const wrong of ['G:pv', 'G:p<', 'G:p^']) {
    expect(into(wrong)?.nodes).toEqual([]);
    expect(into(wrong)?.path).toHaveLength(1);
  }
  // A Bend can turn the flow so that it enters a Glyph that points down.
  const bent = compileLattice(parseLattice('Bolt> Bendv\n. G:pv'), [], lib).spells[0];
  expect(bent?.nodes).toHaveLength(1);
});

test('inner nodes and path cells sit at the socket and name their local cell', () => {
  const [sp] = compileLattice(parseLattice('Bolt> G:p> Oil .'), [], lib).spells;
  const ink = sp?.nodes[0];
  expect(ink).toMatchObject({ rune: 'ink', at: c(1, 0), inner: c(0, 0) });
  const trig = ink?.next[0];
  expect(trig).toMatchObject({ kind: 'trigger', at: c(1, 0), inner: c(1, 0) });
  const spark = trig?.next[0];
  expect(spark).toMatchObject({ rune: 'spark', at: c(1, 0), inner: c(2, 0) });
  const oil = spark?.next[0];
  expect(oil).toMatchObject({ rune: 'oil', at: c(2, 0) });
  expect(oil && 'inner' in oil).toBe(false);
  expect(sp?.path.map((p) => [p.rune, p.at.x, p.inner?.x ?? null])).toEqual([
    ['bolt', 0, null],
    ['ink', 1, 0],
    ['onInked', 1, 1],
    ['spark', 1, 2],
    ['oil', 2, null],
  ]);
});

test('a Spell Glyph is a Source: sorted with plain sources by socket reading order', () => {
  const spells = compileLattice(parseLattice('Bolt> . G:s>\nG:s> . Ward>'), [], lib).spells;
  expect(spells.map((s) => [s.key, s.source, s.glyph ?? null])).toEqual([
    ['0,0', 'bolt', null],
    ['2,0', 'bolt', 's'],
    ['0,1', 'bolt', 's'],
    ['2,1', 'ward', null],
  ]);
  expect(spells[1]?.charges).toBe(spells[0]?.charges);
  expect(spells[1]?.nodes[0]).toMatchObject({ rune: 'ink', at: c(2, 0), inner: c(1, 0) });
});

test('a Spell Glyph in the flow path insulates, like a plain Source', () => {
  const [sp] = compileLattice(parseLattice('Bolt> G:s> Ink'), [], lib).spells;
  expect(sp?.nodes).toEqual([]);
});

test('outer Amplify adds to the source and every material and stacks; inner Amplify stays inside', () => {
  const one = compileLattice(parseLattice('Amp . .\nG:s> Oil .'), [], lib).spells[0];
  expect(one?.magnitude).toBe(2 + 1);
  expect(one?.nodes[0]).toMatchObject({ rune: 'ink', amp: 1, magnitude: 2 });
  const two = compileLattice(parseLattice('Amp . .\nG:s> Oil .\nAmp . .'), [], lib).spells[0];
  expect(two?.magnitude).toBe(2 + 2);
  expect(two?.nodes[0]).toMatchObject({ rune: 'ink', amp: 2, magnitude: 3 });
  const amped = def('a', 'spell', [
    { at: c(0, 0), rune: 'bolt', dir: 'right' },
    { at: c(1, 0), rune: 'ink' },
    { at: c(1, -1), rune: 'amplify' },
  ]);
  const [sp] = compileLattice(parseLattice('G:a> Oil .'), [], { a: amped }).spells;
  expect(sp?.magnitude).toBe(2);
  expect(sp?.nodes[0]).toMatchObject({ rune: 'ink', amp: 1, magnitude: 2 });
  expect(sp?.nodes[0]?.next[0]).toMatchObject({ rune: 'oil', amp: 0 });
});

test('outer Echo makes a Spell Glyph echo and does nothing on a Payload Glyph', () => {
  expect(compileLattice(parseLattice('Echo G:s>'), [], lib).spells[0]?.echo).toBe(true);
  expect(compileLattice(parseLattice('. G:s>'), [], lib).spells[0]?.echo).toBe(false);
  const pg = compileLattice(parseLattice('Bolt> G:p>\n. Echo'), [], lib).spells[0];
  expect(pg?.echo).toBe(false);
  expect(pg?.nodes).toHaveLength(1);
});

test('aura touches and reached cells are recorded against the socket', () => {
  const compiled = compileLattice(parseLattice('Amp .\nG:s> Spark'), [], lib);
  expect(compiled.auraTouches).toContainEqual({ aura: 'amplify', from: c(0, 0), to: c(0, 1) });
  expect(compiled.reached).toContain('0,1');
});

test('an unknown Glyph id insulates and compiles to nothing', () => {
  expect(compileLattice(parseLattice('G:ghost>'), [], lib).spells).toEqual([]);
  const [sp] = compileLattice(parseLattice('Bolt> G:ghost> Ink'), [], lib).spells;
  expect(sp?.nodes).toEqual([]);
});

test('exits fire in inner walk order, left branch first', () => {
  const forked = def('f', 'payload', [
    { at: c(0, 0), rune: 'fork' },
    { at: c(0, -1), rune: 'ink' }, // left of right-travelling flow: walks first
    { at: c(0, 1), rune: 'oil' },
  ]);
  const l = parseLattice('. Spark .\nBolt> G:f> .\n. Spark .');
  const [sp] = compileLattice(l, [], { f: forked }).spells;
  expect(sp?.nodes.map((n) => n.rune)).toEqual(['ink', 'oil']);
  expect(sp?.nodes[0]?.next[0]).toMatchObject({ rune: 'spark', at: c(1, 0) });
  expect(sp?.nodes[1]?.next[0]).toMatchObject({ rune: 'spark', at: c(1, 2) });
});

test('existing callers keep working without a library', () => {
  const l = parseLattice('Bolt> Ink');
  expect(compileLattice(l, []).spells).toHaveLength(1);
  expect(inkUsed(l)).toBe(3);
  expect(validateLattice(l, 3)).toEqual([]);
});
