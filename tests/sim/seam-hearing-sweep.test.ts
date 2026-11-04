import { describe, expect, test } from 'vitest';
import { sweep } from './seamHearing';

/** SM-4 (seam-grows P4, P5): the slow half of tests/scenarios/seam-hearing.test.ts. */

describe('the search bot over every seating (SM-4)', () => {
  // About 9 s alone on a laptop: 324 searches, most stop in the first round or two.
  test('reaches each event from at least half the seatings of each room P4 names', () => {
    const t0 = performance.now();
    const rows = sweep();
    const table = rows.map(
      (r) =>
        `${r.room.padEnd(18)} ${r.event.padEnd(10)} ${String(r.reached).padStart(2)}/${r.of} ${Math.round((100 * r.reached) / r.of)}%`,
    );
    console.log(`${table.join('\n')}\n(${Math.round(performance.now() - t0)} ms)`);
    for (const r of rows) {
      expect(
        r.reached / r.of,
        `${r.room} ${r.event} missed ${r.missed.join('; ')}`,
      ).toBeGreaterThanOrEqual(0.5);
    }
  }, 120_000);
});
