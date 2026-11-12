import { describe, expect, test } from 'vitest';
import { deriveSeed, serializeBoard } from '$engine';
import {
  baseBudget,
  checkGenerated,
  EN_SALT,
  type GeneratedRoom,
  generateRoom,
  type RoomTrial,
  specFor,
} from '$engine/drawing';
import { sampleInput, sampleParty } from '../../src/app/dev/samples';

/**
 * EN-S1 (ending-plan Pack B): the generator spike on built content. A 500-seed fuzz of drawings
 * runs `generateRoom` once each; the three acceptance tests read the same runs, and the summary
 * is printed for the EN-G0 report (first-try acceptance, attempts, fallbacks, ops, desktop ms).
 */

const SEEDS = 500;
const percentile = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};

/** The trial whose layout was offered: the last one, or the last won one for a dull room (P28). */
const offered = (room: GeneratedRoom): RoomTrial | undefined =>
  room.dull && !room.fallback ? room.trials.findLast((t) => t.won === true) : room.trials.at(-1);

const spread = (xs: number[]) => ({
  median: percentile(xs, 0.5),
  p05: percentile(xs, 0.05),
  p95: percentile(xs, 0.95),
});
const histogram = (xs: number[]): Record<number, number> => {
  const out: Record<number, number> = {};
  for (const x of xs) out[x] = (out[x] ?? 0) + 1;
  return out;
};

interface Run {
  seed: number;
  input: ReturnType<typeof sampleInput>;
  room: GeneratedRoom;
  ms: number;
}
let cache: Run[] | undefined;
/** The 500-seed fuzz, run once on first use and shared by the tests that read it. */
function fuzz(): Run[] {
  if (cache) return cache;
  const runs: Run[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    const input = sampleInput(seed);
    const t0 = performance.now();
    const room = generateRoom(input);
    runs.push({ seed, input, room, ms: performance.now() - t0 });
  }
  const accepted = runs.filter((r) => !r.room.fallback);
  const attempts = [1, 2, 3, 4].map((n) => accepted.filter((r) => r.room.attempts === n).length);
  const ms = accepted.map((r) => r.ms);
  const ops = runs.map((r) => r.room.ops);
  const trials = runs.flatMap((r) => r.room.trials);
  const bot = trials.filter((t) => t.won !== null);
  const botOps = bot.map((t) => t.ops);
  const offeredTrials = runs.flatMap((r) => offered(r.room) ?? []);
  console.log(
    JSON.stringify({
      seeds: SEEDS,
      firstTry: accepted.filter((r) => r.room.attempts === 1).length / SEEDS,
      attemptsHistogram: { 1: attempts[0], 2: attempts[1], 3: attempts[2], 4: attempts[3] },
      fallbacks: runs.filter((r) => r.room.fallback).length,
      unverifiedFallbacks: runs.filter((r) => !r.room.verified).length,
      offered: {
        rounds: spread(offeredTrials.map((t) => t.rounds)),
        hpLeft: spread(offeredTrials.map((t) => t.hpLeft)),
        walkovers: offeredTrials.filter((t) => t.walkover).length,
        dull: runs.filter((r) => r.room.dull).length,
        budgets: histogram(offeredTrials.map((t) => t.budget)),
        attemptsSpent: histogram(
          runs.map((r) => r.room.trials.filter((t) => t.attempt <= 4).length),
        ),
        firstFair: histogram(
          runs.map((r) => (r.room.dull || r.room.fallback ? 0 : r.room.attempts)),
        ),
        withinTwo:
          runs.filter((r) => !r.room.dull && !r.room.fallback && r.room.attempts <= 2).length /
          SEEDS,
      },
      guardrailRedraws: trials.filter((t) => t.draws > 1).length,
      guardrailFailedAttempts: trials.filter((t) => t.guardrails.length > 0).length,
      botTrials: bot.length,
      opsPerRoom: {
        median: percentile(ops, 0.5),
        p95: percentile(ops, 0.95),
        max: Math.max(...ops),
      },
      rounds: {
        median: percentile(
          bot.map((t) => t.rounds),
          0.5,
        ),
        p95: percentile(
          bot.map((t) => t.rounds),
          0.95,
        ),
        max: Math.max(...bot.map((t) => t.rounds)),
      },
      hpLeft: {
        median: percentile(
          bot.map((t) => t.hpLeft),
          0.5,
        ),
        p05: percentile(
          bot.map((t) => t.hpLeft),
          0.05,
        ),
      },
      opsPerTrial: { median: percentile(botOps, 0.5), p95: percentile(botOps, 0.95) },
      msPerAcceptedRoom: {
        median: Math.round(percentile(ms, 0.5)),
        p95: Math.round(percentile(ms, 0.95)),
      },
      msPerRoomAll: {
        median: Math.round(
          percentile(
            runs.map((r) => r.ms),
            0.5,
          ),
        ),
        p95: Math.round(
          percentile(
            runs.map((r) => r.ms),
            0.95,
          ),
        ),
      },
    }),
  );
  cache = runs;
  return runs;
}

describe('EN-S1: the generator spike', () => {
  test('EN-S1: guardrails hold on 500 seeds', { timeout: 1_800_000 }, () => {
    const runs = fuzz();
    expect(runs).toHaveLength(SEEDS);
    for (const { seed, input, room } of runs) {
      // EN-S2: the spec is the offered attempt's own (its salt and its walked budget).
      const pick = offered(room);
      const salt = pick?.salt ?? 0;
      const spec = specFor(input, deriveSeed(input.seed, salt), pick?.budget);
      expect(checkGenerated(room.layout, spec), `seed ${seed}`).toEqual([]);
    }
  });

  test('EN-S1: no event-cap overrun inside trials', { timeout: 1_800_000 }, () => {
    const runs = fuzz();
    const capped = runs.filter((r) => r.room.trials.some((t) => t.capped)).map((r) => r.seed);
    expect(capped).toEqual([]);
  });

  test('EN-S1: same input gives the same layout, attempts and ops', { timeout: 1_800_000 }, () => {
    const runs = fuzz();
    for (const { seed, room } of runs.filter((r) => r.seed % 10 === 0)) {
      const again = generateRoom(sampleInput(seed));
      expect(serializeBoard(again.layout)).toBe(serializeBoard(room.layout));
      expect(again.attempts).toBe(room.attempts);
      expect(again.ops).toBe(room.ops);
      expect(again.fallback).toBe(room.fallback);
    }
  });

  test('EN-S1: a bot that cannot win spends four attempts, then offers the counted fallback', () => {
    const input = { ...sampleInput(3), budget: 1 };
    const room = generateRoom(input);
    expect(room.fallback).toBe(true);
    expect(room.attempts).toBe(4);
    expect(room.verified).toBe(false);
    expect(room.trials.map((t) => t.salt)).toEqual([
      7000 + 10 * input.room + 1,
      7000 + 10 * input.room + 2,
      7000 + 10 * input.room + 3,
      7000 + 10 * input.room + 4,
      EN_SALT.fallback + input.room,
    ]);
    expect(
      checkGenerated(
        room.layout,
        specFor(input, deriveSeed(input.seed, EN_SALT.fallback + input.room)),
      ),
    ).toEqual([]);
  });
});

/**
 * EN-S2 (P28): the two-sided judge and the walking budget. The same 500 runs; the offered trial is
 * the one whose layout the room carries (a fallback counts by its own trial).
 */
describe('EN-S2: the walk', () => {
  const median = (xs: number[]): number => percentile(xs, 0.5);

  test('EN-S2: offered rooms are walkovers in at most 10 % of seeds', {
    timeout: 1_800_000,
  }, () => {
    const runs = fuzz();
    const walkovers = runs.filter((r) => offered(r.room)?.walkover === true);
    expect(
      walkovers.length / runs.length,
      `${walkovers.length} of ${runs.length}`,
    ).toBeLessThanOrEqual(0.1);
  });

  test("EN-S2: the offered rooms' median win round is 3 or more and median HP left is below 1", {
    timeout: 1_800_000,
  }, () => {
    const trials = fuzz().flatMap((r) => offered(r.room) ?? []);
    expect(median(trials.map((t) => t.rounds))).toBeGreaterThanOrEqual(3);
    expect(median(trials.map((t) => t.hpLeft))).toBeLessThan(1);
  });

  test('EN-S2: the budget walks up after a walkover and down after a loss', {
    timeout: 1_800_000,
  }, () => {
    const step = 1;
    let ups = 0;
    for (const { room } of fuzz()) {
      const walk = room.trials.filter((t) => t.attempt <= 4);
      for (let i = 1; i < walk.length; i++) {
        const [a, b] = [walk[i - 1], walk[i]] as [RoomTrial, RoomTrial];
        if (a.won) {
          expect(b.budget).toBe(a.budget + step);
          if (a.walkover) ups++;
        } else {
          expect(b.budget).toBe(Math.max(1, a.budget - step));
        }
      }
    }
    expect(ups).toBeGreaterThan(0);
    // A bot that cannot win loses every attempt: the budget walks down to 1 and stays there.
    const input = { ...sampleInput(3), budget: 1 };
    const lost = generateRoom(input)
      .trials.slice(0, 4)
      .map((t) => t.budget);
    const first = baseBudget(input);
    expect(lost).toEqual([0, 1, 2, 3].map((n) => Math.max(1, first - n)));
  });

  test("EN-S2: a trio's base budget is larger than a pair's", () => {
    const trio = sampleInput(1);
    const input = (n: 2 | 3) => ({ ...trio, party: sampleParty(n) });
    const seed = deriveSeed(trio.seed, 7001);
    expect(specFor(input(3), seed).budget).toBeGreaterThan(specFor(input(2), seed).budget);
  });

  test('EN-S2: no walkover is offered while a fair attempt exists', { timeout: 1_800_000 }, () => {
    for (const { seed, room } of fuzz()) {
      const fair = room.trials.some((t) => t.attempt <= 4 && t.won === true && !t.walkover);
      const pick = offered(room);
      if (fair) {
        expect(pick?.walkover, `seed ${seed}`).toBe(false);
        expect(room.dull, `seed ${seed}`).toBe(false);
      }
      if (room.dull && !room.fallback) expect(pick?.walkover, `seed ${seed}`).toBe(true);
    }
  });
});
