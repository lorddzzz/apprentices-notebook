import { describe, expect, test, vi } from 'vitest';
import { DISTRICT_TOKENS, type TokenEntry, tokenCollisions } from '$data/districts/index';
import { RIVAL_TOKENS } from '$data/rivals';
import { arrive } from '$engine/arrival';
import { componentsOf } from '$engine/districts/api';
import { KIT } from '$engine/districts/kit';
import type { DistrictModule, Json, TilePiece } from '$engine/districts/types';
import { COMPOUND_BRACE_NAMES, parseBoard, parseCell, serializeBoard } from '$engine/notation';
import {
  hitPiece,
  pieceBlocksShots,
  pieceBlocksUnits,
  piecesOn,
  strikePiece,
} from '$engine/pieces';
import { legalMoves, tileAt } from '$engine/queries';
import type { BattleState } from '$engine/types';
import {
  act,
  board,
  cast,
  draft,
  parseLabel,
  unitAtLabel,
  withLattices,
} from '../scenarios/harness';

/**
 * DK-4 board pieces (district-kit P10) with fixture pieces registered through a mocked kit: the
 * notation round trip, solidity, and one scenario per trigger (arrive, turn end, struck, hit).
 */

interface Probe {
  arrived: number;
  turns: number;
  hits: number;
  struck: string[];
  [k: string]: Json;
}

const FIXTURE = vi.hoisted((): DistrictModule => {
  const fresh = (): Probe => ({ arrived: 0, turns: 0, hits: 0, struck: [] });
  const asProbe = (d: Json): Probe => d as unknown as Probe;
  const bump = (p: TilePiece, field: 'arrived' | 'turns' | 'hits'): void => {
    const d = asProbe(p.data);
    p.data = { ...d, [field]: d[field] + 1 };
  };
  const onArrive = {
    answers: 'landing' as const,
    subjects: ['unit' as const],
    run(ctx: { s: BattleState }, a: { at: { x: number; y: number } }) {
      const piece = ctx.s.tiles[a.at.y * ctx.s.width + a.at.x]?.piece;
      if (piece) bump(piece, 'arrived');
      return 'go' as const;
    },
  };
  return {
    id: 'bathhouses',
    pieces: [
      {
        id: 'bathhouses:probe',
        token: 'probe',
        solid: 'none',
        data: {
          init: fresh(),
          parse: (s) => (/^\d+$/.test(s) ? { ...fresh(), turns: Number(s) } : null),
          write: (d) => (asProbe(d).turns ? String(asProbe(d).turns) : ''),
        },
        triggers: {
          onArrive,
          onTurnEnd: (_ctx, _at, p) => bump(p, 'turns'),
          onStruck: (_ctx, _at, p, by) => {
            const d = asProbe(p.data);
            p.data = { ...d, struck: [...d.struck, by] };
          },
          onHit: (_ctx, _at, p) => bump(p, 'hits'),
        },
        art: 'probe',
      },
      {
        id: 'bathhouses:mat',
        token: 'mat',
        solid: 'none',
        data: { init: fresh() },
        exempt: ['flies'],
        triggers: { onArrive },
        art: 'mat',
      },
      { id: 'bathhouses:pencil', token: 'pencil', solid: 'units', triggers: {}, art: 'pencil' },
      {
        id: 'bathhouses:bell',
        token: 'bell',
        solid: 'unitsAndShots',
        data: { init: fresh() },
        triggers: {
          onStruck: (_ctx, _at, p, by) => {
            const d = asProbe(p.data);
            p.data = { ...d, struck: [...d.struck, by] };
          },
          onHit: (_ctx, _at, p) => bump(p, 'hits'),
        },
        art: 'bell',
      },
    ],
  };
});

vi.mock('$engine/districts/kit', async (importOriginal) => {
  const m = await importOriginal<typeof import('$engine/districts/kit')>();
  const { buildKit } = await import('$engine/districts/registry');
  return { ...m, KIT: buildKit([...m.DISTRICT_MODULES, FIXTURE]) };
});

const probeAt = (s: BattleState, lbl: string): Probe =>
  tileAt(s, parseLabel(lbl)).piece?.data as unknown as Probe;

describe('piece notation', () => {
  test('pieces round-trip through braces, with and without a data suffix', () => {
    const ascii = ['{probe}   {probe:3} {bell}', 'r{probe}  w>{mat}  {pencil}'].join('\n');
    const spec = parseBoard(ascii);
    expect(spec.tiles.map((t) => t.piece?.id ?? null)).toEqual([
      'bathhouses:probe',
      'bathhouses:probe',
      'bathhouses:bell',
      'bathhouses:probe',
      'bathhouses:mat',
      'bathhouses:pencil',
    ]);
    expect(spec.tiles[1]?.piece?.data).toMatchObject({ turns: 3 });
    expect(spec.tiles[1]?.terrain.water).toBeNull();
    expect(spec.tiles[4]?.terrain.water).toBe('right');
    const norm = (t: string) => t.replace(/ +/g, ' ');
    expect(norm(serializeBoard(spec))).toBe(norm(ascii));
    expect(serializeBoard(parseBoard(serializeBoard(spec)))).toBe(serializeBoard(spec));
  });

  test('a piece sits after the state in canonical order and beside other terrain', () => {
    expect(serializeBoard(parseBoard('{probe}~@'))).toBe('~{probe}@');
  });

  test('each piece gets its own copy of the default data', () => {
    const spec = parseBoard('{probe} {probe}');
    expect(spec.tiles[0]?.piece?.data).not.toBe(spec.tiles[1]?.piece?.data);
  });

  test('bad piece cells name the cell', () => {
    const at = { x: 0, y: 0 };
    expect(() => parseCell('{probe}{mat}', at)).toThrow(/one piece in cell A1/);
    expect(() => parseCell('{probe:x}', at)).toThrow(/cannot read "x" in cell A1/);
    expect(() => parseCell('{bell:a}', at)).toThrow(/cannot read "a"/);
    expect(() => parseCell('r{bell}', at)).toThrow(/cannot stand on a solid piece/);
    expect(() => parseCell('r{pencil}', at)).toThrow(/cannot stand on a solid piece/);
    expect(() => parseCell('P{bell}', at)).toThrow(/start point cannot sit on a solid piece/);
    expect(() => parseCell('{probe}g', at)).toThrow(/lock gate cannot share/);
    expect(() => parseCell('{mud}', at)).toThrow(/Unknown compound "\{mud\}"/);
    expect(parseCell('{stain}{probe}', at).tile).toMatchObject({
      state: { id: 'stain' },
      piece: { id: 'bathhouses:probe' },
    });
  });
});

describe('piece solidity', () => {
  test('pencil blocks units only, bell blocks units and shots, probe blocks nothing', () => {
    const s = board('{probe} {pencil} {bell} .');
    const tile = (lbl: string) => tileAt(s, parseLabel(lbl));
    expect(['A1', 'B1', 'C1', 'D1'].map((l) => pieceBlocksUnits(tile(l)))).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(['A1', 'B1', 'C1', 'D1'].map((l) => pieceBlocksShots(tile(l)))).toEqual([
      false,
      false,
      true,
      false,
    ]);
  });
});

describe('piece triggers', () => {
  test('onArrive: walking onto a piece fires its hook there and nowhere else', () => {
    const s = board('D . {probe}\n. . {probe}');
    const r = act(s, { type: 'move', unit: 'draughtsman', to: parseLabel('C1') });
    expect(probeAt(r.state, 'C1').arrived).toBe(1);
    expect(probeAt(r.state, 'C2').arrived).toBe(0);
    const off = act(s, { type: 'move', unit: 'draughtsman', to: parseLabel('B2') });
    expect(probeAt(off.state, 'C2').arrived).toBe(0);
  });

  test('onArrive: a piece exempt for fliers lets a moth pass, but not a rat', () => {
    const s = board('m {mat} r');
    const r = draft(s, (ctx) => {
      const moth = unitAtLabel(ctx.s, 'A1');
      const rat = unitAtLabel(ctx.s, 'C1');
      arrive(ctx, moth.id, [parseLabel('B1')], { cause: 'push', origin: null, landing: true });
      moth.pos = parseLabel('A1');
      arrive(ctx, rat.id, [parseLabel('B1')], { cause: 'push', origin: null, landing: true });
    });
    expect(probeAt(r.state, 'B1').arrived).toBe(1);
  });

  test('onTurnEnd: each piece answers once per turn end', () => {
    const s = board('D . {probe} {probe:2}');
    const r = act(s, { type: 'endTurn' });
    expect(probeAt(r.state, 'C1').turns).toBe(1);
    expect(probeAt(r.state, 'D1').turns).toBe(3);
    expect(probeAt(s, 'C1').turns).toBe(0); // the input state is untouched
  });

  test('onStruck: damage landing on a piece tile strikes it', () => {
    const s = withLattices('D . r{probe}', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.some((e) => e.type === 'damage')).toBe(true);
    expect(probeAt(r.state, 'C1').struck).toEqual(['damage']);
  });

  test('onStruck and onHit through the entry points (push, Spark, landings)', () => {
    const s = board('{probe} . {bell}');
    const r = draft(s, (ctx) => {
      expect(strikePiece(ctx, parseLabel('A1'), 'push')).toBe(true);
      expect(strikePiece(ctx, parseLabel('A1'), 'spark')).toBe(true);
      expect(hitPiece(ctx, parseLabel('A1'))).toBe(true);
      expect(strikePiece(ctx, parseLabel('B1'), 'push')).toBe(false); // bare tile
      expect(hitPiece(ctx, parseLabel('B1'))).toBe(false); // bare tile
      expect(hitPiece(ctx, { x: 9, y: 9 })).toBe(false); // off the board
    });
    expect(probeAt(r.state, 'A1')).toMatchObject({ struck: ['push', 'spark'], hits: 1 });
  });

  test('piece data is cloned with the battle state', () => {
    const s = board('{probe}');
    const r = draft(s, (ctx) => {
      strikePiece(ctx, parseLabel('A1'), 'shove');
    });
    expect(probeAt(r.state, 'A1').struck).toEqual(['shove']);
    expect(probeAt(s, 'A1').struck).toEqual([]);
    expect(piecesOn(r.state).map((p) => p.piece.id)).toEqual(['bathhouses:probe']);
  });
});

describe('componentsOf', () => {
  test('4-connected groups in reading order of their first tile', () => {
    const s = board(
      [
        '{probe} {probe} .       {probe}',
        '.       {probe} .       {probe}',
        '{probe} .       .       .',
      ].join('\n'),
    );
    const groups = componentsOf(s, (at, st) => tileAt(st, at).piece?.id === 'bathhouses:probe');
    expect(groups.map((g) => g.map((c) => `${c.x},${c.y}`))).toEqual([
      ['0,0', '1,0', '1,1'],
      ['3,0', '3,1'],
      ['0,2'],
    ]);
    expect(componentsOf(s, () => false)).toEqual([]);
  });
});

describe('piece tokens', () => {
  const pieceEntries = (kit = KIT): TokenEntry[] =>
    Object.values(kit.pieces).map((p) => ({
      token: p.token,
      kind: 'piece',
      id: p.id,
      district: p.id.split(':')[0] as TokenEntry['district'],
    }));
  // A district's data may list its own piece's token too: the same claim twice is no clash.
  const claims = (entries: readonly TokenEntry[]): TokenEntry[] => [
    ...new Map(entries.map((e) => [`${e.kind}|${e.token}|${e.id}`, e])).values(),
  ];

  test('kit pieces, district tokens, rival tokens and compound names are all unique', () => {
    const all = claims([...pieceEntries(), ...DISTRICT_TOKENS, ...RIVAL_TOKENS]);
    expect(tokenCollisions(all, COMPOUND_BRACE_NAMES)).toEqual([]);
  });

  test('a piece token reusing a compound name or a rival letter is caught', () => {
    const bad: TokenEntry[] = [
      { token: 'stain', kind: 'piece', id: 'bathhouses:stain', district: 'bathhouses' },
      { token: 'L', kind: 'piece', id: 'bathhouses:lantern', district: 'bathhouses' },
    ];
    expect(tokenCollisions(claims([...RIVAL_TOKENS, ...bad]), COMPOUND_BRACE_NAMES)).toEqual([
      'stain',
      'L',
    ]);
  });
});

describe('piece solidity on the board', () => {
  test('a unit cannot walk onto or through a solid piece; an open piece is walkable', () => {
    const s = board('D {pencil} .\n. {probe} .');
    const moves = legalMoves(s, unitAtLabel(s, 'A1').id).map((c) => `${c.x},${c.y}`);
    expect(moves).not.toContain('1,0');
    expect(moves).toContain('1,1');
  });

  test('a Bolt flies over a units-only piece and hits the rat behind it', () => {
    const s = withLattices('D {pencil} r', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.find((e) => e.type === 'damage')).toMatchObject({
      target: { at: { x: 2, y: 0 } },
    });
  });

  test('a units-and-shots piece stops a Bolt, which hits it there', () => {
    const s = withLattices('D . {bell} r', { draughtsman: 'Bolt> Strike' });
    const r = cast(s, 'draughtsman', 'right');
    expect(r.events.find((e) => e.type === 'stopped')).toMatchObject({ by: 'piece' });
    expect(r.events.some((e) => e.type === 'damage')).toBe(false);
    expect(probeAt(r.state, 'C1').hits).toBe(1);
  });
});

describe('piece triggers from play', () => {
  test('onHit and onStruck: a Bolt of Spark lands on an empty piece tile', () => {
    const s = withLattices('D . {probe}', { draughtsman: 'Bolt> Spark' });
    const r = cast(s, 'draughtsman', 'right');
    expect(probeAt(r.state, 'C1')).toMatchObject({ hits: 1, struck: ['spark'] });
    expect(r.events.some((e) => e.type === 'miss')).toBe(false);
  });

  test('onStruck: a push crushing into a solid piece strikes both tiles', () => {
    const s = board('D r{probe} {bell}');
    const r = act(s, { type: 'shove', unit: unitAtLabel(s, 'A1').id, dir: 'right' });
    expect(r.events.find((e) => e.type === 'crush')).toMatchObject({ into: 'plate' });
    expect(probeAt(r.state, 'B1').struck).toEqual(['damage', 'push']);
    expect(probeAt(r.state, 'C1').struck).toEqual(['push']);
  });

  test('onStruck: a basic Shove at a piece with nobody on it strikes it', () => {
    const s = board('D {probe} {pencil}');
    const id = unitAtLabel(s, 'A1').id;
    const r = act(s, { type: 'shove', unit: id, dir: 'right' });
    expect(probeAt(r.state, 'B1').struck).toEqual(['shove']);
    expect(r.state.units.find((u) => u.id === id)).toMatchObject({ acted: true });
  });
});
