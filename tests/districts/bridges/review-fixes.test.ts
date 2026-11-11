import { describe, expect, test } from 'vitest';
import type { GameEvent } from '$engine';
import { isSilent } from '$engine';
import { checkEnd } from '$engine/ctx';
import { dealDamage } from '$engine/damage';
import { cracksOf } from '$engine/districts/bridges/support';
import { strikePiece } from '$engine/pieces';
import { roundEnd } from '$engine/turn';
import type { BattleState, EnemyUnit } from '$engine/types';
import { projectWith, viewOf } from '../../../src/app/view';
import { board, draft } from '../../scenarios/harness';

/** Code-review fixes for the bridges district (collapse, epilogue, support). */
const chiefOf = (s: BattleState): EnemyUnit => {
  const u = s.units.find((v): v is EnemyUnit => v.kind === 'enemy' && v.def === 'chiefWarden');
  if (!u) throw new Error('no chief');
  return u;
};

const drawnTiles = (v: ReturnType<typeof viewOf>) =>
  v.tiles.map((t) => ({ state: t.state, jar: t.jar, drop: t.drop, piece: t.piece?.id ?? null }));
const project = (start: BattleState, events: readonly GameEvent[]) =>
  events.reduce((v, e) => (isSilent(e) ? v : projectWith(v, e)), viewOf(start));

const jar = (s: BattleState) => ({
  owner: s.units.find((u) => u.kind === 'member')?.id ?? '',
  event: 'dusk' as const,
  rest: null,
  heading: null,
  origin: { caster: '', spell: '0,0', cast: 0 },
});

describe('review 1: right of way with nowhere to land', () => {
  test('he keeps his tile standing (the design: he cannot fall while the keystone stands)', () => {
    const s = board('K{span} _ {keystone:2} _ S{pier}');
    const chief = chiefOf(s);
    const r = draft(s, (ctx) => {
      roundEnd(ctx);
    });
    const at = r.state.units.find((u) => u.id === chief.id);
    expect(at?.hp).toBeGreaterThan(0);
    expect(at?.out ?? null).toBeNull();
    expect(r.state.tiles[0]?.terrain.drop).toBeFalsy();
    expect(r.state.tiles[0]?.piece?.id).toBe('bridges:span');
  });
});

describe('review 2: the projection follows a collapse', () => {
  const clutter = (s: BattleState, at: number) => {
    const t = s.tiles[at];
    if (!t) throw new Error('no tile');
    t.jar = jar(s);
    t.state = { id: 'blot', rounds: 3, origin: null };
    t.hot = 2;
  };

  test('a jar and a plain state on a falling span are gone in the replay', () => {
    const base = board('{pier} {span} . {span} . S');
    const start = draft(base, (ctx) => clutter(ctx.s, 3)).state;
    const r = draft(start, (ctx) => roundEnd(ctx));
    expect(r.state.tiles[3]?.jar).toBeNull();
    expect(drawnTiles(project(start, r.events))).toEqual(drawnTiles(viewOf(r.state)));
  });

  test('and after the epilogue', () => {
    const base = board('D {span} K{keystone:6} {span} j{span} {pier}');
    const start = draft(base, (ctx) => clutter(ctx.s, 1)).state;
    const r = draft(start, (ctx) => {
      chiefOf(ctx.s).hp = 1;
      dealDamage(ctx, chiefOf(ctx.s), 5, 'Test');
      checkEnd(ctx);
    });
    expect(r.state.tiles[1]?.jar).toBeNull();
    expect(drawnTiles(project(start, r.events))).toEqual(drawnTiles(viewOf(r.state)));
  });
});

describe('review 3: the chief dies in the dusk fall', () => {
  test('one collapse, then the epilogue, then won; the member on the other span falls once', () => {
    const s = board('K{keystone:2} {span} {pier} D . S{span}');
    chiefOf(s).hp = 1;
    const r = draft(s, (ctx) => {
      strikePiece(ctx, { x: 0, y: 0 }, 'push');
      strikePiece(ctx, { x: 0, y: 0 }, 'burst');
      roundEnd(ctx);
      checkEnd(ctx);
    });
    const collapses = r.events.filter((e) => e.type === 'bridges:collapse') as unknown as {
      data: { epilogue: boolean };
    }[];
    expect(collapses.map((c) => c.data.epilogue)).toEqual([false, true]);
    expect(r.events.filter((e) => e.type === 'outOfRoom')).toHaveLength(1);
    const types = r.events.map((e) => e.type);
    expect(types.indexOf('outOfRoom')).toBeLessThan(types.lastIndexOf('bridges:collapse'));
    expect(types.lastIndexOf('bridges:collapse')).toBeLessThan(types.indexOf('won'));
    expect(r.state.phase).toBe('won');
  });
});

describe('review 4: non-bridge fights skip the scan', () => {
  test('no rule and no span pieces: no cracks', () => {
    expect(cracksOf(board('S . r'))).toEqual([]);
  });
});

describe('BR-7: what falls with a span', () => {
  test('BR-7: a fall crumbles the jar on the tile', () => {
    const base = board('{pier} {span} . {span} . S');
    const start = draft(base, (ctx) => {
      const t = ctx.s.tiles[3];
      if (t) t.jar = jar(ctx.s);
    }).state;
    const r = draft(start, (ctx) => roundEnd(ctx));
    const crumbles = r.events.filter((e) => e.type === 'jarCrumbles');
    expect(crumbles).toHaveLength(1);
    expect(crumbles[0]).toMatchObject({ at: { x: 3, y: 0 } });
    expect(r.state.tiles[3]?.jar).toBeNull();
  });
});
