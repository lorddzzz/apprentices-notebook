import { describe, expect, test } from 'vitest';
import { BURSTS, type BurstId, type CompoundId } from '$data';
import type { Coord, GameEvent, UnitRef } from '$engine';
import { burstLook, COMPOUND_TONE, type Fx, fxFor, layerTone } from '../../src/app/fx';
import { buildSteps } from '../../src/app/playback';
import { durationOf, STEP_MS } from '../../src/app/timing';
import type { BoardView } from '../../src/app/view';
import { plainBoard, plainUnit } from './viewFixtures';

const board: BoardView = plainBoard(6, 8, [], { state: 'slick' });
const ref = (at: Coord): UnitRef => ({ id: 'rat-1', name: 'rat', at, member: false });
const a = { x: 1, y: 1 };
const b = { x: 2, y: 1 };

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

test('damage floats the amount at the unit', () => {
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
    units: [plainUnit({ id: 'rat-1', pos: { x: 3, y: 1 }, hp: 2, maxHp: 2 })],
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

test('kinds and mixes flash their tile or pulse their unit', () => {
  expect(fxFor({ type: 'landed', kind: 'oil', at: a, makes: 'slick' }, board)).toEqual([
    { kind: 'burst', cells: [a], tone: 'oil', stagger: 0 },
  ]);
  expect(fxFor({ type: 'landed', kind: 'ink', at: b, unit: ref(b), makes: 'mark' }, board)).toEqual(
    [{ kind: 'pulse', at: b, tone: 'ink' }],
  );
  expect(fxFor({ type: 'mixed', at: a, compound: 'pool' }, board)).toEqual([
    { kind: 'burst', cells: [a], tone: 'oil', stagger: 0 },
  ]);
  expect(fxFor({ type: 'mixed', at: b, unit: ref(b), compound: 'shackle' }, board)).toEqual([
    { kind: 'pulse', at: b, tone: 'brass' },
  ]);
});

describe('moving things', () => {
  test('a plain push is a trail, a push that slid is a slide', () => {
    expect(fxFor({ type: 'push', unit: ref(a), dir: 'right', path: [b], slid: 0 }, board)).toEqual([
      { kind: 'trail', cells: [a, b], tone: 'danger' },
    ]);
    expect(fxFor({ type: 'push', unit: ref(a), dir: 'right', path: [b], slid: 1 }, board)).toEqual([
      { kind: 'slide', cells: [a, b], tone: 'oil' },
    ]);
  });

  test('a crush stars the pushed unit, and what it hit when that is a unit', () => {
    expect(fxFor({ type: 'crush', unit: ref(a), into: 'wall', damage: 2 }, board)).toEqual([
      { kind: 'crush', at: a, tone: 'danger' },
    ]);
    expect(fxFor({ type: 'crush', unit: ref(a), into: ref(b), damage: 2 }, board)).toEqual([
      { kind: 'crush', at: a, tone: 'danger' },
      { kind: 'crush', at: b, tone: 'danger' },
    ]);
  });

  test('a drop is a hole under the unit, with the word', () => {
    expect(fxFor({ type: 'dropped', unit: ref(a), at: b, elite: false }, board)).toEqual([
      { kind: 'drop', at: b },
      { kind: 'float', at: a, text: 'drops', tone: 'danger' },
    ]);
    expect(durationOf({ type: 'dropped', unit: ref(a), at: b, elite: true })).toBe(STEP_MS.big);
  });
});

describe('bursts', () => {
  const ids: BurstId[] = [
    'detonation',
    'fire',
    'storm',
    'conduct',
    'surge',
    ...(Object.keys(COMPOUND_TONE).map((c) => `page:${c}`) as BurstId[]),
  ];

  test('every burst the data names has a look', () => {
    for (const row of BURSTS) expect(burstLook(row.burst), row.burst).toBeDefined();
    expect(new Set(ids.map((id) => burstLook(id).base))).toEqual(
      new Set(['detonation', 'fire', 'storm', 'conduct', 'surge']),
    );
  });

  test('page bursts reuse the nearest base look with their own tint', () => {
    const page = (c: CompoundId) => burstLook(`page:${c}`);
    expect(page('stain')).toEqual({ base: 'fire', tone: 'ink' });
    expect(page('pool')).toEqual({ base: 'fire', tone: 'oil' });
    expect(page('brandCloud')).toEqual({ base: 'storm', tone: 'ink' });
    expect(page('shackle').base).toBe('detonation');
    expect(page('wall').base).toBe('conduct');
  });

  const at = { x: 3, y: 1 };
  const burstEvent = (burst: BurstId, units: UnitRef[] = [ref({ x: 4, y: 1 })]): GameEvent => ({
    type: 'burst',
    burst,
    at,
    tiles: [at, { x: 4, y: 1 }],
    units,
  });
  const kinds = (e: GameEvent): string[] => fxFor(e, board).map((f) => f.kind);

  test('each base burst draws its own thing', () => {
    expect(kinds(burstEvent('detonation'))).toEqual(['splat', 'pulse']);
    expect(kinds(burstEvent('fire'))).toEqual(['burst', 'pulse']);
    expect(kinds(burstEvent('storm'))).toEqual(['burst', 'zap']);
    expect(kinds(burstEvent('conduct'))).toEqual(['burst', 'zap']);
    expect(kinds(burstEvent('surge'))).toEqual(['burst', 'pulse', 'zap']);
  });

  test('a storm arcs from the burst to every unit hit; a page storm takes the page tint', () => {
    const rats = [ref({ x: 4, y: 1 }), ref({ x: 5, y: 2 })];
    const zap = fxFor(burstEvent('storm', rats), board).find((f) => f.kind === 'zap') as Fx;
    expect(zap).toEqual({
      kind: 'zap',
      from: at,
      cells: [
        { x: 4, y: 1 },
        { x: 5, y: 2 },
      ],
      tone: 'spark',
    });
    const brand = fxFor(burstEvent('page:brandCloud', rats), board);
    expect(brand[0]).toMatchObject({ kind: 'burst', tone: 'ink' });
    expect(brand[1]).toMatchObject({ kind: 'zap', tone: 'ink' });
  });

  test('a detonation splats in ink, a shackle snaps in brass', () => {
    expect(fxFor(burstEvent('detonation'), board)[0]).toEqual({ kind: 'splat', at, tone: 'ink' });
    expect(fxFor(burstEvent('page:shackle'), board)[0]).toEqual({
      kind: 'splat',
      at,
      tone: 'brass',
    });
  });

  test('a burst with no tiles still flashes its own', () => {
    const e: GameEvent = { type: 'burst', burst: 'fire', at, tiles: [], units: [] };
    expect(fxFor(e, board)[0]).toMatchObject({ kind: 'burst', cells: [at] });
  });
});

test('every state and compound has a tone', () => {
  expect(layerTone('slick')).toBe('oil');
  expect(layerTone('blot')).toBe('ink');
  expect(layerTone('plate')).toBe('brass');
  expect(layerTone('stain')).toBe('ink');
  expect(layerTone('kettle')).toBe('brass');
});

test('silent and housekeeping events draw nothing', () => {
  expect(fxFor({ type: 'named', what: 'burst', id: 'fire' }, board)).toEqual([]);
  expect(fxFor({ type: 'stateFades', tiles: [a] }, board)).toEqual([]);
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

test('reduced motion halves durations and drops trails and slides', () => {
  const events: GameEvent[] = [
    { type: 'moved', unit: ref({ x: 0, y: 0 }), to: { x: 1, y: 0 }, path: [{ x: 1, y: 0 }] },
    { type: 'push', unit: ref(a), dir: 'right', path: [b], slid: 1 },
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
  expect(full[1]?.fx.some((f) => f.kind === 'slide')).toBe(true);
  expect(half[1]?.fx.some((f) => f.kind === 'slide')).toBe(false);
  expect(half[2]?.fx).toEqual(full[2]?.fx);
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

// ── One beat per event ────────────────────────────────────────────────────────────────────────

const rat = ref(a);
const stoker: UnitRef = { id: 'stoker', name: 'Stoker', at: { x: 0, y: 0 }, member: true };
const intent = { kind: 'attack', attack: 'bite', dir: 'left', order: 1 } as const;

/** One sample of every event in the union: a new event type fails to compile until it is added. */
const SAMPLES = {
  battleStart: { type: 'battleStart', title: 'A room' },
  round: { type: 'round', round: 2 },
  phase: { type: 'phase', phase: 'player' },
  won: { type: 'won' },
  lost: { type: 'lost' },
  moved: { type: 'moved', unit: stoker, to: a, path: [a] },
  moveUndone: { type: 'moveUndone', unit: stoker, to: a },
  shove: { type: 'shove', by: stoker, target: rat, dir: 'right' },
  cast: { type: 'cast', caster: stoker, spell: 'Bolt', aim: { kind: 'self' }, aimText: 'x' },
  lands: { type: 'lands', source: 'Bolt', at: b, path: [a, b] },
  stopped: { type: 'stopped', source: 'Bolt', at: b, by: 'cloud', path: [a, b] },
  damage: { type: 'damage', target: rat, amount: 1, source: 'x', bonus: [], hpLeft: 1 },
  shieldAbsorbs: { type: 'shieldAbsorbs', unit: rat, absorbed: 1, left: 0 },
  shieldGained: { type: 'shieldGained', unit: rat, amount: 2 },
  died: { type: 'died', unit: rat },
  telegraph: { type: 'telegraph', unit: rat, intent, verb: 'bite' },
  idle: { type: 'idle', unit: rat },
  attack: { type: 'attack', unit: rat, intent, verbs: 'bites' },
  miss: { type: 'miss', source: 'Bolt' },
  drift: { type: 'drift', floats: [{ from: a, to: b }], units: [] },
  gateBurns: { type: 'gateBurns', at: a },
  vent: { type: 'vent', at: a },
  snuff: { type: 'snuff', by: rat, tiles: [a] },
  foeBursts: { type: 'foeBursts', unit: rat, at: a },
  summon: { type: 'summon', by: rat, unit: rat, at: a },
  flare: { type: 'flare', by: rat },
  trace: { type: 'trace', caster: stoker, spell: '0,0', cells: [], meaningful: true, spans: [] },
  aimed: { type: 'aimed', source: 'bolt', targets: [{ kind: 'tile', at: a }], heading: null },
  landed: { type: 'landed', kind: 'oil', at: a, makes: 'slick' },
  mixed: { type: 'mixed', at: a, compound: 'stain' },
  washed: { type: 'washed', at: a, was: 'stain', now: 'blot' },
  burst: { type: 'burst', burst: 'storm', at: a, tiles: [a], units: [rat] },
  stateFades: { type: 'stateFades', tiles: [a] },
  spreadState: { type: 'spreadState', from: a, to: [b] },
  push: { type: 'push', unit: rat, dir: 'right', path: [b], slid: 0 },
  crush: { type: 'crush', unit: rat, into: 'wall', damage: 2 },
  dropped: { type: 'dropped', unit: rat, at: a, elite: false },
  stunned: { type: 'stunned', unit: rat },
  held: { type: 'held', unit: rat },
  swapped: { type: 'swapped', a: stoker, b: rat },
  drawn: { type: 'drawn', from: a, to: b, what: 'cloud' },
  erased: { type: 'erased', at: a, what: 'cloud' },
  marked: { type: 'marked', unit: rat, deep: false, bound: null },
  collared: { type: 'collared', unit: rat },
  markSpread: { type: 'markSpread', from: rat, to: [stoker] },
  markSpent: { type: 'markSpent', unit: rat, released: false },
  markLifted: { type: 'markLifted', from: rat, to: stoker },
  released: { type: 'released', unit: rat, action: 'shove' },
  conducted: { type: 'conducted', action: 'strike', units: [rat] },
  jarSealed: { type: 'jarSealed', at: a, owner: stoker, event: 'step' },
  jarOpened: { type: 'jarOpened', at: a, by: rat },
  jarCrumbles: { type: 'jarCrumbles', at: a },
  scheduled: { type: 'scheduled', kind: 'repeat', at: a },
  repeated: { type: 'repeated', action: 'strike' },
  triggered: { type: 'triggered', rune: 'tally', passed: true },
  fizzles: { type: 'fizzles', reason: 'cap' },
  named: { type: 'named', what: 'compound', id: 'stain' },
} satisfies Record<GameEvent['type'], GameEvent>;

// Events that leave the beat to their neighbours: no picture, or no place to draw one.
const NO_BEAT: readonly GameEvent['type'][] = [
  'trace',
  'named',
  'markSpent',
  'repeated',
  'triggered',
];
const NO_PICTURE: readonly GameEvent['type'][] = [
  ...NO_BEAT,
  'shove',
  'miss',
  'idle',
  'telegraph',
  'stateFades',
];

describe('one short beat per event', () => {
  const all = Object.values(SAMPLES) as GameEvent[];

  test('an event with a picture gets time to show it, and none is long', () => {
    for (const e of all) {
      if (NO_BEAT.includes(e.type)) {
        expect(durationOf(e), e.type).toBe(0);
        continue;
      }
      if (e.type === 'phase' || e.type === 'battleStart') continue; // banners, tested above
      expect(durationOf(e), e.type).toBeGreaterThan(0);
      expect(durationOf(e), e.type).toBeLessThanOrEqual(STEP_MS.big);
    }
    expect(durationOf(SAMPLES.battleStart)).toBe(STEP_MS.banner);
  });

  test('a beat with no picture is a deliberate choice', () => {
    for (const e of all) {
      const drawn = fxFor(e, board).length > 0;
      if (NO_PICTURE.includes(e.type)) expect(drawn, e.type).toBe(false);
      else expect(drawn, e.type).toBe(true);
    }
  });

  test('a quiet event never carries a picture that would be skipped', () => {
    for (const e of all) if (durationOf(e) === 0) expect(fxFor(e, board), e.type).toEqual([]);
  });

  test('the new moving-things events are big beats', () => {
    for (const t of ['burst', 'crush', 'dropped'] as const) {
      expect(durationOf(SAMPLES[t]), t).toBe(STEP_MS.big);
    }
    for (const t of ['push', 'mixed', 'marked', 'collared', 'jarSealed', 'jarOpened'] as const) {
      expect(durationOf(SAMPLES[t]), t).toBe(STEP_MS.normal);
    }
  });
});
