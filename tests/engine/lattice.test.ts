import { expect, test } from 'vitest';
import { type InventionDef, MEMBERS } from '$data';
import {
  compileLattice,
  describeSpell,
  type GlyphDef,
  inkOf,
  inkUsed,
  type Lattice,
  libraryOf,
  type Placed,
  parseLattice,
  rotateSocket,
  type Spell,
  type Step,
  serializeLattice,
  setSocket,
  socketAt,
  stepsOf,
  validateLattice,
} from '$engine';

const compile = (
  ascii: string,
  ...rest: Parameters<typeof compileLattice> extends [unknown, ...infer R] ? R : never
) => compileLattice(parseLattice(ascii), ...rest);

const only = (
  ascii: string,
  ...rest: Parameters<typeof compileLattice> extends [unknown, ...infer R] ? R : never
): Spell => {
  const [spell, ...more] = compile(ascii, ...rest).spells;
  if (!spell || more.length > 0) throw new Error('expected exactly one spell');
  return spell;
};

/** Compact step shape: `'ink'`, `{ ink: next }`, `{ fork: [left, right] }`, `{ jar: rest }`. */
const shape = (st: Step | null): unknown => {
  if (!st) return null;
  switch (st.role) {
    case 'fork':
      return { fork: [shape(st.left), shape(st.right)] };
    case 'seal':
      return { [st.rune]: shape(st.rest) };
    case 'split':
      return { split: st.branches.map(shape) };
    default:
      return st.next ? { [st.rune]: shape(st.next) } : st.rune;
  }
};

const FORK_ORDER = `
  .     Oil   .
  Bolt> Fork  .
  .     Spark .
`;

const runeName = (p: Placed): string => ('rune' in p ? p.rune : p.glyph);

test('straight flow: each Action or Kind is a step', () => {
  const s = only('Bolt> Ink Strike');
  expect(shape(s.first)).toEqual({ ink: 'strike' });
  expect(s.first).toMatchObject({ role: 'kind', at: { x: 1, y: 0 }, auras: [] });
  expect(s.first?.role === 'kind' && s.first.next).toMatchObject({ role: 'action' });
  expect(s.key).toBe('0,0');
  expect(s.source).toBe('bolt');
  expect(s.charges).toBe(5);
  expect(s.path.map((p) => p.rune)).toEqual(['bolt', 'ink', 'strike']);
});

test('bend uses its absolute arrow and leaves no step (R6), only a via cell', () => {
  const s = only('Bolt> Bendv\n.     Spark');
  expect(shape(s.first)).toEqual('spark');
  expect(s.first?.via).toEqual([{ x: 1, y: 0 }]);
  expect(s.path.map((p) => [p.rune, p.dir])).toEqual([
    ['bolt', 'right'],
    ['bend', 'right'],
    ['spark', 'down'],
  ]);
});

test('bend pointing back stops', () => {
  const s = only('Bolt> Bend<');
  expect(s.first).toBeNull();
  expect(s.path.map((p) => p.rune)).toEqual(['bolt', 'bend']);
});

test('fork is a step with a left and a right branch, relative to travel', () => {
  // entering the fork travelling down: left is east, right is west (off the page)
  expect(shape(only('Boltv .\nFork Ink').first)).toEqual({ fork: ['ink', null] });
  // entering travelling right: left is north, right is south
  expect(shape(only('. Ink\nBolt> Fork\n. Spark').first)).toEqual({ fork: ['ink', 'spark'] });
  expect(only(FORK_ORDER).first).toMatchObject({ role: 'fork', at: { x: 1, y: 1 } });
});

test('fork walks left before right', () => {
  expect(shape(only(FORK_ORDER).first)).toEqual({ fork: ['oil', 'spark'] });
  const mirror = only('. Spark .\nBolt> Fork .\n. Oil .');
  expect(shape(mirror.first)).toEqual({ fork: ['spark', 'oil'] });
});

test('visited per cast stops loops', () => {
  const s = only('Bolt> Ink Bendv\n.     Bend^ Bend<');
  expect(shape(s.first)).toEqual('ink');
  expect(s.path).toHaveLength(5);
});

test('left branch claims shared cells first', () => {
  const s = only(`
    .     Bend> Bendv
    Bolt> Fork  Spark
    .     Bend> Bend^
  `);
  expect(shape(s.first)).toEqual({ fork: ['spark', null] });
  expect(s.path.filter((p) => p.rune === 'spark')).toHaveLength(1);
});

test('sources share runes; flow entering another Source stops', () => {
  const c = compile('Bolt> Ink Bolt<');
  expect(c.spells.map((s) => s.key)).toEqual(['0,0', '2,0']);
  for (const s of c.spells) expect(shape(s.first)).toEqual('ink');
  const pair = compile('Bolt> Touch>');
  expect(pair.spells).toHaveLength(2);
  expect(pair.spells[0]?.first).toBeNull();
});

test('holes and the lattice edge end the flow', () => {
  expect(only('Bolt> x Ink').first).toBeNull();
  expect(only('Bolt> Ink').first).not.toBeNull();
  expect(only('Bolt^ Ink').first).toBeNull();
});

test('triggers and shapes wrap the rest; a seal puts the rest in its jar', () => {
  expect(shape(only('Bolt> Tally Spark').first)).toEqual({ tally: 'spark' });
  expect(only('Bolt> Tally Spark').first).toMatchObject({ role: 'trigger', rune: 'tally' });
  expect(shape(only('Splash> Seep Oil').first)).toEqual({ seep: 'oil' });
  expect(only('Bolt> Lay Brass').first).toMatchObject({ role: 'shape', rune: 'lay' });
  expect(shape(only('Bolt> Ink Jar Spark').first)).toEqual({ ink: { jar: 'spark' } });
  expect(stepsOf(only('Bolt> Ink Fuse Spark').first).map((s) => s.role)).toEqual([
    'kind',
    'seal',
    'kind',
  ]);
});

test('auras insulate and ride on the steps and the source they touch', () => {
  const s = only('Bolt> Coil Spark');
  expect(s.first).toBeNull();
  const touched = only('. Afterglow .\nBolt> Oil Spark');
  expect(touched.first).toMatchObject({ rune: 'oil', auras: ['afterglow'] });
  expect(touched.first?.role === 'kind' && touched.first.next).toMatchObject({ auras: [] });
  expect(only('Steep .\nBolt> Spark').sourceAuras).toEqual(['steep']);
});

test('reached cells and aura touches', () => {
  const c = compile('Coil . .\nBolt> Ink Bendv\nSteep . Spark');
  expect(c.reached).toEqual(['0,1', '1,1', '2,1', '2,2']);
  expect(c.auraTouches).toEqual([
    { aura: 'coil', from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
    { aura: 'steep', from: { x: 0, y: 2 }, to: { x: 0, y: 1 } },
  ]);
});

test('describeSpell', () => {
  expect(describeSpell(only(MEMBERS.draughtsman.startLattice))).toBe('Bolt → Ink → Strike');
  expect(describeSpell(only(FORK_ORDER))).toBe('Bolt → [left: Oil | right: Spark]');
  expect(describeSpell(only('Bolt> Tally Spark'))).toBe('Bolt → if Tally: Spark');
  expect(describeSpell(only('Bolt> Ink Jar Spark'))).toBe('Bolt → Ink → Jar: [Spark]');
  expect(describeSpell(only('Touch>'))).toBe('Touch');
});

test('ink per role, and 1 less on a trained school (P33)', () => {
  expect(inkOf('bolt')).toBe(2);
  expect(inkOf('strike')).toBe(2);
  expect(inkOf('ink')).toBe(1);
  expect(inkOf('fork')).toBe(1);
  expect(inkOf('bend')).toBe(1);
  expect(inkOf('tally')).toBe(1);
  expect(inkOf('jar')).toBe(2);
  expect(inkOf('coil')).toBe(3);
  const stoker = MEMBERS.stoker.lean; // trained Seam
  expect(inkOf('bolt', {}, stoker)).toBe(1);
  expect(inkOf('ink', {}, stoker)).toBe(1); // min 1
  expect(inkOf('jar', {}, stoker)).toBe(2); // Timing is not his
  const draughtsman = MEMBERS.draughtsman.lean; // trained Timing
  expect(inkOf('jar', {}, draughtsman)).toBe(1);
  expect(inkUsed(parseLattice(MEMBERS.draughtsman.startLattice))).toBe(5);
  expect(inkUsed(parseLattice(MEMBERS.stoker.startLattice), {}, {}, stoker)).toBe(3);
});

test('an invention costs its parts plus its method and takes its method role', () => {
  const recoil: InventionDef = {
    id: 'inv:recoil',
    name: 'Recoil',
    method: 'bind',
    parts: ['shove'],
    event: 'hit',
    solvent: null,
  };
  const lib = libraryOf([recoil]);
  expect(inkOf('inv:recoil', lib)).toBe(2 + 2);
  const s = only('Bolt> inv:recoil Spark', {}, lib);
  expect(s.first).toMatchObject({ role: 'kind', rune: 'inv:recoil' });
  // Unknown inventions insulate and are flagged.
  expect(only('Bolt> inv:nope Spark').first).toBeNull();
  expect(validateLattice(parseLattice('Bolt> inv:nope'), null).map((i) => i.kind)).toEqual([
    'owned',
  ]);
});

test('a spell carries what it costs on the page, auras touching it included', () => {
  expect(only('Bolt> Ink Strike').ink).toBe(5);
  expect(only('Coil .\nBolt> Spark').ink).toBe(2 + 1 + 3);
});

test('validateLattice flags ink and structural problems', () => {
  const l = parseLattice('Bolt> Ink Strike Coil');
  expect(validateLattice(l, 7).map((i) => i.kind)).toEqual(['ink']);
  expect(validateLattice(l, 8)).toEqual([]);
  expect(validateLattice(l, null)).toEqual([]);
  const base = parseLattice('x .\n. .');
  const kinds = (x: Lattice) => validateLattice(x, null).map((i) => i.kind);
  expect(kinds({ ...base, runes: [{ at: { x: 0, y: 0 }, rune: 'ink' }] })).toEqual(['socket']);
  expect(kinds({ ...base, runes: [{ at: { x: 5, y: 0 }, rune: 'ink' }] })).toEqual(['socket']);
  expect(kinds({ ...base, runes: [{ at: { x: 1, y: 0 }, rune: 'bolt' }] })).toEqual(['arrow']);
  expect(kinds({ ...base, runes: [{ at: { x: 1, y: 0 }, rune: 'ink', dir: 'up' }] })).toEqual([
    'arrow',
  ]);
  const twice: Lattice = {
    ...base,
    runes: [
      { at: { x: 1, y: 0 }, rune: 'ink' },
      { at: { x: 1, y: 0 }, rune: 'oil' },
    ],
  };
  expect(kinds(twice)).toEqual(['overlap']);
});

test('a Glyph extra exit compiles to a split step', () => {
  const g: GlyphDef = {
    id: 'g1',
    name: 'Mark',
    kind: 'payload',
    cells: [{ at: { x: 0, y: 0 }, rune: 'ink' }],
    entry: { x: 0, y: 0 },
    exits: [{ from: { x: 0, y: 0 }, dir: 'right' }],
    idiom: null,
    version: 1,
    params: [],
    extraExit: 'down',
  };
  const s = only('Bolt> G:g1> Spark\n.     Strike .', { g1: g });
  expect(shape(s.first)).toEqual({ ink: { split: ['spark', 'strike'] } });
  expect(s.first).toMatchObject({ at: { x: 1, y: 0 }, inner: { x: 0, y: 0 } });
});

test('setSocket / rotateSocket are pure', () => {
  const l = parseLattice('x .\n. .');
  const before = serializeLattice(l);

  const withBolt = setSocket(l, { x: 1, y: 0 }, 'bolt');
  expect(socketAt(withBolt, { x: 1, y: 0 })).toEqual({
    at: { x: 1, y: 0 },
    rune: 'bolt',
    dir: 'right',
  });
  expect(serializeLattice(l)).toBe(before);

  const ink = setSocket(withBolt, { x: 0, y: 1 }, 'ink', 'up');
  expect(socketAt(ink, { x: 0, y: 1 })).toEqual({ at: { x: 0, y: 1 }, rune: 'ink' }); // no arrow on Ink
  expect(ink.runes.map(runeName)).toEqual(['bolt', 'ink']); // reading order

  const replaced = setSocket(ink, { x: 0, y: 1 }, 'oil');
  expect(replaced.runes.map(runeName)).toEqual(['bolt', 'oil']);
  expect(setSocket(replaced, { x: 0, y: 1 }, null).runes.map(runeName)).toEqual(['bolt']);

  expect(() => setSocket(l, { x: 0, y: 0 }, 'ink')).toThrow(/No socket/);

  const turned = [withBolt];
  for (let i = 0; i < 4; i++) turned.push(rotateSocket(turned[i] ?? withBolt, { x: 1, y: 0 }));
  expect(turned.map((t) => socketAt(t, { x: 1, y: 0 })?.dir)).toEqual([
    'right',
    'down',
    'left',
    'up',
    'right',
  ]);
  expect(socketAt(withBolt, { x: 1, y: 0 })?.dir).toBe('right');
  expect(rotateSocket(ink, { x: 0, y: 1 })).toBe(ink); // Ink has no arrow
  expect(rotateSocket(ink, { x: 1, y: 1 })).toBe(ink); // empty socket
});
