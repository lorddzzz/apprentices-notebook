import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import type { DistrictId } from '$data';
import {
  playLock,
  recordTrip,
  type ThresholdRecord,
  type TripOptions,
  type TripRecord,
} from '../fixtures/district-kit/record';

/**
 * Golden baseline for the district kit (plan DK-0). Recorded bot trips for the Seam and the
 * canals, with every room's full event log, offers, stats and the end profile/save, plus the
 * canal lock solved and failed. The replay drives the engine from the recorded *actions* (never
 * the bot), so these fixtures only change when engine behaviour does.
 *
 * Public entry points exercised: run.ts `startTrip`, `beginEncounter`, `variantFor`, `placeOf`,
 * `closeBattle` (-> `finishEncounter`, `learnFromFight`, `recordTripCasts`), `pickLoot`, `pushOn`,
 * `returnHome`, `parseSaveData`; city.ts `hearFromBattle`/`hearAfterTrip` (inside `closeBattle`),
 * `canReturn`, `keyOffer`, `bankKeys` (inside the trip flow), `solveThreshold` (via
 * `thresholdOutcome`), `objectiveMet`/`checkGoal` (inside the battle); app/threshold.ts
 * `thresholdStart`/`thresholdOutcome`.
 *
 * A red run after a refactor means behaviour changed: fix the code. If the change is intended
 * (a rule or content change), re-record and review the diff of the fixtures:
 *
 *   RECORD_GOLDEN=1 pnpm vitest run tests/run/golden.test.ts
 *
 * Recording drives the greedy bot (tests/sim/bot.ts) and takes about a minute. To add a scenario,
 * add a line to TRIPS below and re-record.
 */

const DIR = new URL('../fixtures/district-kit/', import.meta.url);
const RECORDING = process.env.RECORD_GOLDEN === '1';

interface TripCase {
  name: string;
  district: DistrictId;
  seed: number;
  options: TripOptions;
  expect: TripRecord['outcome'];
}
const BOT = { maxRounds: 100 };
const IDLE = { idle: true };
const TRIPS: TripCase[] = [
  { name: 'seam-win-2', district: 'seam', seed: 2, options: BOT, expect: 'returned' },
  { name: 'seam-win-4', district: 'seam', seed: 4, options: BOT, expect: 'returned' },
  { name: 'seam-win-5', district: 'seam', seed: 5, options: BOT, expect: 'returned' },
  { name: 'seam-wipe-1', district: 'seam', seed: 1, options: BOT, expect: 'wiped' },
  { name: 'seam-wipe-6', district: 'seam', seed: 6, options: BOT, expect: 'wiped' },
  { name: 'seam-wipe-idle-3', district: 'seam', seed: 3, options: IDLE, expect: 'wiped' },
  { name: 'canals-win-2', district: 'canals', seed: 2, options: BOT, expect: 'returned' },
  { name: 'canals-win-3', district: 'canals', seed: 3, options: BOT, expect: 'returned' },
  { name: 'canals-win-4', district: 'canals', seed: 4, options: BOT, expect: 'returned' },
  { name: 'canals-win-5', district: 'canals', seed: 5, options: BOT, expect: 'returned' },
  { name: 'canals-wipe-idle-1', district: 'canals', seed: 1, options: IDLE, expect: 'wiped' },
  { name: 'canals-wipe-idle-4', district: 'canals', seed: 4, options: IDLE, expect: 'wiped' },
];
const LOCKS: ThresholdRecord['kind'][] = ['solve', 'fire'];

/** JSON round trip: what a fixture file holds (drops `undefined`, like a save does). */
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const file = (name: string) => new URL(`${name}.json`, DIR);
function load<T>(name: string): T {
  return JSON.parse(readFileSync(file(name), 'utf8')) as T;
}
function store(name: string, value: unknown) {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(file(name), `${JSON.stringify(value)}\n`);
}

describe('golden trips', () => {
  for (const c of TRIPS) {
    test(`${c.name}: replays to the recorded events, offers, stats and end save`, () => {
      if (RECORDING) {
        const rec = plain(recordTrip(c.district, c.seed, c.options));
        expect(rec.outcome).toBe(c.expect);
        store(c.name, rec);
      }
      const golden = load<TripRecord>(c.name);
      expect(golden.outcome).toBe(c.expect);
      const replayed = plain(
        recordTrip(
          golden.district,
          golden.seed,
          golden.options,
          golden.rooms.map((r) => r.actions),
        ),
      );
      expect(replayed.rooms.length).toBe(golden.rooms.length);
      golden.rooms.forEach((room, i) => {
        const got = replayed.rooms[i];
        expect(got?.place, `room ${i} place`).toBe(room.place);
        expect(got?.variant, `room ${i} variant`).toBe(room.variant);
        expect(got?.events, `room ${i} events`).toEqual(room.events);
        expect(got?.phase, `room ${i} phase`).toBe(room.phase);
        expect(got?.outcome, `room ${i} outcome`).toBe(room.outcome);
        expect(got?.offers, `room ${i} offers`).toEqual(room.offers);
        expect(got?.stats, `room ${i} stats`).toEqual(room.stats);
      });
      expect(replayed.outcome).toBe(golden.outcome);
      expect(replayed.profile).toEqual(golden.profile);
      expect(replayed.trip).toEqual(golden.trip);
      expect(replayed.save).toEqual(golden.save);
    }, 120_000);
  }

  test('the set covers both districts, wins and wipes', () => {
    const outcomes = (d: DistrictId) =>
      new Set(TRIPS.filter((c) => c.district === d).map((c) => c.expect));
    for (const d of ['seam', 'canals'] as const) {
      expect(outcomes(d)).toEqual(new Set(['returned', 'wiped']));
    }
  });
});

describe('golden canal lock', () => {
  for (const kind of LOCKS) {
    test(`lock-${kind}: replays to the recorded events and profile`, () => {
      if (RECORDING) store(`lock-${kind}`, plain(playLock(kind)));
      const golden = load<ThresholdRecord>(`lock-${kind}`);
      const got = plain(playLock(kind));
      expect(got.events).toEqual(golden.events);
      expect(got.phase).toBe(golden.phase);
      expect(got.board).toBe(golden.board);
      expect(got.profile).toEqual(golden.profile);
      expect(got.profile.city.open.includes('canals')).toBe(kind === 'solve');
    });
  }
});
