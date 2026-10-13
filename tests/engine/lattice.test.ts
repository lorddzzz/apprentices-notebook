import { expect, test } from 'vitest';
import { MEMBERS } from '$data';
import {
  compileLattice,
  countRunes,
  describeSpell,
  inkCost,
  inkUsed,
  type Lattice,
  parseLattice,
  rotateSocket,
  type Spell,
  type SpellNode,
  serializeLattice,
  setSocket,
  socketAt,
  validateLattice,
} from '$engine';

type Affinity = Parameters<typeof compileLattice>[1];

const compile = (ascii: string, affinity: Affinity = []) =>
  compileLattice(parseLattice(ascii), affinity);

const only = (ascii: string, affinity: Affinity = []): Spell => {
  const [spell, ...rest] = compile(ascii, affinity).spells;
  if (!spell || rest.length > 0) throw new Error('expected exactly one spell');
  return spell;
};

/** Compact node shape for assertions: `'ink'` or `{ ink: [...children] }`. */
const shape = (nodes: readonly SpellNode[]): unknown[] =>
  nodes.map((n) => (n.next.length > 0 ? { [n.rune]: shape(n.next) } : n.rune));

const DRAUGHTSMAN = MEMBERS.draughtsman.affinity;
const STOKER = MEMBERS.stoker.affinity;

const DESIGN_EXAMPLE = `
  Amp   .   .       .       .
  Bolt> Ink Fork    .       .
  .     .   Bend>   OnInked Spark
`;
const FORK_ORDER = `
  .     Oil   .
  Bolt> Fork  .
  .     Spark .
`;

test('straight flow', () => {
  const s = only('Bolt> Ink Spark');
  expect(shape(s.nodes)).toEqual([{ ink: ['spark'] }]);
  expect(s.key).toBe('0,0');
  expect(s.source).toBe('bolt');
  expect(s.charges).toBe(5);
  expect(s.path.map((p) => p.rune)).toEqual(['bolt', 'ink', 'spark']);
});

test('bend uses absolute arrow', () => {
  const s = only('Bolt> Bendv\n.     Spark');
  expect(shape(s.nodes)).toEqual(['spark']);
  expect(s.path.map((p) => [p.rune, p.dir])).toEqual([
    ['bolt', 'right'],
    ['bend', 'right'],
    ['spark', 'down'],
  ]);
});

test('bend pointing back stops', () => {
  const s = only('Bolt> Bend<');
  expect(s.nodes).toEqual([]);
  expect(s.path.map((p) => p.rune)).toEqual(['bolt', 'bend']);
});

test('fork is relative to travel', () => {
  // entering the fork travelling down: left is east
  const s = only('Boltv .\nFork Ink');
  expect(shape(s.nodes)).toEqual(['ink']);
  // entering travelling right: left is north, right is south
  expect(shape(only('. Ink\nBolt> Fork\n. Spark').nodes)).toEqual(['ink', 'spark']);
});

test('fork resolves left before right', () => {
  const s = only(FORK_ORDER, DRAUGHTSMAN);
  expect(shape(s.nodes)).toEqual(['oil', 'spark']);
  // mirrored: Spark on top
  const mirror = only('. Spark .\nBolt> Fork .\n. Oil .', DRAUGHTSMAN);
  expect(shape(mirror.nodes)).toEqual(['spark', 'oil']);
});

test('visited per cast stops loops', () => {
  const s = only('Bolt> Ink Bendv\n.     Bend^ Bend<');
  expect(shape(s.nodes)).toEqual(['ink']);
  expect(s.path).toHaveLength(5);
});

test('left branch claims shared cells first', () => {
  const s = only(`
    .     Bend> Bendv
    Bolt> Fork  Spark
    .     Bend> Bend^
  `);
  expect(s.nodes).toHaveLength(1);
  expect(s.nodes[0]?.at).toEqual({ x: 2, y: 1 });
  expect(s.path.filter((p) => p.rune === 'spark')).toHaveLength(1);
});

test('sources share runes', () => {
  const c = compile('Bolt> Ink Bolt<');
  expect(c.spells.map((s) => s.key)).toEqual(['0,0', '2,0']);
  for (const s of c.spells) expect(shape(s.nodes)).toEqual(['ink']);
  // flow entering another Source stops
  const pair = compile('Bolt> Ward>');
  expect(pair.spells).toHaveLength(2);
  expect(pair.spells[0]?.nodes).toEqual([]);
});

test('holes and the lattice edge end the flow', () => {
  expect(only('Bolt> x Ink').nodes).toEqual([]);
  expect(only('Bolt> Ink').nodes).toHaveLength(1);
  expect(only('Bolt^ Ink').nodes).toEqual([]);
});

test('auras insulate', () => {
  const s = only('Bolt> Amp Spark');
  expect(s.nodes).toEqual([]);
  expect(s.magnitude).toBe(3);
  expect(s.amp).toBe(1);
});

test('amplify stacks', () => {
  const spark = only('. Amp .\nBolt> Spark Amp');
  expect(spark.nodes[0]).toMatchObject({ rune: 'spark', amp: 2, magnitude: 3 });
  const src = only('Amp .\nBolt> Spark\nAmp .');
  expect(src.amp).toBe(2);
  expect(src.magnitude).toBe(4);
  // Amplify beside shape or trigger runes does nothing
  expect(only('. Amp .\nBolt> Bend> Spark').nodes[0]).toMatchObject({ magnitude: 1 });
});

test('affinity adds magnitude', () => {
  const d = only(MEMBERS.draughtsman.startLattice, DRAUGHTSMAN);
  expect(d.magnitude).toBe(2);
  expect(d.nodes[0]).toMatchObject({ rune: 'ink', amp: 0, magnitude: 2 });
  const s = only(MEMBERS.stoker.startLattice, STOKER);
  expect(s.nodes[0]).toMatchObject({ rune: 'spark', magnitude: 2 });
  // sources never get affinity
  expect(s.magnitude).toBe(2);
  // without affinity the same rune is base strength
  expect(only(MEMBERS.stoker.startLattice).nodes[0]).toMatchObject({ magnitude: 1 });
});

test('echo only on source', () => {
  expect(only('. Echo .\nBolt> Spark .').echo).toBe(false);
  expect(only('Echo . .\nBolt> Spark .').echo).toBe(true);
  expect(only('Echo . .\nBolt> Spark .\nEcho . .').echo).toBe(true);
});

test('triggers gate the rest', () => {
  const s = only('Bolt> OnInked Spark');
  expect(s.nodes).toHaveLength(1);
  expect(s.nodes[0]).toMatchObject({ kind: 'trigger', rune: 'onInked' });
  expect(shape(s.nodes)).toEqual([{ onInked: ['spark'] }]);
  expect(shape(only('Bolt> OnKill Steam').nodes)).toEqual([{ onKill: ['steam'] }]);
});

test('reached cells and aura touches', () => {
  const c = compile('Amp . .\nBolt> Ink Bendv\nEcho . Spark');
  expect(c.reached).toEqual(['0,1', '1,1', '2,1', '2,2']);
  expect(c.auraTouches).toEqual(
    expect.arrayContaining([
      { aura: 'amplify', from: { x: 0, y: 0 }, to: { x: 0, y: 1 } },
      { aura: 'echo', from: { x: 0, y: 2 }, to: { x: 0, y: 1 } },
    ]),
  );
  expect(c.auraTouches).toHaveLength(2);
});

test('describeSpell', () => {
  const d = only(MEMBERS.draughtsman.startLattice, DRAUGHTSMAN);
  expect(describeSpell(d)).toBe('Bolt (2 damage) → Ink 3×3');
  const s = only(MEMBERS.stoker.startLattice, STOKER);
  expect(describeSpell(s)).toBe('Bolt (2 damage) → Spark (2 damage)');
  expect(describeSpell(only(DESIGN_EXAMPLE, DRAUGHTSMAN))).toBe(
    'Bolt (3 damage) → Ink 3×3 → if inked: Spark (1 damage)',
  );
  expect(describeSpell(only(FORK_ORDER, DRAUGHTSMAN))).toBe(
    'Bolt (2 damage) → [Oil | Spark (1 damage)]',
  );
  expect(describeSpell(only('. Amp .\nBolt> Ink .', DRAUGHTSMAN))).toBe(
    'Bolt (2 damage) → Ink 5×5',
  );
  expect(describeSpell(only('Echo .\nBolt> Spark'))).toBe(
    'Bolt (2 damage) → Spark (1 damage) · echoes next turn at half strength',
  );
  expect(describeSpell(only('Splash>'))).toBe('Splash (1 damage, 3×3)');
  expect(describeSpell(only('Ward> Steam'))).toBe('Ward (shield 2) → Steam');
  expect(describeSpell(only('Bolt> OnKill'))).toBe(
    'Bolt (2 damage) → on kill, from each victim: (nothing)',
  );
  expect(describeSpell(only('Bolt> OnKill Steam'))).toBe(
    'Bolt (2 damage) → on kill, from each victim: Steam',
  );
});

test('ink cost', () => {
  expect(inkCost('amplify')).toBe(3);
  expect(inkCost('bolt')).toBe(2);
  expect(inkUsed(parseLattice(DESIGN_EXAMPLE))).toBe(11);
  expect(inkUsed(parseLattice(MEMBERS.draughtsman.startLattice))).toBe(3);
  const issues = validateLattice(parseLattice(DESIGN_EXAMPLE), 8);
  expect(issues.map((i) => i.kind)).toEqual(['ink']);
  expect(validateLattice(parseLattice(DESIGN_EXAMPLE), 11)).toEqual([]);
  expect(validateLattice(parseLattice(DESIGN_EXAMPLE), null)).toEqual([]);
});

test('countRunes sums across lattices', () => {
  const counts = countRunes([parseLattice('Bolt> Ink'), parseLattice('Bolt> Ink Ink')]);
  expect(counts.bolt).toBe(2);
  expect(counts.ink).toBe(3);
  expect(counts.echo).toBe(0);
});

test('validateLattice flags structural problems', () => {
  const base = parseLattice('x .\n. .');
  const kinds = (l: Lattice) => validateLattice(l, null).map((i) => i.kind);
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
  expect(ink.runes.map((r) => r.rune)).toEqual(['bolt', 'ink']); // reading order

  const replaced = setSocket(ink, { x: 0, y: 1 }, 'oil');
  expect(replaced.runes.map((r) => r.rune)).toEqual(['bolt', 'oil']);
  expect(setSocket(replaced, { x: 0, y: 1 }, null).runes.map((r) => r.rune)).toEqual(['bolt']);

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
