import { describe, expect, test } from 'vitest';
import { deriveSeed, serializeBoard } from '$engine';
import {
  checkGenerated,
  EN_SALT,
  type GeneratedRoom,
  generateRoom,
  specFor,
} from '$engine/drawing';
import { sampleInput } from '../../src/app/dev/samples';

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
  console.log(
    JSON.stringify({
      seeds: SEEDS,
      firstTry: accepted.filter((r) => r.room.attempts === 1).length / SEEDS,
      attemptsHistogram: { 1: attempts[0], 2: attempts[1], 3: attempts[2], 4: attempts[3] },
      fallbacks: runs.filter((r) => r.room.fallback).length,
      unverifiedFallbacks: runs.filter((r) => !r.room.verified).length,
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
      const salt = room.fallback ? EN_SALT.fallback + input.room : (room.trials.at(-1)?.salt ?? 0);
      const spec = specFor(input, deriveSeed(input.seed, salt));
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
