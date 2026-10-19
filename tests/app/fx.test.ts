import { expect, test } from 'vitest';
import type { Coord, GameEvent, UnitRef } from '$engine';
import { fxFor, layerTone } from '../../src/app/fx';
import { buildSteps } from '../../src/app/playback';
import { durationOf, STEP_MS } from '../../src/app/timing';
import type { BoardView } from '../../src/app/view';

const board: BoardView = {
  width: 6,
  height: 8,
  tiles: Array.from({ length: 48 }, () => ({ state: 'slick', rounds: 0, jar: false, vent: false })),
  units: [],
  round: 1,
  phase: 'player',
};
const ref = (at: Coord): UnitRef => ({ id: 'rat-1', name: 'rat', at, member: false });

test('a fire burst → staggered fire burst over all tiles', () => {
  const tiles = [
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 4, y: 1 },
  ];
  const e: GameEvent = { type: 'burst', burst: 'fire', at: tiles[0] as Coord, tiles, units: [] };
  expect(fxFor(e, board)).toEqual([
    { kind: 'burst', cells: tiles, tone: 'fire', stagger: 50 },
    { kind: 'pulse', at: tiles[0], tone: 'fire' },
  ]);
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

test('a cast that only aims flashes its targets', () => {
  const e: GameEvent = {
    type: 'aimed',
    source: 'bolt',
    targets: [
      { kind: 'tile', at: { x: 1, y: 1 } },
      { kind: 'unit', unit: 'rat-1' },
    ],
    heading: 'right',
  };
  const withRat: BoardView = {
    ...board,
    units: [
      {
        id: 'rat-1',
        kind: 'enemy',
        def: 'rat',
        name: 'rat',
        pos: { x: 3, y: 1 },
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
  };
  expect(fxFor(e, withRat)).toEqual([
    {
      kind: 'burst',
      cells: [
        { x: 1, y: 1 },
        { x: 3, y: 1 },
      ],
      tone: 'source',
      stagger: 0,
    },
  ]);
});

test('kinds, mixes, pushes and drops each have a look', () => {
  const a = { x: 1, y: 1 };
  const b = { x: 2, y: 1 };
  expect(fxFor({ type: 'landed', kind: 'oil', at: a, makes: 'slick' }, board)).toEqual([
    { kind: 'burst', cells: [a], tone: 'oil', stagger: 0 },
  ]);
  expect(fxFor({ type: 'landed', kind: 'ink', at: b, unit: ref(b), makes: 'mark' }, board)).toEqual(
    [{ kind: 'pulse', at: b, tone: 'ink' }],
  );
  expect(fxFor({ type: 'mixed', at: a, compound: 'pool' }, board)).toEqual([
    { kind: 'burst', cells: [a], tone: 'oil', stagger: 0 },
  ]);
  expect(fxFor({ type: 'push', unit: ref(a), dir: 'right', path: [b], slid: 0 }, board)).toEqual([
    { kind: 'trail', cells: [a, b], tone: 'danger' },
  ]);
  expect(fxFor({ type: 'push', unit: ref(a), dir: 'right', path: [b], slid: 1 }, board)).toEqual([
    { kind: 'trail', cells: [a, b], tone: 'oil' },
  ]);
  expect(fxFor({ type: 'dropped', unit: ref(a), at: a, elite: false }, board)).toEqual([
    { kind: 'pulse', at: a, tone: 'danger' },
    { kind: 'float', at: a, text: 'drops', tone: 'danger' },
  ]);
});

test('every state and compound has a tone', () => {
  expect(layerTone('slick')).toBe('oil');
  expect(layerTone('blot')).toBe('ink');
  expect(layerTone('plate')).toBe('brass');
  expect(layerTone('stain')).toBe('ink');
  expect(layerTone('kettle')).toBe('brass');
});

test('silent and housekeeping events draw nothing', () => {
  const a = { x: 1, y: 1 };
  expect(fxFor({ type: 'named', what: 'burst', id: 'fire' }, board)).toEqual([]);
  expect(fxFor({ type: 'stateFades', tiles: [a] }, board)).toEqual([]);
  expect(fxFor({ type: 'jarCrumbles', at: a }, board)).toEqual([]);
  expect(durationOf({ type: 'named', what: 'burst', id: 'fire' })).toBe(0);
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
    {
      type: 'burst',
      burst: 'fire',
      at: { x: 1, y: 0 },
      tiles: [{ x: 1, y: 0 }],
      units: [],
    },
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
    intent: { kind: 'attack', attack: 'line', dir: 'right', order: 1 },
    verbs: 'fires',
  };
  const [fx] = fxFor(sentry, board);
  expect(fx).toMatchObject({ kind: 'trail', tone: 'danger' });
  expect(fx?.kind === 'trail' && fx.cells).toHaveLength(6);
});
