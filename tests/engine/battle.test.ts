import { expect, test } from 'vitest';
import { ENCOUNTERS } from '$data';
import {
  boardOf,
  createBattle,
  createEncounterBattle,
  IllegalActionError,
  isLegal,
  labSetCell,
  parseBoard,
  replay,
  type Spell,
  serializeBoard,
} from '$engine';
import { act, board, expectLog, unitAtLabel } from '../scenarios/harness';

const bolt: Spell = {
  key: '0,0',
  at: { x: 0, y: 0 },
  source: 'bolt',
  amp: 0,
  magnitude: 2,
  echo: false,
  charges: 3,
  nodes: [],
  path: [],
};

test('createBattle spawns units in reading order with ids rat-1, rat-2', () => {
  const s = board(`
    r  .  D
    S  r& d!
  `);
  expect(s.units.map((u) => u.id)).toEqual(['rat-1', 'draughtsman', 'stoker', 'rat-2', 'dummy-1']);
  const [rat1, draughtsman, , rat2, dummy] = s.units;
  expect(rat1).toMatchObject({ kind: 'enemy', hp: 2, maxHp: 2, oilSoaked: true, brass: false });
  expect(rat2).toMatchObject({ brass: true, pos: { x: 1, y: 1 } });
  expect(dummy).toMatchObject({ inked: true, hp: 12 });
  expect(draughtsman).toMatchObject({ kind: 'member', hp: 6, move: 3, moved: false, acted: false });
  expect(unitAtLabel(s, 'A2').name).toBe('Stoker');
  expect(s).toMatchObject({ round: 1, phase: 'player', echoes: [], discovered: [], lab: false });
  expect(board('b', { title: 't' }).units[0]?.brass).toBe(true);
});

test('party init sets hp, spells and default charges per spell key', () => {
  const s = board('D S d', { party: { draughtsman: { hp: 2, spells: [bolt] } } });
  const d = unitAtLabel(s, 'A1');
  expect(d).toMatchObject({ hp: 2, maxHp: 6, charges: { '0,0': 3 } });
  expect(unitAtLabel(s, 'B1')).toMatchObject({ hp: 8, spells: [], charges: {} });
});

test('hp overrides by label', () => {
  const s = board('D r d', { hp: { B1: 1, A1: 3, C1: 20 } });
  expect(unitAtLabel(s, 'A1')).toMatchObject({ hp: 3, maxHp: 6 });
  expect(unitAtLabel(s, 'B1').hp).toBe(1);
  expect(unitAtLabel(s, 'C1')).toMatchObject({ hp: 20, maxHp: 20 });
  expect(() => board('D r', { hp: { C1: 1 } })).toThrow(/C1/);
});

test('explicit intents emit telegraph lines', () => {
  const { state, events } = createBattle({
    title: 'Sentry post',
    seed: 7,
    board: 'b . . D\nr . . f',
    intents: { A1: 'right', D2: 'left' },
  });
  expectLog(events, [
    'Encounter: Sentry post',
    'Round 1',
    'Enemies move',
    'sentry at A1 will fire right',
    'rat at A2 waits',
    'familiar at D2 will spit left',
    'Your turn',
  ]);
  expect(unitAtLabel(state, 'A1')).toMatchObject({
    intent: { attack: 'line', dir: 'right', order: 1 },
  });
  expect(unitAtLabel(state, 'D2')).toMatchObject({ intent: { order: 2 } });
  expect(unitAtLabel(state, 'A2')).toMatchObject({ intent: null });
  expect(state.rngState).toBe(7);
  expect(() => board('D d', { intents: { B1: 'left' } })).toThrow(/no attack/);
  expect(() => board('D r', { intents: { A1: 'left' } })).toThrow(/not an enemy/);
});

test('applyAction never mutates its input', () => {
  const s = board(`
    S r o o i .
    D . . . . d
  `);
  const snapshot = structuredClone(s);
  const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'right' });
  const moved = act(shoved.state, { type: 'move', unit: 'draughtsman', to: { x: 2, y: 1 } });
  expect(s).toEqual(snapshot);
  expect(shoved.state).not.toBe(s);
  expect(unitAtLabel(moved.state, 'C2').id).toBe('draughtsman');
  expect(unitAtLabel(s, 'A2').id).toBe('draughtsman');
});

test('illegal action throws with reason', () => {
  const open = board('D . . d');
  const moved = act(open, { type: 'move', unit: 'draughtsman', to: { x: 1, y: 0 } });
  const again = { type: 'move', unit: 'draughtsman', to: { x: 2, y: 0 } } as const;
  expect(() => act(moved.state, again)).toThrow(IllegalActionError);
  expect(() => act(moved.state, again)).toThrow('Draughtsman has already moved');

  const s = board('D r . d');
  expect(isLegal(s, { type: 'move', unit: 'draughtsman', to: { x: 1, y: 0 } })).toMatch(
    /can't reach B1/,
  );
  expect(isLegal(s, { type: 'move', unit: 'rat-1', to: { x: 2, y: 0 } })).toBe(
    'rat is not a party member',
  );
  expect(isLegal(s, { type: 'shove', unit: 'ghost', dir: 'up' })).toBe('No unit ghost');
  expect(isLegal(s, { type: 'shove', unit: 'draughtsman', dir: 'left' })).toBe(
    'Nothing to shove left',
  );
  expect(isLegal(s, { type: 'undoMove', unit: 'draughtsman' })).toBe(
    'Draughtsman has no move to undo',
  );
  const aim = { kind: 'dir', dir: 'right' } as const;
  expect(isLegal(s, { type: 'cast', unit: 'draughtsman', spell: '0,0', aim })).toBe(
    'Draughtsman has no spell at 0,0',
  );
  expect(isLegal(s, { type: 'endTurn' })).toBeNull();
});

test('cast legality: charges, aim and lab', () => {
  const party = { draughtsman: { spells: [bolt], charges: { '0,0': 0 } } };
  const cast = { type: 'cast', unit: 'draughtsman', spell: '0,0' } as const;
  const right = { kind: 'dir', dir: 'right' } as const;
  expect(isLegal(board('D d', { party }), { ...cast, aim: right })).toBe('No charges left');
  expect(isLegal(board('D d', { party, lab: true }), { ...cast, aim: right })).toBeNull();
  const charged = board('D d', { party: { draughtsman: { spells: [bolt] } } });
  expect(isLegal(charged, { ...cast, aim: right })).toBeNull();
  expect(isLegal(charged, { ...cast, aim: { kind: 'dir', dir: 'left' } })).toBe('Not a legal aim');
  expect(isLegal(charged, { ...cast, aim: { kind: 'tile', at: { x: 1, y: 0 } } })).toBe(
    'Not a legal aim',
  );
});

test('a downed member and a finished battle refuse actions', () => {
  const s = board('S r', { hp: { B1: 1 } });
  const won = act(s, { type: 'shove', unit: 'stoker', dir: 'right' });
  expect(won.lines.slice(-2)).toEqual(['rat at B1 dies', 'The party wins']);
  expect(won.state.phase).toBe('won');
  expect(isLegal(won.state, { type: 'endTurn' })).toBe('The battle is over');

  const down = board('D S d', { hp: { A1: 1 } });
  const bumped = act(down, { type: 'shove', unit: 'stoker', dir: 'left' });
  expect(bumped.lines).toContain('Draughtsman is down');
  expect(bumped.state.phase).toBe('player');
  expect(isLegal(bumped.state, { type: 'move', unit: 'draughtsman', to: { x: 0, y: 0 } })).toBe(
    'Draughtsman is down',
  );
});

test('discovered accumulates interactions, deduplicated', () => {
  const s = board('S r o o . . . d');
  const first = act(s, { type: 'shove', unit: 'stoker', dir: 'right' });
  expect(first.state.discovered).toEqual(['slide']);
  expect(s.discovered).toEqual([]);
});

test('boardOf round-trips the board', () => {
  const ascii = `
    D  r!o *   @~ .
    b  r&  i   =  S
    d& .   ~o  .  f
  `;
  const s = board(ascii);
  expect(boardOf(s)).toBe(serializeBoard(parseBoard(ascii)));
  expect(boardOf(board(boardOf(s)))).toBe(boardOf(s));
  const shoved = act(s, { type: 'shove', unit: 'stoker', dir: 'down' });
  expect(shoved.lines).toContain('familiar at E3 dies');
  expect(boardOf(shoved.state).split('\n')[2]?.split(/\s+/)).toEqual(['d&', '.', 'o~', '.', '.']);
});

test('replay returns every intermediate state and the whole log', () => {
  const spec = { title: 'replay', seed: 3, board: 'S r o o . .\nD . . . . d' };
  const actions = [
    { type: 'move', unit: 'draughtsman', to: { x: 1, y: 1 } },
    { type: 'shove', unit: 'stoker', dir: 'right' },
  ] as const;
  const { states, events } = replay(spec, actions);
  expect(states).toHaveLength(3);
  const created = createBattle(spec);
  expect(states[0]).toEqual(created.state);
  const step1 = act(created.state, actions[0]);
  const step2 = act(step1.state, actions[1]);
  expect(states[2]).toEqual(step2.state);
  expect(events).toEqual([...created.events, ...step1.events, ...step2.events]);
});

test('createEncounterBattle builds the first encounter', () => {
  const enc = ENCOUNTERS[0];
  if (!enc) throw new Error('no encounter');
  const { state, events } = createEncounterBattle(enc, { stoker: { hp: 5 } }, 42);
  expect(events[0]).toEqual({ type: 'battleStart', title: enc.title });
  expect(state.units.filter((u) => u.kind === 'enemy')).toHaveLength(3);
  expect(state.units.find((u) => u.id === 'stoker')?.hp).toBe(5);
  expect([state.width, state.height]).toEqual([6, 8]);
});

test('labSetCell replaces tile and unit, keeping member spells', () => {
  const s = board('D r . d', { party: { draughtsman: { spells: [bolt] } } });
  const withRat = labSetCell(s, { x: 2, y: 0 }, 'r~');
  expect(unitAtLabel(withRat, 'C1').id).toBe('rat-2');
  expect(withRat.tiles[2]?.steam).toBe(2);
  expect(s.units).toHaveLength(3);

  const movedD = labSetCell(withRat, { x: 1, y: 0 }, 'D!');
  expect(movedD.units.map((u) => u.id)).toEqual(['dummy-1', 'rat-2', 'draughtsman']);
  expect(unitAtLabel(movedD, 'B1')).toMatchObject({ inked: true, charges: { '0,0': 3 } });
  expect(boardOf(movedD)).toBe('. D! r~ d');

  expect(boardOf(labSetCell(movedD, { x: 2, y: 0 }, '.'))).toBe('. D! . d');
  expect(() => labSetCell(s, { x: 9, y: 0 }, 'r')).toThrow(/off the board/);
});
