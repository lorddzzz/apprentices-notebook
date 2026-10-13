import { expect, test } from 'vitest';
import { type BattleState, type Coord, type GameEvent, parseBoard, type UnitRef } from '$engine';
import {
  type BoardView,
  project,
  type UnitView,
  viewOf,
  viewOfSpec,
  withoutIntents,
} from '../../src/app/view';
import { TUNING } from '../../src/data';

const W = 4;
const H = 3;

function unit(id: string, kind: 'member' | 'enemy', pos: Coord, hp = 3): UnitView {
  return {
    id,
    kind,
    def: kind === 'member' ? 'draughtsman' : 'rat',
    name: id,
    pos,
    hp,
    maxHp: hp,
    shield: 0,
    inked: false,
    brass: false,
    oilSoaked: false,
    branded: false,
    heat: 0,
    etched: false,
    alive: true,
    intent: null,
  };
}

function fixture(): BoardView {
  return {
    width: W,
    height: H,
    tiles: Array.from({ length: W * H }, () => ({
      oil: false,
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
    units: [unit('draughtsman', 'member', { x: 0, y: 0 }), unit('rat-1', 'enemy', { x: 2, y: 1 })],
    round: 1,
    phase: 'player',
  };
}

const ref = (id: string, at: Coord): UnitRef => ({
  id,
  name: id === 'rat-1' ? 'rat' : 'Draughtsman',
  at,
  member: id === 'draughtsman',
});
const tile = (v: BoardView, x: number, y: number) => v.tiles[y * v.width + x];
const unitOf = (v: BoardView, id: string) => v.units.find((u) => u.id === id) as UnitView;

test('moved/pushed/slide update pos', () => {
  const v0 = fixture();
  const to = { x: 1, y: 0 };
  const moved = project(v0, {
    type: 'moved',
    unit: ref('draughtsman', { x: 0, y: 0 }),
    to,
    path: [to],
  });
  expect(unitOf(moved, 'draughtsman').pos).toEqual(to);
  const pushed = project(v0, {
    type: 'pushed',
    unit: ref('rat-1', { x: 2, y: 1 }),
    to: { x: 3, y: 1 },
  });
  expect(unitOf(pushed, 'rat-1').pos).toEqual({ x: 3, y: 1 });
  const slid = project(v0, {
    type: 'slide',
    unit: ref('rat-1', { x: 2, y: 1 }),
    to: { x: 0, y: 1 },
    path: [
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
  });
  expect(unitOf(slid, 'rat-1').pos).toEqual({ x: 0, y: 1 });
});

test('damage sets hp from hpLeft, died clears intent', () => {
  const v0 = fixture();
  unitOf(v0, 'rat-1').intent = { attack: 'bite', dir: 'left', order: 1 };
  const hit = project(v0, {
    type: 'damage',
    target: ref('rat-1', { x: 2, y: 1 }),
    amount: 2,
    source: 'Bolt',
    bonus: [],
    hpLeft: 1,
  });
  expect(unitOf(hit, 'rat-1').hp).toBe(1);
  const dead = project(hit, { type: 'died', unit: ref('rat-1', { x: 2, y: 1 }) });
  expect(unitOf(dead, 'rat-1').alive).toBe(false);
  expect(unitOf(dead, 'rat-1').intent).toBeNull();
});

test('puddle then inked-via-puddle clears the tile', () => {
  const at = { x: 2, y: 1 };
  const v1 = project(fixture(), { type: 'puddle', tiles: [at] });
  expect(tile(v1, 2, 1)?.ink).toBe(true);
  const v2 = project(v1, { type: 'inked', unit: ref('rat-1', at), via: 'puddle' });
  expect(tile(v2, 2, 1)?.ink).toBe(false);
  expect(unitOf(v2, 'rat-1').inked).toBe(true);
});

test('plates clear other layers', () => {
  let v = fixture();
  const at = { x: 1, y: 1 };
  v = project(v, { type: 'oiled', tiles: [at] });
  v = project(v, { type: 'puddle', tiles: [at] });
  v = project(v, { type: 'steam', tiles: [at] });
  expect(tile(v, 1, 1)).toMatchObject({ oil: true, ink: true, steam: TUNING.steamRounds });
  v = project(v, { type: 'plates', tiles: [at] });
  expect(tile(v, 1, 1)).toEqual({
    oil: false,
    ink: false,
    steam: 0,
    fire: 0,
    plate: true,
    vent: false,
    stain: false,
    heat: 0,
    etched: false,
    scald: false,
  });
  v = project(v, { type: 'plateCrumbles', tiles: [at] });
  expect(tile(v, 1, 1)?.plate).toBe(false);
});

test('ignite sets fire and oil on every tile', () => {
  const tiles = [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 2, y: 2 },
  ];
  const v = project(fixture(), { type: 'ignite', at: tiles[0] as Coord, tiles });
  for (const t of tiles) {
    expect(tile(v, t.x, t.y)).toMatchObject({ oil: true, fire: TUNING.fireRounds });
  }
  expect(tile(v, 3, 2)?.fire).toBe(0);
});

test('fireOut removes oil', () => {
  const tiles = [{ x: 0, y: 2 }];
  const lit = project(fixture(), { type: 'ignite', at: tiles[0] as Coord, tiles });
  const out = project(lit, { type: 'fireOut', tiles });
  expect(tile(out, 0, 2)).toMatchObject({ oil: false, fire: 0 });
});

test('telegraph sets intent, attack clears it', () => {
  const r = ref('rat-1', { x: 2, y: 1 });
  const intent = { attack: 'bite' as const, dir: 'left' as const, order: 1 };
  const t = project(fixture(), { type: 'telegraph', unit: r, intent, verb: 'bite' });
  expect(unitOf(t, 'rat-1').intent).toEqual(intent);
  expect(unitOf(withoutIntents(t), 'rat-1').intent).toBeNull();
  const a = project(t, { type: 'attack', unit: r, intent, verbs: 'bites' });
  expect(unitOf(a, 'rat-1').intent).toBeNull();
});

test('round, phase and shields', () => {
  const r = ref('draughtsman', { x: 0, y: 0 });
  let v = project(fixture(), { type: 'round', round: 3 });
  expect(v.round).toBe(3);
  v = project(v, { type: 'shieldGained', unit: r, amount: 2 });
  expect(unitOf(v, 'draughtsman').shield).toBe(2);
  v = project(v, { type: 'shieldAbsorbs', unit: r, absorbed: 1, left: 1 });
  expect(unitOf(v, 'draughtsman').shield).toBe(1);
  expect(project(v, { type: 'lost' }).phase).toBe('lost');
});

test('project never mutates its input', () => {
  const v0 = fixture();
  const frozen = JSON.stringify(v0);
  const events: GameEvent[] = [
    { type: 'moved', unit: ref('draughtsman', { x: 0, y: 0 }), to: { x: 1, y: 0 }, path: [] },
    { type: 'ignite', at: { x: 0, y: 0 }, tiles: [{ x: 0, y: 0 }] },
    { type: 'died', unit: ref('rat-1', { x: 2, y: 1 }) },
    { type: 'round', round: 2 },
  ];
  for (const e of events) project(v0, e);
  expect(JSON.stringify(v0)).toBe(frozen);
});

test('viewOf copies a battle state', () => {
  const s = {
    title: 't',
    width: 1,
    height: 1,
    tiles: [
      {
        oil: true,
        ink: false,
        steam: 1,
        fire: 0,
        plate: false,
        vent: false,
        stain: true,
        heat: 0,
        etched: false,
        scald: false,
      },
    ],
    units: [
      {
        kind: 'enemy',
        id: 'rat-1',
        def: 'rat',
        name: 'rat',
        pos: { x: 0, y: 0 },
        hp: 0,
        maxHp: 2,
        shield: 0,
        inked: false,
        brass: false,
        oilSoaked: false,
        branded: false,
        heat: 2,
        etched: true,
        intent: null,
      },
    ],
    round: 2,
    phase: 'player',
  } as unknown as BattleState;
  const v = viewOf(s);
  expect(v.units[0]).toMatchObject({ alive: false, hp: 0, kind: 'enemy', heat: 2, etched: true });
  expect(v.tiles[0]).toEqual(s.tiles[0]);
  expect(v.tiles[0]).not.toBe(s.tiles[0]);
});

test('viewOfSpec maps parseBoard tiles and units', () => {
  const v = viewOfSpec(parseBoard('D . r!o\n. @~ *\nb& . r'));
  expect(v.width).toBe(3);
  expect(v.height).toBe(3);
  expect(v.round).toBe(1);
  expect(v.phase).toBe('player');
  const rat1 = unitOf(v, 'rat-1');
  expect(rat1).toMatchObject({
    kind: 'enemy',
    def: 'rat',
    pos: { x: 2, y: 0 },
    inked: true,
    oilSoaked: true,
    branded: false,
    hp: 2,
    maxHp: 2,
    alive: true,
    intent: null,
  });
  expect(tile(v, 2, 0)).toMatchObject({ oil: true, ink: false });
  expect(tile(v, 1, 1)).toMatchObject({ vent: true, steam: TUNING.steamRounds });
  expect(tile(v, 2, 1)).toMatchObject({ oil: true, fire: TUNING.fireRounds });
  expect(unitOf(v, 'rat-2').pos).toEqual({ x: 2, y: 2 });
  const sentry = unitOf(v, 'sentry-1');
  expect(sentry).toMatchObject({ brass: true, hp: 5 });
  expect(unitOf(v, 'draughtsman')).toMatchObject({ kind: 'member', hp: 6, name: 'Draughtsman' });
});

test('viewOfSpec ids match what the engine would assign', () => {
  const v = viewOfSpec(parseBoard('r . r\nS . d'));
  expect(v.units.map((u) => u.id)).toEqual(['rat-1', 'rat-2', 'stoker', 'dummy-1']);
});

test('stained, heated, cooled, scalded and etched project onto tiles and units', () => {
  const at = { x: 1, y: 1 };
  const plate = { x: 0, y: 2 };
  const rat = ref('rat-1', { x: 2, y: 1 });
  let v = project(fixture(), { type: 'oiled', tiles: [at] });
  v = project(v, { type: 'stained', tiles: [at] });
  expect(tile(v, 1, 1)).toMatchObject({ oil: true, stain: true });
  v = project(v, { type: 'plates', tiles: [plate] });
  v = project(v, { type: 'heated', tiles: [plate], units: [rat] });
  expect(tile(v, 0, 2)?.heat).toBe(TUNING.heatRounds);
  expect(unitOf(v, 'rat-1').heat).toBe(TUNING.heatRounds);
  v = project(v, { type: 'etched', tiles: [plate], units: [rat] });
  expect(tile(v, 0, 2)?.etched).toBe(true);
  expect(unitOf(v, 'rat-1').etched).toBe(true);
  v = project(v, { type: 'cooled', tiles: [plate], units: [rat] });
  expect(tile(v, 0, 2)?.heat).toBe(0);
  expect(unitOf(v, 'rat-1').heat).toBe(0);
  // a crumbling plate takes its heat and etching with it
  v = project(v, { type: 'heated', tiles: [plate], units: [] });
  v = project(v, { type: 'plateCrumbles', tiles: [plate] });
  expect(tile(v, 0, 2)).toMatchObject({ plate: false, heat: 0, etched: false });
  v = project(v, { type: 'scalded', tiles: [{ x: 3, y: 0 }] });
  expect(tile(v, 3, 0)).toMatchObject({ steam: TUNING.steamRounds, scald: true });
  v = project(v, { type: 'steamFades', tiles: [{ x: 3, y: 0 }] });
  expect(tile(v, 3, 0)).toMatchObject({ steam: 0, scald: false });
});

test('fire and washing away clear a stain', () => {
  const at = { x: 1, y: 1 };
  let v = project(project(fixture(), { type: 'oiled', tiles: [at] }), {
    type: 'stained',
    tiles: [at],
  });
  v = project(v, { type: 'ignite', at, tiles: [at] });
  expect(tile(v, 1, 1)).toMatchObject({ fire: TUNING.fireRounds, stain: false });
  v = project(v, { type: 'stained', tiles: [at] });
  v = project(v, { type: 'fireOut', tiles: [at] });
  expect(tile(v, 1, 1)).toMatchObject({ oil: false, stain: false });
});

test('viewOfSpec carries stain, heat, etching and scald', () => {
  const v = viewOfSpec(parseBoard('$ s =^ =#\nD&^# . r'));
  expect(tile(v, 0, 0)).toMatchObject({ oil: true, stain: true });
  expect(tile(v, 1, 0)).toMatchObject({ steam: TUNING.steamRounds, scald: true });
  expect(tile(v, 2, 0)).toMatchObject({ plate: true, heat: TUNING.heatRounds });
  expect(tile(v, 3, 0)).toMatchObject({ plate: true, etched: true });
  expect(unitOf(v, 'draughtsman')).toMatchObject({ heat: TUNING.heatRounds, etched: true });
});
