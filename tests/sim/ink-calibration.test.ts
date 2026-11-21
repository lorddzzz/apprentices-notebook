import { describe, expect, test } from 'vitest';
import { encountersOf } from '$data';
import {
  CLOCK_SEAL,
  CLOCK_TUNING,
  INK_FOE_TUNING,
  POSTMASTER,
} from '$data/districts/inkQuarter/enemies';
import { INK_TERMS } from '$data/districts/inkQuarter/terms';
import { POSTMASTER_RIVAL } from '$data/rivals/postmaster';
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
          // Meetable: the condition holds in a clear majority of the wins. The heart (room 5) is
          // fought through longer, losable rounds after CAL-2's deliveries (IQ-20-W, delegated).
          expect(
            pct(won.filter((r) => r.settled === 'paid').length, won.length),
          ).toBeGreaterThanOrEqual(room === 5 ? 55 : 75);
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

// IQ-20 lever table (CAL-2): data-only candidates tried in memory on a fresh heart, then restored.
// `INK_LEVERS=1`. Nothing here is applied; the rows go to the player as proposals.
type Mut<T> = { -readonly [K in keyof T]: T[K] extends number ? number : T[K] };
const LEVERS: { id: string; kind: 'lever' | 'movement' | 'opener'; set: () => void }[] = [
  {
    id: 'as applied (CAL-2 deliveries: 4 shielded letters, burst 4; deadline 3, collect 3, cooldown 2, seal 3 HP, move 0)',
    kind: 'lever',
    set: () => {},
  },
  {
    id: 'delivery burst 2 (the plain letter weight; shields stay)',
    kind: 'lever',
    set: () => (mut(INK_FOE_TUNING).counterBurst = 2),
  },
  {
    id: 'delivery burst 6',
    kind: 'lever',
    set: () => (mut(INK_FOE_TUNING).counterBurst = 6),
  },
  { id: 'collect 6', kind: 'lever', set: () => (mut(CLOCK_TUNING).collect = 6) },
  { id: 'collect 8', kind: 'lever', set: () => (mut(CLOCK_TUNING).collect = 8) },
  { id: 'deadline 2', kind: 'lever', set: () => (mut(CLOCK_TUNING).deadlineAfter = 2) },
  { id: 'deadline 1', kind: 'lever', set: () => (mut(CLOCK_TUNING).deadlineAfter = 1) },
  { id: 'cooldown 1', kind: 'lever', set: () => (mut(CLOCK_TUNING).cooldown = 1) },
  { id: 'seal 6 HP', kind: 'lever', set: () => (mut(CLOCK_SEAL).hp = 6) },
  { id: 'seal 12 HP', kind: 'lever', set: () => (mut(CLOCK_SEAL).hp = 12) },
  {
    id: 'deadline 2 + cooldown 1 + collect 6',
    kind: 'lever',
    set: () => {
      mut(CLOCK_TUNING).deadlineAfter = 2;
      mut(CLOCK_TUNING).cooldown = 1;
      mut(CLOCK_TUNING).collect = 6;
    },
  },
  {
    id: 'deadline 1 + collect 6 + seal 6 HP',
    kind: 'lever',
    set: () => {
      mut(CLOCK_TUNING).deadlineAfter = 1;
      mut(CLOCK_TUNING).collect = 6;
      mut(CLOCK_SEAL).hp = 6;
    },
  },
  { id: 'postmaster HP 28', kind: 'lever', set: () => setHp(28) },
  { id: 'postmaster HP 42', kind: 'lever', set: () => setHp(42) },
  {
    id: 'postmaster HP 28 + deadline 2 + collect 6',
    kind: 'lever',
    set: () => {
      setHp(28);
      mut(CLOCK_TUNING).deadlineAfter = 2;
      mut(CLOCK_TUNING).collect = 6;
    },
  },
  {
    id: 'postmaster HP 28 + Serve notice = Bolt> Ink Strike (a damage source)',
    kind: 'opener',
    set: () => {
      setHp(28);
      setNotice('Bolt> Ink Strike');
    },
  },
  {
    id: 'postmaster HP 28 + move 1',
    kind: 'movement',
    set: () => {
      setHp(28);
      mut(POSTMASTER_RIVAL).move = 1;
    },
  },
  { id: 'postmaster move 1', kind: 'movement', set: () => (mut(POSTMASTER_RIVAL).move = 1) },
  { id: 'postmaster move 2', kind: 'movement', set: () => (mut(POSTMASTER_RIVAL).move = 2) },
  {
    id: 'opener: Serve notice = Splash> Ink Sentence',
    kind: 'opener',
    set: () => setNotice('Splash> Ink Sentence'),
  },
  {
    id: 'opener: Serve notice = Bolt> Ink Strike (a damage source)',
    kind: 'opener',
    set: () => setNotice('Bolt> Ink Strike'),
  },
  {
    id: 'move 1 + Serve notice = Bolt> Ink Strike',
    kind: 'opener',
    set: () => {
      mut(POSTMASTER_RIVAL).move = 1;
      setNotice('Bolt> Ink Strike');
    },
  },
  {
    id: 'deadline 1 + collect 8',
    kind: 'lever',
    set: () => {
      mut(CLOCK_TUNING).deadlineAfter = 1;
      mut(CLOCK_TUNING).collect = 8;
    },
  },
  {
    id: 'deadline 1 + collect 8 + postmaster HP 28',
    kind: 'lever',
    set: () => {
      mut(CLOCK_TUNING).deadlineAfter = 1;
      mut(CLOCK_TUNING).collect = 8;
      setHp(28);
    },
  },
  {
    id: 'routine: notice first (a cast opener), writ second',
    kind: 'opener',
    set: () => castFirst(),
  },
  {
    id: 'routine: notice first + Serve notice = Bolt> Ink Strike (a damage source)',
    kind: 'opener',
    set: () => {
      castFirst();
      setNotice('Bolt> Ink Strike');
    },
  },
  {
    id: 'routine: notice first + Strike + postmaster HP 28',
    kind: 'opener',
    set: () => {
      castFirst();
      setNotice('Bolt> Ink Strike');
      setHp(28);
    },
  },
];
// A routine that opens with his notice (a spell), the writ second: the opener is then a cast.
const castFirst = () => {
  const r = mut(POSTMASTER_RIVAL);
  const step = r.routine.find((x) => x.action.kind === 'spell' && x.goal === 'hitParty');
  if (step) r.routine = [step, ...r.routine.filter((x) => x !== step)];
};
const mut = <T extends object>(o: T): Mut<T> => o as Mut<T>;
const setHp = (hp: number) => {
  mut(POSTMASTER).hp = hp;
  mut(POSTMASTER_RIVAL).hp = hp;
};
const setNotice = (lattice: string) => {
  const sp = mut(POSTMASTER_RIVAL).spells.find((x) => x.id === 'serveNotice');
  if (sp) mut(sp).lattice = lattice;
};

test.skipIf(!process.env.INK_LEVERS)(
  'INK_LEVERS: print the IQ-20/IQ-23 candidate table',
  () => {
    const n = Number(process.env.INK_LEVERS_SEEDS ?? 120);
    const hs = Array.from({ length: n }, (_, i) => 1000 + i);
    const only = process.env.INK_LEVERS_ONLY?.split(',');
    const out: string[] = [`## Lever candidates, fresh heart, ${n} seeds`, '', ...HEART_HEADER];
    const snap = {
      tuning: { ...CLOCK_TUNING },
      seal: CLOCK_SEAL.hp,
      burst: INK_FOE_TUNING.counterBurst,
      move: POSTMASTER_RIVAL.move,
      hp: POSTMASTER.hp,
      routine: [...POSTMASTER_RIVAL.routine],
      spells: POSTMASTER_RIVAL.spells.map((x) => ({ ...x })),
    };
    for (const [i, lever] of LEVERS.entries()) {
      if (only && !only.includes(String(i))) continue;
      try {
        lever.set();
        out.push(
          heartRow(
            `${i}. ${lever.kind}: ${lever.id}`,
            hs.map((s) => freshHeart(s)),
          ),
        );
      } finally {
        Object.assign(mut(CLOCK_TUNING), snap.tuning);
        mut(CLOCK_SEAL).hp = snap.seal;
        mut(INK_FOE_TUNING).counterBurst = snap.burst;
        mut(POSTMASTER_RIVAL).move = snap.move;
        setHp(snap.hp);
        mut(POSTMASTER_RIVAL).routine = snap.routine;
        for (const [k, sp] of POSTMASTER_RIVAL.spells.entries()) {
          const was = snap.spells[k];
          if (was) mut(sp).lattice = was.lattice;
        }
      }
    }
    process.stdout.write(`\nINK_LEVERS_TABLE\n${out.join('\n')}\n`);
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
