import { describe, expect, test, vi } from 'vitest';
import { type ApprenticeId, encountersOf, RUNE_IDS, START_KNOWN, TUNING } from '$data';
import {
  applyAction,
  applyDoorway,
  type BattleState,
  beginEncounter,
  closeBattle,
  createBattle,
  finishEncounter,
  isLegal,
  joinHousehold,
  memberById,
  newProfile,
  type Profile,
  parseBoard,
  parseSaveData,
  pickLoot,
  pushOn,
  returnHome,
  type SlotIndex,
  setSlot,
  startTrip,
  type Trip,
} from '$engine';
import { nearestMember } from '$engine/ai';
import { startSeedFor } from '$engine/rooms';

// A test-only third apprentice (RECRUITS is empty until RC): the Draughtsman's starter page, a
// frailer body and Pull instead of Shove, so the P14 shove gate has someone to refuse.
vi.mock('../../src/data/recruits', async (orig) => {
  const real = await orig<typeof import('../../src/data/recruits')>();
  return {
    ...real,
    RECRUITS: {
      tester: {
        id: 'tester',
        name: 'Tester',
        token: 'Q',
        look: { hue: 'amber', shape: 'triangle' },
        hp: 5,
        move: 3,
        action: 'pull',
        lean: { trained: 'timing', gifted: 'contracts' },
        habit: null,
        starterPage: ['.     .   .      . .', 'Bolt> Ink Strike . .', 'x     .   .      . x'].join(
          '\n',
        ),
        blurb: 'Only here for the tests.',
        found: { door: 'A' },
        beat: [],
        runes: { all: [] },
      },
    },
  };
});

const TESTER = 'tester' as ApprenticeId;
const SEED = 4242;

/** A notebook whose slots hold exactly `who` (joining anyone missing). */
function withParty(who: readonly ApprenticeId[], base: Profile = newProfile()): Profile {
  let p = base;
  for (const id of who) p = joinHousehold(p, id);
  for (const slot of [0, 1, 2] as SlotIndex[]) p = setSlot(p, slot, null);
  who.forEach((id, i) => {
    p = setSlot(p, i as SlotIndex, id);
  });
  return p;
}

const PARTIES: ApprenticeId[][] = [
  ['stoker'],
  ['draughtsman', 'stoker'],
  ['stoker', TESTER, 'draughtsman'],
];

const won = (b: BattleState): BattleState => {
  const s = structuredClone(b);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return s;
};

const members = (b: BattleState) => b.units.filter((u) => u.kind === 'member');
const foes = (b: BattleState) =>
  b.units.filter((u) => u.kind === 'enemy').map((u) => `${u.id}@${u.pos.x},${u.pos.y}:${u.hp}`);

/** A JSON round trip through the save boundary, as a reload does. */
const reload = (p: Profile, t: Trip) =>
  parseSaveData(
    JSON.parse(JSON.stringify({ profile: p, trip: t, seedCounter: 1, lastTrip: null })),
  );

describe('a trip sets out with the slots (HC-4)', () => {
  test.each(PARTIES)('party %#: fixed at start, hp and charges keyed by it', (...who) => {
    const t = startTrip(withParty(who), SEED);
    expect(t.party).toEqual(who);
    expect(Object.keys(t.hp).sort()).toEqual([...who].sort());
    expect(Object.keys(t.charges).sort()).toEqual([...who].sort());
    if (who.includes(TESTER)) expect(t.hp[TESTER]).toBe(5);
  });

  test('nobody slotted: no trip', () => {
    expect(() => startTrip(withParty([]), SEED)).toThrow(/Nobody is in a trip slot/);
  });

  test('only the party pages are checked: a broken page on the bench does not block', () => {
    // A rune the household does not know on the tester's page.
    const unknown = RUNE_IDS.find((r) => !START_KNOWN.includes(r));
    if (!unknown) throw new Error('every rune is known');
    const p0 = joinHousehold(newProfile(), TESTER);
    const page = [...(p0.lattices[TESTER] ?? []), { at: { x: 1, y: 0 }, rune: unknown }];
    const p = { ...p0, lattices: { ...p0.lattices, [TESTER]: page } };
    expect(() => startTrip(withParty(['draughtsman', 'stoker'], p), SEED)).not.toThrow();
    expect(() => startTrip(withParty(['draughtsman', TESTER], p), SEED)).toThrow(/not ready/);
  });

  test('the party stands on drawn start points, the same ones on every replay', () => {
    for (const who of PARTIES) {
      const p = withParty(who);
      const t = startTrip(p, SEED);
      const b = beginEncounter(p, t).state;
      expect(
        members(b)
          .map((m) => m.def)
          .sort(),
      ).toEqual([...who].sort());
      const enc = encountersOf(t.district)[0];
      const layout = enc?.variants.find((v) => v.name === b.title)?.layout ?? '';
      const starts = parseBoard(layout).starts.map((c) => `${c.x},${c.y}`);
      for (const m of members(b)) expect(starts).toContain(`${m.pos.x},${m.pos.y}`);
      expect(beginEncounter(p, t).state).toEqual(b);
      // A reload replays the same fight: same spots, same recorded moves.
      const again = reload(p, t);
      expect(again.trip?.party).toEqual(who);
      expect(beginEncounter(again.profile, again.trip as Trip).state).toEqual(b);
    }
    expect(startSeedFor({ seed: SEED } as Trip, 0)).not.toBe(
      startSeedFor({ seed: SEED } as Trip, 1),
    );
  });

  test('a recorded fight replays after a reload, mid-fight', () => {
    const p = withParty(['stoker', TESTER, 'draughtsman']);
    const t0 = startTrip(p, SEED);
    const b = beginEncounter(p, t0).state;
    const a = { type: 'endTurn' } as const;
    const after = applyAction(b, a).state;
    const t = { ...t0, actions: [a] };
    const saved = reload(p, t);
    expect(beginEncounter(saved.profile, saved.trip as Trip).state).toEqual(after);
  });
});

describe('no scaling (party.md §0b)', () => {
  test('same seed: same foes and the same offers, whatever the party size', () => {
    const rooms = PARTIES.map((who) => {
      const p = withParty(who);
      const t = startTrip(p, SEED);
      const b = beginEncounter(p, t).state;
      const r = finishEncounter(p, t, won(b));
      return { title: b.title, foes: foes(b), offers: r.trip?.offers, picks: r.trip?.picksLeft };
    });
    // The foes' turn-1 moves read the party's spots, so compare the board as the room lays it.
    const p = withParty(['stoker']);
    const t = startTrip(p, SEED);
    const enc = encountersOf(t.district)[0];
    const layout = enc?.variants.find((v) => v.name === rooms[0]?.title)?.layout ?? '';
    const laid = parseBoard(layout).units.filter((u) => u.kind === 'enemy').length;
    for (const r of rooms) {
      expect(r.title).toBe(rooms[0]?.title);
      expect(r.foes).toHaveLength(laid);
      expect(r.offers).toEqual(rooms[0]?.offers);
      expect(r.picks).toBe(rooms[0]?.picks);
    }
  });
});

describe('win, wipe and bank with 1, 2 and 3 apprentices', () => {
  test.each(PARTIES)('party %#: clears the district and banks the loot', (...who) => {
    let p = withParty(who);
    let t: Trip = startTrip(p, SEED);
    for (let guard = 0; guard < 10 && t.status !== 'cleared'; guard++) {
      const b = beginEncounter(p, t).state;
      const end = won(b);
      // Someone went down in the fight: they come back at the revive HP.
      const down = memberById(end, who[0] as ApprenticeId);
      down.hp = 0;
      const r = closeBattle(p, t, end);
      expect(r.outcome).toBe('won');
      p = r.profile;
      t = r.trip as Trip;
      expect(t.party).toEqual(who);
      expect(t.hp[who[0] as ApprenticeId]).toBe(TUNING.reviveHp);
      while (t.status === 'looting') t = pickLoot(t, 0);
      if (t.status === 'doorway') t = applyDoorway(p, t, p.lattices).trip;
      while (t.status === 'looting') t = pickLoot(t, 0);
      if (t.status === 'crossroads') t = pushOn(t);
    }
    expect(t.status).toBe('cleared');
    const banked = returnHome(p, t);
    const runes = t.loot.flatMap((i) => (i.kind === 'rune' ? [i.rune] : []));
    for (const r of runes) expect(banked.known).toContain(r);
  });

  test.each(PARTIES)('party %#: all of the party down is a wipe', (...who) => {
    const p = withParty(who);
    const t = startTrip(p, SEED);
    let s = beginEncounter(p, t).state;
    for (let n = 0; n < 60 && s.phase === 'player'; n++)
      s = applyAction(s, { type: 'endTurn' }).state;
    expect(s.phase).toBe('lost');
    expect(members(s).every((m) => m.hp <= 0)).toBe(true);
    const r = finishEncounter(p, t, s);
    expect(r.outcome).toBe('wiped');
    expect(r.trip).toBeNull();
  });
});

describe('doorway charge carry over the party', () => {
  test('a one-apprentice trip carries only their charges', () => {
    const p = withParty(['stoker']);
    const t: Trip = { ...startTrip(p, SEED), status: 'doorway' };
    const r = applyDoorway(p, t, p.lattices);
    expect(Object.keys(r.trip.charges)).toEqual(['stoker']);
    expect(r.trip.charges.stoker).toEqual(t.charges.stoker);
  });
});

describe('saves keep the party honest', () => {
  const p = withParty(['stoker', TESTER]);
  const t = startTrip(p, SEED);
  const raw = (trip: unknown, profile: Profile = p) =>
    JSON.parse(JSON.stringify({ profile, trip, seedCounter: 1, lastTrip: null }));

  test('round trip', () => {
    expect(reload(p, t).trip).toEqual(t);
  });

  test.each([
    ['no party', { ...t, party: [] }],
    ['four apprentices', { ...t, party: ['stoker', TESTER, 'draughtsman', 'stoker'] }],
    ['the same apprentice twice', { ...t, party: ['stoker', 'stoker'] }],
    ['hp for someone not on the trip', { ...t, hp: { ...t.hp, draughtsman: 6 } }],
    ['charges missing for a party member', { ...t, charges: { stoker: t.charges.stoker } }],
    [
      'an action by someone not on the trip',
      { ...t, actions: [{ type: 'undoMove', unit: 'draughtsman' }] },
    ],
  ])('refused: %s', (_, bad) => {
    expect(() => parseSaveData(raw(bad))).toThrow(/Not a valid save/);
  });

  test('refused: a party member who left the household', () => {
    const lone = withParty(['stoker'], newProfile());
    expect(() => parseSaveData(raw(t, lone))).toThrow(/Not a valid save/);
  });
});

describe('battle rules over the registry', () => {
  test('P14: only an apprentice whose action is Shove can shove', () => {
    const board = ['. . .', '. P .', '. r .', '. . .', '. . .', '. . .'].join('\n');
    for (const [who, legal] of [
      ['stoker', true],
      [TESTER, false],
    ] as const) {
      const { state } = createBattle({ title: 't', board, seed: 1, lineup: [who], intents: {} });
      const why = isLegal(state, { type: 'shove', unit: who, dir: 'down' });
      expect(why === null, String(why)).toBe(legal);
    }
  });

  test("P15: a foe's tie between two apprentices goes to registry order, not slot order", () => {
    // Two start points the same walk from the rat; the Stoker is slotted first.
    const board = ['P . r . P', '. . . . .'].join('\n');
    for (const seed of [1, 2, 3, 4]) {
      const lineup = ['stoker', 'draughtsman'] as const;
      const { state } = createBattle({ title: 't', board, seed, lineup, intents: {} });
      const rat = state.units.find((u) => u.kind === 'enemy');
      if (rat?.kind !== 'enemy') throw new Error('no rat');
      expect(nearestMember(state, rat)?.def).toBe('draughtsman');
    }
  });
});
