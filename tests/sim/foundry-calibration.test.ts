import { appendFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, test } from 'vitest';
import {
  atRoom,
  type Config,
  layoutCount,
  layoutName,
  paired,
  party,
  play,
  type Sample,
  STAT_HEADER,
  stats,
  statCells,
  candidateFromEnv,
  POLICY_NAMES,
  withBells,
  wornTrips,
} from './calibration/foundry-cartographers';
import { countEnv } from './calibration/runner';
import * as flow from '../../src/app/flow';

/**
 * CAL-4 (BF-20, BF-21): the foundry's genuine bot tables. Nothing here forces a victory: every fight
 * is `botFight` on the room as the trip builds it (`flow.startBattle`), under the default bot and
 * the district-aware bot (gauge + cracks, CAL-B's declared policy). Controlled-heart trials hang
 * exactly 0-4 great bells by writing a legal trip peal (the first N rooms' notes) before the heart
 * starts; naturally earned bells are reported separately from real worn trips. No win-rate gate:
 * the default run asserts only no-throw, no cap overrun and that the hung bells match the request.
 * Full tables: `CAL4=1 CAL4_OUT=out.md pnpm vitest run tests/sim/foundry-calibration.test.ts`.
 */
const full = process.env.CAL4 === '1';
/** CAL4_CAND tries a proposed number set in memory (see `CANDIDATES`); the run says which. */
const cand = candidateFromEnv();
afterAll(cand.restore);
const PARTIES = (process.env.CAL4_PARTIES ?? '1,2,3').split(',').map(Number);
const config: Config = {
  seeds: countEnv('CAL4_SEEDS', full ? 30 : 1),
  rounds: countEnv('CAL4_ROUNDS', full ? 40 : 4),
  budget: countEnv('CAL4_BUDGET', full ? 600 : 32),
  lite: !full,
  parties: PARTIES,
};
/** The default run is a smoke: one layout, the aware bot, party 2 outside the heart (about 20 fights). */
const policies = full
  ? ((process.env.CAL4_POLICIES?.split(',') as typeof POLICY_NAMES | undefined) ?? POLICY_NAMES)
  : (['aware'] as const);
const layouts = (room: number) => (full ? layoutCount('foundry', room) : 1);
const roomParties = process.env.CAL4_HEART_ONLY === '1' ? [] : full ? config.parties : [2];
const HEART = 4;
/** CAL4_BELLS narrows the hung-bell columns (a larger-seed 0-vs-4 run); CAL4_HEART_ONLY skips rooms 1-4 and worn trips. */
const BELLS = (process.env.CAL4_BELLS ?? '0,1,2,3,4').split(',').map(Number);

test(
  'CAL-4: foundry party and hung-bell tables',
  () => {
    const out: string[] = [
      '## CAL-4 foundry tables',
      '',
      `Candidate: ${cand.name}. Seeds 1-${config.seeds}; rounds ${config.rounds}; action budget ${config.budget}; lite=${config.lite}; starter lattices; first loot, onward, unchanged doorway. Policies: default = botFight with no options; aware = gauge + cracks (CAL-B). Stalls = round limit with neither side down; budget stops = action budget spent first. Paired = same seeds and layouts in every bell column.`,
      '',
    ];
    if (process.env.CAL4_OUT) {
      const sink = process.env.CAL4_OUT;
      writeFileSync(sink, `${out.join('\n')}\n`);
      const push = out.push.bind(out);
      out.push = (...rows: string[]) => {
        appendFileSync(sink, `${rows.join('\n')}\n`);
        return push(...rows);
      };
    }
    // ── 1. fresh rooms 1-4 ──
    out.push(
      '### Fresh rooms 1-4 (all layouts)',
      '',
      `| party | policy | room | layout | ${STAT_HEADER} |`,
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    );
    for (const size of roomParties) {
      for (const policy of policies) {
        for (let room = 0; room < HEART; room++) {
          for (let v = 0; v < layouts(room); v++) {
            const xs: Sample[] = [];
            for (let seed = 1; seed <= config.seeds; seed++) {
              const save = atRoom('foundry', party(size), seed, room, v);
              xs.push(play(flow.startBattle(save).state, party(size), policy, config, seed).sample);
            }
            out.push(
              `| ${size} | ${policy} | ${room + 1} | ${layoutName('foundry', room, v)} | ${statCells(xs)} |`,
            );
          }
        }
      }
    }
    // ── 2. controlled heart, 0-4 hung bells ──
    out.push(
      '',
      '### Controlled heart: legal peals with exactly N hung bells (authored heart layouts)',
      '',
      `| party | policy | bells | layout | ${STAT_HEADER} |`,
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    );
    const pooled = new Map<string, Sample[]>();
    for (const size of config.parties) {
      for (const policy of policies) {
        for (const bells of BELLS) {
          for (let v = 0; v < layouts(HEART); v++) {
            const xs: Sample[] = [];
            for (let seed = 1; seed <= config.seeds; seed++) {
              const save = atRoom('foundry', party(size), seed, HEART, v, (t) =>
                withBells(t, bells),
              );
              const r = play(flow.startBattle(save).state, party(size), policy, config, seed);
              expect(r.sample.hung, `hung bells at ${bells}`).toBe(bells);
              xs.push(r.sample);
            }
            const key = `${size}|${policy}|${bells}`;
            pooled.set(key, [...(pooled.get(key) ?? []), ...xs]);
            out.push(
              `| ${size} | ${policy} | ${bells} | ${layoutName('foundry', HEART, v)} | ${statCells(xs)} |`,
            );
          }
        }
      }
    }
    // ── 3. pooled by bells and the paired 0-vs-4 ──
    out.push(
      '',
      '### Controlled heart pooled over the three layouts',
      '',
      `| party | policy | bells | ${STAT_HEADER} |`,
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    );
    for (const size of config.parties)
      for (const policy of policies)
        for (const bells of BELLS)
          out.push(
            `| ${size} | ${policy} | ${bells} | ${statCells(pooled.get(`${size}|${policy}|${bells}`) ?? [])} |`,
          );
    out.push(
      '',
      '### Paired 0 bells vs 4 bells (same seed and layout; `wins 0 / wins 4` counts)',
      '',
      '| party | policy | both won | only 0 bells | only 4 bells | neither | n | rounds 0 → 4 | HP left % (all) 0 → 4 |',
      '|---|---|---|---|---|---|---|---|---|',
    );
    for (const size of config.parties)
      for (const policy of policies) {
        const a = pooled.get(`${size}|${policy}|0`) ?? [];
        const b = pooled.get(`${size}|${policy}|4`) ?? [];
        // pooled samples repeat seeds across layouts: pair them by position instead.
        const idx = (xs: Sample[]) => xs.map((x, i) => ({ ...x, seed: i }));
        const p = paired(idx(a), idx(b));
        out.push(
          `| ${size} | ${policy} | ${p.both} | ${p.onlyA} | ${p.onlyB} | ${p.neither} | ${p.n} | ${stats(a).rounds} → ${stats(b).rounds} | ${stats(a).hpLeft} → ${stats(b).hpLeft} |`,
        );
      }
    // ── 4. worn trips, earned bells ──
    out.push(
      '',
      '### Real worn trips (bells earned, not injected)',
      '',
      `| party | policy | room | wins/reached | win % | stalled | lost | budget stops | mean rounds | HP left % | mean bells at entry |`,
      '|---|---|---|---|---|---|---|---|---|---|---|',
    );
    const notes: string[] = [];
    for (const size of roomParties) {
      for (const policy of policies) {
        const bellsIn: number[] = [];
        const { worn, ends } = wornTrips('foundry', size, policy, config, (t, _s, initial) => {
          if (t.encounter === HEART)
            bellsIn.push(initial.tiles.filter((x) => x.piece?.id === 'foundry:greatBell').length);
        });
        worn.forEach((cells, room) => {
          const xs = cells.flat();
          const s = stats(xs);
          out.push(
            `| ${size} | ${policy} | ${room + 1}${room === HEART ? ' (heart)' : ''} | ${s.wins}/${s.n} | ${s.pct} | ${s.stalls} | ${s.losses} | ${s.stops} | ${s.rounds} | ${s.hpLeft} | ${room === HEART ? bellsIn.join(',') || '—' : '—'} |`,
          );
        });
        notes.push(`Party ${size} ${policy}: trip ends ${JSON.stringify(ends)} / ${config.seeds}.`);
      }
    }
    out.push('', ...notes);
    const md = out.join('\n');
    if (full) process.stdout.write(`${md}\n`);
  },
  full ? 36_000_000 : 60_000,
);
