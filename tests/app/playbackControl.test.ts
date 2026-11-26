import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { GameEvent } from '$engine';
import { BattleSession } from '../../src/app/battle.svelte';
import { type Clock, Sequencer } from '../../src/app/playback';
import { Playback } from '../../src/app/playback.svelte';
import { STEP_MS } from '../../src/app/timing';
import { at, battleOf, CAST_BOARD } from './battleFixtures';
import { plainBoard } from './viewFixtures';

const clock: Clock = {
  now: () => Date.now(),
  set: (fn, ms) => globalThis.setTimeout(fn, ms) as unknown as number,
  clear: (handle) => globalThis.clearTimeout(handle),
};

const start = plainBoard(3, 1);
const burst: GameEvent = {
  type: 'burst',
  burst: 'fire',
  at: at('B1'),
  tiles: [at('B1'), at('C1')],
  units: [],
};
const move: GameEvent = {
  type: 'moved',
  unit: { id: 'rat', name: 'rat', member: false, at: at('A1') },
  from: at('A1'),
  to: at('B1'),
  path: [at('B1')],
  cause: 'walk',
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function playback(scale = 1, reduced = false): Playback {
  return new Playback({ clock, motion: () => ({ scale, reduced }) });
}

function expectHoldEndsAt(controller: Playback, ms: number): void {
  vi.advanceTimersByTime(ms - 1);
  expect(controller.current?.event.type).toBe('burst');
  vi.advanceTimersByTime(1);
  expect(controller.current?.event.type).toBe('moved');
}

test('burst holds 800 ms', () => {
  const controller = playback();
  void controller.play(start, [burst, move]);
  expect(controller.beat).toEqual({ kind: 'burst', name: 'Fire', first: false });
  expect(controller.dimmed).toBe(true);
  expectHoldEndsAt(controller, 800);
  expect(controller.beat).toBeNull();
  expect(controller.dimmed).toBe(false);
});

test('×2 hold is 250 ms', () => {
  const controller = playback();
  void controller.play(start, [burst, move]);
  controller.speedUp();
  expectHoldEndsAt(controller, 250);
  vi.advanceTimersByTime(STEP_MS.normal / 2 - 1);
  expect(controller.playing).toBe(true);
  vi.advanceTimersByTime(1);
  expect(controller.playing).toBe(false);
});

test('×4 hold is 100 ms', () => {
  const controller = playback();
  void controller.play(start, [burst, move]);
  controller.speedUp();
  controller.speedUp();
  expectHoldEndsAt(controller, 100);
  vi.advanceTimersByTime(STEP_MS.normal / 4 - 1);
  expect(controller.playing).toBe(true);
  vi.advanceTimersByTime(1);
  expect(controller.playing).toBe(false);
});

test('mid-hold remaining never lengthens', () => {
  const controller = playback();
  void controller.play(start, [burst, move]);
  vi.advanceTimersByTime(780);
  controller.speedUp();
  controller.speedUp();
  expectHoldEndsAt(controller, 20);
});

test('speed resets on next action', () => {
  const session = new BattleSession({ state: battleOf(CAST_BOARD), events: [] }, 'trip', {});
  void session.dispatch({ type: 'move', unit: 'stoker', to: at('C8') });
  session.playback.speedUp();
  expect(session.playback.speed).toBe(2);
  void session.dispatch({ type: 'move', unit: 'draughtsman', to: at('A2') });
  expect(session.busy).toBe(true);
  expect(session.playback.speed).toBe(1);
  session.dispose();
});

test('reduced motion holds 300 ms cross-fade', () => {
  const controller = playback(1, true);
  void controller.play(start, [burst, move]);
  vi.advanceTimersByTime(20);
  controller.speedUp();
  controller.speedUp();
  expectHoldEndsAt(controller, 280);
});

test.each([
  { scale: 0.5, reduced: false, hold: 400, trails: true },
  { scale: 1, reduced: true, hold: 300, trails: false },
  { scale: 0.5, reduced: true, hold: 150, trails: false },
])(
  'Quick halves time and reduced motion removes trails independently ($scale, $reduced)',
  ({ scale, reduced, hold, trails }) => {
    const controller = playback(scale, reduced);
    void controller.play(start, [burst, move]);
    expectHoldEndsAt(controller, hold);
    expect(controller.current?.fx.some(({ kind }) => kind === 'trail')).toBe(trails);
    vi.advanceTimersByTime(STEP_MS.normal * scale - 1);
    expect(controller.playing).toBe(true);
    vi.advanceTimersByTime(1);
    expect(controller.playing).toBe(false);
  },
);

test('natural completion skip replace dispose resolve once', () => {
  const seq = new Sequencer(clock);
  const natural = vi.fn();
  const skipped = vi.fn();
  const replaced = vi.fn();
  const disposed = vi.fn();
  const show = vi.fn();
  seq.run([100], show, natural);
  vi.advanceTimersByTime(100);
  seq.run([100, 100], show, skipped);
  seq.skip();
  seq.skip();
  seq.run([100, 100], show, replaced);
  seq.run([100, 100], show, disposed);
  seq.dispose();
  seq.dispose();
  vi.runAllTimers();
  for (const done of [natural, skipped, replaced, disposed]) expect(done).toHaveBeenCalledTimes(1);
  expect(seq.running).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

test('skip during a hold fires onDone once', async () => {
  const controller = playback();
  const onDone = vi.fn();
  const onShown = vi.fn();
  const done = controller.play(start, [burst, move], [], { onShown }).then(onDone);
  vi.advanceTimersByTime(100);
  controller.speedUp();
  controller.skip();
  controller.skip();
  vi.runAllTimers();
  await done;
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onShown).toHaveBeenCalledTimes(1);
  expect(controller.current).toBeNull();
  expect(controller.markers).toEqual([]);
});

test('FX cleared at rest', async () => {
  const session = new BattleSession({ state: battleOf(CAST_BOARD), events: [] }, 'trip', {});
  const done = session.dispatch({ type: 'move', unit: 'stoker', to: at('C8') });
  expect(session.fx.map((effect) => effect.kind)).toEqual(['trail']);
  vi.runAllTimers();
  await done;
  expect(session.fx).toEqual([]);
  const skipped = session.dispatch({ type: 'move', unit: 'draughtsman', to: at('A2') });
  expect(session.fx).toHaveLength(1);
  session.skip();
  await skipped;
  expect(session.fx).toEqual([]);
  expect(vi.getTimerCount()).toBe(0);
});
