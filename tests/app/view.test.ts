import { describe, expect, test } from 'vitest';
import { ACTIONS, type BurstId, TUNING } from '$data';
import {
  type BattleState,
  type Coord,
  firstRune,
  type GameEvent,
  parseBoard,
  type Step,
  type Tile,
  type UnitRef,
} from '$engine';
import { tileLine, unitTraits } from '../../src/app/describe';
import {
  type BoardView,
  project,
  projectWith,
  type TileView,
  type UnitView,
  viewOf,
  viewOfSpec,
  withoutIntents,
} from '../../src/app/view';
import { cellLabel } from '../../src/ui/components/board/label';
import { act, board } from '../scenarios/harness';
import { bareTile, plainUnit } from './viewFixtures';

const W = 4;
const H = 3;

const unit = (id: string, kind: 'member' | 'enemy', pos: Coord, hp = 3): UnitView =>
  plainUnit({ id, kind, def: kind === 'member' ? 'draughtsman' : 'rat', pos, hp, maxHp: hp });

const bare = (): TileView => bareTile();

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
    from: { x: 0, y: 0 },
    to,
    path: [to],
    cause: 'walk',
  });
  expect(unitOf(moved, 'draughtsman').pos).toEqual(to);
  const pushed = project(v0, {
    type: 'push',
    unit: ref('rat-1', { x: 2, y: 1 }),
    from: { x: 2, y: 1 },
    to: { x: 3, y: 1 },
    cause: 'push',
    dir: 'right',
    path: [{ x: 3, y: 1 }],
    slid: 0,
  });
  expect(unitOf(pushed, 'rat-1').pos).toEqual({ x: 3, y: 1 });
  const slid = project(v0, {
    type: 'push',
    unit: ref('rat-1', { x: 2, y: 1 }),
    from: { x: 2, y: 1 },
    to: { x: 0, y: 1 },
    cause: 'push',
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
  expect(unitOf(shackled, 'rat-1')).toMatchObject({
    mark: null,
    collar: false,
    shackle: TUNING.compoundRounds,
  });
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
  // A layer fades on its last round; the third cloud has longer to go and stays.
  for (const [x, rounds] of [
    [1, 1],
    [2, 1],
    [3, 2],
  ] as const) {
    const t = tile(v, x, 1);
    if (t) t.rounds = rounds;
  }
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
  // A spread copy is the same mark: the same depth, the same lineage.
  v = project(v, { type: 'markSpread', from: hero, to: [rat] });
  expect(unitOf(v, 'rat-1')).toMatchObject({
    mark: 'deep',
    lineage: unitOf(v, 'draughtsman').lineage,
  });
  v = project(v, { type: 'markSpent', unit: rat, released: false });
  expect(unitOf(v, 'rat-1').mark).toBeNull();
  v = project(v, { type: 'collared', unit: rat });
  expect(unitOf(v, 'rat-1').collar).toBe(true);
});

test('stunned, held and swapped', () => {
  const rat = ref('rat-1', { x: 2, y: 1 });
  const hero = ref('draughtsman', { x: 0, y: 0 });
  let v = project(fixture(), { type: 'stunned', unit: rat });
  v = project(v, { type: 'held', unit: hero, rounds: ACTIONS.holdRounds });
  expect(unitOf(v, 'rat-1').stunned).toBe(true);
  expect(unitOf(v, 'draughtsman').held).toBe(ACTIONS.holdRounds);
  v = project(v, {
    type: 'swapped',
    unit: hero,
    with: rat,
    from: hero.at,
    to: rat.at,
    path: [rat.at],
    cause: 'swap',
  });
  expect(unitOf(v, 'draughtsman').pos).toEqual({ x: 2, y: 1 });
  expect(unitOf(v, 'rat-1').pos).toEqual({ x: 0, y: 0 });
});

test('jars appear when sealed and go when opened or crumbled', () => {
  const at = { x: 3, y: 2 };
  const hero = ref('draughtsman', { x: 0, y: 0 });
  let v = project(fixture(), {
    type: 'jarSealed',
    at,
    owner: hero,
    event: 'step',
    id: 1,
    peek: null,
  });
  expect(tile(v, 3, 2)?.jar).toEqual({ owner: 'draughtsman', event: 'step', peek: null });
  v = project(v, { type: 'jarOpened', at, by: null });
  expect(tile(v, 3, 2)?.jar).toBeNull();
  v = project(v, { type: 'jarSealed', at, owner: hero, event: 'dusk', id: 2, peek: null });
  v = project(v, { type: 'jarCrumbles', at });
  expect(tile(v, 3, 2)?.jar).toBeNull();
});

test('events that only flash leave the board as it was', () => {
  const rat = ref('rat-1', { x: 2, y: 1 });
  const v0 = fixture();
  const quiet: GameEvent[] = [
    { type: 'aimed', source: 'bolt', targets: [{ kind: 'unit', unit: 'rat-1' }], heading: 'right' },
    { type: 'burst', burst: 'storm', at: rat.at, tiles: [rat.at], units: [rat] },
    { type: 'crush', unit: rat, into: 'wall', damage: 2, at: A(3, 1), dir: 'right' },
    { type: 'dropped', unit: rat, at: rat.at, elite: false },
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
    {
      type: 'moved',
      unit: ref('draughtsman', { x: 0, y: 0 }),
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 },
      path: [],
      cause: 'walk',
    },
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
    born: true,
    shackle: 0,
    held: 1,
    stunned: true,
  });
  expect(v.tiles[0]).toMatchObject({ state: 'cloud', rounds: 2, vent: true, jar: null });
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
    shackle: TUNING.compoundRounds,
    born: true,
    shield: 2,
  });
  expect(unitOf(v, 'rat-1')).toMatchObject({ shackle: TUNING.compoundRounds, mark: null });
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

test('drift: fire joins whatever floats on the tile it reaches, and wins', () => {
  for (const there of ['slick', 'blot', 'stain', 'fire'] as const) {
    const v0 = fixture();
    Object.assign(tile(v0, 1, 1) ?? {}, { state: 'fire', rounds: 2 });
    Object.assign(tile(v0, 2, 1) ?? {}, { state: there, rounds: 1 });
    const v1 = project(v0, {
      type: 'drift',
      floats: [{ from: { x: 1, y: 1 }, to: { x: 2, y: 1 } }],
      units: [],
    });
    expect(tile(v1, 2, 1)).toMatchObject({ state: 'fire', rounds: 2 });
  }
});

test('drift moves units named in the event', () => {
  const v1 = project(fixture(), {
    type: 'drift',
    floats: [],
    units: [
      {
        unit: ref('rat-1', { x: 2, y: 1 }),
        from: { x: 2, y: 1 },
        to: { x: 3, y: 1 },
        path: [{ x: 3, y: 1 }],
        cause: 'drift',
      },
    ],
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

// ── The rune redesign: states, compounds, marks, jars and moving things ───────────────────────

const A = (x: number, y: number): Coord => ({ x, y });
const setTile = (v: BoardView, x: number, y: number, patch: Partial<TileView>): BoardView => {
  Object.assign(tile(v, x, y) as TileView, patch);
  return v;
};
const ratRef = (x: number, y: number): UnitRef => ref('rat-1', A(x, y));

test('a sealed jar remembers its owner, its trigger and a peek at what is inside', () => {
  const hero = ref('draughtsman', A(0, 0));
  const sealed: GameEvent = {
    type: 'jarSealed',
    at: A(3, 2),
    owner: hero,
    event: 'dusk',
    id: 1,
    peek: 'oil',
  };
  const v = projectWith(fixture(), sealed);
  expect(tile(v, 3, 2)?.jar).toEqual({ owner: 'draughtsman', event: 'dusk', peek: 'oil' });
});

test('firstRune walks a sealed chain to its first rune', () => {
  const at = A(0, 0);
  const strike: Step = { role: 'action', rune: 'strike', auras: [], next: null, at };
  const fork: Step = { role: 'fork', left: null, right: strike, at };
  const split: Step = { role: 'split', branches: [fork], at };
  expect(firstRune(null)).toBeNull();
  expect(firstRune(strike)).toBe('strike');
  expect(firstRune({ role: 'seal', rune: 'jar', rest: strike, at })).toBe('jar');
  expect(firstRune(split)).toBe('strike');
});

test('viewOf shows a jar, its owner and its first rune, and a wall with its hits', () => {
  const s = board('D . .\n. {wall} .');
  const draft = structuredClone(s);
  const first = draft.tiles[0];
  if (first) {
    first.jar = {
      owner: 'draughtsman',
      event: 'step',
      heading: null,
      origin: { caster: 'draughtsman', spell: '0,0', cast: 1 },
      rest: { role: 'action', rune: 'guard', auras: [], next: null, at: A(2, 0) },
    };
  }
  const v = viewOf(draft);
  expect(tile(v, 0, 0)?.jar).toEqual({ owner: 'draughtsman', event: 'step', peek: 'guard' });
  expect(tile(v, 1, 1)).toMatchObject({ state: 'wall', hits: 2 });
});

test('drawn moves a state with its rounds and hits, or a jar, to the next tile', () => {
  const jar = { owner: 'draughtsman', event: 'step', peek: 'oil' } as const;
  const v0 = setTile(fixture(), 1, 1, { state: 'wall', rounds: 2, hits: 1, jar });
  const state = project(v0, { type: 'drawn', from: A(1, 1), to: A(2, 1), what: 'wall' });
  expect(tile(state, 2, 1)).toMatchObject({ state: 'wall', rounds: 2, hits: 1 });
  expect(tile(state, 1, 1)).toMatchObject({ state: null, hits: 0, jar });
  const moved = project(state, { type: 'drawn', from: A(1, 1), to: A(2, 1), what: 'jar' });
  expect(tile(moved, 2, 1)?.jar).toEqual(jar);
  expect(tile(moved, 1, 1)?.jar).toBeNull();
});

test('erased takes the thing the event names and no more', () => {
  const v0 = fixture();
  const rat = unitOf(v0, 'rat-1');
  rat.collar = true;
  rat.shackle = 2;
  setTile(v0, 2, 1, {
    state: 'cloud',
    rounds: 2,
    jar: { owner: 'draughtsman', event: 'step', peek: null },
  });
  const at = A(2, 1);
  const collar = project(v0, { type: 'erased', at, what: 'collar' });
  expect(unitOf(collar, 'rat-1')).toMatchObject({ collar: false, shackle: 2 });
  expect(tile(collar, 2, 1)?.state).toBe('cloud');
  const shackle = project(v0, { type: 'erased', at, what: 'shackle' });
  expect(unitOf(shackle, 'rat-1')).toMatchObject({ collar: true, shackle: 0 });
  const jar = project(v0, { type: 'erased', at, what: 'jar' });
  expect(tile(jar, 2, 1)).toMatchObject({ jar: null, state: 'cloud' });
  const cloud = project(v0, { type: 'erased', at, what: 'cloud' });
  expect(tile(cloud, 2, 1)).toMatchObject({ state: null });
  expect(tile(cloud, 2, 1)?.jar).not.toBeNull();
});

test('a wash on a unit takes its own compound off, not the tile', () => {
  const v0 = setTile(fixture(), 2, 1, { state: 'cloud', rounds: 2 });
  const rat = unitOf(v0, 'rat-1');
  rat.shackle = 2;
  const unshackled = project(v0, { type: 'washed', at: A(2, 1), was: 'shackle', now: 'plate' });
  expect(unitOf(unshackled, 'rat-1').shackle).toBe(0);
  expect(tile(unshackled, 2, 1)?.state).toBe('cloud');
  rat.shackle = 0;
  rat.mark = 'deep';
  const shallow = project(v0, { type: 'washed', at: A(2, 1), was: 'deepMark', now: 'blot' });
  expect(unitOf(shallow, 'rat-1').mark).toBe('plain');
  expect(tile(shallow, 2, 1)?.state).toBe('cloud');
});

test('a shackle keeps a brass unit its collar; a fresh collar comes off', () => {
  const rat = ratRef(2, 1);
  const v0 = fixture();
  Object.assign(unitOf(v0, 'rat-1'), { collar: true, born: true, mark: 'plain' });
  const born = project(v0, { type: 'mixed', at: rat.at, unit: rat, compound: 'shackle' });
  expect(unitOf(born, 'rat-1')).toMatchObject({
    collar: true,
    mark: null,
    shackle: TUNING.compoundRounds,
  });
  Object.assign(unitOf(v0, 'rat-1'), { born: false });
  const cast = project(v0, { type: 'mixed', at: rat.at, unit: rat, compound: 'shackle' });
  expect(unitOf(cast, 'rat-1').collar).toBe(false);
});

describe('bursts change the board the way the engine does', () => {
  const burst = (b: BurstId, at: Coord, tiles: Coord[]): GameEvent => ({
    type: 'burst',
    burst: b,
    at,
    tiles,
    units: [],
  });

  test('fire runs along the oil it names, and so do the stain and pool pages', () => {
    for (const id of ['fire', 'page:stain', 'page:pool'] as const) {
      const v0 = fixture();
      setTile(v0, 1, 1, { state: 'slick' });
      const v = project(v0, burst(id, A(1, 1), [A(1, 1), A(2, 1)]));
      expect(tile(v, 1, 1), id).toMatchObject({ state: 'fire', rounds: TUNING.fireRounds });
      expect(tile(v, 2, 1)?.state, id).toBe('fire');
    }
  });

  test('flashover turns the fog to a one-round fire; other clouds stay', () => {
    const v0 = fixture();
    setTile(v0, 1, 1, { state: 'greaseFog', rounds: 2 });
    setTile(v0, 2, 1, { state: 'cloud', rounds: 2 });
    const v = project(v0, burst('page:greaseFog', A(1, 1), [A(1, 1), A(2, 1)]));
    expect(tile(v, 1, 1)).toMatchObject({ state: 'fire', rounds: 1 });
    expect(tile(v, 2, 1)?.state).toBe('cloud');
  });

  test('a skid plate is spent, a kettle leaves a cloud, a shackle snaps', () => {
    const v0 = fixture();
    setTile(v0, 1, 1, { state: 'skidPlate', rounds: 2, hits: 1 });
    setTile(v0, 3, 2, { state: 'kettle', rounds: 2, hits: 1 });
    const skid = project(v0, burst('page:skidPlate', A(1, 1), [A(2, 1)]));
    expect(tile(skid, 1, 1)).toMatchObject({ state: null, hits: 0 });
    const kettle = project(v0, burst('page:kettle', A(3, 2), [A(3, 2)]));
    expect(tile(kettle, 3, 2)).toMatchObject({
      state: 'cloud',
      rounds: TUNING.cloudRounds,
      hits: 0,
    });
    unitOf(v0, 'rat-1').shackle = 2;
    const snapped = project(v0, burst('page:shackle', A(2, 1), [A(2, 1)]));
    expect(unitOf(snapped, 'rat-1').shackle).toBe(0);
  });

  test('a storm or a detonation changes nothing by itself', () => {
    const v0 = setTile(fixture(), 1, 1, { state: 'cloud', rounds: 2 });
    for (const id of ['storm', 'detonation', 'conduct', 'surge', 'page:wall'] as const) {
      expect(project(v0, burst(id, A(1, 1), [A(1, 1)])), id).toEqual(v0);
    }
  });
});

describe('plates wear', () => {
  test('a crush wears the one plate beside the unit; the last hit is left to the fade', () => {
    const v0 = setTile(fixture(), 3, 1, { state: 'wall', rounds: 2, hits: 2 });
    const crush: GameEvent = {
      type: 'crush',
      unit: ratRef(2, 1),
      into: 'plate',
      damage: 2,
      at: A(3, 1),
      dir: 'right',
    };
    const once = project(v0, crush);
    expect(tile(once, 3, 1)?.hits).toBe(1);
    const twice = project(once, crush);
    expect(tile(twice, 3, 1)?.hits).toBe(1);
    const gone = project(twice, { type: 'stateFades', tiles: [A(3, 1)] });
    expect(tile(gone, 3, 1)).toMatchObject({ state: null, hits: 0 });
  });

  test('only the plate the event names is worn', () => {
    const v0 = setTile(setTile(fixture(), 3, 1, { state: 'plate', hits: 2 }), 1, 1, {
      state: 'plate',
      hits: 2,
    });
    const v = project(v0, {
      type: 'crush',
      unit: ratRef(2, 1),
      into: 'plate',
      damage: 2,
      at: A(3, 1),
      dir: 'right',
    });
    expect(tile(v, 3, 1)?.hits).toBe(1);
    expect(tile(v, 1, 1)?.hits).toBe(2);
  });

  test('a layout plate (no hits) is never worn', () => {
    const v0 = setTile(fixture(), 3, 1, { state: 'plate', rounds: 0, hits: 0 });
    const v = project(v0, {
      type: 'crush',
      unit: ratRef(2, 1),
      into: 'plate',
      damage: 2,
      at: A(3, 1),
      dir: 'right',
    });
    expect(tile(v, 3, 1)).toMatchObject({ state: 'plate', hits: 0 });
  });
});

test('round-end fading: the layer on its last round goes, a shackle on its last round comes off', () => {
  const v0 = fixture();
  setTile(v0, 2, 1, { state: 'cloud', rounds: 2 });
  setTile(v0, 0, 0, { state: 'fire', rounds: 1 });
  unitOf(v0, 'rat-1').shackle = 1;
  unitOf(v0, 'draughtsman').shackle = 2;
  const v = project(v0, { type: 'stateFades', tiles: [A(2, 1), A(0, 0)] });
  expect(unitOf(v, 'rat-1').shackle).toBe(0);
  expect(tile(v, 2, 1)?.state).toBe('cloud'); // more rounds to go: only the shackle faded
  expect(tile(v, 0, 0)?.state).toBeNull();
  expect(unitOf(v, 'draughtsman').shackle).toBe(2);
});

describe('marks carry what they hold', () => {
  const rat = ratRef(2, 1);
  const hero = ref('draughtsman', A(0, 0));

  test('Bind attaches its action to the whole lineage', () => {
    let v = project(fixture(), { type: 'marked', unit: rat, deep: false, bound: null });
    v = project(v, { type: 'markSpread', from: rat, to: [hero] });
    v = project(v, { type: 'marked', unit: rat, deep: false, bound: 'shove' });
    expect(unitOf(v, 'rat-1').bound).toBe('shove');
    expect(unitOf(v, 'draughtsman').bound).toBe('shove');
  });

  test('another mark is another lineage and takes no part in it', () => {
    let v = project(fixture(), { type: 'marked', unit: rat, deep: false, bound: null });
    v = project(v, { type: 'marked', unit: hero, deep: false, bound: null });
    v = project(v, { type: 'marked', unit: rat, deep: false, bound: 'hold' });
    expect(unitOf(v, 'rat-1').bound).toBe('hold');
    expect(unitOf(v, 'draughtsman').bound).toBeNull();
  });

  test('lifting moves the mark with what it holds; spending clears all of it', () => {
    let v = project(fixture(), { type: 'marked', unit: rat, deep: true, bound: null });
    v = project(v, { type: 'marked', unit: rat, deep: true, bound: 'sentence' });
    v = project(v, { type: 'markLifted', from: rat, to: hero });
    expect(unitOf(v, 'rat-1')).toMatchObject({ mark: null, bound: null, lineage: null });
    expect(unitOf(v, 'draughtsman')).toMatchObject({ mark: 'deep', bound: 'sentence' });
    v = project(v, { type: 'markSpent', unit: hero, released: true });
    expect(unitOf(v, 'draughtsman')).toMatchObject({ mark: null, bound: null, lineage: null });
  });

  test('a mark that goes deep and back keeps its action', () => {
    let v = project(fixture(), { type: 'marked', unit: rat, deep: false, bound: 'guard' });
    v = project(v, { type: 'mixed', at: rat.at, unit: rat, compound: 'deepMark' });
    expect(unitOf(v, 'rat-1')).toMatchObject({ mark: 'deep', bound: 'guard' });
    v = project(v, { type: 'washed', at: rat.at, was: 'deepMark', now: 'blot' });
    expect(unitOf(v, 'rat-1')).toMatchObject({ mark: 'plain', bound: 'guard' });
  });
});

describe('a new player phase', () => {
  test('Guard lapses on its round, a hold counts down, a stunned apprentice wakes', () => {
    const v0 = fixture();
    v0.round = 2;
    Object.assign(unitOf(v0, 'draughtsman'), { shield: 2, guard: 2, stunned: true, held: 1 });
    Object.assign(unitOf(v0, 'rat-1'), { shield: 2, guard: 3, stunned: true, held: 2 });
    const v = project(v0, { type: 'phase', phase: 'player' });
    expect(unitOf(v, 'draughtsman')).toMatchObject({
      shield: 0,
      guard: null,
      stunned: false,
      held: 0,
    });
    // A foe keeps its stun for its own phase; its guard has a round to go.
    expect(unitOf(v, 'rat-1')).toMatchObject({ shield: 2, guard: 3, stunned: true, held: 1 });
  });

  test('gaining a shield sets when it lapses; an idle foe loses its stun; the dead are zero', () => {
    let v = project(fixture(), {
      type: 'shieldGained',
      unit: ref('draughtsman', A(0, 0)),
      amount: 2,
    });
    expect(unitOf(v, 'draughtsman')).toMatchObject({ shield: 2, guard: v.round + 1 });
    unitOf(v, 'rat-1').stunned = true;
    v = project(v, { type: 'idle', unit: ratRef(2, 1) });
    expect(unitOf(v, 'rat-1').stunned).toBe(false);
    v = project(v, { type: 'died', unit: ratRef(2, 1) });
    expect(unitOf(v, 'rat-1')).toMatchObject({ alive: false, hp: 0 });
  });

  test('a hold that is already running is not extended by a second event', () => {
    const v0 = fixture();
    unitOf(v0, 'rat-1').held = 3;
    const v = project(v0, { type: 'held', unit: ratRef(2, 1), rounds: ACTIONS.holdRounds });
    expect(unitOf(v, 'rat-1').held).toBe(3);
  });
});

describe('readable lines for the new board', () => {
  test('tileLine names a wall’s hits and a jar’s owner, trigger and first rune', () => {
    const s = structuredClone(board('D . .\n. {wall} .'));
    const wall = s.tiles[1 * s.width + 1];
    if (wall?.state) wall.state.hits = 1;
    expect(tileLine(wall as Tile, A(1, 1))).toBe('B2: wall (2 rounds, 1 hit left)');
    const first = s.tiles[0];
    if (first) {
      first.jar = {
        owner: 'draughtsman',
        event: 'dusk',
        heading: null,
        origin: { caster: 'draughtsman', spell: '0,0', cast: 1 },
        rest: { role: 'action', rune: 'guard', auras: [], next: null, at: A(2, 0) },
      };
    }
    expect(tileLine(first as Tile, A(0, 0))).toBe(
      "A1: Draughtsman's jar (opens at dusk, starts with Guard)",
    );
  });

  test('a bound mark says what it holds, to the player and to a screen reader', () => {
    const base = {
      kind: 'enemy' as const,
      def: 'rat' as const,
      mark: 'plain' as const,
      collar: false,
      shackle: false,
      held: false,
      stunned: false,
    };
    expect(unitTraits({ ...base, bound: 'shove' })[0]).toBe(
      'marked (a Spark bursts it), holding Shove until its event',
    );
    expect(unitTraits({ ...base, bound: null })[0]).toBe('marked (a Spark bursts it)');

    const v = viewOfSpec(parseBoard('D! r!!'));
    const rat = unitOf(v, 'rat-1');
    rat.bound = 'inv:recoil';
    const hero = unitOf(v, 'draughtsman');
    setTile(v, 0, 0, { jar: { owner: 'draughtsman', event: 'step', peek: 'oil' } });
    expect(cellLabel(v, A(1, 0))).toBe('B1: rat, 2 of 2 HP, deeply marked, holding recoil');
    expect(cellLabel(v, A(0, 0))).toBe(
      `A1: ${hero.name}, 6 of 6 HP, marked, sealed jar of Draughtsman, opens on a step, starts with oil`,
    );
  });

  test('a cell label counts a plate’s hits and a layer’s rounds', () => {
    const v = viewOfSpec(parseBoard('{kettle} {wall}'));
    expect(cellLabel(v, A(0, 0))).toBe('A1: kettle (2 rounds, 1 hit left)');
    expect(cellLabel(v, A(1, 0))).toBe('B1: wall (2 rounds, 2 hits left)');
  });
});
