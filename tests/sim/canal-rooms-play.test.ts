import { describe, expect, test } from 'vitest';
import { CANAL_ROOMS } from '$data/districts/canals';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { botFight } from './bot';

/** The bot play-throughs of tests/data/canal-rooms.test.ts (CN-3, CN-4, CN-13), kept out of check:fast. */

const ROOMS = [CANAL_ROOMS[0], CANAL_ROOMS[1]];

describe('canal rooms 1 and 2 play (CN-3)', () => {
  test('the bot wins every layout with the founding pair on fresh HP', () => {
    for (const room of ROOMS) {
      if (!room) throw new Error('missing room');
      for (const v of room.variants) {
        for (const seed of [1, 2, 3]) {
          const fight = botFight(
            createBattle({
              title: room.title,
              board: v.layout,
              seed,
              lineup: FOUNDERS,
              party: Object.fromEntries(
                FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
              ),
            }).state,
          );
          expect(fight.state.phase, `${v.name} seed ${seed}`).toBe('won');
        }
      }
    }
  });
});

describe('canal rooms 3 and 4 play (CN-4)', () => {
  test('the bot wins every layout with the founding pair on fresh HP', () => {
    for (const room of [CANAL_ROOMS[2], CANAL_ROOMS[3]]) {
      if (!room) throw new Error('missing room');
      for (const v of room.variants) {
        let wins = 0;
        for (const seed of [1, 2, 3, 4, 5]) {
          const fight = botFight(
            createBattle({
              title: room.title,
              board: v.layout,
              seed,
              lineup: FOUNDERS,
              party: Object.fromEntries(
                FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
              ),
            }).state,
          );
          if (fight.state.phase === 'won') wins++;
        }
        expect(wins, v.name).toBe(5);
      }
    }
  });
});

describe('canal heart (CN-5) play', () => {
  const heart = CANAL_ROOMS[4];
  if (!heart) throw new Error('missing heart');

  test('CN-13: the bot plays every variant to an end; the pool is no walkover (target 50-65%)', () => {
    let wins = 0;
    let fights = 0;
    for (const v of heart.variants) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const fight = botFight(
          createBattle({
            title: heart.title,
            board: v.layout,
            seed,
            lineup: FOUNDERS,
            party: Object.fromEntries(
              FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
            ),
          }).state,
        );
        fights++;
        if (fight.state.phase === 'won') wins++;
      }
    }
    // The full table lives in tests/sim/canals.test.ts; this only keeps both ends in view.
    expect(wins).toBeGreaterThan(0);
    expect(wins).toBeLessThan(fights);
  }, 120_000); // ~25 s alone, over the 30 s default under a loaded full run
});
