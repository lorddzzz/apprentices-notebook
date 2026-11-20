import { describe, expect, test } from 'vitest';
import { encountersOf } from '$data';
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import { HEART_HEADER, heartRow } from './calibration/ink';
import {
  checkStakeDefs,
  checkTermDefs,
  freshHeart,
  type HeartRun,
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
      test(
        `${d.id}, fought in room ${room}`,
        () => {
          const b = base(room);
          const rs = seeds.map((s) => roomRun(s, room, d.id));
          const won = rs.filter((r) => r.won);
          // Fairness: a term room is no harder than the same room without one, within 10 points.
          expect(pct(won.length, SEEDS)).toBeGreaterThanOrEqual(pct(b.won, SEEDS) - 10);
          // Meetable: the condition holds in a clear majority of the wins.
          expect(
            pct(won.filter((r) => r.settled === 'paid').length, won.length),
          ).toBeGreaterThanOrEqual(75);
        },
        BIG ? 3_600_000 : 30_000,
      );
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

// The big run: per-room tables, the postmaster rows and the real-trip chain, as the doc's markdown.
test.skipIf(!BIG)(
  'INK_CAL: print the tables',
  () => {
    const out: string[] = [`## Per room, fresh party (founding pair), ${SEEDS} seeds`, ''];
    out.push(
      '| room | term | win | baseline win | delta (pts) | paid | broken | median rounds | max rounds |',
      '|---|---|---|---|---|---|---|---|---|',
    );
    for (let room = 0; room < ROOMS; room++) {
      const none = seeds.map((s) => roomRun(s, room, null));
      const baseWin = pct(none.filter((r) => r.won).length, SEEDS);
      const row = (label: string, def: string | null) => {
        const rs = def ? seeds.map((s) => roomRun(s, room, def)) : none;
        const won = rs.filter((r) => r.won);
        const w = pct(won.length, SEEDS);
        const paid = def ? `${pct(won.filter((r) => r.settled === 'paid').length, SEEDS)}%` : '-';
        const broken = def
          ? `${pct(won.filter((r) => r.settled === 'broken').length, SEEDS)}%`
          : '-';
        out.push(
          `| ${room + 1}${room === HEART ? ' (heart)' : ''} | ${label} | ${w}% | ${def ? `${baseWin}%` : '-'} | ${def ? w - baseWin : '-'} | ${paid} | ${broken} | ${median(won.map((r) => r.rounds))} | ${Math.max(0, ...won.map((r) => r.rounds))} |`,
        );
      };
      row('none', null);
      for (const d of INK_TERMS)
        if (d.rooms.includes(room - 1)) row(d.id.replace('inkQuarter:term-', ''), d.id);
    }
    out.push(
      '',
      `Paid and broken are shares of all ${SEEDS} fights (of the won, paid + broken = the win rate); a lost room settles neither.`,
      '',
      `## The postmaster at the heart, fresh party (room 5), ${SEEDS} seeds`,
      '',
      ...HEART_HEADER,
    );
    const heartDefs: [string, string | null][] = [
      ['fresh, no term', null],
      ...INK_TERMS.filter((d) => d.rooms.includes(HEART - 1)).map((d): [string, string | null] => [
        `fresh, ${d.id.replace('inkQuarter:term-', '')}`,
        d.id,
      ]),
    ];
    for (const [label, def] of heartDefs)
      out.push(
        heartRow(
          label,
          seeds.map((s) => freshHeart(s, def)),
        ),
      );
    out.push(
      '',
      `## Real trips, no restocking (founding pair, bot never goes home), ${SEEDS} seeds`,
      '',
      '| policy | reached room 2 | 3 | 4 | 5 (heart) | cleared | signed per trip | terms paid / broken / unsettled |',
      '|---|---|---|---|---|---|---|---|',
    );
    const worn: string[] = [];
    for (const policy of ['never', 'always', 'winRoom'] as const) {
      const runs = seeds.map((s) => inkTrip(s, policy, 'bot'));
      const reached = (k: number) =>
        pct(runs.filter((r) => r.rooms.filter((x) => x.won).length >= k).length, SEEDS);
      const signed = runs.reduce((a, r) => a + r.signed.length, 0) / SEEDS;
      const settled = runs.flatMap((r) => r.rooms.filter((x) => x.term));
      const n = (k: string) => settled.filter((x) => (x.settled ?? 'unsettled') === k).length;
      out.push(
        `| ${policy} | ${reached(1)}% | ${reached(2)}% | ${reached(3)}% | ${reached(4)}% | ${pct(runs.filter((r) => r.cleared).length, SEEDS)}% | ${signed.toFixed(1)} | ${n('paid')} / ${n('broken')} / ${n('unsettled')} |`,
      );
      const hearts = runs.map((r) => r.heart).filter((h): h is HeartRun => h !== null);
      worn.push(heartRow(`worn, ${policy} (of ${SEEDS} trips)`, hearts));
    }
    out.push(
      '',
      `## The postmaster at the heart, worn party (the trip's own heart fight), ${SEEDS} seeds`,
      '',
      ...HEART_HEADER,
      ...worn,
    );
    process.stdout.write(`\nINK_CAL_TABLE\n${out.join('\n')}\n`);
  },
  3_600_000,
);

// The worn heart (CAL-2): the trip's own heart fight, on as many trips as it takes to reach it.
// `INK_WORN=<trips>` (about 1% of trips get there, so a few hundred trips give a handful of hearts).
test.skipIf(!process.env.INK_WORN)(
  'INK_WORN: print the worn-heart sample',
  () => {
    const n = Number(process.env.INK_WORN);
    const hearts = Array.from(
      { length: n },
      (_, i) => inkTrip(20_000 + i, 'never', 'bot').heart,
    ).filter((h): h is HeartRun => h !== null);
    process.stdout.write(
      `\nINK_WORN_TABLE\n${['', `## Worn heart, ${n} trips (never policy, seeds 20000+)`, '', ...HEART_HEADER, heartRow('worn, never', hearts)].join('\n')}\n`,
    );
  },
  3_600_000,
);
