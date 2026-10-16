import { describe, expect, test } from 'vitest';
import { MEMBERS } from '$data';
import {
  type BattleState,
  type CompiledLattice,
  compileLattice,
  createBattle,
  type Dir,
  describeLog,
  type GlyphDef,
  type GlyphLibrary,
  type PlacedRune,
  parseLattice,
  validateLattice,
} from '$engine';
import { cast, expectLog } from './harness';

/**
 * Glyph arguments and the extra exit (research-and-mastery §4.4, §4.5, §5.2; plan M21-M28),
 * asserted on the event log. In the ASCII a Glyph is `G:id>` then optional `[x,y:Rune]` arguments
 * (the Glyph's local cell). The library holds the *effective* defs, as `glyphLibrary` returns them.
 */

const AFFINITY = MEMBERS.draughtsman.affinity;
const c = (x: number, y: number) => ({ x, y });

const glyph = (
  id: string,
  kind: GlyphDef['kind'],
  cells: PlacedRune[],
  extra: Partial<Pick<GlyphDef, 'params' | 'extraExit'>> = {},
): GlyphDef => ({
  id,
  name: id,
  kind,
  cells,
  entry: c(0, 0),
  exits: [],
  idiom: null,
  version: 1,
  params: [],
  extraExit: null,
  ...extra,
});

const libOf = (...defs: GlyphDef[]): GlyphLibrary => Object.fromEntries(defs.map((d) => [d.id, d]));
const compile = (ascii: string, lib: GlyphLibrary): CompiledLattice =>
  compileLattice(parseLattice(ascii), AFFINITY, lib);

/** The draughtsman at D1 casts the lattice's first spell right at a rat on C1. */
function battle(ascii: string, lib: GlyphLibrary, board: string): BattleState {
  const spells = compile(ascii, lib).spells;
  return createBattle({ title: 'test', seed: 1, board, party: { draughtsman: { spells } } }).state;
}
const ROW = 'D . r d .';
const lines = (ascii: string, lib: GlyphLibrary, board = ROW, aim: Dir = 'right'): string[] =>
  describeLog(cast(battle(ascii, lib, board), 'draughtsman', aim).events);

// ── Parameters ──

describe('parameters: an argument is the inner rune for the placement', () => {
  // Cashing In: Bolt, a Material (open), OnInked, Spark.
  const cashing = glyph(
    'ci',
    'spell',
    [
      { at: c(0, 0), rune: 'bolt', dir: 'right' },
      { at: c(1, 0), rune: 'ink' },
      { at: c(2, 0), rune: 'onInked' },
      { at: c(3, 0), rune: 'spark' },
    ],
    { params: ['1,0'] },
  );
  const lib = libOf(cashing);
  const sturdy = 'D . d . .'; // a dummy survives the Bolt, so the Spark has a target

  test('the default Material cashes in: the target is inked, then sparked', () => {
    expectLog(cast(battle('G:ci>', lib, sturdy), 'draughtsman', 'right').events, [
      'Draughtsman casts Bolt right',
      'Bolt hits dummy at C1 for 2',
      'dummy at C1 is inked',
      'ink pools at B1, D1',
      'On Inked: a target is inked',
      'Spark hits dummy at C1 for 2 (inked +1)',
      'the ink on dummy at C1 detonates',
      'Detonation hits dummy at C1 for 2',
    ]);
  });

  test('the same Glyph with Oil in the cell never inks the unit, so nothing cashes in', () => {
    expectLog(cast(battle('G:ci>[1,0:Oil]', lib, sturdy), 'draughtsman', 'right').events, [
      'Draughtsman casts Bolt right',
      'Bolt hits dummy at C1 for 2',
      'oil coats C1',
      'On Inked: no inked target, the chain stops',
    ]);
  });

  test('an argument is only honoured on an open cell of the effective view', () => {
    const closed = libOf({ ...cashing, params: [] }); // the allowance cut it
    expect(lines('G:ci>[1,0:Oil]', closed, sturdy)).toEqual(lines('G:ci>', closed, sturdy));
  });

  test('a wrong-family argument leaves the default and the validator reports it', () => {
    expect(lines('G:ci>[1,0:OnKill]', lib, sturdy)).toEqual(lines('G:ci>', lib, sturdy));
    const issues = validateLattice(parseLattice('G:ci>[1,0:OnKill]'), null, lib);
    expect(issues.map((i) => i.kind)).toEqual(['arg']);
  });

  test('two placements of one Glyph can take different arguments', () => {
    const spells = compile('G:ci>[1,0:Oil] .\n. .\nG:ci> .', lib).spells;
    expect(spells).toHaveLength(2);
    expect(spells[0]?.nodes[0]?.rune).toBe('oil');
    expect(spells[1]?.nodes[0]?.rune).toBe('ink');
  });

  test('an arrow argument turns the flow inside the Glyph (local frame, rotated with it)', () => {
    const bender = glyph(
      'bd',
      'payload',
      [
        { at: c(0, 0), rune: 'pierce' },
        { at: c(1, 0), rune: 'smear' },
        { at: c(0, 1), rune: 'oil' },
      ],
      { params: ['0,0'] },
    );
    const l = (arg: string, dir: string) => `Bolt> G:bd${dir}${arg} .`;
    const first = (src: string) => compile(src, libOf(bender)).spells[0]?.nodes[0]?.rune;
    expect(first(l('', '>'))).toBe('smear');
    expect(first(l('[0,0:Bend>]', '>'))).toBe('smear');
    expect(first(l('[0,0:Bendv]', '>'))).toBe('oil'); // local down
  });
});

// ── The extra exit ──

describe("extra exit: a free Fork at the Glyph's first way out (M27)", () => {
  const SM: PlacedRune[] = [
    { at: c(0, 0), rune: 'bolt', dir: 'right' },
    { at: c(1, 0), rune: 'smear' },
  ];
  const none = libOf(glyph('s', 'spell', SM));
  const up = libOf(glyph('s', 'spell', SM, { extraExit: 'up' }));
  const BOLT_AND_INK = [
    'Draughtsman casts Bolt right',
    'Bolt hits rat at C1 for 2',
    'rat at C1 dies',
    'ink pools at C1',
  ];

  test('the extra side up leads into Oil then Spark: the oil is lit', () => {
    const ascii = 'Spark . .\nOil . .\nG:s> . .';
    expectLog(cast(battle(ascii, none, ROW), 'draughtsman', 'right').events, BOLT_AND_INK);
    expectLog(cast(battle(ascii, up, ROW), 'draughtsman', 'right').events, [
      ...BOLT_AND_INK,
      'oil coats C1',
      'oil at C1 ignites',
    ]);
  });

  test('main branch first: the same cells swapped over main and extra change the log', () => {
    // Main exit right walks first.
    const oilMain = lines('Spark . .\nG:s> Oil .', up);
    const sparkMain = lines('Oil . .\nG:s> Spark .', up);
    expect(oilMain).toEqual([...BOLT_AND_INK, 'oil coats C1', 'oil at C1 ignites']);
    // The Spark goes off before there is any oil to light.
    expect(sparkMain).toEqual([...BOLT_AND_INK, 'oil coats C1']);
  });

  test('an extra side that leads nowhere changes nothing (empty socket, hole, insulator, edge)', () => {
    const down = libOf(glyph('s', 'spell', SM, { extraExit: 'down' }));
    const base = lines('G:s> Oil .\n. . .', none);
    expect(base).toContain('oil coats C1');
    for (const below of ['.', 'x', 'Bolt>']) {
      expect(lines(`G:s> Oil .\n${below} . .`, down)).toEqual(base);
    }
    expect(lines('G:s> Oil .', up)).toEqual(lines('G:s> Oil .', none)); // off the lattice
  });

  test('the same side as the main exit adds nothing (the cells are already taken)', () => {
    const right = libOf(glyph('s', 'spell', SM, { extraExit: 'right' }));
    expect(lines('G:s> Oil .', right)).toEqual(lines('G:s> Oil .', none));
    const spells = compile('G:s> Oil .', right).spells;
    expect(spells[0]?.nodes[0]?.next).toHaveLength(1);
  });

  test('it fires once, at the first way out: later branches do not repeat it', () => {
    // Fork: left (up) branch smears, right (down) branch oils; both leave through the socket.
    const forked = [
      { at: c(0, 0), rune: 'bolt', dir: 'right' },
      { at: c(1, 0), rune: 'fork' },
      { at: c(1, -1), rune: 'smear' },
      { at: c(1, 1), rune: 'oil' },
    ] satisfies PlacedRune[];
    const lib = libOf(glyph('f', 'spell', forked, { extraExit: 'right' }));
    const [sp] = compile('. .\nG:f> Spark', lib).spells;
    const leaves = (sp?.nodes ?? []).map((n) => n.next.map((m) => m.rune));
    expect(leaves).toEqual([['spark'], []]); // the up-branch got the extra exit, once
  });

  test('an extra exit takes the cell the second branch would have taken (walk order decides)', () => {
    // First branch (up) leaves through the socket and the extra side (down) claims Ink before the
    // down branch (Oil) reaches it.
    const forked = [
      { at: c(0, 0), rune: 'bolt', dir: 'right' },
      { at: c(1, 0), rune: 'fork' },
      { at: c(1, -1), rune: 'smear' },
      { at: c(1, 1), rune: 'oil' },
    ] satisfies PlacedRune[];
    const lib = libOf(glyph('f', 'spell', forked, { extraExit: 'down' }));
    const [sp] = compile('Spark . .\nG:f> . .\nInk . .', lib).spells;
    expect(sp?.nodes[0]?.next.map((n) => n.rune)).toEqual(['spark', 'ink']);
    expect(sp?.nodes[1]?.next.map((n) => n.rune)).toEqual([]); // Ink was already walked
  });

  test('branches that all end on insulators never reach it ("no way out to share")', () => {
    const closed = glyph('s', 'spell', [...SM, { at: c(2, 0), rune: 'amplify' }], {
      extraExit: 'up',
    });
    const spells = compile('. .\nG:s> Oil', libOf(closed)).spells;
    expect(spells[0]?.nodes[0]?.next).toEqual([]);
    const ascii = 'Spark . .\nOil . .\nG:s> . .';
    expect(lines(ascii, libOf(closed))).toEqual(
      lines(ascii, libOf({ ...closed, extraExit: null })),
    );
  });

  test('it rotates with the Glyph: local up placed down is world right', () => {
    const upLog = lines('Spark . .\nOil . .\nG:s> Ink .', up);
    // Turn the picture a quarter clockwise: the Glyph points down, its local up is world right.
    const turned = lines('G:sv Oil Spark\nInk . .', up);
    expect(turned).toEqual(upLog);
    const reached = (ascii: string) => compile(ascii, up).reached.sort();
    expect(reached('G:sv Oil Spark\nInk . .')).toEqual(['0,0', '0,1', '1,0', '2,0']);
  });

  test('a Payload Glyph gets the extra exit too', () => {
    const p = glyph('p', 'payload', [{ at: c(0, 0), rune: 'smear' }], { extraExit: 'up' });
    const ascii = '. Spark .\nBolt> G:p> Oil';
    const board = 'D . d . .';
    const got = lines(ascii, libOf(p), board);
    expect(got).toEqual([
      'Draughtsman casts Bolt right',
      'Bolt hits dummy at C1 for 2',
      'dummy at C1 is inked',
      'oil coats C1',
      'Spark hits dummy at C1 for 2 (inked +1)',
      'the ink on dummy at C1 detonates',
      'Detonation hits dummy at C1 for 2',
      'oil at C1 ignites',
      'Fire hits dummy at C1 for 1',
    ]);
    // Without it the Spark is never reached.
    expect(lines(ascii, libOf({ ...p, extraExit: null }), board)).toEqual(got.slice(0, 4));
  });

  test('reached cells only ever grow (the extra branch adds its cells)', () => {
    const ascii = 'Spark . .\nOil . .\nG:s> Ink .';
    const without = new Set(compile(ascii, none).reached);
    const withExtra = new Set(compile(ascii, up).reached);
    for (const k of without) expect(withExtra.has(k)).toBe(true);
    expect(withExtra.size).toBeGreaterThan(without.size);
  });
});

// ── The extra exit with arguments and neighbours (BL-89) ──

describe('extra exit meets a Shape argument and its neighbours (M27, BL-89)', () => {
  const sturdy = 'D . d . .';
  const INK_AND_SPARK = [
    'Draughtsman casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'dummy at C1 is inked',
    'Spark hits dummy at C1 for 2 (inked +1)',
    'the ink on dummy at C1 detonates',
    'Detonation hits dummy at C1 for 2',
  ];
  // Bolt, Smear, then an open Bend at the way out; the extra exit leaves up.
  const bender = glyph(
    'b',
    'spell',
    [
      { at: c(0, 0), rune: 'bolt', dir: 'right' },
      { at: c(1, 0), rune: 'smear' },
      { at: c(2, 0), rune: 'bend', dir: 'right' },
    ],
    { params: ['2,0'], extraExit: 'up' },
  );
  const lib = libOf(bender);
  const page = (arg: string) => `Spark . .\nG:b>${arg} Oil .\n. . .`;

  test('the default Bend leaves right into Oil, then the extra side lights it from above', () => {
    expect(lines(page(''), lib, sturdy)).toEqual([
      'Draughtsman casts Bolt right',
      'Bolt hits dummy at C1 for 2',
      'dummy at C1 is inked',
      'oil coats C1',
      'Spark hits dummy at C1 for 2 (inked +1)',
      'the ink on dummy at C1 detonates',
      'Detonation hits dummy at C1 for 2',
      'oil at C1 ignites',
      'Fire hits dummy at C1 for 1',
    ]);
  });

  test('a Bend argument pointing into the extra side: one branch, the Oil is never reached', () => {
    expect(lines(page('[2,0:Bend^]'), lib, sturdy)).toEqual(INK_AND_SPARK);
    const [sp] = compile(page('[2,0:Bend^]'), lib).spells;
    expect(sp?.nodes[0]?.next.map((n) => n.rune)).toEqual(['spark']); // the extra side adds nothing
    expect(compile(page('[2,0:Bend^]'), lib).reached.sort()).toEqual(['0,0', '0,1']);
  });

  test('a Bend argument pointing away into an empty socket still leaves the extra side', () => {
    expect(lines(page('[2,0:Bendv]'), lib, sturdy)).toEqual(INK_AND_SPARK);
    // With no extra exit the same argument casts the Bolt and Smear alone.
    const plain = libOf({ ...bender, extraExit: null });
    expect(lines(page('[2,0:Bendv]'), plain, sturdy)).toEqual(INK_AND_SPARK.slice(0, 3));
  });
});

describe('a Glyph beside a rune on its extra side (M27, BL-89)', () => {
  const sturdy = 'D . d . .';
  const smear = glyph('p', 'payload', [{ at: c(0, 0), rune: 'smear' }], { extraExit: 'down' });
  const oiler = glyph('q', 'payload', [{ at: c(0, 0), rune: 'oil' }]);
  const lib = libOf(smear, oiler);
  const MAIN = [
    'Draughtsman casts Bolt right',
    'Bolt hits dummy at C1 for 2',
    'dummy at C1 is inked',
    'Spark hits dummy at C1 for 2 (inked +1)',
    'the ink on dummy at C1 detonates',
    'Detonation hits dummy at C1 for 2',
  ];

  test('the rune below is walked after the main branch: Spark first, then the Oil', () => {
    expect(lines('Bolt> G:p> Spark\n. Oil .', lib, sturdy)).toEqual([...MAIN, 'oil coats C1']);
    expect(
      lines('Bolt> G:p> Spark\n. Oil .', libOf({ ...smear, extraExit: null }), sturdy),
    ).toEqual(MAIN);
  });

  test('a Payload Glyph on the extra side is entered only when it faces the flow', () => {
    // Facing right, its way in is from the left: flow coming down misses it.
    expect(lines('Bolt> G:p> Spark\n. G:q> .', lib, sturdy)).toEqual(MAIN);
    expect(compile('Bolt> G:p> Spark\n. G:q> .', lib).reached).not.toContain('1,1');
    // Facing down, the flow from above is its way in, and it pours its Oil.
    expect(lines('Bolt> G:p> Spark\n. G:qv .', lib, sturdy)).toEqual([...MAIN, 'oil coats C1']);
    expect(compile('Bolt> G:p> Spark\n. G:qv .', lib).reached).toContain('1,1');
  });
});
