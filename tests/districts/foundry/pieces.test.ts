import { describe, expect, test } from 'vitest';
import type { Tone } from '$data/districts/foundry';
import { toneGroups, toneOfPiece, tonesPresent } from '$engine/districts/foundry/pieces';
import { landOnTile } from '$engine/mix';
import { parseBoard, serializeBoard } from '$engine/notation';
import { blocksShots, blocksUnits, legalMoves, tileAt } from '$engine/queries';
import type { BattleState } from '$engine/types';
import { board, cast, draft, unitAtLabel, withLattices } from '../../scenarios/harness';

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const dataAt = (s: BattleState, x: number, y: number) => tileAt(s, { x, y }).piece?.data;

describe('BF-2 notation round trip', () => {
  test.each([
    ['{bell:low}'],
    ['{bell:mid}'],
    ['{bell:high}'],
    ['{rope:mid}'],
    ['{hook}'],
    ['{hook:3}'],
    ['{greatBell:2:high:allied:rung}'],
    ['{greatBell:1}'],
    ['{greatBell:3:low:rung}'],
  ])('%s survives parse and serialise', (cell) => {
    expect(serializeBoard(parseBoard(`. ${cell} .`))).toBe(`. ${cell} .`);
  });

  test('bare tokens read their defaults and write the short form', () => {
    expect(dataAt(board('{bell}'), 0, 0)).toEqual({ tone: 'low' });
    expect(dataAt(board('{rope}'), 0, 0)).toEqual({ tone: 'low' });
    expect(dataAt(board('{hook}'), 0, 0)).toEqual({ note: 0 });
    expect(serializeBoard(parseBoard('{bell}'))).toBe('{bell:low}');
  });

  test('great bell parts come in any order and keep their meaning', () => {
    expect(dataAt(board('{greatBell:2:rung:allied:high}'), 0, 0)).toEqual({
      note: 2,
      hang: 'high',
      allied: true,
      rung: true,
    });
    expect(serializeBoard(parseBoard('{greatBell:2:rung:allied:high}'))).toBe(
      '{greatBell:2:high:allied:rung}',
    );
  });

  test('bad suffixes throw', () => {
    expect(() => board('{bell:loud}')).toThrow();
    expect(() => board('{greatBell:5}')).toThrow();
    expect(() => board('{hook:9}')).toThrow();
  });
});

describe('BF-2 solidity', () => {
  test('a bell and a great bell block walks; rope and hook do not', () => {
    const s = board('D {bell:low} {greatBell:1} {rope:mid} {hook}');
    const moves = (from: string) =>
      legalMoves(s, unitAtLabel(s, from).id).map((c) => `${c.x},${c.y}`);
    expect(moves('A1')).not.toContain('1,0');
    const walker = board('{bell} D . .\n{greatBell:1} {rope} {hook} .');
    const m = legalMoves(walker, unitAtLabel(walker, 'B1').id).map((c) => `${c.x},${c.y}`);
    expect(m).not.toContain('0,0');
    expect(m).not.toContain('0,1');
    expect(m).toContain('1,1');
    expect(m).toContain('2,1');
    for (const x of [0, 1]) expect(blocksUnits(tileAt(s, { x: x + 1, y: 0 }))).toBe(true);
    for (const x of [3, 4]) expect(blocksUnits(tileAt(s, { x, y: 0 }))).toBe(false);
  });

  test('bells and great bells block shots and lines; rope and hook do not', () => {
    const s = board('D {bell:low} {greatBell:1} {rope:mid} {hook}');
    expect(blocksShots(tileAt(s, { x: 1, y: 0 }))).toBe(true);
    expect(blocksShots(tileAt(s, { x: 2, y: 0 }))).toBe(true);
    expect(blocksShots(tileAt(s, { x: 3, y: 0 }))).toBe(false);
    expect(blocksShots(tileAt(s, { x: 4, y: 0 }))).toBe(false);
  });

  test('a Bolt is stopped by a bell and by a great bell, but passes a rope and a hook', () => {
    for (const piece of ['{bell:mid}', '{greatBell:2}']) {
      const s = withLattices(`D . ${piece} r`, { draughtsman: 'Bolt> Strike' });
      const r = cast(s, 'draughtsman', 'right');
      expect(r.events.find((e) => e.type === 'stopped')).toMatchObject({ by: 'piece' });
      expect(r.events.some((e) => e.type === 'damage')).toBe(false);
    }
    for (const piece of ['{rope:mid}', '{hook}']) {
      const s = withLattices(`D . ${piece} r`, { draughtsman: 'Bolt> Strike' });
      const r = cast(s, 'draughtsman', 'right');
      expect(r.events.some((e) => e.type === 'stopped')).toBe(false);
      expect(r.events.find((e) => e.type === 'damage')).toMatchObject({
        target: { at: { x: 3, y: 0 } },
      });
    }
  });
});

describe('BF-2 bells hold no state but a cloud', () => {
  test('a Steam cloud sits on a bell and on a great bell, and thickens on a second', () => {
    for (const piece of ['{bell:mid}', '{greatBell:2}']) {
      const s = board(`D ${piece} .`);
      const r = draft(s, (ctx) => landOnTile(ctx, 'steam', { x: 1, y: 0 }, null));
      expect(tileAt(r.state, { x: 1, y: 0 }).state?.id).toBe('cloud');
      expect(tileAt(r.state, { x: 1, y: 0 }).piece).not.toBeNull();
    }
  });

  test('oil, ink and brass do not land on a bell or a great bell', () => {
    for (const piece of ['{bell:mid}', '{greatBell:2}']) {
      for (const kind of ['oil', 'ink', 'brass'] as const) {
        const s = board(`D ${piece} .`);
        const r = draft(s, (ctx) => landOnTile(ctx, kind, { x: 1, y: 0 }, null));
        expect(tileAt(r.state, { x: 1, y: 0 }).state).toBeNull();
        expect(r.events.some((e) => e.type === 'landed')).toBe(false);
      }
    }
  });

  test('a cast of Brass or Oil at a bell leaves it bare; a cast of Steam clouds it', () => {
    const states = ['Brass', 'Oil', 'Steam'].map((k) => {
      const s = withLattices('D . {bell:mid} r', { draughtsman: `Bolt> ${k}` });
      return tileAt(cast(s, 'draughtsman', 'right').state, { x: 2, y: 0 }).state?.id ?? null;
    });
    expect(states).toEqual([null, null, 'cloud']);
  });

  test('other pieces and bare tiles are unchanged: a rope still takes oil', () => {
    const s = board('D {rope:low} .');
    const r = draft(s, (ctx) => landOnTile(ctx, 'oil', { x: 1, y: 0 }, null));
    expect(tileAt(r.state, { x: 1, y: 0 }).state?.id).toBe('slick');
  });
});

describe('BF-2 tone grouping', () => {
  const tonesOf = (s: BattleState, stub?: (id: string) => Tone | null) => {
    const g = toneGroups(s, stub ? (u) => stub(u.id) : undefined);
    return {
      low: g.low.map((m) => `${m.kind}@${m.at.x},${m.at.y}`),
      mid: g.mid.map((m) => `${m.kind}@${m.at.x},${m.at.y}`),
      high: g.high.map((m) => `${m.kind}@${m.at.x},${m.at.y}`),
    };
  };

  test('bells group by tone in reading order; great bells join their hang tone', () => {
    const s = board('{bell:low} {bell:high} {greatBell:1}\n{bell:low} {rope:mid} {greatBell:3}');
    expect(tonesOf(s)).toEqual({
      low: ['bell@0,0', 'greatBell@2,0', 'bell@0,1'],
      mid: [],
      high: ['bell@1,0', 'greatBell@2,1'],
    });
    expect(tonesPresent(toneGroups(s))).toEqual(['low', 'high']);
  });

  test('an allied great bell is no member of the foes tones', () => {
    const s = board('{greatBell:1:allied} {bell:low}');
    expect(tonesOf(s).low).toEqual(['bell@1,0']);
  });

  test('a stub unit carrying a tone (the Clapper) joins that tone while it stands', () => {
    const s = board('{bell:mid} r . D');
    const rat = unitAtLabel(s, 'B1');
    expect(tonesOf(s, (id) => (id === rat.id ? 'mid' : null)).mid).toEqual([
      'bell@0,0',
      'unit@1,0',
    ]);
    expect(tonesOf(s).mid).toEqual(['bell@0,0']); // no reader: no unit has a tone
    const dead = json(s);
    for (const u of dead.units) if (u.id === rat.id) u.hp = 0;
    expect(tonesOf(dead, (id) => (id === rat.id ? 'mid' : null)).mid).toEqual(['bell@0,0']);
  });

  test('toneOfPiece reads bells and great bells only', () => {
    expect(toneOfPiece('foundry:bell', { tone: 'high' })).toBe('high');
    expect(
      toneOfPiece('foundry:greatBell', { note: 2, hang: 'mid', allied: false, rung: false }),
    ).toBe('mid');
    expect(toneOfPiece('foundry:rope', { tone: 'high' })).toBeNull();
    expect(toneOfPiece('foundry:hook', { note: 1 })).toBeNull();
  });
});

describe('BF-2 clone and save', () => {
  const ascii = '{bell:high} {rope:mid} {hook:3} {greatBell:2:high:allied:rung}';

  test('a battle clone (a draft) keeps tone, rung and allied, and never shares them', () => {
    const s = board(ascii);
    const r = draft(s, (ctx) => {
      const t = tileAt(ctx.s, { x: 0, y: 0 });
      (t.piece?.data as { tone: string }).tone = 'low';
    });
    expect(dataAt(r.state, 0, 0)).toEqual({ tone: 'low' });
    expect(dataAt(s, 0, 0)).toEqual({ tone: 'high' });
    expect(dataAt(r.state, 1, 0)).toEqual({ tone: 'mid' });
    expect(dataAt(r.state, 2, 0)).toEqual({ note: 3 });
    expect(dataAt(r.state, 3, 0)).toEqual({ note: 2, hang: 'high', allied: true, rung: true });
  });

  test('a save round trip through JSON keeps every piece and its data', () => {
    const s = board(ascii);
    const back = json(s);
    expect(back.tiles.map((t) => t.piece)).toEqual(s.tiles.map((t) => t.piece));
    expect(back.tiles.map((t) => t.piece)).toEqual(
      parseBoard(ascii).tiles.map((t) => t.piece ?? null),
    );
    expect(tonesOf2(back)).toEqual({ low: [], mid: [], high: ['bell'] });
  });
});

const tonesOf2 = (s: BattleState) => {
  const g = toneGroups(s);
  return {
    low: g.low.map((m) => m.kind),
    mid: g.mid.map((m) => m.kind),
    high: g.high.map((m) => m.kind),
  };
};
