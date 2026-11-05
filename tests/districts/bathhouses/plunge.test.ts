import { describe, expect, test, vi } from 'vitest';
import { BATH_LOOT_TABLES, PLUNGE_KIND } from '$data/districts/bathhouses';
import {
  type BattleState,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  type SaveData,
  type Trip,
} from '$engine';
import {
  type BathTripState,
  BOIL_OVER_RULE_ID,
  parseBathState,
} from '$engine/districts/bathhouses/types';
import type { OfferRollCtx } from '$engine/districts/types';
import { kindOf } from '$engine/trip/offerKinds';
import {
  endBattle,
  goHome,
  leaveDoorway,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
} from '../../../src/app/flow';

/**
 * BH-3: the cold plunge (bathhouses-plan P5, P6). The bathhouses ship with no rooms until BH-6,
 * so four plain rooms and a heart are mocked, as in trip.test.ts.
 */

vi.mock('$data/districts/index', async (importOriginal) => {
  const m = await importOriginal<typeof import('$data/districts/index')>();
  const board = (rows: readonly string[]): string => rows.join('\n');
  const ROOM = board(['P . . . . .', '. . ~ ~ . .', '. . . @ . r', 'P . . . . .']);
  const HEART = board(['P . . . . .', '. . @ . d .', 'P . . . . .']);
  const room = (i: number, heart = false) => ({
    id: `bh-${i}`,
    title: `Room ${i}`,
    depth: i + 1,
    layout: heart ? HEART : ROOM,
    variants: [{ name: `Room ${i}`, layout: heart ? HEART : ROOM }],
    loot: 'bathhouses:h1' as const,
    picks: 1,
    heart,
  });
  const rooms = [room(0), room(1), room(2), room(3), room(4, true)];
  const DISTRICTS = { ...m.DISTRICTS, bathhouses: { ...m.DISTRICTS.bathhouses, rooms } };
  return {
    ...m,
    DISTRICTS,
    DISTRICT_KIT: DISTRICTS,
    encountersOf: (d: keyof typeof DISTRICTS) => DISTRICTS[d].rooms,
  };
});

const open = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: {
      ...p.city,
      heard: [...p.city.heard, 'bathhouses'],
      open: [...p.city.open, 'bathhouses'],
    },
  };
};
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const tripOf = (s: SaveData): Trip => {
  if (!s.trip) throw new Error('expected a trip');
  return s.trip;
};
const stateOf = (t: Trip | null): BathTripState => parseBathState(t?.kit?.state);
const heatIn = (s: BattleState): unknown =>
  (s.rules?.[BOIL_OVER_RULE_ID] as { heat?: unknown } | undefined)?.heat;
const plungeIx = (s: SaveData): number => tripOf(s).offers.findIndex((o) => o.kind === PLUNGE_KIND);
const closeWith = (save: SaveData, phase: 'won' | 'lost'): SaveData => {
  const s = structuredClone(startBattle(save).state);
  s.phase = phase;
  for (const u of s.units) if ((u.kind === 'enemy') === (phase === 'won')) u.hp = 0;
  return endBattle(save, s, []).save;
};
/** Spends every remaining pick on the first card, leaves a doorway, and pushes on to the next room. */
function moveOn(save: SaveData): SaveData {
  let s = save;
  for (let g = 0; g < 6 && tripOf(s).status === 'looting'; g++) s = takeOffer(s, 0);
  if (tripOf(s).status === 'doorway') s = leaveDoorway(s, s.profile);
  return pushOnward(s);
}
/** Plays to the loot screen after room `upTo` (0-based), taking the first card everywhere before. */
function toLoot(seed: number, upTo: number): SaveData {
  let save = setOut({ ...newSave(seed), profile: open() }, 'bathhouses');
  for (;;) {
    const room = tripOf(save).encounter;
    save = closeWith(save, 'won');
    if (room === upTo) return save;
    save = moveOn(save);
  }
}
/** The loot screen after `room` with the plunge taken, and the next fight reached. */
const plungedInto = (seed: number, room: number): SaveData => {
  let s = toLoot(seed, room);
  s = takeOffer(s, plungeIx(s));
  return moveOn(s);
};

describe('the cold plunge offer (P6)', () => {
  test('a fixed extra card after rooms 1–3, last in the offers, on every seed', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      for (const room of [0, 1, 2]) {
        const t = tripOf(toLoot(seed, room));
        expect(t.offers.at(-1)?.kind, `seed ${seed} room ${room}`).toBe(PLUNGE_KIND);
        expect(t.offers.filter((o) => o.kind === PLUNGE_KIND)).toHaveLength(1);
      }
    }
  });

  test('never after room 4 and never at the heart', () => {
    for (const seed of [1, 2, 3]) {
      for (const room of [3, 4]) expect(plungeIx(toLoot(seed, room))).toBe(-1);
    }
  });

  test('not offered on another district’s trips', () => {
    const base = tripOf(toLoot(1, 0));
    const ctx = (district: 'bathhouses' | 'canals', room: number): OfferRollCtx =>
      ({
        profile: newProfile(),
        trip: { ...base, district },
        room,
        table: 'bathhouses:h1',
        seed: 1,
      }) as OfferRollCtx;
    const k = kindOf({ kind: PLUNGE_KIND });
    expect(k.roll?.(ctx('bathhouses', 1))).toHaveLength(1);
    expect(k.roll?.(ctx('canals', 1))).toEqual([]);
  });
});

describe('taking the plunge', () => {
  test('it costs the pick, joins the loot and cools the next room; the cool is then spent', () => {
    const before = toLoot(2, 1);
    const picks = tripOf(before).picksLeft;
    const taken = takeOffer(before, plungeIx(before));
    const t = tripOf(taken);
    expect(t.loot.some((i) => i.kind === PLUNGE_KIND)).toBe(true);
    expect(stateOf(t).pendingCool).toBe(1);
    expect(t.picksLeft).toBe(picks - 1);
    const fight = moveOn(taken);
    expect(heatIn(startBattle(fight).state)).toBe(2); // room 3, base 3
    expect(stateOf(tripOf(closeWith(fight, 'won'))).pendingCool).toBe(0);
  });

  test('never below heat 1: a plunge after room 1 cools room 2 to 1', () => {
    expect(heatIn(startBattle(plungedInto(3, 0)).state)).toBe(1);
  });

  test('after room 3, room 4 runs at 3 but keeps heat 4 loot and picks; the heart is never cooled', () => {
    const fight = plungedInto(5, 2);
    expect(tripOf(fight).encounter).toBe(3);
    expect(heatIn(startBattle(fight).state)).toBe(3);
    const won = closeWith(fight, 'won');
    expect(tripOf(won).picksLeft).toBe(2);
    for (const o of tripOf(won).offers) {
      const inTable =
        o.kind === 'ink' ||
        BATH_LOOT_TABLES['bathhouses:h4'].entries.some(
          (e) => JSON.stringify(e.spec) === JSON.stringify(o),
        );
      expect(inTable, o.kind).toBe(true);
    }
    expect(heatIn(startBattle(moveOn(won)).state)).toBe(4);
  });

  test('the plunge does not change the loot tier: the room’s other cards match an unplunged trip', () => {
    const rest = (s: SaveData) => tripOf(s).offers.filter((o) => o.kind !== PLUNGE_KIND);
    const plunged = closeWith(plungedInto(9, 0), 'won');
    const plain = closeWith(moveOn(toLoot(9, 0)), 'won');
    // Both trips took a different card in room 1, so compare only the tier of what is offered.
    for (const s of [plunged, plain]) {
      for (const o of rest(s)) {
        const ok =
          o.kind === 'ink' ||
          BATH_LOOT_TABLES['bathhouses:h2'].entries.some(
            (e) => JSON.stringify(e.spec) === JSON.stringify(o),
          );
        expect(ok).toBe(true);
      }
    }
  });

  test('banked at home it changes nothing; a wipe drops it with the rest of the loot', () => {
    const taken = takeOffer(toLoot(4, 1), plungeIx(toLoot(4, 1)));
    const item = tripOf(taken).loot.find((i) => i.kind === PLUNGE_KIND);
    if (!item) throw new Error('expected the plunge in the loot');
    expect(kindOf(item).onBank(taken.profile, item)).toEqual(taken.profile);
    expect(() => goHome(taken)).not.toThrow();
    const lost = endBattle(
      moveOn(taken),
      (() => {
        const s = structuredClone(startBattle(moveOn(taken)).state);
        s.phase = 'lost';
        for (const u of s.units) if (u.kind !== 'enemy') u.hp = 0;
        return s;
      })(),
      [],
    );
    expect(lost.save.trip).toBeNull();
    expect(lost.save.profile.known).toEqual(taken.profile.known);
  });

  test('survives a save and load; a malformed plunge item is refused', () => {
    const before = toLoot(6, 1);
    const save = takeOffer(before, plungeIx(before));
    const loaded = parseSaveData(json(save));
    expect(loaded.trip).toEqual(save.trip);
    expect(stateOf(loaded.trip).pendingCool).toBe(1);
    expect(kindOf({ kind: PLUNGE_KIND }).parse({ kind: PLUNGE_KIND, data: 3 })).toBeNull();
    expect(kindOf({ kind: PLUNGE_KIND }).parse({ kind: PLUNGE_KIND, data: {} })).toEqual({
      kind: PLUNGE_KIND,
      data: {},
    });
  });
});
