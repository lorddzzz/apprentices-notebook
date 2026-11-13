import { describe, expect, it } from 'vitest';
import { type InventionDef, LINES } from '$data';
import { type BattleState, type GameEvent, libraryOf, parseLabel, tileAt } from '$engine';
import { BLANK_PIECE, PENCIL_PIECE } from '$engine/districts/cartographers/types';
import { idiomPre, idiomsIn } from '$engine/idioms';
import { act, board, cast, withLattices } from '../../scenarios/harness';

/**
 * CG-3: board runes on paper (cartographers-plan P5). Erase on pencil un-draws the tile and erases
 * whoever stands there; on an outline it un-draws the foe; inked paper (no piece) is plain Erase.
 */

const at = parseLabel;
const touch = (lbl: string) => ({ kind: 'tile' as const, at: at(lbl) });
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const ofType = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type);
const pieceAt = (s: BattleState, lbl: string) => tileAt(s, at(lbl)).piece;
const eraseTouch = (ascii: string) => withLattices(ascii, { draughtsman: 'Touch> Erase' });

const SILVER: InventionDef = {
  id: 'inv:erase-quicksilver',
  name: 'erase-quicksilver',
  method: 'repeat',
  parts: ['erase'],
  solvent: 'quicksilver',
};

describe('CG-3 board runes on paper', () => {
  it('CG-3: erase on pencil under a foe erases it', () => {
    const r = cast(eraseTouch('D r{pencil} . . r'), 'draughtsman', touch('B1'));
    expect(pieceAt(r.state, 'B1')?.id).toBe(BLANK_PIECE);
    expect(unit(r.state, 'rat-1')).toMatchObject({ hp: 0, out: 'erased' });
    expect(ofType(r.events, 'cartographers:undrawn')[0]).toMatchObject({
      line: 'erase:pencil',
      data: { by: 'erase', was: 'pencil', units: ['rat-1'] },
    });
    // An elite takes the drop damage and loses its action instead.
    const e = cast(eraseTouch('D b{pencil} . . r'), 'draughtsman', touch('B1'));
    expect(unit(e.state, 'sentry-1')).toMatchObject({ hp: 1, stunned: true });
    expect(pieceAt(e.state, 'B1')?.id).toBe(BLANK_PIECE);
  });

  it('CG-3: erase on an outline un-draws the foe', () => {
    const r = cast(eraseTouch('D {outline:eraser@2} . . r'), 'draughtsman', touch('B1'));
    expect(pieceAt(r.state, 'B1')).toEqual({ id: PENCIL_PIECE, data: { fate: null, due: null } });
    expect(ofType(r.events, 'cartographers:undrawn')[0]).toMatchObject({
      line: 'erase:outline',
      data: { by: 'erase', was: 'outline', units: [] },
    });
  });

  it('CG-3: inked paper cannot be erased', () => {
    const r = cast(eraseTouch('D r . . r'), 'draughtsman', touch('B1'));
    expect(ofType(r.events, 'cartographers:undrawn')).toHaveLength(0);
    expect(unit(r.state, 'rat-1').hp).toBeGreaterThan(0);
    expect(pieceAt(r.state, 'B1')).toBeNull();
  });

  it('CG-3: quicksilver un-draws the mirrored pencil', () => {
    const s = withLattices(
      'D {pencil} . . . {pencil} .\n. . . . . . r',
      { draughtsman: 'Touch> inv:erase-quicksilver' },
      { inventions: libraryOf([SILVER]) },
    );
    const r = cast(s, 'draughtsman', touch('B1'));
    expect(pieceAt(r.state, 'B1')?.id).toBe(BLANK_PIECE);
    expect(pieceAt(r.state, 'F1')?.id).toBe(BLANK_PIECE);
    const undrawn = ofType(r.events, 'cartographers:undrawn');
    expect(undrawn.map((e) => [e.line, (e as { data: { by: string } }).data.by])).toEqual([
      ['erase:pencil', 'erase'],
      ['quicksilver:undraw', 'quicksilver'],
    ]);
  });

  it('CG-3: graphite after an un-draw leaves it blank', () => {
    const graphite: InventionDef = { ...SILVER, id: 'inv:erase-graphite', solvent: 'graphite' };
    const s = withLattices(
      'D b{pencil} . .\n. . . r',
      { draughtsman: 'Touch> inv:erase-graphite' },
      { inventions: libraryOf([graphite]) },
    );
    const r = cast(s, 'draughtsman', touch('B1'));
    const next = act(r.state, { type: 'endTurn' });
    expect(pieceAt(next.state, 'B1')?.id).toBe(BLANK_PIECE);
    expect(tileAt(next.state, at('B1')).state).toBeNull();
    expect(unit(next.state, 'sentry-1').pos).toEqual(at('B1'));
  });

  it('CG-3: redraft still names on pencil', () => {
    const s = board('D o{pencil} . .\n. . . r');
    const log: GameEvent[] = [
      { type: 'drawn', from: at('A1'), to: at('B1'), what: 'oil' },
      { type: 'burst', burst: 'fire', at: at('B1'), tiles: [at('B1')], units: [] },
    ];
    expect(idiomsIn(log, idiomPre(s), s).map((h) => h.id)).toEqual(['redraft']);
  });

  it('CG-1: draw onto blank fails with draw:blank', () => {
    const s = withLattices('D o {blank} . r', { draughtsman: 'Touch> Draw' });
    const r = cast(s, 'draughtsman', touch('B1'));
    const miss = r.events.filter((e) => e.type === 'miss');
    expect(miss.map((e) => e.line)).toContain('draw:blank');
    expect(tileAt(r.state, at('B1')).state?.id).toBe('slick');
    expect(tileAt(r.state, at('C1')).state).toBeNull();
    expect(pieceAt(r.state, 'C1')?.id).toBe(BLANK_PIECE);
  });
});

describe('CG-3 lines', () => {
  it('the four new rows exist for the cartographers', () => {
    for (const id of ['erase:pencil', 'erase:outline', 'draw:blank', 'quicksilver:undraw']) {
      expect(LINES.find((l) => l.id === id)?.district, id).toBe('cartographers');
    }
  });
});
