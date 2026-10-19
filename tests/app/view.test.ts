import { expect, test } from 'vitest';
import { TUNING } from '$data';
import { type BattleState, type Coord, type GameEvent, parseBoard, type UnitRef } from '$engine';
import {
  type BoardView,
  project,
  type TileView,
  type UnitView,
  viewOf,
  viewOfSpec,
  withoutIntents,
} from '../../src/app/view';
import { act, board } from '../scenarios/harness';

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
    mark: null,
    collar: false,
    shackle: false,
    held: false,
    stunned: false,
    alive: true,
    intent: null,
  };
}

const bare = (): TileView => ({ state: null, rounds: 0, jar: false, vent: false });

function fixture(): BoardView {
  return {
    width: W,
    height: H,
    tiles: Array.from({ length: W * H }, bare),
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

test('moved and push update pos', () => {
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
    type: 'push',
    unit: ref('rat-1', { x: 2, y: 1 }),
    dir: 'right',
    path: [{ x: 3, y: 1 }],
    slid: 0,
  });
  expect(unitOf(pushed, 'rat-1').pos).toEqual({ x: 3, y: 1 });
  const slid = project(v0, {
    type: 'push',
    unit: ref('rat-1', { x: 2, y: 1 }),
    dir: 'left',
    path: [
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ],
    slid: 2,
  });
  expect(unitOf(slid, 'rat-1').pos).toEqual({ x: 0, y: 1 });
});

test('damage sets hp from hpLeft, died clears intent', () => {
  const v0 = fixture();
  unitOf(v0, 'rat-1').intent = { kind: 'attack', attack: 'bite', dir: 'left', order: 1 };
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

test('landed puts a state on the tile, a mark or a collar on the unit', () => {
  const at = { x: 1, y: 1 };
  const slick = project(fixture(), { type: 'landed', kind: 'oil', at, makes: 'slick' });
  expect(tile(slick, 1, 1)).toMatchObject({ state: 'slick', rounds: 0 });
  const cloud = project(fixture(), { type: 'landed', kind: 'steam', at, makes: 'cloud' });
  expect(tile(cloud, 1, 1)).toMatchObject({ state: 'cloud', rounds: TUNING.cloudRounds });
  const marked = project(fixture(), {
    type: 'landed',
    kind: 'ink',
    at: { x: 2, y: 1 },
    unit: ref('rat-1', { x: 2, y: 1 }),
    makes: 'mark',
  });
  expect(unitOf(marked, 'rat-1').mark).toBe('plain');
  expect(tile(marked, 2, 1)?.state).toBeNull();
  const collared = project(fixture(), {
    type: 'landed',
    kind: 'brass',
    at: { x: 2, y: 1 },
    unit: ref('rat-1', { x: 2, y: 1 }),
    makes: 'collar',
  });
  expect(unitOf(collared, 'rat-1').collar).toBe(true);
});

test('mixed makes a compound on a tile, or a deep mark and a shackle on a unit', () => {
  const at = { x: 1, y: 1 };
  const stain = project(fixture(), { type: 'mixed', at, compound: 'stain' });
  expect(tile(stain, 1, 1)).toMatchObject({ state: 'stain', rounds: TUNING.compoundRounds });
  const rat = ref('rat-1', { x: 2, y: 1 });
  const deep = project(fixture(), { type: 'mixed', at: rat.at, unit: rat, compound: 'deepMark' });
  expect(unitOf(deep, 'rat-1').mark).toBe('deep');
  const shackled = project(deep, { type: 'mixed', at: rat.at, unit: rat, compound: 'shackle' });
  expect(unitOf(shackled, 'rat-1')).toMatchObject({ mark: null, collar: false, shackle: true });
});

test('washed, fades and spreadState rewrite tiles', () => {
  const at = { x: 1, y: 1 };
  let v = project(fixture(), { type: 'mixed', at, compound: 'pool' });
  v = project(v, { type: 'washed', at, was: 'pool', now: 'cloud' });
  expect(tile(v, 1, 1)?.state).toBe('cloud');
  v = project(v, {
    type: 'spreadState',
    from: at,
    to: [
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ],
  });
  expect(tile(v, 2, 1)?.state).toBe('cloud');
  expect(tile(v, 3, 1)?.state).toBe('cloud');
  v = project(v, { type: 'stateFades', tiles: [at, { x: 2, y: 1 }] });
  expect(tile(v, 1, 1)?.state).toBeNull();
  expect(tile(v, 2, 1)?.state).toBeNull();
  expect(tile(v, 3, 1)?.state).toBe('cloud');
});

test('marks spread, are spent and move', () => {
  const rat = ref('rat-1', { x: 2, y: 1 });
  const hero = ref('draughtsman', { x: 0, y: 0 });
  let v = project(fixture(), { type: 'marked', unit: rat, deep: true, bound: null });
  expect(unitOf(v, 'rat-1').mark).toBe('deep');
  v = project(v, { type: 'markLifted', from: rat, to: hero });
  expect(unitOf(v, 'rat-1').mark).toBeNull();
  expect(unitOf(v, 'draughtsman').mark).toBe('deep');
  v = project(v, { type: 'markSpread', from: hero, to: [rat] });
  expect(unitOf(v, 'rat-1').mark).toBe('plain');
  v = project(v, { type: 'markSpent', unit: rat, released: false });
  expect(unitOf(v, 'rat-1').mark).toBeNull();
  v = project(v, { type: 'collared', unit: rat });
  expect(unitOf(v, 'rat-1').collar).toBe(true);
});

test('stunned, held and swapped', () => {
  const rat = ref('rat-1', { x: 2, y: 1 });
  const hero = ref('draughtsman', { x: 0, y: 0 });
  let v = project(fixture(), { type: 'stunned', unit: rat });
  v = project(v, { type: 'held', unit: hero });
  expect(unitOf(v, 'rat-1').stunned).toBe(true);
  expect(unitOf(v, 'draughtsman').held).toBe(true);
  v = project(v, { type: 'swapped', a: hero, b: rat });
  expect(unitOf(v, 'draughtsman').pos).toEqual({ x: 2, y: 1 });
  expect(unitOf(v, 'rat-1').pos).toEqual({ x: 0, y: 0 });
});

test('jars appear when sealed and go when opened or crumbled', () => {
  const at = { x: 3, y: 2 };
  const hero = ref('draughtsman', { x: 0, y: 0 });
  let v = project(fixture(), { type: 'jarSealed', at, owner: hero, event: 'step' });
  expect(tile(v, 3, 2)?.jar).toBe(true);
  v = project(v, { type: 'jarOpened', at, by: null });
  expect(tile(v, 3, 2)?.jar).toBe(false);
  v = project(v, { type: 'jarSealed', at, owner: hero, event: 'dusk' });
  v = project(v, { type: 'jarCrumbles', at });
  expect(tile(v, 3, 2)?.jar).toBe(false);
});

test('events that only flash leave the board as it was', () => {
  const rat = ref('rat-1', { x: 2, y: 1 });
  const v0 = fixture();
  const quiet: GameEvent[] = [
    { type: 'aimed', source: 'bolt', targets: [{ kind: 'unit', unit: 'rat-1' }], heading: 'right' },
    { type: 'burst', burst: 'fire', at: rat.at, tiles: [rat.at], units: [rat] },
    { type: 'crush', unit: rat, into: 'wall', damage: 2 },
    { type: 'dropped', unit: rat, at: rat.at, elite: false },
    { type: 'drawn', from: rat.at, to: { x: 1, y: 1 }, what: 'cloud' },
    { type: 'erased', at: rat.at, what: 'mark' },
    { type: 'released', unit: rat, action: 'strike' },
    { type: 'conducted', action: 'strike', units: [rat] },
    { type: 'scheduled', kind: 'repeat', at: rat.at },
    { type: 'repeated', action: 'strike' },
    { type: 'triggered', rune: 'tally', passed: false },
    { type: 'fizzles', reason: 'cap' },
    { type: 'named', what: 'compound', id: 'stain' },
  ];
  for (const e of quiet) expect(project(v0, e), e.type).toEqual(v0);
});

test('telegraph sets intent, attack clears it', () => {
  const r = ref('rat-1', { x: 2, y: 1 });
  const intent = {
    kind: 'attack' as const,
    attack: 'bite' as const,
    dir: 'left' as const,
    order: 1,
  };
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
    { type: 'landed', kind: 'oil', at: { x: 0, y: 0 }, makes: 'slick' },
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
        terrain: { water: null, drop: false, vent: true, grate: false, gate: false, lamp: false },
        state: { id: 'cloud', rounds: 2, origin: null },
        jar: null,
        hot: 0,
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
        guardUntil: null,
        mark: { deep: true, lineage: 1, bound: null, origin: null },
        collar: null,
        shackle: 0,
        held: 1,
        stunned: true,
        elite: false,
        lastMove: null,
        intent: null,
      },
    ],
    round: 2,
    phase: 'player',
  } as unknown as BattleState;
  const v = viewOf(s);
  expect(v.units[0]).toMatchObject({
    alive: false,
    hp: 0,
    kind: 'enemy',
    mark: 'deep',
    collar: true, // null = born brass (a layout collar)
    shackle: false,
    held: true,
    stunned: true,
  });
  expect(v.tiles[0]).toMatchObject({ state: 'cloud', rounds: 2, vent: true, jar: false });
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
    mark: 'plain',
    hp: 2,
    maxHp: 2,
    alive: true,
    intent: null,
  });
  expect(tile(v, 2, 0)).toMatchObject({ state: 'slick' });
  expect(tile(v, 1, 1)).toMatchObject({ vent: true, state: 'cloud', rounds: TUNING.cloudRounds });
  expect(tile(v, 2, 1)).toMatchObject({ state: 'fire', rounds: TUNING.fireRounds });
  expect(unitOf(v, 'rat-2').pos).toEqual({ x: 2, y: 2 });
  const sentry = unitOf(v, 'sentry-1');
  expect(sentry).toMatchObject({ collar: true, hp: 5 });
  expect(unitOf(v, 'draughtsman')).toMatchObject({ kind: 'member', hp: 6, name: 'Draughtsman' });
});

test('viewOfSpec carries compounds, plates, the drop and unit mods', () => {
  const v = viewOfSpec(parseBoard('{stain} {brand} = _\nD!!&$++ . r$ .'));
  expect(tile(v, 0, 0)).toMatchObject({ state: 'stain', rounds: TUNING.compoundRounds });
  expect(tile(v, 1, 0)).toMatchObject({ state: 'brandCloud' });
  expect(tile(v, 2, 0)).toMatchObject({ state: 'plate', rounds: 0 });
  expect(tile(v, 3, 0)?.drop).toBe(true);
  expect(unitOf(v, 'draughtsman')).toMatchObject({
    mark: 'deep',
    collar: true,
    shackle: true,
    shield: 2,
  });
  expect(unitOf(v, 'rat-1')).toMatchObject({ shackle: true, mark: null });
});

test('viewOfSpec ids match what the engine would assign', () => {
  const v = viewOfSpec(parseBoard('r . r\nS . d'));
  expect(v.units.map((u) => u.id)).toEqual(['rat-1', 'rat-2', 'stoker', 'dummy-1']);
});

// ── The canals (U1) ──

const endTurn = { type: 'endTurn' } as const;

/** Replays a round's events onto the view of the state before it. */
function replay(ascii: string): { played: BoardView; after: BoardView } {
  const before = board(ascii);
  const r = act(before, endTurn);
  const played = r.events.reduce(project, viewOf(before));
  return { played, after: viewOf(r.state) };
}

const living = (v: BoardView) =>
  v.units
    .filter((u) => u.alive)
    .map((u) => [u.id, u.pos.x, u.pos.y])
    .sort();

test('viewOf and viewOfSpec carry the canal terrain', () => {
  const ascii = '. w> hw> l\n. g . .\nD . . .';
  const v = viewOf(board(ascii));
  expect(v.tiles[1]).toMatchObject({ water: 'right', grate: false });
  expect(v.tiles[2]).toMatchObject({ water: 'right', grate: true });
  expect(v.tiles[3]?.lamp).toBe(true);
  expect(v.tiles[5]?.gate).toBe(true);
  const spec = viewOfSpec(parseBoard(ascii));
  expect(spec.tiles.map((t) => [t.water, t.grate, t.gate, t.lamp])).toEqual(
    v.tiles.map((t) => [t.water, t.grate, t.gate, t.lamp]),
  );
});

test('drift slides a member with the current', () => {
  const { played, after } = replay('. . . .\nD w> w> w>\n. . . .');
  expect(living(played)).toEqual(living(after));
});

test('drift carries a float one tile and drops it past the end of the lane', () => {
  const v0 = fixture();
  Object.assign(tile(v0, 1, 1) ?? {}, { state: 'fire', rounds: 2 });
  Object.assign(tile(v0, 3, 1) ?? {}, { state: 'slick' });
  const v1 = project(v0, {
    type: 'drift',
    floats: [
      { from: { x: 1, y: 1 }, to: { x: 2, y: 1 } },
      { from: { x: 3, y: 1 }, to: null },
    ],
    units: [],
  });
  expect(tile(v1, 1, 1)).toMatchObject({ state: null, rounds: 0 });
  expect(tile(v1, 2, 1)).toMatchObject({ state: 'fire', rounds: 2 });
  expect(tile(v1, 3, 1)?.state).toBeNull();
  expect(tile(v0, 1, 1)?.state).toBe('fire');
});

test('drift moves units named in the event', () => {
  const v1 = project(fixture(), {
    type: 'drift',
    floats: [],
    units: [{ unit: ref('rat-1', { x: 2, y: 1 }), from: { x: 2, y: 1 }, to: { x: 3, y: 1 } }],
  });
  expect(unitOf(v1, 'rat-1').pos).toEqual({ x: 3, y: 1 });
});

test('gateBurns removes the gate; snuff clears fire only', () => {
  const v0 = fixture();
  Object.assign(tile(v0, 1, 0) ?? {}, { gate: true });
  Object.assign(tile(v0, 2, 2) ?? {}, { state: 'fire', rounds: 2 });
  Object.assign(tile(v0, 3, 2) ?? {}, { state: 'slick' });
  const v1 = project(v0, { type: 'gateBurns', at: { x: 1, y: 0 } });
  expect(tile(v1, 1, 0)?.gate).toBe(false);
  const v2 = project(v1, {
    type: 'snuff',
    by: ref('rat-1', { x: 2, y: 1 }),
    tiles: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
    ],
  });
  expect(tile(v2, 2, 2)).toMatchObject({ state: null, rounds: 0 });
  expect(tile(v2, 3, 2)?.state).toBe('slick');
});

test('vent puffs a cloud', () => {
  const v = project(fixture(), { type: 'vent', at: { x: 1, y: 1 } });
  expect(tile(v, 1, 1)).toMatchObject({ state: 'cloud', rounds: TUNING.cloudRounds });
});

test('summon adds the called moth; its caller loses the intent', () => {
  const v0 = fixture();
  unitOf(v0, 'rat-1').intent = { kind: 'summon', at: { x: 0, y: 2 }, order: 1 };
  const v1 = project(v0, {
    type: 'summon',
    by: ref('rat-1', { x: 2, y: 1 }),
    unit: ref('moth-1', { x: 0, y: 2 }),
    at: { x: 0, y: 2 },
  });
  expect(unitOf(v1, 'moth-1')).toMatchObject({
    def: 'moth',
    alive: true,
    hp: 1,
    pos: { x: 0, y: 2 },
  });
  expect(unitOf(v1, 'rat-1').intent).toBeNull();
  expect(v0.units.some((u) => u.id === 'moth-1')).toBe(false);
});

test('three rounds of summon and flare replay to the engine state', () => {
  const pool = `
    l . . . . . . . . . . .
    . . Mw> . . . . . . . m m
    . . . . . . . . . . . .
    D . . . . . . . . . . .
  `;
  let s = board(pool);
  let v = viewOf(s);
  for (let i = 0; i < 3; i++) {
    const r = act(s, endTurn);
    v = r.events.reduce(project, v);
    s = r.state;
  }
  expect(living(v)).toEqual(living(viewOf(s)));
  expect(v.units.filter((u) => u.alive && u.def === 'moth')).toHaveLength(0);
});

test('an eel and a current: the replayed round matches the engine', () => {
  const { played, after } = replay(`
    . . . . . .
    D w> w> w> w> ew>
    . . . . . .
  `);
  expect(living(played)).toEqual(living(after));
});
