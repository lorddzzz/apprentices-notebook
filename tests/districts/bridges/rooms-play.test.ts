import { describe, expect, test } from 'vitest';
import { BRIDGE_ROOMS_12 } from '$data/districts/bridges';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { botFight } from '../../sim/bot';

/**
 * BR-9: a quick bot fight per layout. The bot knows nothing about cracks (BR-21 teaches it), so
 * this only proves each board plays to an end without throwing; win and loss are printed, never
 * asserted, and nothing is tuned from them.
 */
describe('BR-9 rooms 1 and 2 play out', () => {
  test('every layout terminates for the founding pair', () => {
    const lines: string[] = [];
    for (const room of BRIDGE_ROOMS_12) {
      for (const v of room.variants) {
        const results = [1, 2, 3].map((seed) => {
          const s = structuredClone(
            createBattle({
              title: room.title,
              board: v.layout,
              seed,
              edge: 'drop',
              lineup: FOUNDERS,
              party: Object.fromEntries(
                FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
              ),
            }).state,
          );
          return botFight(s).state.phase;
        });
        for (const phase of results) expect(['won', 'lost']).toContain(phase);
        lines.push(`${room.title} / ${v.name}: ${results.join(' ')}`);
      }
    }
    if (process.env.BR_TABLE) console.log(lines.join('\n'));
  });
});
