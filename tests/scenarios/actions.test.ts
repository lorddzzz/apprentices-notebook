import { expect, test, vi } from 'vitest';
import type { ActionRuneId } from '$data';
import { type BattleState, type Dir, type GameEvent, parseLabel } from '$engine';
import type { Ctx } from '$engine/ctx';
import type { NotifiedHook } from '$engine/hooks';
import { snapshotOf } from '$engine/resolve';
import { ACTION_HANDLERS } from '$engine/runes/actions';
import { type Flow, type Step, type Target, targetKey, type Unit } from '$engine/types';
import { board, draft, expectLog } from './harness';

/** The nine Actions, one target at a time (design §5, plan P27, P28, P31). */
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
const STEP: Step = { at: { x: 1, y: 0 }, role: 'action', rune: 'strike', auras: [], next: null };
const unit = (id: string): Target => ({ kind: 'unit', unit: id });
const tile = (lbl: string): Target => ({ kind: 'tile', at: parseLabel(lbl) });
const find = (s: BattleState, id: string): Unit => {
  const u = s.units.find((x) => x.id === id);
  if (!u) throw new Error(`no ${id}`);
  return u;
};
const types = (events: readonly GameEvent[]) => events.map((e) => e.type);

interface RunOpts {
  caster?: string;
  heading?: Dir | null;
  flow?: Partial<Flow>;
}
/** Runs one Action's handler over targets with a hand-built Flow (runStep is E1's). */
function run(s: BattleState, rune: ActionRuneId, targets: Target[], opts: RunOpts = {}) {
  return draft(s, (ctx) => {
    const caster = opts.caster ?? 'draughtsman';
    const flow: Flow = {
      caster,
      origin: { caster, spell: '0,0', cast: 1 },
      snapshot: snapshotOf(ctx.s),
      headings: new Map(targets.map((t) => [targetKey(t), opts.heading ?? null])),
      lay: false,
      gifted: false,
      solvent: null,
      habit: null,
      depth: 0,
      auras: [],
      ...opts.flow,
    };
    for (const t of targets) ACTION_HANDLERS[rune](ctx, t, flow, STEP);
  });
}

const jar = (owner: string) => ({
  owner,
  event: 'step' as const,
  rest: null,
  heading: null,
  origin: { caster: owner, spell: '0,0', cast: 1 },
});

test('strike deals 2 and records the hit with its heading', () => {
  hooks.seen.length = 0;
  const r = run(board('D r'), 'strike', [unit('rat-1')], { heading: 'right' });
  expectLog(r.events, ['Strike hits rat at B1 for 2', 'rat at B1 dies']);
  expect(hooks.seen).toContainEqual({
    kind: 'hit',
    unit: 'rat-1',
    heading: 'right',
    from: { x: 0, y: 0 },
  });
  expect(hooks.seen).toContainEqual({ kind: 'died', unit: 'rat-1' });
  // A tile with nobody on it: nothing to strike.
  expect(run(board('D .'), 'strike', [tile('B1')]).events).toEqual([]);
});

test('guarded-hit-still-hit: a fully shielded hit leaves hp alone but still counts as a hit', () => {
  hooks.seen.length = 0;
  const r = run(board('D r++'), 'strike', [unit('rat-1')], { heading: 'right' });
  expectLog(r.events, ['Strike hits rat at B1 for 2', "rat at B1's shield absorbs 2 (0 left)"]);
  expect(r.events[0]).toMatchObject({ line: 'strike:shielded' });
  expect(find(r.state, 'rat-1')).toMatchObject({ hp: 2, shield: 0 });
  expect(hooks.seen).toContainEqual({
    kind: 'hit',
    unit: 'rat-1',
    heading: 'right',
    from: { x: 0, y: 0 },
  });
  expect(hooks.seen).not.toContainEqual({ kind: 'died', unit: 'rat-1' });
});

test('guard gives 2 shield until the next player phase; shields stack, and gifted lasts a round longer', () => {
  const s = board('D r');
  const r = run(s, 'guard', [unit('draughtsman')]);
  expectLog(r.events, ['Draughtsman gains a shield of 2']);
  expect(find(r.state, 'draughtsman')).toMatchObject({ shield: 2, guardUntil: s.round + 1 });
  const again = run(r.state, 'guard', [unit('draughtsman')]);
  expect(find(again.state, 'draughtsman').shield).toBe(4);
  expect(again.events[0]).toMatchObject({ line: 'guard:shielded' });
  const gifted = run(s, 'guard', [unit('draughtsman')], { flow: { gifted: true } });
  expect(find(gifted.state, 'draughtsman').guardUntil).toBe(s.round + 2);
});

test('shove pushes 1 tile along the target heading; +1 if gifted; nothing without a heading', () => {
  const s = board('D r . .');
  const one = run(s, 'shove', [unit('rat-1')], { heading: 'right' });
  expect(find(one.state, 'rat-1').pos).toEqual({ x: 2, y: 0 });
  const two = run(s, 'shove', [unit('rat-1')], { heading: 'right', flow: { gifted: true } });
  expect(find(two.state, 'rat-1').pos).toEqual({ x: 3, y: 0 });
  const none = run(s, 'shove', [unit('rat-1')], { heading: null });
  expectLog(none.events, ['Shove hits nothing']);
  expect(none.events[0]).toMatchObject({ line: 'shove:noHeading' });
  expect(find(none.state, 'rat-1').pos).toEqual({ x: 1, y: 0 });
});

test('hold stops the unit changing tiles: pushes and swaps fail, and holding again does not stack', () => {
  const held = run(board('D r .'), 'hold', [unit('rat-1')]);
  expectLog(held.events, ['rat at B1 is held']);
  expect(find(held.state, 'rat-1').held).toBe(1);
  const pushed = run(held.state, 'shove', [unit('rat-1')], { heading: 'right' });
  expect(find(pushed.state, 'rat-1')).toMatchObject({ pos: { x: 1, y: 0 }, hp: 2 });
  const again = run(held.state, 'hold', [unit('rat-1')]);
  expect(find(again.state, 'rat-1').held).toBe(1);
  expect(again.events[0]).toMatchObject({ line: 'hold:held' });
  const gifted = run(board('D r'), 'hold', [unit('rat-1')], { flow: { gifted: true } });
  expect(find(gifted.state, 'rat-1').held).toBe(2);
});

test('swap-with-caster: the target and the caster trade places', () => {
  hooks.seen.length = 0;
  const r = run(board('D . r'), 'swap', [unit('rat-1')]);
  expectLog(r.events, ['Draughtsman and rat at C1 swap places']);
  expect(find(r.state, 'draughtsman').pos).toEqual({ x: 2, y: 0 });
  expect(find(r.state, 'rat-1').pos).toEqual({ x: 0, y: 0 });
  // One simultaneous relocation through the arrival pipeline (FD-3): no per-tile notifications.
  expect(hooks.seen).toEqual([]);
  // A held unit, or a held caster, stays put.
  const s = board('D . r');
  const rat = find(s, 'rat-1');
  rat.held = 1;
  const blocked = run(s, 'swap', [unit('rat-1')]);
  expect(blocked.events[0]).toMatchObject({ type: 'held', line: 'swap:held' });
  expect(find(blocked.state, 'draughtsman').pos).toEqual({ x: 0, y: 0 });
  // Swapping with yourself, or with a tile, does nothing.
  expect(run(s, 'swap', [unit('draughtsman')]).events).toEqual([]);
  expect(run(s, 'swap', [tile('B1')]).events).toEqual([]);
});

test('draw-moves-jar: a jar goes one tile along the heading and keeps its owner', () => {
  const s = board('D . . r');
  const home = s.tiles[1];
  if (home) home.jar = jar('draughtsman');
  const r = run(s, 'draw', [tile('B1')], { heading: 'right' });
  expectLog(r.events, ['the jar is drawn from B1 to C1']);
  expect(r.events[0]).toMatchObject({ line: 'draw:jar' });
  expect(r.state.tiles[1]?.jar).toBeNull();
  expect(r.state.tiles[2]?.jar).toMatchObject({ owner: 'draughtsman' });
  // Gifted: two tiles, under the rat on D1: a step-jar arriving under a unit opens on it (P6).
  const far = run(s, 'draw', [tile('B1')], { heading: 'right', flow: { gifted: true } });
  expectLog(far.events, [
    'the jar is drawn from B1 to C1',
    'the jar is drawn from C1 to D1',
    'the jar at D1 opens under rat at D1',
  ]);
  expect(far.state.tiles[3]?.jar).toBeNull();
  // Onto a tile that already has a jar: it stays.
  const full = structuredClone(s);
  const next = full.tiles[2];
  if (next) next.jar = jar('stoker');
  const blocked = run(full, 'draw', [tile('B1')], { heading: 'right' });
  expect(blocked.state.tiles[1]?.jar).toMatchObject({ owner: 'draughtsman' });
});

test('draw moves a state or plate; a plate will not go under a unit, nor off the board', () => {
  const slick = run(board('D o . r'), 'draw', [unit('draughtsman')], { heading: 'right' });
  // Targeting the caster's own (empty) tile draws nothing.
  expect(slick.events).toEqual([]);
  const moved = run(board('D o . r'), 'draw', [tile('B1')], { heading: 'right' });
  expectLog(moved.events, ['the slick is drawn from B1 to C1']);
  expect(moved.state.tiles[1]?.state).toBeNull();
  expect(moved.state.tiles[2]?.state?.id).toBe('slick');
  const plate = run(board('D # r'), 'draw', [tile('B1')], { heading: 'right' });
  expect(plate.events[0]).toMatchObject({ type: 'miss', line: 'draw:unit' });
  expect(plate.state.tiles[1]?.state?.id).toBe('plate');
  const edge = run(board('D o'), 'draw', [tile('B1')], { heading: 'right' });
  expect(edge.events[0]).toMatchObject({ type: 'miss', line: 'draw:edge' });
  const lost = run(board('D o'), 'draw', [tile('B1')], { heading: null });
  expect(lost.events[0]).toMatchObject({ type: 'miss', line: 'draw:noHeading' });
});

test('erase-removes-mark-no-release: the mark goes and what it held is never released', () => {
  const s = board('D r!');
  const rat = find(s, 'rat-1');
  if (rat.mark) rat.mark.bound = { action: 'shove', event: 'hit', solvent: null, heading: 'right' };
  const r = run(s, 'erase', [unit('rat-1')], { heading: 'right' });
  expectLog(r.events, ["rat at B1's mark is spent", 'the mark at B1 is erased']);
  expect(r.events[1]).toMatchObject({ line: 'erase:mark' });
  expect(find(r.state, 'rat-1')).toMatchObject({ mark: null, pos: { x: 1, y: 0 } });
  expect(types(r.events)).not.toContain('released');
  expect(types(r.events)).not.toContain('push');
  // A deep mark clears in one erase.
  const deep = run(board('D r!!'), 'erase', [unit('rat-1')]);
  expect(deep.events[1]).toMatchObject({ line: 'erase:deepMark' });
  expect(find(deep.state, 'rat-1').mark).toBeNull();
});

test('erase clears the tile too: a state, a jar, a collar and a shackle', () => {
  const state = run(board('D o'), 'erase', [tile('B1')]);
  expectLog(state.events, ['the slick at B1 is erased']);
  expect(state.state.tiles[1]?.state).toBeNull();
  const s = board('D r&$');
  find(s, 'rat-1').collar = { caster: 'draughtsman', spell: '0,0', cast: 1 }; // a cast collar
  const home = s.tiles[1];
  if (home) home.jar = jar('draughtsman');
  const r = run(s, 'erase', [unit('rat-1')]);
  expect(r.events.map((e) => e.line)).toEqual(['erase:collar', 'erase:shackle', 'erase:jar']);
  expect(find(r.state, 'rat-1')).toMatchObject({ collar: false, shackle: 0 });
  expect(r.state.tiles[1]?.jar).toBeNull();
  // A creature born in brass keeps it.
  expect(find(run(board('D b'), 'erase', [unit('sentry-1')]).state, 'sentry-1').collar).toBeNull();
});

test('sentence-pushes-2: the mark is spent and the unit goes 2 tiles along the heading', () => {
  const r = run(board('D r! . . .'), 'sentence', [unit('rat-1')], { heading: 'right' });
  expect(find(r.state, 'rat-1')).toMatchObject({ mark: null, pos: { x: 3, y: 0 } });
  expect(r.events[0]).toMatchObject({ type: 'markSpent', released: false });
  expect(r.events[1]).toMatchObject({ type: 'push', dir: 'right' });
  // Into a wall it is the same crush as any push: 1 + tiles moved.
  const wall = run(board('D r! . {wall}'), 'sentence', [unit('rat-1')], { heading: 'right' });
  expect(wall.events.find((e) => e.type === 'crush')).toMatchObject({ damage: 2 });
  // No mark, nothing spent; no heading, the mark stays.
  const bare = run(board('D r . .'), 'sentence', [unit('rat-1')], { heading: 'right' });
  expect(bare.events[0]).toMatchObject({ type: 'miss', line: 'sentence:unit' });
  const lost = run(board('D r! . .'), 'sentence', [unit('rat-1')], { heading: null });
  expect(lost.events[0]).toMatchObject({ type: 'miss', line: 'sentence:noHeading' });
  expect(find(lost.state, 'rat-1').mark).not.toBeNull();
  // Gifted in push: 3 tiles.
  const gifted = run(board('D r! . . . .'), 'sentence', [unit('rat-1')], {
    heading: 'right',
    flow: { gifted: true },
  });
  expect(find(gifted.state, 'rat-1').pos).toEqual({ x: 4, y: 0 });
});

test('levy-shield-per-mark: every mark in the area is spent; the caster gains 1 shield for each', () => {
  const s = board('D r! r! r\n. . . .');
  const r = run(s, 'levy', [unit('rat-1'), unit('rat-2'), unit('rat-3')]);
  expect(find(r.state, 'draughtsman').shield).toBe(2);
  expect(find(r.state, 'rat-1').mark).toBeNull();
  expect(find(r.state, 'rat-2').mark).toBeNull();
  expect(r.events.filter((e) => e.type === 'shieldGained')).toHaveLength(2);
  expect(find(r.state, 'draughtsman').guardUntil).toBe(s.round + 1);
  // Nothing marked, nothing gained.
  expect(find(run(board('D r'), 'levy', [unit('rat-1')]).state, 'draughtsman').shield).toBe(0);
});
