import { describe, expect, test } from 'vitest';
import { BATH_ROOMS_12 } from '$data/districts/bathhouses';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { BOIL_OVER_RULE_ID } from '$engine/districts/bathhouses/types';
import { listRules } from '$engine/rules';
import { botFight } from './bot';

/** The bot play-through of tests/data/bathhouse-rooms12.test.ts (BH-6), kept out of check:fast. */

describe('bathhouse rooms 1 and 2 play (BH-6)', () => {
  test('the gauge-blind bot wins each layout over a seed sample (founding pair, fresh HP)', () => {
    const table: string[] = [];
    BATH_ROOMS_12.forEach((room, i) => {
      for (const v of room.variants) {
        let wins = 0;
        const seeds = process.env.BATH_TABLE
          ? Array.from({ length: 30 }, (_, n) => n + 1)
          : [1, 2, 3, 4, 5];
        let boils = 0;
        for (const seed of seeds) {
          const s = structuredClone(
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
          s.rules = listRules(s, [BOIL_OVER_RULE_ID], { [BOIL_OVER_RULE_ID]: { heat: i + 1 } });
          const fight = botFight(s);
          if (fight.state.phase === 'won') wins++;
          boils += fight.events.filter((e) => e.type === 'bathhouses:boilOver').length;
        }
        table.push(`${v.name}: ${wins}/${seeds.length}, boil-overs ${boils}`);
        expect(wins / seeds.length, v.name).toBeGreaterThanOrEqual(0.8);
      }
    });
    if (process.env.BATH_TABLE) console.log(table.join('\n'));
  });
});
