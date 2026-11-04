import { describe, expect, test } from 'vitest';
import { INK_ROOMS_12 } from '$data/districts/inkQuarter/rooms12';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { botFight } from './bot';

/** The bot play-through of tests/data/ink-rooms12.test.ts (IQ-9), kept out of check:fast. */

const [one, two] = INK_ROOMS_12;
if (!one || !two) throw new Error('missing room');
const ROOMS = [one, two];

describe('ink rooms 1 and 2 play (IQ-9)', () => {
  test('the bot wins every layout over a seed sample (founding pair, fresh HP)', () => {
    const table: string[] = [];
    for (const room of ROOMS) {
      for (const v of room.variants) {
        let wins = 0;
        const seeds = [1, 2, 3, 4, 5];
        for (const seed of seeds) {
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
        table.push(`${v.name}: ${wins}/${seeds.length}`);
        expect(wins, v.name).toBeGreaterThanOrEqual(4);
      }
    }
    if (process.env.INK_TABLE) console.log(table.join('\n'));
  });
});
