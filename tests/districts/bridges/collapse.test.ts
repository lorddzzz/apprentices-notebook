import { describe, expect, test } from 'vitest';
import { checkEnd } from '$engine/ctx';
import { cracksOf } from '$engine/districts/bridges/support';
import { type BridgesState, COLLAPSE_RULE_ID } from '$engine/districts/bridges/types';
import { roundEnd } from '$engine/turn';
import { act, board, draft, unitAtLabel } from '../../scenarios/harness';

/** BR-3 (bridges P4-P6): at dusk cracked tiles fall with whatever stands on them. */
type S = ReturnType<typeof board>;
const dusk = (s: S) => draft(s, (ctx) => roundEnd(ctx));
const collapses = (events: readonly { type: string }[]) =>
  events.filter((e) => e.type === 'bridges:collapse') as unknown as {
    data: { tiles: { x: number; y: number }[]; units: string[]; epilogue: boolean };
  }[];
const dropAt = (s: S, x: number, y: number) => s.tiles[y * s.width + x]?.terrain.drop;
const unit = (s: S, lbl: string) => unitAtLabel(s, lbl);

describe('BR-3 falls', () => {
  test('a supported span does not fall; a cut-off one does, and becomes fog', () => {
    const held = dusk(board('{pier} {span} S . r'));
    expect(collapses(held.events)).toEqual([]);
    expect(dropAt(held.state, 1, 0)).toBe(false);
    const cut = dusk(board('{pier} {span} . {span} . S'));
    expect(collapses(cut.events).map((c) => c.data.tiles)).toEqual([[{ x: 3, y: 0 }]]);
    expect(dropAt(cut.state, 3, 0)).toBe(true);
    expect(cracksOf(cut.state)).toEqual([]);
  });

  test('a member on a falling tile leaves the room and keeps HP', () => {
    const s = board('S{span} . D r');
    const id = unit(s, 'A1').id;
    const hp = unit(s, 'A1').hp;
    const r = dusk(s);
    const m = r.state.units.find((u) => u.id === id);
    expect(m?.out).toBe('fell');
    expect(m?.hp).toBe(hp);
    expect(collapses(r.events)[0]?.data).toMatchObject({ units: [id], epilogue: false });
    expect(r.lines.some((l) => l.includes('falls out of the room'))).toBe(true);
  });

  test('the whole party falling is a wipe', () => {
    const r = draft(board('S{span} D{span} . r'), (ctx) => {
      roundEnd(ctx);
      checkEnd(ctx);
    });
    expect(r.state.phase).toBe('lost');
  });

  test('a minion on a falling tile is gone, with a dropped event and no burst', () => {
    const r = dusk(board('r{span} . S'));
    expect(r.events.filter((e) => e.type === 'dropped')).toHaveLength(1);
    expect(r.state.units.find((u) => u.def === 'rat')?.hp).toBe(0);
    expect(r.events.some((e) => e.type === 'burst')).toBe(false);
  });

  test('an elite takes 4, is stunned and stands on the nearest standing tile', () => {
    const s = board('. b{span} . S');
    const before = unit(s, 'B1').hp;
    const r = dusk(s);
    const b = r.state.units.find((u) => u.def === 'sentry');
    expect(b?.hp).toBe(before - 4);
    expect(b?.stunned).toBe(true);
    expect(b?.pos).toEqual({ x: 0, y: 0 });
    expect(b?.out).toBeFalsy();
    expect(r.events.some((e) => e.type === 'moved' && e.cause === 'bridges:fall')).toBe(true);
    expect(dropAt(r.state, 1, 0)).toBe(true);
  });

  test('a flier over a falling tile is untouched', () => {
    const r = dusk(board('m{span} . S'));
    const moth = r.state.units.find((u) => u.def === 'moth');
    expect(moth?.hp).toBeGreaterThan(0);
    expect(moth?.pos).toEqual({ x: 0, y: 0 });
    expect(collapses(r.events)[0]?.data.units).toEqual([]);
    expect(dropAt(r.state, 0, 0)).toBe(true);
  });

  test('states on a falling tile vanish with it', () => {
    const s = board('{span} . S');
    const t = s.tiles[0];
    if (!t) throw new Error('tile');
    t.state = { id: 'slick', rounds: 3, origin: null };
    const r = dusk(s);
    expect(r.state.tiles[0]?.state).toBeNull();
    expect(r.state.tiles[0]?.piece).toBeNull();
  });

  test('determinism: the same board falls the same way on replay', () => {
    const a = dusk(board('{span} r{span} . S'));
    const b = dusk(board('{span} r{span} . S'));
    expect(b.lines).toEqual(a.lines);
    expect(b.state).toEqual(a.state);
  });
});

describe('BR-3 Long Drop credit', () => {
  test('a foe dropped with a cut span is credited to the cutter and names The Long Drop once', () => {
    const s = board('r{span} . S D');
    const cutter = unit(s, 'C1').id;
    const own = s.rules?.[COLLAPSE_RULE_ID] as BridgesState;
    own.cuts['0,0'] = { by: cutter, cause: 'crush' };
    const r = act(s, { type: 'endTurn' });
    const named = r.events.filter((e) => e.type === 'named' && e.id === 'longDrop');
    expect(named).toHaveLength(1);
    expect(named[0]?.origin?.caster).toBe(cutter);
    expect(r.state.named).toContain('idiom:longDrop');
  });
});
