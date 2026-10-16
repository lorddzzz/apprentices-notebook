import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { ENCOUNTERS, LOOT_TABLES, type LootTableId, MEMBER_IDS } from '$data';
import {
  applyAction,
  beginEncounter,
  describeLog,
  newProfile,
  placeOf,
  rollOffers,
  startTrip,
  variantFor,
} from '$engine';

/**
 * The Seam replays byte-identically across the district refactor (K-2): every room, variant and
 * loot roll for a spread of seeds, plus a few idle rounds of each fight, as text.
 * `SEAM_IDENTITY_WRITE=1` rewrites the fixture (only ever from the commit before the refactor).
 */
const FIXTURE = 'tests/fixtures/seam-identity.json';

function digest(): Record<string, unknown> {
  const p = newProfile();
  const out: Record<string, unknown> = {};
  for (let seed = 1; seed <= 12; seed++) {
    const base = startTrip(p, seed);
    ENCOUNTERS.forEach((_, i) => {
      const t = { ...base, encounter: i };
      let { state, events } = beginEncounter(p, t);
      const log = [...events];
      for (let r = 0; r < 4 && state.phase === 'player'; r++) {
        const next = applyAction(state, { type: 'endTurn' });
        state = next.state;
        log.push(...next.events);
      }
      out[`${seed}/${i}`] = {
        variant: variantFor(t, i),
        place: placeOf(t, i),
        log: describeLog(log),
      };
    });
    for (const table of Object.keys(LOOT_TABLES) as LootTableId[]) {
      out[`${seed}/loot/${table}`] = rollOffers(seed, 1, table, MEMBER_IDS, null);
    }
  }
  return out;
}

test('the Seam replays byte-identically', () => {
  const now = digest();
  if (process.env.SEAM_IDENTITY_WRITE || !existsSync(FIXTURE)) {
    writeFileSync(FIXTURE, JSON.stringify(now, null, 2));
  }
  expect(now).toEqual(JSON.parse(readFileSync(FIXTURE, 'utf8')));
});
