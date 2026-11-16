import { describe, expect, test } from 'vitest';
import { BOARD_TREASURES } from '$data/districts/cartographers/loot';
import { CARTOGRAPHERS_ROOMS, ROOM_PENCIL } from '$data/districts/cartographers/rooms';
import {
  applyAction,
  type BattleState,
  choicesAt,
  type GameEvent,
  joinHousehold,
  newProfile,
  newSave,
  type Profile,
  parseSaveData,
  type SaveData,
  setSlot,
  type Trip,
} from '$engine';
import { GUILD_HAND_RULE_ID } from '$engine/districts/cartographers/types';
import { rulePreview } from '$engine/rules';
import { chooseWay, setOutAt } from '../../src/app/crossroads';
import { endBattle, goHome, leaveDoorway, startBattle, takeOffer } from '../../src/app/flow';

/**
 * CG-16 (cartographers-plan §6): the hall as property tests. 200 seeds at party sizes 1-3, from
 * room 1 and from the doorway: no throw, no event-cap overrun at a round end, never stranded
 * (every trip walks to the heart), the through-doorway opens the rewiring and then room 4, no
 * return after it, the checkpoint kept on a wipe, one Bind page granted once; the plan preview
 * equals the round end; seeded determinism after save and load. Rooms are won by decree (the
 * property is the trip's wiring), then each room's real board is held still for a few rounds.
 */

const SEEDS = 200;
const SIZES = [1, 2, 3] as const;
const ROUNDS = 3;

const household = (size: number, checkpoint: boolean): Profile => {
  let p = newProfile();
  if (size === 3) {
    p = setSlot(joinHousehold({ ...p, known: [...p.known, 'touch'] }, 'runaway'), 2, 'runaway');
  }
  if (size === 1) p = setSlot(p, 1, null);
  const city = { ...p.city, heard: [...p.city.heard, 'cartographers' as const] };
  return {
    ...p,
    city: {
      ...city,
      open: [...city.open, 'cartographers' as const],
      ...(checkpoint ? { checkpoints: { cartographers: 2 } } : {}),
    },
  };
};
const tripOf = (save: SaveData): Trip => {
  if (!save.trip) throw new Error('expected a trip');
  return save.trip;
};
const out = (seed: number, size: number, from: 'start' | 'checkpoint'): SaveData =>
  setOutAt(
    { ...newSave(seed), profile: household(size, from === 'checkpoint') },
    'cartographers',
    from,
  );

const capped = (events: readonly GameEvent[]): boolean =>
  events.some((e) => e.type === 'fizzles' && e.reason === 'cap');

/** Everyone holds still; the foes and the hand take their rounds. Returns the log. */
function holdStill(
  start: BattleState,
  rounds: number,
): { state: BattleState; events: GameEvent[] } {
  let state = start;
  const events: GameEvent[] = [];
  for (let n = 0; n < rounds && state.phase === 'player'; n++) {
    const r = applyAction(state, { type: 'endTurn' });
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}
const tilesOf = (events: readonly GameEvent[], type: string): string[] =>
  events
    .filter((e) => e.type === type)
    .map((e) => {
      const a = (e as { at?: { x: number; y: number } }).at;
      return a ? `${a.x},${a.y}` : '';
    })
    .sort();
const previewAt = (s: BattleState, tone: 'erased' | 'drawn'): string[] =>
  rulePreview(s)
    .filter((p) => p.rule === GUILD_HAND_RULE_ID)
    .flatMap((p) => p.shapes)
    .flatMap((sh) => (sh.kind === 'tile' && sh.tone === tone ? [`${sh.at.x},${sh.at.y}`] : []))
    .sort();

/** The room's board with no foes: only the hand moves, so the preview is the whole round end. */
const handOnly = (s: BattleState): BattleState => {
  const b = structuredClone(s);
  b.units = b.units.filter((u) => u.kind === 'member');
  return b;
};

/** The battle as the room starts it, checked, then won by decree. Returns the won save. */
function playRoom(save: SaveData): SaveData {
  const t = tripOf(save);
  const state = startBattle(save).state;
  const hand = state.rules?.[GUILD_HAND_RULE_ID] as Record<string, unknown> | undefined;
  expect(hand, `room ${t.encounter + 1} lists the hand`).toMatchObject({
    ...ROOM_PENCIL[t.encounter],
  });
  const held = holdStill(structuredClone(state), ROUNDS);
  expect(capped(held.events), `room ${t.encounter + 1} cap`).toBe(false);
  // The plan preview equals the round end (no foes to disturb the paper).
  let solo = handOnly(state);
  for (let round = 0; round < ROUNDS && solo.phase === 'player'; round++) {
    const rub = previewAt(solo, 'erased');
    const ink = previewAt(solo, 'drawn');
    const r = applyAction(solo, { type: 'endTurn' });
    expect(tilesOf(r.events, 'cartographers:rubbedOut'), `room ${t.encounter + 1} rub`).toEqual(
      rub,
    );
    expect(
      [
        ...tilesOf(r.events, 'cartographers:inked'),
        ...tilesOf(r.events, 'cartographers:drawnIn'),
      ].sort(),
      `room ${t.encounter + 1} ink`,
    ).toEqual(ink);
    solo = r.state;
  }
  const won: BattleState = structuredClone(state);
  won.phase = 'won';
  for (const u of won.units) if (u.kind === 'enemy') u.hp = 0;
  let next = endBattle(save, won, []).save;
  while (tripOf(next).status === 'looting') next = takeOffer(next, 0);
  return next;
}

describe('CG-16 the hall, walked', () => {
  for (const size of SIZES) {
    test(`party of ${size}: from room 1 and from the doorway, ${SEEDS} seeds`, () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const label = `size ${size} seed ${seed}`;
        // From room 1: rooms 1-3, the through-doorway, then rooms 4-6 and the heart.
        let save = out(seed, size, 'start');
        expect(tripOf(save).encounter, label).toBe(0);
        for (let room = 0; room < 6; room++) {
          expect(tripOf(save).encounter, label).toBe(room);
          save = playRoom(save);
          let t = tripOf(save);
          if (room === 5) {
            expect(t.status, label).toBe('cleared');
            break;
          }
          expect(t.status, `${label} room ${room + 1}`).toBe('crossroads');
          const home = choicesAt(t).find((c) => c.kind === 'return');
          if (room > 2) expect(home?.disabled, `${label} no return`).toBeTruthy();
          if (room === 2) {
            expect(home?.disabled, label).toBeUndefined();
            save = chooseWay(save, 'doorway');
            t = tripOf(save);
            expect(t.status, `${label} doorway`).toBe('doorway');
            expect(t.encounter, label).toBe(2);
            // A wipe cannot happen in the doorway; leaving it rewires and enters room 4.
            save = leaveDoorway(save, save.profile);
            expect(tripOf(save).status, label).toBe('fight');
            expect(tripOf(save).encounter, `${label} room 4`).toBe(3);
          } else {
            save = chooseWay(save, 'push');
          }
        }
        // Save and load: the same room-1 battle, round after round.
        const fresh = out(seed, size, 'start');
        const loaded = parseSaveData(JSON.parse(JSON.stringify(fresh)));
        const a = startBattle(fresh).state;
        const b = startBattle(loaded).state;
        expect(b, `${label} reload`).toEqual(a);
        expect(holdStill(b, 2).state, `${label} replay`).toEqual(holdStill(a, 2).state);

        // From the doorway: room 4 first, the checkpoint carried, no way home until the heart.
        let door = out(seed, size, 'checkpoint');
        expect(tripOf(door).encounter, label).toBe(3);
        expect(tripOf(door).kit?.checkpoint, label).toBe(true);
        for (let room = 3; room < 6; room++) {
          door = playRoom(door);
          const t = tripOf(door);
          if (room === 5) {
            expect(t.status, label).toBe('cleared');
            break;
          }
          expect(choicesAt(t).find((c) => c.kind === 'return')?.disabled, label).toBeTruthy();
          door = chooseWay(door, 'push');
        }
      }
    }, 300_000);
  }
});

describe('CG-16 the doorway and its checkpoint', () => {
  test('a wipe keeps the checkpoint, from either start', () => {
    for (let seed = 1; seed <= SEEDS; seed++) {
      for (const size of SIZES) {
        const label = `size ${size} seed ${seed}`;
        // Past the doorway from room 1.
        let save = out(seed, size, 'start');
        for (let room = 0; room < 3; room++) {
          save = playRoom(save);
          save = chooseWay(save, room === 2 ? 'doorway' : 'push');
        }
        save = leaveDoorway(save, save.profile);
        const lost: BattleState = structuredClone(startBattle(save).state);
        lost.phase = 'lost';
        for (const u of lost.units) if (u.kind === 'member') u.hp = 0;
        const wiped = endBattle(save, lost, []).save;
        expect(wiped.trip, label).toBeNull();
        expect(wiped.profile.city.checkpoints?.cartographers, label).toBe(2);
        // The next trip may start at the doorway and wipes again there.
        const again = out(seed, size, 'checkpoint');
        const lost2: BattleState = structuredClone(startBattle(again).state);
        lost2.phase = 'lost';
        for (const u of lost2.units) if (u.kind === 'member') u.hp = 0;
        const done = endBattle(again, lost2, []).save;
        expect(done.profile.city.checkpoints?.cartographers, label).toBe(2);
      }
    }
  }, 300_000);

  test('one Bind page is granted once, however many trips take it', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let save: SaveData = { ...newSave(seed), profile: household(2, false) };
      for (let trip = 0; trip < 4; trip++) {
        save = setOutAt(save, 'cartographers');
        for (let room = 0; room < 3; room++) {
          const won: BattleState = structuredClone(startBattle(save).state);
          won.phase = 'won';
          for (const u of won.units) if (u.kind === 'enemy') u.hp = 0;
          save = endBattle(save, won, []).save;
          // Take every Board treasure the room offers, the *dies* page among them.
          for (let guard = 0; guard < 6 && tripOf(save).status === 'looting'; guard++) {
            const offers = tripOf(save).offers;
            const board = offers.findIndex((o) =>
              BOARD_TREASURES.some((b) => JSON.stringify(b) === JSON.stringify(o)),
            );
            save = takeOffer(save, Math.max(board, 0));
          }
          if (room < 2) save = chooseWay(save, 'push');
        }
        save = goHome(save);
        const dies = save.profile.bindEvents.filter((e) => e === 'dies');
        expect(dies.length, `seed ${seed} trip ${trip}`).toBeLessThanOrEqual(1);
        if (trip >= 1) expect(dies, `seed ${seed} trip ${trip}`).toHaveLength(1);
      }
    }
  });
});

describe('CG-16 the rooms are the data', () => {
  test('six rooms, each with a pencil config', () => {
    expect(CARTOGRAPHERS_ROOMS).toHaveLength(6);
    expect(ROOM_PENCIL).toHaveLength(6);
  });
});
