import { describe, expect, test } from 'vitest';
import { SEAM_ROOMS } from '$data/districts/seam';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { botFight } from './bot';

/** The bot play-through of tests/data/seam-rooms.test.ts (SM-3), kept out of check:fast. */

const ROOMS = SEAM_ROOMS;

describe('Seam rooms play (SM-3)', () => {
  const party = () =>
    Object.fromEntries(
      FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
    );
  const fight = (title: string, layout: string, seed: number) =>
    botFight(createBattle({ title, board: layout, seed, lineup: FOUNDERS, party: party() }).state);

  test('the bot wins rooms 1-3 with the founding pair on fresh HP', () => {
    for (const room of ROOMS.slice(0, 3)) {
      for (const v of room.variants) {
        let wins = 0;
        for (const seed of [1, 2, 3, 4, 5])
          if (fight(room.title, v.layout, seed).state.phase === 'won') wins++;
        expect(wins, v.name).toBeGreaterThanOrEqual(4);
      }
    }
  });

  test('the heart plays to an end and is no walkover', () => {
    const heart = ROOMS[3];
    if (!heart) throw new Error('missing heart');
    const rows: string[] = [];
    let wins = 0;
    for (const v of heart.variants) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const phase = fight(heart.title, v.layout, seed).state.phase;
        rows.push(`${v.name} ${seed} ${phase}`);
        if (phase === 'won') wins++;
      }
    }
    console.log(rows.join('\n'), wins);
    expect(wins).toBeGreaterThan(0);
  });
});
