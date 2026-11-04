import { describe, expect, test } from 'vitest';
import { HEART_RULES, INK_ROOMS_34 } from '$data/districts/inkQuarter/rooms34';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { listRules } from '$engine/rules';
import { botFight } from './bot';

/** The bot play-through of tests/data/ink-rooms34.test.ts (IQ-10), kept out of check:fast. */

const [three, four, heart] = INK_ROOMS_34;
if (!three || !four || !heart) throw new Error('missing room');
const ROOMS = [three, four, heart];

describe('ink rooms 3, 4 and the heart play (IQ-10)', () => {
  test('the bot wins every layout over a seed sample (founding pair, fresh HP)', () => {
    const table: string[] = [];
    ROOMS.forEach((room, ri) => {
      for (const v of room.variants) {
        let wins = 0;
        const seeds = [1, 2];
        for (const seed of seeds) {
          const s0 = createBattle({
            title: room.title,
            board: v.layout,
            seed,
            lineup: FOUNDERS,
            party: Object.fromEntries(
              FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
            ),
          }).state;
          if (ri === 2) s0.rules = listRules(s0, [...HEART_RULES]);
          if (botFight(s0).state.phase === 'won') wins++;
        }
        table.push(`${v.name}: ${wins}/${seeds.length}`);
        expect(wins, v.name).toBeGreaterThanOrEqual(ri === 2 ? 1 : 2);
      }
    });
    if (process.env.INK_TABLE) process.stderr.write(`${table.join('\n')}\n`);
  });
});
