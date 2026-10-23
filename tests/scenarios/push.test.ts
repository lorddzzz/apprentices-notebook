import { expect, test, vi } from 'vitest';
import type { BattleState, Dir, GameEvent } from '$engine';
import type { Ctx } from '$engine/ctx';
import type { NotifiedHook } from '$engine/hooks';
import { push } from '$engine/push';
import { board, draft, expectLog, unitAtLabel } from './harness';

/**
 * Push, slide, crush and drop (design §4.4, plan P3, P19, P28). Every hook the engine fires is
 * recorded, and so is every arrival (FD-3: entered tiles go through the arrival pipeline).
 */
const hooks = vi.hoisted(() => ({ seen: [] as unknown[] }));
vi.mock('$engine/hooks', async (original) => {
  const real = await original<typeof import('$engine/hooks')>();
  return {
    ...real,
    notify: (ctx: Ctx, h: NotifiedHook) => {
      hooks.seen.push(h);
      real.notify(ctx, h);
    },
  };
});
vi.mock('$engine/arrival', async (original) => {
  const real = await original<typeof import('$engine/arrival')>();
  return {
    ...real,
    arrive: (...a: Parameters<typeof real.arrive>) => {
      hooks.seen.push({ kind: 'arrive', unit: a[1], entered: a[2], cause: a[3].cause });
      return real.arrive(...a);
    },
  };
});

const pushAt = (s: BattleState, lbl: string, dir: Dir, tiles: number) =>
  draft(s, (ctx) => push(ctx, unitAtLabel(ctx.s, lbl), dir, tiles, null));
const types = (events: readonly GameEvent[]) => events.map((e) => e.type);
const unit = (s: BattleState, id: string) => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};

test('the-wall: oil under a shove makes a slide that ends in a crush', () => {
  // The rat is shoved onto a run of oil, slides to its end... and the Wall is right behind it.
  const s = board('D r o o o {wall}');
  const r = pushAt(s, 'B1', 'right', 1);
  expectLog(r.events, [
    'rat at B1 is pushed right to E1 (slides 2)',
    'rat at E1 is crushed against the plate for 4',
    'Crush hits rat at E1 for 4',
    'rat at E1 dies',
  ]);
  expect(r.events[0]).toMatchObject({ line: 'shove:slick' });
  expect(r.events[1]).toMatchObject({ line: 'shove:wall' });
  expect(unit(r.state, 'rat-1')).toMatchObject({ hp: 0, pos: { x: 4, y: 0 } });
});

test('a Wall takes two crushes to break', () => {
  const a = pushAt(board('D b {wall}'), 'B1', 'right', 1);
  expect(a.state.tiles[2]?.state).toMatchObject({ id: 'wall', hits: 1 });
  const b = pushAt(a.state, 'B1', 'right', 1);
  expect(b.state.tiles[2]?.state).toBeNull();
  expect(types(b.events)).toContain('stateFades');
});

test('crush-counts-tiles: 1 + 1 per tile moved to the pushed unit, 1 to what it hit', () => {
  const r = pushAt(board('D b . . r'), 'B1', 'right', 3);
  expect(r.events.find((e) => e.type === 'crush')).toMatchObject({ damage: 3 });
  expect(unit(r.state, 'sentry-1')).toMatchObject({ hp: 2, pos: { x: 3, y: 0 } });
  expect(unit(r.state, 'rat-1').hp).toBe(1);
  // Pushed into something without moving: 1 + 0.
  const flat = pushAt(board('D b r'), 'B1', 'right', 1);
  expect(flat.events.find((e) => e.type === 'crush')).toMatchObject({ damage: 1 });
});

test('a rune plate is crushed against and loses its one hit; a layout plate never breaks', () => {
  const rune = pushAt(board('D b #'), 'B1', 'right', 1);
  expect(rune.state.tiles[2]?.state).toBeNull();
  expect(rune.events.find((e) => e.type === 'crush')).toMatchObject({
    into: 'plate',
    line: 'shove:plate',
  });
  const layout = pushAt(board('D b ='), 'B1', 'right', 1);
  expect(layout.state.tiles[2]?.state?.id).toBe('plate');
});

test('slide-no-pinball: oil a unit slid over is used up for the round', () => {
  const s = board('r o o o .\n. . . . D');
  const out = pushAt(s, 'A1', 'right', 1);
  expect(unit(out.state, 'rat-1').pos).toEqual({ x: 4, y: 0 });
  expect(out.events[0]).toMatchObject({ type: 'push', slid: 3 });
  // Pushed back across the same oil in the same round: it does not slide again.
  const back = pushAt(out.state, 'E1', 'left', 1);
  expect(unit(back.state, 'rat-1').pos).toEqual({ x: 3, y: 0 });
  expect(back.events[0]).toMatchObject({ type: 'push', slid: 0 });
  // Next round the oil is fresh again.
  const next = structuredClone(back.state);
  next.round += 1;
  const again = pushAt(next, 'D1', 'left', 1);
  expect(unit(again.state, 'rat-1').pos).toEqual({ x: 0, y: 0 });
});

test('a slide stops on a unit, held or not, as on a wall', () => {
  const s = board('r o o r\n. . . D');
  const held = structuredClone(s);
  const blocker = held.units.find((u) => u.id === 'rat-2');
  if (blocker) blocker.held = 1;
  for (const state of [s, held]) {
    const r = pushAt(state, 'A1', 'right', 1);
    expect(unit(r.state, 'rat-1').pos).toEqual({ x: 2, y: 0 });
    expect(r.events.find((e) => e.type === 'crush')).toMatchObject({ damage: 3 });
  }
});

test('minion-drops-in-canal: a land minion pushed into water is gone, without a burst', () => {
  const r = pushAt(board('D r w>'), 'B1', 'right', 1);
  expectLog(r.events, ['rat at B1 drops at C1', 'rat at B1 dies']);
  expect(r.events[0]).toMatchObject({ type: 'dropped', elite: false, line: 'shove:water' });
  expect(unit(r.state, 'rat-1').hp).toBe(0);
  expect(types(r.events)).not.toContain('foeBursts');
});

test('swimmers and fliers do not drop into water', () => {
  // A water foe can't be pushed out of the water at all (K-13): it is held back.
  expect(types(pushAt(board('D e w>'), 'B1', 'right', 1).events)).not.toContain('dropped');
  const moth = pushAt(board('D m w>'), 'B1', 'right', 1);
  expect(types(moth.events)).not.toContain('dropped');
  expect(unit(moth.state, 'moth-1')).toMatchObject({ pos: { x: 2, y: 0 } });
});

test('elite-drops-takes-4-stunned: an elite survives a drop on its last solid tile', () => {
  const r = pushAt(board('D b _'), 'B1', 'right', 1);
  expectLog(r.events, [
    'sentry at B1 drops at C1',
    'Drop hits sentry at B1 for 4',
    'sentry at B1 is stunned',
  ]);
  expect(unit(r.state, 'sentry-1')).toMatchObject({ hp: 1, stunned: true, pos: { x: 1, y: 0 } });
  expect(r.events[0]).toMatchObject({ elite: true, line: 'shove:drop' });
});

test('member-never-drops: a party member falls like an elite and stays on the board', () => {
  const r = pushAt(board('D S w>', { hp: { B1: 9 } }), 'B1', 'right', 1);
  expect(r.events[0]).toMatchObject({ type: 'dropped', elite: true });
  expect(unit(r.state, 'stoker')).toMatchObject({ hp: 5, stunned: true, pos: { x: 1, y: 0 } });
  expect(types(r.events)).not.toContain('died');
  // At 1 hp the 4 damage downs them where they fell: the body stays, it never vanishes.
  const low = pushAt(board('D S w>', { hp: { B1: 1 } }), 'B1', 'right', 1);
  expect(unit(low.state, 'stoker')).toMatchObject({ hp: 0, pos: { x: 1, y: 0 } });
});

test('edge-wall-crushes: on a wall edge the board edge is a crush', () => {
  const r = pushAt(board('D r'), 'B1', 'right', 1);
  expectLog(r.events, [
    'rat at B1 is crushed against the wall for 1',
    'Crush hits rat at B1 for 1',
  ]);
  expect(r.events[0]).toMatchObject({ line: 'shove:edge' });
  expect(unit(r.state, 'rat-1')).toMatchObject({ hp: 1, pos: { x: 1, y: 0 } });
});

test('edge-drop-drops: on a drop edge the same push is a fall', () => {
  const r = pushAt(board('D r', { edge: 'drop' }), 'B1', 'right', 1);
  expectLog(r.events, ['rat at B1 drops at B1', 'rat at B1 dies']);
  expect(r.events[0]).toMatchObject({ line: 'shove:drop' });
  const elite = pushAt(board('D b', { edge: 'drop' }), 'B1', 'right', 1);
  expect(unit(elite.state, 'sentry-1')).toMatchObject({ hp: 1, stunned: true });
  // A flier is never dropped by an edge: it is crushed like on a wall edge.
  const moth = pushAt(board('D m', { edge: 'drop' }), 'B1', 'right', 1);
  expect(types(moth.events)).not.toContain('dropped');
});

test('hold-blocks-push: a held unit does not move and takes no crush', () => {
  const s = board('D r r');
  const rat = s.units.find((u) => u.id === 'rat-1');
  if (rat) rat.held = 1;
  hooks.seen.length = 0;
  const r = pushAt(s, 'B1', 'right', 2);
  expectLog(r.events, ['rat at B1 is held']);
  expect(r.events[0]).toMatchObject({ line: 'shove:held' });
  expect(unit(r.state, 'rat-1')).toMatchObject({ hp: 2, pos: { x: 1, y: 0 } });
  expect(hooks.seen).toEqual([]);
});

test('hooks: pushed once, one arrival entering each tile, then hit and died from the crush', () => {
  hooks.seen.length = 0;
  pushAt(board('D r . . {wall}'), 'B1', 'right', 3);
  expect(hooks.seen).toEqual([
    { kind: 'pushed', unit: 'rat-1', dir: 'right' },
    {
      kind: 'arrive',
      unit: 'rat-1',
      entered: [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      cause: 'push',
    },
    { kind: 'hit', unit: 'rat-1', heading: 'right', from: null },
    { kind: 'died', unit: 'rat-1' },
  ]);
});

test('an anchored foe is crushed where it stands and never moves', () => {
  const r = pushAt(board('D M'), 'B1', 'right', 1);
  expect(unit(r.state, 'mother-1').pos).toEqual({ x: 1, y: 0 });
});
