import { describe, expect, test, vi } from 'vitest';
import type { TermDef } from '$data/districts/inkQuarter/types';
import {
  type Action,
  applyAction,
  type BattleState,
  beginEncounter,
  closeBattle,
  type GameEvent,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  pickLoot,
  pushOn,
  startTrip,
  type Trip,
} from '$engine';
import { checkStakeDefs, stakeMember } from '$engine/districts/inkQuarter/stakes';
import { roomSetupFor } from '$engine/trip';

/**
 * IQ-4: term stakes through a whole trip. As in terms-trip.test.ts the quarter's data is mocked
 * (four plain rooms and a heart); `TERMS` holds one fixture term per test, so every stake kind is
 * covered whether or not the real list carries it.
 */

const TERMS = vi.hoisted((): TermDef[] => []);

vi.mock('$data/districts/inkQuarter/terms', () => ({ INK_TERMS: TERMS }));

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const board = (rows: readonly string[]): string => rows.join('\n');
  const ROOM = board(['P . . . . .', '. . . . . .', '. . . . . r', 'P . . . . .']);
  const HEART = board(['P . . . . .', '. . . . d .', 'P . . . . .']);
  const room = (i: number, heart = false) => ({
    id: `iq-${i}`,
    title: `Room ${i}`,
    depth: i + 1,
    layout: heart ? HEART : ROOM,
    variants: [{ name: `Room ${i}`, layout: heart ? HEART : ROOM }],
    loot: heart ? ('heart' as const) : ('shallow' as const),
    picks: heart ? 2 : 1,
    heart,
  });
  const rooms = [room(0), room(1), room(2), room(3), room(4, true)];
  const DISTRICTS = { ...m.DISTRICTS, inkQuarter: { ...m.DISTRICTS.inkQuarter, rooms } };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

// ── Helpers ─────────────────────────────────────────────
const profile = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: {
      ...p.city,
      heard: [...p.city.heard, 'inkQuarter'],
      open: [...p.city.open, 'inkQuarter'],
    },
  };
};

interface Fight {
  trip: Trip;
  state: BattleState;
  log: GameEvent[];
}

const endTurn: Action = { type: 'endTurn' };

function fight(p: Profile, t: Trip, turns: number): Fight {
  const start = beginEncounter(p, t);
  let state = start.state;
  const log = [...start.events];
  let trip = t;
  for (let i = 0; i < turns; i++) {
    const r = applyAction(state, endTurn);
    state = r.state;
    log.push(...r.events);
    trip = { ...trip, actions: [...trip.actions, endTurn] };
  }
  return { trip, state, log };
}

/** Ends the fight won (every foe down), then closes it. */
function win(p: Profile, f: Fight) {
  const s = structuredClone(f.state);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  const r = closeBattle(p, f.trip, s, f.log);
  if (!r.trip) throw new Error('expected the trip to go on');
  return { profile: r.profile, trip: r.trip };
}

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const def = (id: string, stake: TermDef['stake']): TermDef => ({
  id: `inkQuarter:${id}`,
  reward: { kind: 'extraPick' },
  stake,
  condition: { kind: 'withinRounds', rounds: 2 },
  rooms: [0],
  text: { reward: 'a second page', condition: 'clear it fast', penalty: id },
});

/** A trip that signed `stake` in room 0 and stands at room 1's crossroads (the extra pick spent). */
function signedWith(stake: TermDef['stake'], seed = 31) {
  TERMS.length = 0;
  TERMS.push(def('stake', stake));
  const p = profile();
  const won = win(p, fight(p, startTrip(p, seed, 'inkQuarter'), 1));
  const taken = pickLoot(pickLoot(won.trip, won.trip.offers.length - 1), 0);
  return { p: won.profile, atCross: taken, room1: pushOn(taken) };
}

const members = (s: BattleState) => s.units.filter((u) => u.kind === 'member');
const foes = (s: BattleState) => s.units.filter((u) => u.kind === 'enemy');
const baseline = () => {
  const { p, room1 } = signedWith({ kind: 'reward' });
  return beginEncounter(p, room1).state;
};

// ── Next-room handicaps ─────────────────────────────────
describe('next-room handicaps (P6)', () => {
  test('a mark lands on one apprentice drawn from the trip seed', () => {
    const { p, room1 } = signedWith({ kind: 'nextRoom', cost: { kind: 'mark' } });
    const s = beginEncounter(p, room1).state;
    const marked = members(s).filter((u) => u.mark);
    expect(marked.map((u) => u.id)).toEqual([stakeMember(room1, 1)]);
    expect(marked[0]?.mark).toMatchObject({ deep: false, bound: null });
    expect(beginEncounter(p, room1).state).toEqual(s);
    expect(members(baseline()).some((u) => u.mark)).toBe(false);
  });

  test('the draw is stable per trip and always a party member', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const { room1 } = signedWith({ kind: 'nextRoom', cost: { kind: 'mark' } }, seed);
      expect(room1.party).toContain(stakeMember(room1, 1));
      expect(stakeMember(room1, 1)).toBe(stakeMember(room1, 1));
    }
  });

  test('an extra dead letter joins the room, away from the apprentices', () => {
    const { p, room1 } = signedWith({
      kind: 'nextRoom',
      cost: { kind: 'extraFoe', foe: 'deadLetter' },
    });
    const s = beginEncounter(p, room1).state;
    const extra = foes(s).filter((u) => u.def === 'deadLetter');
    expect(foes(s)).toHaveLength(foes(baseline()).length + 1);
    expect(extra).toHaveLength(1);
    const e = extra[0]?.pos ?? { x: 0, y: 0 };
    for (const m of members(s))
      expect(Math.abs(m.pos.x - e.x) + Math.abs(m.pos.y - e.y)).toBeGreaterThan(1);
  });

  test("a wax seal sits on one apprentice's start tile and holds them", () => {
    const { p, room1 } = signedWith({ kind: 'nextRoom', cost: { kind: 'seal' } });
    const s = beginEncounter(p, room1).state;
    const who = members(s).find((u) => u.id === stakeMember(room1, 1));
    expect(s.tiles.filter((t) => t.piece?.id === 'inkQuarter:wax')).toHaveLength(1);
    expect(who?.held).toBe(2);
    const at = who?.pos ?? { x: 0, y: 0 };
    expect(s.tiles[at.y * s.width + at.x]?.piece?.id).toBe('inkQuarter:wax');
    expect(members(s).filter((u) => u.held > 0)).toHaveLength(1);
  });

  test('a pending handicap survives a save and reload', () => {
    const { p, atCross, room1 } = signedWith({ kind: 'nextRoom', cost: { kind: 'mark' } });
    const save = { ...newSave(1), profile: p, trip: atCross };
    const loaded = parseSaveData(json(save)).trip as Trip;
    expect(loaded).toEqual(atCross);
    const later = pushOn(loaded);
    expect(roomSetupFor(later)).toEqual(roomSetupFor(room1));
    expect(roomSetupFor(later).activate).toEqual(['inkQuarter:stakes']);
    expect(beginEncounter(p, later).state).toEqual(beginEncounter(p, room1).state);
    // Mid-room: the fight replays under the same handicap.
    const mid = fight(p, room1, 1);
    const reloaded = parseSaveData(json({ ...save, trip: mid.trip })).trip as Trip;
    expect(beginEncounter(p, reloaded).state).toEqual(mid.state);
  });

  test('the handicap is due once: the room after starts clean', () => {
    const { p, room1 } = signedWith({ kind: 'nextRoom', cost: { kind: 'mark' } });
    const next = win(p, fight(p, room1, 1));
    expect(roomSetupFor(pushOn(pickLoot(next.trip, 0)))).toEqual({});
  });
});

// ── Resource penalties ──────────────────────────────────
describe('resource penalties (P6)', () => {
  /** Wins room 1 in `turns` turns (1: paid, 3: broken), then starts room 2. */
  function room2(stake: TermDef['stake'], turns: number, tweak?: (t: Trip) => Trip) {
    const { p, room1 } = signedWith(stake);
    const t = win(p, fight(p, tweak ? tweak(room1) : room1, turns));
    const next = pushOn(pickLoot(t.trip, 0));
    return { before: t.trip, after: beginEncounter(t.profile, next).state, next };
  }
  const hpOf = (r: ReturnType<typeof room2>, id: string) => r.next.hp[id as keyof Trip['hp']] ?? 0;
  const HP1: TermDef['stake'] = { kind: 'resources', loss: { kind: 'hp', amount: 1 } };

  test('hp: a broken term takes HP from each apprentice, a paid one nothing', () => {
    const broke = room2(HP1, 3);
    const paid = room2(HP1, 1);
    for (const m of members(paid.after)) expect(m.hp).toBe(hpOf(paid, m.id));
    for (const m of members(broke.after)) expect(m.hp).toBe(Math.max(1, hpOf(broke, m.id) - 1));
    expect(members(broke.after).some((m) => m.hp < hpOf(broke, m.id))).toBe(true);
  });

  test('hp: never lethal, whatever the loss', () => {
    const r = room2({ kind: 'resources', loss: { kind: 'hp', amount: 99 } }, 3);
    for (const m of members(r.after)) expect(m.hp).toBe(1);
  });

  test('charge: a broken term takes one charge from each apprentice, a paid one none', () => {
    const stake: TermDef['stake'] = { kind: 'resources', loss: { kind: 'charge', amount: 1 } };
    const total = (s: BattleState) =>
      members(s).map((m) =>
        m.kind === 'member' ? Object.values(m.charges).reduce((a, b) => a + b, 0) : 0,
      );
    const paid = total(room2(stake, 1).after);
    const broke = total(room2(stake, 3).after);
    expect(paid.map((n, i) => n - (broke[i] ?? 0))).toEqual(paid.map(() => 1));
  });

  test('ink: a broken term takes ink from the trip, never below none', () => {
    const stake: TermDef['stake'] = { kind: 'resources', loss: { kind: 'ink', amount: 2 } };
    const give =
      (n: number) =>
      (t: Trip): Trip => ({
        ...t,
        loot: [...t.loot, { kind: 'ink', amount: n }],
      });
    const inkOf = (t: Trip) => t.loot.reduce((a, i) => a + (i.kind === 'ink' ? i.amount : 0), 0);
    expect(inkOf(room2(stake, 3, give(3)).before)).toBe(1);
    expect(inkOf(room2(stake, 3, give(1)).before)).toBe(0);
    expect(inkOf(room2(stake, 3).before)).toBe(0);
    expect(inkOf(room2(stake, 1, give(3)).before)).toBe(3);
  });

  test('reward (regression): a broken term still takes its held page back', () => {
    TERMS.length = 0;
    TERMS.push({
      ...def('page', { kind: 'reward' }),
      reward: { kind: 'page', spec: { kind: 'solvent', solvent: 'wax' } },
    });
    const p = profile();
    const won = win(p, fight(p, startTrip(p, 31, 'inkQuarter'), 1));
    const signed = pickLoot(won.trip, won.trip.offers.length - 1);
    expect(signed.loot.some((i) => i.kind === 'inkQuarter:termed')).toBe(true);
    const lost = win(won.profile, fight(won.profile, pushOn(signed), 3));
    expect(lost.trip.loot.some((i) => i.kind === 'inkQuarter:termed')).toBe(false);
  });
});

// ── The difficulty band ─────────────────────────────────
describe('the difficulty band (P6)', () => {
  test("the quarter's own terms pass the guard", async () => {
    const real = await vi.importActual<typeof import('$data/districts/inkQuarter/terms')>(
      '$data/districts/inkQuarter/terms',
    );
    expect(checkStakeDefs(real.INK_TERMS)).toEqual([]);
  });

  test('a stake beyond the band is named; one within it is not', () => {
    const bad = [
      def('hp', { kind: 'resources', loss: { kind: 'hp', amount: 3 } }),
      def('charge', { kind: 'resources', loss: { kind: 'charge', amount: 2 } }),
      def('ink', { kind: 'resources', loss: { kind: 'ink', amount: 4 } }),
      def('boss', { kind: 'nextRoom', cost: { kind: 'extraFoe', foe: 'postmaster' } }),
    ];
    expect(checkStakeDefs(bad)).toHaveLength(4);
    const ok = [
      def('a', { kind: 'resources', loss: { kind: 'hp', amount: 2 } }),
      def('b', { kind: 'nextRoom', cost: { kind: 'seal' } }),
      def('c', { kind: 'nextRoom', cost: { kind: 'extraFoe', foe: 'sealer' } }),
    ];
    expect(checkStakeDefs(ok)).toEqual([]);
  });
});
