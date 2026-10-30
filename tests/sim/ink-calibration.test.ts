import { describe, expect, test } from 'vitest';
import { encountersOf } from '$data';
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import {
  checkStakeDefs,
  checkTermDefs,
  inkTrip,
  returnCheck,
  roomRun,
  type SignPolicy,
} from './ink-bot';

/**
 * Ink quarter calibration (IQ-20; numbers and policy in docs/plans/ink-quarter-calibration.md).
 * Default run is small and fast; `INK_CAL=1` runs the big tables and prints them as markdown.
 */
const BIG = !!process.env.INK_CAL;
const SEEDS = BIG ? 120 : 2;
const seeds = Array.from({ length: SEEDS }, (_, i) => 1000 + i);
const ROOMS = encountersOf('inkQuarter').length;
const HEART = ROOMS - 1;

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
const pct = (n: number, d: number) => (d === 0 ? 100 : Math.round((100 * n) / d));

describe('the terms as data', () => {
  test('pass the engine checks and name only rooms before the heart', () => {
    expect(checkTermDefs(INK_TERMS, ROOMS)).toEqual([]);
    expect(checkStakeDefs(INK_TERMS)).toEqual([]);
  });
});

describe('every term is meetable and fair on a fresh party', () => {
  const baseline = new Map<number, { won: number; rounds: number[] }>();
  const base = (room: number) => {
    let b = baseline.get(room);
    if (!b) {
      const rs = seeds.map((s) => roomRun(s, room, null));
      b = {
        won: rs.filter((r) => r.won).length,
        rounds: rs.filter((r) => r.won).map((r) => r.rounds),
      };
      baseline.set(room, b);
    }
    return b;
  };

  for (const d of INK_TERMS) {
    for (const signedIn of d.rooms) {
      const room = signedIn + 1;
      test(`${d.id}, fought in room ${room}`, () => {
        const b = base(room);
        const rs = seeds.map((s) => roomRun(s, room, d.id));
        const won = rs.filter((r) => r.won);
        // Fairness: a term room is no harder than the same room without one, within 10 points.
        expect(pct(won.length, SEEDS)).toBeGreaterThanOrEqual(pct(b.won, SEEDS) - 10);
        // Meetable: the condition holds in a clear majority of the wins.
        expect(
          pct(won.filter((r) => r.settled === 'paid').length, won.length),
        ).toBeGreaterThanOrEqual(75);
      });
    }
  }
});

describe('fuzz: trips under each signing policy', () => {
  const policies: SignPolicy[] = ['never', 'always', 'winRoom'];
  test('never stranded, one open term at most, none at the heart, a way home once cleared', () => {
    const n = BIG ? 300 : 40;
    for (const policy of policies) {
      for (let i = 0; i < n; i++) {
        const r = inkTrip(5000 + i, policy, 'skip');
        expect(r.cleared, `${policy} ${i} cleared`).toBe(true);
        expect(r.maxOpen).toBeLessThanOrEqual(1);
        expect(r.termAtHeart).toBe(false);
        expect(r.stranded).toBe(false);
        if (policy === 'never') expect(r.signed).toEqual([]);
        if (r.save.trip) expect(returnCheck(r.save.trip).ok).toBe(true);
        expect(r.rooms).toHaveLength(ROOMS);
        // A term may be open going into the heart (signed in room 4's loot), never signed in it.
      }
    }
  });
});

// The big run: per-room tables and the real-trip chain, printed as the doc's markdown.
test.skipIf(!BIG)(
  'INK_CAL: print the tables',
  () => {
    const out: string[] = ['## Per room, fresh party (founding pair), %d seeds', ''];
    out[0] = `## Per room, fresh party (founding pair), ${SEEDS} seeds`;
    out.push(
      '| room | term | win | term paid | median rounds | max rounds |',
      '|---|---|---|---|---|---|',
    );
    for (let room = 0; room < ROOMS; room++) {
      const row = (label: string, def: string | null) => {
        const rs = seeds.map((s) => roomRun(s, room, def));
        const won = rs.filter((r) => r.won);
        const paid = def
          ? `${pct(won.filter((r) => r.settled === 'paid').length, won.length)}%`
          : '-';
        out.push(
          `| ${room + 1}${room === HEART ? ' (heart)' : ''} | ${label} | ${pct(won.length, SEEDS)}% | ${paid} | ${median(won.map((r) => r.rounds))} | ${Math.max(0, ...won.map((r) => r.rounds))} |`,
        );
      };
      row('none', null);
      for (const d of INK_TERMS)
        if (d.rooms.includes(room - 1)) row(d.id.replace('inkQuarter:term-', ''), d.id);
    }
    out.push(
      '',
      `## Real trips, no restocking (founding pair, bot never goes home), ${SEEDS} seeds`,
      '',
    );
    out.push(
      '| policy | reached room 2 | 3 | 4 | 5 (heart) | cleared | signed per trip |',
      '|---|---|---|---|---|---|---|',
    );
    for (const policy of ['never', 'always', 'winRoom'] as const) {
      const runs = seeds.map((s) => inkTrip(s, policy, 'bot'));
      const reached = (k: number) =>
        pct(runs.filter((r) => r.rooms.filter((x) => x.won).length >= k).length, SEEDS);
      const signed = runs.reduce((a, r) => a + r.signed.length, 0) / SEEDS;
      out.push(
        `| ${policy} | ${reached(1)}% | ${reached(2)}% | ${reached(3)}% | ${reached(4)}% | ${pct(runs.filter((r) => r.cleared).length, SEEDS)}% | ${signed.toFixed(1)} |`,
      );
    }
    process.stdout.write(`\nINK_CAL_TABLE\n${out.join('\n')}\n`);
  },
  3_600_000,
);
