import { expect, test } from 'vitest';
import type { Coord, GameEvent, UnitRef } from '$engine';
import { buildSteps, type Clock, Sequencer } from '../../src/app/playback';
import { type BoardView, project } from '../../src/app/view';

function fakeClock() {
  let now = 0;
  let nextHandle = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: Clock = {
    set(fn, ms) {
      const h = nextHandle++;
      timers.set(h, { at: now + ms, fn });
      return h;
    },
    clear(h) {
      timers.delete(h);
    },
  };
  function advance(ms: number): void {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].fn();
    }
    now = end;
  }
  return { clock, advance, pending: () => timers.size };
}

test('steps fire in order with their durations', () => {
  const { clock, advance } = fakeClock();
  const seq = new Sequencer(clock);
  const seen: number[] = [];
  let done = 0;
  seq.run(
    [100, 200, 50],
    (i) => seen.push(i),
    () => done++,
  );
  expect(seen).toEqual([0]);
  advance(99);
  expect(seen).toEqual([0]);
  advance(1);
  expect(seen).toEqual([0, 1]);
  advance(199);
  expect(seen).toEqual([0, 1]);
  advance(1);
  expect(seen).toEqual([0, 1, 2]);
  expect(done).toBe(0);
  advance(50);
  expect(done).toBe(1);
  expect(seq.running).toBe(false);
});

test('zero-ms steps coalesce', () => {
  const { clock, advance } = fakeClock();
  const seq = new Sequencer(clock);
  const seen: number[] = [];
  let done = 0;
  seq.run(
    [0, 0, 100, 0, 0],
    (i) => seen.push(i),
    () => done++,
  );
  expect(seen).toEqual([2]);
  advance(100);
  expect(seen).toEqual([2]);
  expect(done).toBe(1);
});

test('skip jumps to the last step and calls onDone once', () => {
  const { clock, advance, pending } = fakeClock();
  const seq = new Sequencer(clock);
  const seen: number[] = [];
  let done = 0;
  seq.run(
    [100, 100, 100],
    (i) => seen.push(i),
    () => done++,
  );
  seq.skip();
  seq.skip();
  expect(seen).toEqual([0, 2]);
  expect(done).toBe(1);
  expect(pending()).toBe(0);
  advance(1000);
  expect(done).toBe(1);
});

test('run while running finishes the previous run first', () => {
  const { clock } = fakeClock();
  const seq = new Sequencer(clock);
  const log: string[] = [];
  seq.run(
    [100, 100],
    (i) => log.push(`a${i}`),
    () => log.push('A done'),
  );
  seq.run(
    [50],
    (i) => log.push(`b${i}`),
    () => log.push('B done'),
  );
  expect(log).toEqual(['a0', 'a1', 'A done', 'b0']);
});

test('an empty run finishes immediately', () => {
  const { clock } = fakeClock();
  const seq = new Sequencer(clock);
  let done = 0;
  seq.run(
    [],
    () => {},
    () => done++,
  );
  expect(done).toBe(1);
  expect(seq.running).toBe(false);
});

const ref = (id: string, at: Coord): UnitRef => ({ id, name: 'rat', at, member: false });

test('buildSteps: step i view = project of steps 0..i', () => {
  const start: BoardView = {
    width: 3,
    height: 1,
    tiles: Array.from({ length: 3 }, () => ({
      state: null,
      rounds: 0,
      jar: false,
      vent: false,
    })),
    units: [
      {
        id: 'rat-1',
        kind: 'enemy',
        def: 'rat',
        name: 'rat',
        pos: { x: 0, y: 0 },
        hp: 2,
        maxHp: 2,
        shield: 0,
        mark: null,
        collar: false,
        shackle: false,
        held: false,
        stunned: false,
        alive: true,
        intent: null,
      },
    ],
    round: 1,
    phase: 'player',
  };
  const events: GameEvent[] = [
    { type: 'landed', kind: 'oil', at: { x: 1, y: 0 }, makes: 'slick' },
    {
      type: 'moved',
      unit: ref('rat-1', { x: 0, y: 0 }),
      to: { x: 1, y: 0 },
      path: [{ x: 1, y: 0 }],
    },
    {
      type: 'damage',
      target: ref('rat-1', { x: 1, y: 0 }),
      amount: 2,
      source: 'Bolt',
      bonus: [],
      hpLeft: 0,
    },
    { type: 'died', unit: ref('rat-1', { x: 1, y: 0 }) },
  ];
  const steps = buildSteps(start, events);
  expect(steps).toHaveLength(4);
  let v = start;
  steps.forEach((s, i) => {
    v = project(v, events[i] as GameEvent);
    expect(s.view).toEqual(v);
    expect(s.line.length).toBeGreaterThan(0);
  });
});
