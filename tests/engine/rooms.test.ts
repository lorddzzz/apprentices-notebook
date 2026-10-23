import { describe, expect, test } from 'vitest';
import type { ApprenticeId } from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  createBattle,
  deriveSeed,
  inBoard,
  isLegal,
  label,
  legalAims,
  members,
  parseBoard,
  scenarioSpec,
  serializeBoard,
} from '$engine';
import { checkRoom, placeParty, START_SALT, startSeedFor } from '$engine/rooms';
import type { Trip } from '$engine/types';

/** HC-2: start points (`P`), the room format check and the seeded party placement (HC P3–P5). */

const ROOM_5x6 = `
  P  .  .  r  .
  .  .  ~  .  .
  P  .  .  .  P
  .  =  .  .  .
  .  .  .  .  .
  P  .  P~ .  r
`;
const ROOM_7x9 = `
  .  .  .  r  .  .  .
  .  .  .  .  .  .  .
  .  .  .  .  .  .  .
  .  .  =  .  .  .  .
  P  .  .  .  .  .  P
  .  .  .  .  .  .  .
  .  .  .  Pw> .  .  .
  .  .  .  .  .  .  .
  P  .  .  .  .  r  P
`;
const spots = (b: ReturnType<typeof parseBoard>) =>
  b.units.filter((u) => u.kind === 'member').map((u) => `${u.def}@${label(u.at)}`);

describe('notation: start points', () => {
  test('parseBoard collects P in reading order, with a state or water', () => {
    const b = parseBoard(ROOM_7x9);
    expect(b.starts.map(label)).toEqual(['A5', 'G5', 'D7', 'A9', 'G9']);
    expect(b.tiles[6 * 7 + 3]?.terrain.water).toBe('right');
    expect(parseBoard('P~ .').tiles[0]?.state?.id).toBe('cloud');
    expect(parseBoard('D S').starts).toEqual([]);
  });

  test('parse and serialize round-trip', () => {
    const text = serializeBoard(parseBoard(ROOM_5x6));
    expect(text.split('\n')[0]).toBe('P . .  r .');
    expect(text).toContain('P~');
    expect(serializeBoard(parseBoard(text))).toBe(text);
    expect(parseBoard(text)).toEqual(parseBoard(ROOM_5x6));
    expect(serializeBoard(parseBoard('Pw> . P'))).toBe('Pw> . P');
  });

  test('P refuses a unit, plate, gate, grate or a second P, naming the cell', () => {
    expect(() => parseBoard('. rP')).toThrow(/B1/);
    expect(() => parseBoard('. P=')).toThrow(/start point.*plate.*B1/);
    expect(() => parseBoard('Pg')).toThrow(/A1/);
    expect(() => parseBoard('Pw>h')).toThrow(/grate/);
    expect(() => parseBoard('PP')).toThrow(/one start point/);
  });
});

describe('checkRoom', () => {
  test('a 5x6 and a 7x9 room pass', () => {
    expect(checkRoom(ROOM_5x6)).toEqual([]);
    expect(checkRoom(ROOM_7x9)).toEqual([]);
  });

  test('size, start count and apprentice tokens are refused; tokens name the cell', () => {
    const small = checkRoom('P P P P');
    expect(small.map((p) => p.message).join(' ')).toMatch(/1 tall/);
    expect(small.some((p) => /4 wide/.test(p.message))).toBe(true);
    const wide = checkRoom(Array(6).fill('P P P P . . . .').join('\n'));
    expect(wide.map((p) => p.message)).toEqual(['Room is 8 wide, want 5–7']);
    const tall = checkRoom(Array(10).fill('P . . . .').join('\n'));
    expect(tall.map((p) => p.message)).toEqual(['Room is 10 tall, want 6–9']);
    const few = checkRoom(ROOM_5x6.replace('P~', '~ ').replace(/P {2}\./, '.  .'));
    expect(few.map((p) => p.message)).toEqual(['Room has 3 start points, want at least 4']);
    const fixed = checkRoom(ROOM_5x6.replace('.  .  ~', '.  D  ~'));
    expect(fixed).toEqual([
      {
        cell: { x: 1, y: 1 },
        message: 'Apprentice token "D" in cell B2: rooms use start points (P)',
      },
    ]);
  });

  test('a P on a tile no one can stand on names the cell', () => {
    const plated = checkRoom(ROOM_5x6.replace('.  =  .', 'P  P=  .'));
    expect(plated).toHaveLength(1);
    expect(plated[0]?.cell).toEqual({ x: 1, y: 3 });
    expect(plated[0]?.message).toMatch(/B4/);
  });
});

describe('placeParty', () => {
  const room = parseBoard(ROOM_7x9);
  // Only the pair is in the registry until RC; placement never reads the registry.
  const trio = ['draughtsman', 'stoker', 'recruit' as ApprenticeId] as const;

  test('same board, lineup and seed: same spots', () => {
    expect(spots(placeParty(room, trio, 42))).toEqual(spots(placeParty(room, trio, 42)));
    const draws = new Set(
      Array.from({ length: 20 }, (_, i) => spots(placeParty(room, trio, i)).join()),
    );
    expect(draws.size).toBeGreaterThan(5);
  });

  test('1, 2 and 3 apprentices take distinct start points, in slot order', () => {
    for (let n = 1; n <= 3; n++) {
      for (let seed = 0; seed < 50; seed++) {
        const placed = placeParty(room, trio.slice(0, n), seed);
        const at = placed.units.filter((u) => u.kind === 'member').map((u) => label(u.at));
        expect(new Set(at).size).toBe(n);
        for (const c of at) expect(room.starts.map(label)).toContain(c);
      }
    }
    // A smaller party takes a prefix of the same shuffle.
    const three = placeParty(room, trio, 7).units.filter((u) => u.kind === 'member');
    const one = placeParty(room, trio.slice(0, 1), 7).units.filter((u) => u.kind === 'member');
    expect(one[0]?.at).toEqual(three.find((u) => u.def === 'draughtsman')?.at);
  });

  test('keeps units in reading order and the board untouched', () => {
    const before = structuredClone(room);
    const placed = placeParty(room, ['stoker'], 3);
    expect(room).toEqual(before);
    const order = placed.units.map((u) => u.at.y * 7 + u.at.x);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test('refuses an empty, doubled or oversized party, fixed tokens and too few points', () => {
    expect(() => placeParty(room, [], 1)).toThrow(/1–3/);
    expect(() => placeParty(room, ['stoker', 'stoker'], 1)).toThrow(/twice/);
    expect(() => placeParty(room, [...trio, 'x' as ApprenticeId], 1)).toThrow(/1–3/);
    expect(() => placeParty(parseBoard('D P P'), ['stoker'], 1)).toThrow(/A1/);
    expect(() => placeParty(parseBoard('P r'), ['stoker', 'draughtsman'], 1)).toThrow(/1/);
  });

  test('startSeedFor derives from the trip seed and the room, salted apart', () => {
    const trip = { seed: 99 } as Trip;
    expect(startSeedFor(trip, 2)).toBe(deriveSeed(99, START_SALT + 2));
    expect(startSeedFor(trip, 2)).toBe(startSeedFor({ ...trip }, 2));
    expect(startSeedFor(trip, 2)).not.toBe(startSeedFor(trip, 3));
    expect(startSeedFor(trip, 2)).not.toBe(deriveSeed(99, 2)); // the variant draw's seed
  });
});

/** Every member casts its first legal aim, then ends the turn, until the battle ends. */
function playOut(start: BattleState): BattleState {
  let s = start;
  for (let turn = 0; turn < 40 && s.phase === 'player'; turn++) {
    for (const m of members(s)) {
      const spell = m.spells[0];
      if (!spell || m.hp <= 0) continue;
      const aim = legalAims(s, m.id, spell.key)[0];
      if (!aim) continue;
      const action: Action = { type: 'cast', unit: m.id, spell: spell.key, aim };
      if (isLegal(s, action) !== null || s.phase !== 'player') continue;
      s = applyAction(s, action).state;
    }
    if (s.phase === 'player') s = applyAction(s, { type: 'endTurn' }).state;
    for (const u of s.units) expect(inBoard(s, u.pos), `${u.id} at ${label(u.pos)}`).toBe(true);
  }
  return s;
}

describe('battles on free board sizes', () => {
  const battle = (board: string, lineup: ApprenticeId[], startSeed?: number) => {
    const spec = scenarioSpec(
      { board, lattices: { draughtsman: 'Bolt>', stoker: 'Bolt>' } },
      { lab: true },
    );
    return createBattle({ ...spec, lineup, ...(startSeed === undefined ? {} : { startSeed }) })
      .state;
  };

  test('a 5x6 room with one apprentice runs to the end', () => {
    const s = battle(ROOM_5x6, ['stoker']);
    expect(s).toMatchObject({ width: 5, height: 6 });
    expect(members(s).map((m) => m.id)).toEqual(['stoker']);
    expect(parseBoard(ROOM_5x6).starts).toContainEqual(members(s)[0]?.pos);
    expect(playOut(s).phase).not.toBe('player');
  });

  test('a 7x9 room with the pair runs to the end', () => {
    const s = battle(ROOM_7x9, ['draughtsman', 'stoker'], 5);
    expect(s).toMatchObject({ width: 7, height: 9 });
    expect(members(s)).toHaveLength(2);
    expect(playOut(s).phase).not.toBe('player');
  });

  test('the start seed picks the spots; the default derives from the battle seed', () => {
    const at = (s: BattleState) => members(s).map((m) => label(m.pos));
    expect(at(battle(ROOM_7x9, ['stoker'], 11))).toEqual(at(battle(ROOM_7x9, ['stoker'], 11)));
    const spec = { title: 't', board: ROOM_7x9, seed: 4, lineup: ['stoker' as const] };
    const placed = placeParty(parseBoard(ROOM_7x9), ['stoker'], deriveSeed(4, START_SALT));
    expect(at(createBattle(spec).state)).toEqual(spots(placed).map((x) => x.split('@')[1]));
  });

  test('a board with fixed tokens and no lineup is unchanged', () => {
    const s = createBattle({ title: 't', board: 'D . P\nS r .', seed: 1 }).state;
    expect(members(s).map((m) => `${m.id}@${label(m.pos)}`)).toEqual([
      'draughtsman@A1',
      'stoker@A2',
    ]);
  });
});
