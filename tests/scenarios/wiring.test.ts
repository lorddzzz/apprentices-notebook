import { describe, expect, test } from 'vitest';
import { MEMBERS } from '$data';
import {
  type Aim,
  type BattleState,
  compileLattice,
  createBattle,
  describeLog,
  type GlyphDef,
  type GlyphLibrary,
  parseLabel,
  parseLattice,
  type Spell,
  stepShape,
} from '$engine';
import { castWith, fakes } from './fake-runes';
import { act, expectLogIncludes, withLattices } from './harness';

/**
 * Design §3 (R3–R9) and plan P21–P24: the order a spell is read in. The Actions and Kinds are
 * fakes (`fake-runes.ts`): each note shows when it ran and where its target stood.
 */

const ids = (state: BattleState, id: string) => state.units.find((u) => u.id === id);
const tileState = (state: BattleState, at: string) =>
  state.tiles[parseLabel(at).y * state.width + parseLabel(at).x]?.state?.id ?? null;

describe('wiring order (R3)', () => {
  test('oil-then-spark-vs-spark-then-oil', () => {
    const board = 'D . r';
    const oilFirst = fakes();
    const a = castWith(
      oilFirst,
      withLattices(board, { draughtsman: 'Bolt> Oil Spark' }),
      'draughtsman',
      'right',
    );
    expect(oilFirst.calls).toEqual(['oil@C1', 'spark@C1']);
    expectLogIncludes(a.events, [
      'oil lands at C1 as slick',
      'Spark hits rat at C1 for 1',
      'spark lands at C1 as fire',
    ]);
    expect(tileState(a.state, 'C1')).toBe('fire');

    const sparkFirst = fakes();
    const b = castWith(
      sparkFirst,
      withLattices(board, { draughtsman: 'Bolt> Spark Oil' }),
      'draughtsman',
      'right',
    );
    expect(sparkFirst.calls).toEqual(['spark@C1', 'oil@C1']);
    expectLogIncludes(b.events, ['Spark hits rat at C1 for 1', 'oil lands at C1 as slick']);
    expect(describeLog(b.events).join('\n')).not.toContain('as fire');
    expect(tileState(b.state, 'C1')).toBe('slick');
  });

  test('shove-then-strike-follows-unit', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('D r . .', { draughtsman: 'Bolt> Shove Strike' }),
      'draughtsman',
      'right',
    );
    // R7: the Strike lands where the rat ended up, not on the tile it was aimed at.
    expect(f.calls).toEqual(['shove@B1', 'strike@C1']);
    expectLogIncludes(r.events, ['rat at B1 is pushed right to C1', 'Strike hits rat at C1 for 2']);
    expect(ids(r.state, 'rat-1')?.pos).toEqual(parseLabel('C1'));
  });

  test('a unit that died drops out of the rest', () => {
    const f = fakes();
    const board = 'D r . .';
    const start = withLattices(board, { draughtsman: 'Bolt> Strike Strike Oil' });
    const s = structuredClone(start);
    const rat = ids(s, 'rat-1');
    if (rat) rat.hp = 2;
    const r = castWith(f, s, 'draughtsman', 'right');
    // The first Strike kills the rat: the second and the Oil have nothing to follow.
    expect(f.calls).toEqual(['strike@B1']);
    expectLogIncludes(r.events, ['Strike hits rat at B1 for 2', 'rat at B1 dies']);
  });

  test('bolt-empty-line-targets-tile', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('D . . . .', { draughtsman: 'Bolt> Oil' }),
      'draughtsman',
      'right',
    );
    // P21: nothing in the line, so the last open tile in range (range 4).
    expect(f.calls).toEqual(['oil@E1']);
    expectLogIncludes(r.events, ['oil lands at E1 as slick']);
    expect(r.events.find((e) => e.type === 'aimed')).toMatchObject({
      targets: [{ kind: 'tile', at: parseLabel('E1') }],
      heading: 'right',
    });
  });
});

describe('Fork (R5, P24)', () => {
  const FORK = '. Strike .\nBolt> Fork .\n. Oil .'; // Strike on the left branch, Oil on the right

  test('fork-left-before-right', () => {
    const f = fakes();
    const board = '. r .\nD r .\n. r .';
    const r = castWith(f, withLattices(board, { draughtsman: FORK }), 'draughtsman', 'right');
    // Bolt hits the middle rat heading right: left is up (B1), right is down (B3).
    expect(f.calls).toEqual(['strike@B1', 'oil@B3']);
    expectLogIncludes(r.events, [
      'Strike hits rat at B1 for 2',
      'rat at B1 dies',
      'oil lands at B3 as slick',
    ]);
    // The target itself is not acted on, only its two sides.
    expect(ids(r.state, 'rat-2')?.hp).toBe(ids(withLattices(board, {}), 'rat-2')?.hp);
  });

  test('fork-sides-follow-heading', () => {
    const board = '. . r . .\n. . . . .\nr . D . r\n. . . . .\n. . r . .';
    const cases: { dir: 'up' | 'right' | 'down' | 'left'; left: string; right: string }[] = [
      { dir: 'up', left: 'B1', right: 'D1' },
      { dir: 'right', left: 'E2', right: 'E4' },
      { dir: 'down', left: 'D5', right: 'B5' },
      { dir: 'left', left: 'A4', right: 'A2' },
    ];
    for (const c of cases) {
      const f = fakes();
      castWith(f, withLattices(board, { draughtsman: FORK }), 'draughtsman', c.dir);
      expect(f.calls, c.dir).toEqual([`strike@${c.left}`, `oil@${c.right}`]);
    }
  });

  test('a side off the board is dropped, duplicates are dropped', () => {
    const f = fakes();
    // Rat in the top row heading right: its left side is off the board.
    castWith(f, withLattices('D r\n. .', { draughtsman: FORK }), 'draughtsman', 'right');
    expect(f.calls).toEqual(['oil@B2']);
    const g = fakes();
    // A Splash over two tiles whose sides overlap: the shared tile is acted on once.
    const s = withLattices('. . D . .\n. . . . .\n. . . . .\n. . . . .', {
      draughtsman: '. Oil .\nSplash> Fork .',
    });
    castWith(g, s, 'draughtsman', { kind: 'tile', at: parseLabel('C3') });
    const seen = g.calls.filter((c) => c.startsWith('oil@'));
    expect(new Set(seen).size).toBe(seen.length);
  });

  test('a Shove after a Fork still pushes along the spell heading', () => {
    const f = fakes();
    const lattice = '. Shove .\nBolt> Fork .';
    const r = castWith(
      f,
      withLattices('. r .\nD r .\n. r .', { draughtsman: lattice }),
      'draughtsman',
      'right',
    );
    expect(f.calls).toEqual(['shove@B1']);
    expect(ids(r.state, 'rat-1')?.pos).toEqual(parseLabel('C1')); // right, not up
  });
});

describe('Splash (R9, P23)', () => {
  const AREA: Aim = { kind: 'tile', at: parseLabel('C3') };

  test('splash-reading-order', () => {
    const f = fakes();
    const board = '. . D . .\n. r . . .\n. . . r .\n. . r . .\n. . . . .';
    const r = castWith(
      f,
      withLattices(board, { draughtsman: 'Splash> Oil Strike' }),
      'draughtsman',
      AREA,
    );
    const area = ['B2', 'C2', 'D2', 'B3', 'C3', 'D3', 'B4', 'C4', 'D4'];
    // Each rune runs over the whole area, in reading order, before the next rune starts.
    expect(f.calls).toEqual([...area.map((c) => `oil@${c}`), ...area.map((c) => `strike@${c}`)]);
    const hits = describeLog(r.events).filter((l) => l.startsWith('Strike hits'));
    expect(hits).toEqual([
      'Strike hits rat at B2 for 2',
      'Strike hits rat at D3 for 2',
      'Strike hits rat at C4 for 2',
    ]);
  });

  test('splash-shove-once-per-unit', () => {
    const f = fakes();
    // The rat at B2 is shoved down (caster → centre) onto B3, a later tile of the same area.
    const board = '. . D . .\n. r . . .\n. . . . .\n. . . . .\n. . . . .';
    const r = castWith(
      f,
      withLattices(board, { draughtsman: 'Splash> Shove' }),
      'draughtsman',
      AREA,
    );
    expect(ids(r.state, 'rat-1')?.pos).toEqual(parseLabel('B3'));
    expect(r.events.filter((e) => e.type === 'push')).toHaveLength(1);
    expect(f.calls).not.toContain('shove@B3');
    expect(f.calls[0]).toBe('shove@B2');
  });
});

describe('Touch (R2, P22)', () => {
  const TOUCH_FORK = '. Strike .\nTouch> Fork .\n. Oil .';

  test('touch-self-no-heading', () => {
    const f = fakes();
    const start = withLattices('. . .\nD . .\n. . r', { draughtsman: TOUCH_FORK });
    const r = castWith(f, start, 'draughtsman', { kind: 'self' });
    // Not moved this turn: no heading, so the Fork has no sides, and says so.
    expect(f.calls).toEqual([]);
    expect(r.events.find((e) => e.type === 'miss')).toMatchObject({
      source: 'Fork',
      line: 'fork:noHeading',
    });

    // After a move the heading is the move's direction.
    const moved = act(start, { type: 'move', unit: 'draughtsman', to: parseLabel('B2') });
    const g = fakes();
    castWith(g, moved.state, 'draughtsman', { kind: 'self' });
    expect(g.calls).toEqual(['strike@B1', 'oil@B3']);
  });

  test('Touch on an adjacent tile heads toward it', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('. . .\nD r .\n. . .', { draughtsman: 'Touch> Shove' }),
      'draughtsman',
      { kind: 'tile', at: parseLabel('B2') },
    );
    expect(ids(r.state, 'rat-1')?.pos).toEqual(parseLabel('C2'));
  });
});

describe('Seal (J1)', () => {
  test('seal-splits-before-after', () => {
    const f = fakes();
    const r = castWith(
      f,
      withLattices('D . r', { draughtsman: 'Bolt> Ink Jar Spark Oil' }),
      'draughtsman',
      'right',
    );
    // Before the Seal: now. After it: sealed, not run.
    expect(f.calls).toEqual(['ink@C1']);
    expect(f.jars).toHaveLength(1);
    const { at, jar } = f.jars[0] ?? { at: { x: -1, y: -1 }, jar: null };
    expect(at).toEqual(parseLabel('C1'));
    expect(jar).toMatchObject({
      owner: 'draughtsman',
      event: 'step',
      heading: 'right',
      origin: { caster: 'draughtsman', cast: 1 },
    });
    expect(jar?.rest).toMatchObject({ role: 'kind', rune: 'spark', next: { rune: 'oil' } });
    expect(tileState(r.state, 'C1')).toBeNull();

    // Fuse seals the same way, for dusk.
    const g = fakes();
    castWith(
      g,
      withLattices('D . r', { draughtsman: 'Bolt> Ink Fuse Spark' }),
      'draughtsman',
      'right',
    );
    expect(g.jars[0]?.jar.event).toBe('dusk');
  });

  test('a Seal with nothing after it seals nothing', () => {
    const f = fakes();
    castWith(f, withLattices('D . r', { draughtsman: 'Bolt> Ink Jar' }), 'draughtsman', 'right');
    expect(f.calls).toEqual(['ink@C1']);
    expect(f.jars).toEqual([]);
  });

  test('Splash seals one jar per target, in reading order', () => {
    const f = fakes();
    castWith(
      f,
      withLattices('. . D . .\n. r . . .\n. . . . .\n. . . . .', {
        draughtsman: 'Splash> Jar Oil',
      }),
      'draughtsman',
      { kind: 'tile', at: parseLabel('C3') },
    );
    expect(f.jars.map((j) => j.at)).toEqual(
      ['B2', 'C2', 'D2', 'B3', 'C3', 'D3', 'B4', 'C4', 'D4'].map(parseLabel),
    );
  });
});

describe('a Glyph casts what its flat cluster casts (Fork and Seal inside)', () => {
  const LEAN = MEMBERS.draughtsman.lean;
  const c = (x: number, y: number) => ({ x, y });
  const glyph = (id: string, kind: GlyphDef['kind'], cells: GlyphDef['cells']): GlyphDef => ({
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
  });
  const compile = (ascii: string, library: GlyphLibrary = {}): Spell[] =>
    compileLattice(parseLattice(ascii), library, {}, LEAN).spells;
  const battle = (board: string, spells: Spell[]): BattleState =>
    createBattle({ title: 'test', seed: 1, board, party: { draughtsman: { spells } } }).state;

  const BOARDS = ['. r .\nD r .\n. r .', '. d .\nD r .\n. . .', 'D . .\n. . .\n. . .'];

  const CASES = [
    {
      name: 'a Fork inside a Spell Glyph, the right branch leaving to an outside tail',
      flat: '. Strike . .\nBolt> Fork . .\n. Oil . .\n. Spark . .',
      compiled: '. . . .\nG:fk> . . .\nOil . . .\nSpark . . .',
      def: glyph('fk', 'spell', [
        { at: c(0, 0), rune: 'bolt', dir: 'right' },
        { at: c(1, 0), rune: 'fork' },
        { at: c(1, -1), rune: 'strike' },
      ]),
      expects: ['strike@B1', 'oil@B3', 'spark@B3'],
    },
    {
      name: 'a Seal inside a Payload Glyph keeps the rest in its jar',
      flat: 'Bolt> Ink Jar Spark Oil',
      compiled: 'Bolt> G:pj> Oil . .',
      def: glyph('pj', 'payload', [
        { at: c(0, 0), rune: 'ink' },
        { at: c(1, 0), rune: 'jar' },
        { at: c(2, 0), rune: 'spark' },
      ]),
      expects: ['ink@B2'],
    },
  ];

  for (const k of CASES) {
    test(k.name, () => {
      const lib: GlyphLibrary = { [k.def.id]: k.def };
      const flat = compile(k.flat);
      const compiled = compile(k.compiled, lib);
      expect(flat).toHaveLength(1);
      expect(compiled).toHaveLength(1);
      for (const board of BOARDS) {
        const a = fakes();
        const b = fakes();
        const ra = castWith(a, battle(board, flat), 'draughtsman', 'right');
        const rb = castWith(b, battle(board, compiled), 'draughtsman', 'right');
        expect(describeLog(rb.events)).toEqual(describeLog(ra.events));
        expect(b.calls).toEqual(a.calls);
        expect(
          b.jars.map((j) => [j.at, j.jar.event, j.jar.heading, stepShape(j.jar.rest)]),
        ).toEqual(a.jars.map((j) => [j.at, j.jar.event, j.jar.heading, stepShape(j.jar.rest)]));
      }
      const probe = fakes();
      castWith(probe, battle(BOARDS[0] as string, flat), 'draughtsman', 'right');
      expect(probe.calls.slice(0, k.expects.length)).toEqual(
        k.expects.slice(0, probe.calls.length),
      );
      if (k.def.id === 'pj') expect(probe.jars).toHaveLength(1);
    });
  }
});
