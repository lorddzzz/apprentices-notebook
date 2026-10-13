import { expect, test } from 'vitest';
import type { Coord, GameEvent, UnitRef } from '$engine';
import { fxFor } from '../../src/app/fx';
import { buildSteps } from '../../src/app/playback';
import { durationOf, STEP_MS } from '../../src/app/timing';
import type { BoardView } from '../../src/app/view';

const board: BoardView = {
  width: 6,
  height: 8,
  tiles: Array.from({ length: 48 }, () => ({
    oil: true,
    ink: false,
    steam: 0,
    fire: 0,
    plate: false,
    vent: false,
    stain: false,
    heat: 0,
    etched: false,
    scald: false,
  })),
  units: [],
  round: 1,
  phase: 'player',
};
const ref = (at: Coord): UnitRef => ({ id: 'rat-1', name: 'rat', at, member: false });

test('ignite → staggered fire burst over all tiles', () => {
  const tiles = [
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
  ];
  const e: GameEvent = { type: 'ignite', at: tiles[0] as Coord, tiles };
  expect(fxFor(e, board)).toEqual([{ kind: 'burst', cells: tiles, tone: 'fire', stagger: 50 }]);
  expect(durationOf(e)).toBe(STEP_MS.big);
});

test('damage → float "−3"', () => {
  const e: GameEvent = {
    type: 'damage',
    target: ref({ x: 2, y: 1 }),
    amount: 3,
    source: 'Bolt',
    bonus: [],
    hpLeft: 0,
  };
  expect(fxFor(e, board)).toEqual([
    { kind: 'float', at: { x: 2, y: 1 }, text: '−3', tone: 'danger' },
  ]);
});

test('seam events: pierced hits, heated and scalded burn, stained and etched ink', () => {
  const a = { x: 1, y: 1 };
  const b = { x: 2, y: 1 };
  expect(fxFor({ type: 'pierced', source: 'Bolt', unit: ref(a) }, board)).toEqual([
    { kind: 'pulse', at: a, tone: 'danger' },
  ]);
  expect(fxFor({ type: 'heated', tiles: [a], units: [ref(b)] }, board)).toEqual([
    { kind: 'burst', cells: [a, b], tone: 'fire', stagger: 50 },
  ]);
  expect(fxFor({ type: 'cooled', tiles: [a], units: [] }, board)).toEqual([
    { kind: 'burst', cells: [a], tone: 'steam', stagger: 0 },
  ]);
  expect(fxFor({ type: 'scalded', tiles: [a, b] }, board)).toEqual([
    { kind: 'burst', cells: [a, b], tone: 'fire', stagger: 50 },
  ]);
  expect(fxFor({ type: 'stained', tiles: [a] }, board)).toEqual([
    { kind: 'burst', cells: [a], tone: 'ink', stagger: 0 },
  ]);
  expect(fxFor({ type: 'etched', tiles: [a], units: [ref(b)] }, board)).toEqual([
    { kind: 'burst', cells: [a, b], tone: 'ink', stagger: 0 },
  ]);
});

test('phase player → banner, phase enemy → 0 ms', () => {
  expect(fxFor({ type: 'phase', phase: 'player' }, board)).toEqual([
    { kind: 'banner', text: 'Your turn' },
  ]);
  expect(durationOf({ type: 'phase', phase: 'player' })).toBe(STEP_MS.banner);
  expect(fxFor({ type: 'phase', phase: 'enemy' }, board)).toEqual([]);
  expect(durationOf({ type: 'phase', phase: 'enemy' })).toBe(0);
});

test('reduced motion halves durations and drops trails', () => {
  const events: GameEvent[] = [
    { type: 'moved', unit: ref({ x: 0, y: 0 }), to: { x: 1, y: 0 }, path: [{ x: 1, y: 0 }] },
    { type: 'ignite', at: { x: 1, y: 0 }, tiles: [{ x: 1, y: 0 }] },
  ];
  const full = buildSteps(board, events);
  const half = buildSteps(board, events, 0.5);
  expect(half.map((s) => s.ms)).toEqual(full.map((s) => s.ms / 2));
  expect(full[0]?.fx.some((f) => f.kind === 'trail')).toBe(true);
  expect(half[0]?.fx.some((f) => f.kind === 'trail')).toBe(false);
  expect(half[1]?.fx).toEqual(full[1]?.fx);
});

test('attack trails follow the attack range and stop at the edge', () => {
  const sentry: GameEvent = {
    type: 'attack',
    unit: { id: 'sentry-1', name: 'sentry', at: { x: 0, y: 0 }, member: false },
    intent: { attack: 'line', dir: 'right', order: 1 },
    verbs: 'fires',
  };
  const [fx] = fxFor(sentry, board);
  expect(fx).toMatchObject({ kind: 'trail', tone: 'danger' });
  expect(fx?.kind === 'trail' && fx.cells).toHaveLength(6);
});
