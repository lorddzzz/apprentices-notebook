import { describe, expect, test } from 'vitest';
import { encountersOf, type RuneId } from '$data';
import {
  type BattleState,
  newProfile,
  newSave,
  type Profile,
  rollOffers,
  startTrip,
  type Trip,
} from '$engine';
import { CLOCK_RULE_ID } from '$engine/districts/inkQuarter/clock';
import { recruitOffers } from '$engine/recruits';
import {
  endBattle,
  leaveDoorway,
  pushOnward,
  setOut,
  startBattle,
  takeOffer,
} from '../../src/app/flow';

/** The ink quarter as a district (gate flip): a whole trip, and the notary's landmark (IQ-13). */

const open = (): Profile => {
  const p = newProfile();
  return { ...p, city: { ...p.city, heard: ['seam', 'inkQuarter'], open: ['seam', 'inkQuarter'] } };
};
const learn = (p: Profile, ...runes: RuneId[]): Profile => ({
  ...p,
  known: [...new Set([...p.known, ...runes])],
});
const tripAt = (p: Profile, room: number, loot: Trip['loot'] = []): Trip => ({
  ...startTrip(p, 7, 'inkQuarter'),
  encounter: room,
  loot,
});
const tally = { kind: 'rune', rune: 'tally' } as const;

describe('a whole trip through the quarter', () => {
  test('rooms 1-4 and the heart each set up and close, the clock rule listed at every board', () => {
    for (const seed of [1, 2, 3, 4]) {
      let save = newSave(seed);
      save = { ...save, profile: open() };
      save = setOut(save, 'inkQuarter');
      const rooms: string[] = [];
      for (let guard = 0; guard < 40 && save.trip; guard++) {
        const status = save.trip.status;
        if (status === 'fight') {
          const s: BattleState = structuredClone(startBattle(save).state);
          expect(s.rules?.[CLOCK_RULE_ID] !== undefined || rooms.length < 4).toBe(true);
          rooms.push(s.title);
          s.phase = 'won';
          for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
          save = endBattle(save, s, []).save;
        } else if (status === 'looting') save = takeOffer(save, 0);
        else if (status === 'doorway') save = leaveDoorway(save, save.profile);
        else if (status === 'crossroads') save = pushOnward(save);
        else break;
      }
      expect(rooms).toHaveLength(encountersOf('inkQuarter').length);
      expect(save.trip?.status).toBe('cleared');
    }
  });
});

describe('the notary (IQ-13)', () => {
  const ready = learn(open(), 'splash', 'steam');

  test('hidden until Tally, Splash and Steam are held, and outside room 3', () => {
    expect(recruitOffers(open(), tripAt(open(), 2), 2)).toEqual([]);
    expect(recruitOffers(ready, tripAt(ready, 2), 2)).toEqual([]);
    const full = learn(ready, 'tally');
    expect(recruitOffers(full, tripAt(full, 1), 1)).toEqual([]);
    expect(recruitOffers(full, tripAt(full, 3), 3)).toEqual([]);
  });

  test('offered in room 3 once held, including a Tally picked up earlier in the same trip', () => {
    const full = learn(ready, 'tally');
    expect(recruitOffers(full, tripAt(full, 2), 2)).toEqual([
      { kind: 'recruit', apprentice: 'notary' },
    ]);
    expect(recruitOffers(ready, tripAt(ready, 2, [tally]), 2)).toEqual([
      { kind: 'recruit', apprentice: 'notary' },
    ]);
  });
});

describe('the shallow table and the notary page (IQ-FU1)', () => {
  test('rooms 1 and 2 offer Tally once, never twice, on every seed', () => {
    const p = open();
    for (let seed = 1; seed <= 60; seed++) {
      for (const room of [0, 1]) {
        const trip = startTrip(p, seed, 'inkQuarter');
        const offers = rollOffers(
          seed,
          room,
          'inkQuarter:shallow',
          trip.party,
          null,
          { known: p.known, methods: p.methods },
          { profile: p, trip: { ...trip, encounter: room } },
        );
        const tallies = offers.filter((o) => o.kind === 'rune' && o.rune === 'tally');
        expect(tallies, `seed ${seed} room ${room}`).toHaveLength(1);
      }
    }
  });
});
