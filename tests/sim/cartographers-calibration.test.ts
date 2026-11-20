import { appendFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, test } from 'vitest';
import { applyAction, type BattleState, type GameEvent } from '$engine';
import { legalAims, legalMoves, memberById } from '$engine/queries';
import { encountersOf } from '$data';
import { withLattices } from '../scenarios/harness';
import { withFootnotes } from '../scenarios/footnoteHarness';
import * as flow from '../../src/app/flow';
import {
  atRoom,
  type Config,
  layoutCount,
  layoutName,
  candidateFromEnv,
  POLICY_NAMES,
  party,
  play,
  type Sample,
  STAT_HEADER,
  statCells,
  stats,
  wornTrips,
} from './calibration/foundry-cartographers';
import { countEnv } from './calibration/runner';

/**
 * CAL-4 (CG-9, CG-10): the academy's genuine bot tables, fresh and trip-worn, party 1-3, every
 * layout of the six rooms, default and district-aware bot. Depths 1-4 are the ones the canals' band
 * names; the deeper non-heart room 5 and the heart (room 6) are reported separately, since the
 * canals have no room 5 to compare. No win-rate gate: the default run asserts only no-throw and
 * no cap overrun (`play` replays every fight). Full tables:
 * `CAL4=1 CAL4_OUT=out.md pnpm vitest run tests/sim/cartographers-calibration.test.ts`.
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
  parties: full ? PARTIES : [2],
};
const policies = full
  ? ((process.env.CAL4_POLICIES?.split(',') as typeof POLICY_NAMES | undefined) ?? POLICY_NAMES)
  : (['aware'] as const);
const layouts = (room: number) => (full ? layoutCount('cartographers', room) : 1);
const ROOMS = 6;
/** CAL4_ROOMS (0-based) narrows the fresh tables to some rooms; the worn trips always run whole. */
const roomsOnly = process.env.CAL4_ROOMS?.split(',').map(Number);
const label = (room: number) =>
  room === ROOMS - 1
    ? '6 (heart)'
    : room === ROOMS - 2
      ? '5 (deeper, non-heart)'
      : String(room + 1);

test(
  'CAL-4: academy fresh and worn combat tables',
  () => {
    const out: string[] = [
      '## CAL-4 academy tables',
      '',
      `Candidate: ${cand.name}. Seeds 1-${config.seeds}; rounds ${config.rounds}; action budget ${config.budget}; lite=${config.lite}; starter lattices; authored layouts (drawn frames are CAL-5). Policies: default = botFight with no options; aware = gauge + cracks (CAL-B; the rub term is read through gauge). Stalls = round limit, neither side down.`,
      '',
      '### Fresh rooms',
      '',
      `| party | policy | room | layout | ${STAT_HEADER} |`,
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
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
    const pooled = new Map<string, Sample[]>();
    for (const size of config.parties) {
      for (const policy of policies) {
        for (let room = 0; room < ROOMS; room++) {
          if (roomsOnly && !roomsOnly.includes(room)) continue;
          for (let v = 0; v < layouts(room); v++) {
            const xs: Sample[] = [];
            for (let seed = 1; seed <= config.seeds; seed++) {
              const save = atRoom('cartographers', party(size), seed, room, v);
              xs.push(play(flow.startBattle(save).state, party(size), policy, config, seed).sample);
            }
            const key = `${size}|${policy}|${room}`;
            pooled.set(key, [...(pooled.get(key) ?? []), ...xs]);
            out.push(
              `| ${size} | ${policy} | ${label(room)} | ${layoutName('cartographers', room, v)} | ${statCells(xs)} |`,
            );
          }
        }
      }
    }
    out.push(
      '',
      '### Fresh, pooled over the layouts of each room',
      '',
      `| party | policy | room | ${STAT_HEADER} |`,
      '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    );
    for (const size of config.parties)
      for (const policy of policies)
        for (let room = 0; room < ROOMS; room++)
          out.push(
            `| ${size} | ${policy} | ${label(room)} | ${statCells(pooled.get(`${size}|${policy}|${room}`) ?? [])} |`,
          );
    out.push(
      '',
      '### Trip-worn (real trips, first loot, bot HP and charges carried)',
      '',
      `| party | policy | room | wins/reached | win % | stalled | lost | budget stops | mean rounds | HP left % | entry HP (mean of reached) |`,
      '|---|---|---|---|---|---|---|---|---|---|---|',
    );
    const notes: string[] = [];
    for (const size of config.parties) {
      for (const policy of policies) {
        const { worn, ends } = wornTrips('cartographers', size, policy, config);
        worn.forEach((cells, room) => {
          const xs = cells.flat();
          const s = stats(xs);
          const entry = xs.length
            ? (xs.reduce((n, x) => n + x.hpIn, 0) / xs.length).toFixed(1)
            : '—';
          out.push(
            `| ${size} | ${policy} | ${label(room)}${xs.length ? '' : ' UNREACHED'} | ${s.wins}/${s.n} | ${s.pct} | ${s.stalls} | ${s.losses} | ${s.stops} | ${s.rounds} | ${s.hpLeft} | ${entry} |`,
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

/**
 * Watch case (CG-J, the Registrar's note `registrar:swap`): a member's Swap that leaves a foe on
 * pencil circles it, and a circled foe still on its tile at round end is erased from the fight. The
 * greedy bot cannot cast Swap from its starter pages and `botFight` passes no footnotes, so the
 * case is fixed instead: the Draughtsman carries the Registrar's own `Bolt> Swap`, and from each
 * authored room layout at round 1 every one-turn line (stay or walk, then one Swap cast) is played
 * out to the end of the round with the note written and without it. Counts: states where some line
 * leaves a foe on pencil (prevalence), states where the noted line erases a foe at round end, and
 * how often that foe is the Registrar himself. No rule is changed here; a nonzero Registrar count
 * is the player-rule question (should an elite be erasable by his own page's note?).
 */
const SWAP_PAGE = 'Bolt> Swap';
const NOTE = withFootnotes(['registrar:swap']);
const swapState = (s: BattleState): BattleState => {
  const donor = memberById(
    withLattices('D r', { draughtsman: SWAP_PAGE, stoker: SWAP_PAGE }),
    'draughtsman',
  );
  const t = structuredClone(s);
  const m = memberById(t, 'draughtsman');
  m.spells = structuredClone(donor.spells);
  m.charges = structuredClone(donor.charges);
  return t;
};
const count = (events: readonly GameEvent[], type: string) =>
  events.filter((e) => e.type === type).length;

test(
  'CAL-4: Registrar-note swap-on-pencil watch case',
  () => {
    const seeds = countEnv('CAL4_SEEDS', full ? 10 : 1);
    const rows: string[] = [
      '',
      "### Watch case: the Registrar's note on Swap (fixed Bolt> Swap, one turn, round 1)",
      '',
      '| room | layouts x seeds | states with a Swap line leaving a foe on pencil | states where the note erases a foe by round end | of those, lines erasing the Registrar | states won outright by the erase | foe erased without the note (control) |',
      '|---|---|---|---|---|---|---|',
    ];
    for (let room = 0; room < ROOMS; room++) {
      let states = 0;
      let opportunity = 0;
      let erased = 0;
      let registrar = 0;
      let won = 0;
      let control = 0;
      for (let v = 0; v < layoutCount('cartographers', room); v++) {
        for (let seed = 1; seed <= seeds; seed++) {
          const start = swapState(
            flow.startBattle(atRoom('cartographers', party(1), seed, room, v)).state,
          );
          states++;
          const spots = [null, ...legalMoves(start, 'draughtsman')];
          let anyOpp = false;
          let anyErased = false;
          let anyRegistrar = false;
          let anyWon = false;
          let anyControl = false;
          // Re-run each line with and without the note from the same pre-cast board.
          for (const to of spots) {
            const moved = to
              ? applyAction(start, { type: 'move', unit: 'draughtsman', to }).state
              : start;
            const m = memberById(moved, 'draughtsman');
            for (const sp of m.spells) {
              for (const aim of legalAims(moved, 'draughtsman', sp.key)) {
                const cast = { type: 'cast', unit: 'draughtsman', spell: sp.key, aim } as const;
                const withNote = applyAction(moved, cast, NOTE);
                if (count(withNote.events, 'cartographers:circled') === 0) continue;
                anyOpp = true;
                const end = applyAction(withNote.state, { type: 'endTurn' }, NOTE);
                const struck = end.events.filter((e) => e.type === 'cartographers:struck');
                if (struck.length) {
                  anyErased = true;
                  const ids = struck.flatMap(
                    (e) => (e as { data?: { units?: string[] } }).data?.units ?? [],
                  );
                  if (
                    ids.some(
                      (id) =>
                        end.state.units.find((u) => u.id === id)?.kind === 'enemy' &&
                        end.state.units.find((u) => u.id === id)?.def === 'registrar',
                    )
                  )
                    anyRegistrar = true;
                  if (end.state.phase === 'won') anyWon = true;
                }
                const plain = applyAction(applyAction(moved, cast).state, { type: 'endTurn' });
                if (count(plain.events, 'cartographers:struck') > 0) anyControl = true;
              }
            }
          }
          opportunity += Number(anyOpp);
          erased += Number(anyErased);
          registrar += Number(anyRegistrar);
          won += Number(anyWon);
          control += Number(anyControl);
        }
      }
      rows.push(
        `| ${label(room)} | ${states} | ${opportunity} | ${erased} | ${registrar} | ${won} | ${control} |`,
      );
    }
    expect(encountersOf('cartographers').length).toBe(ROOMS);
    const md = rows.join('\n');
    if (full) process.stdout.write(`${md}\n`);
    if (process.env.CAL4_WATCH_OUT) writeFileSync(process.env.CAL4_WATCH_OUT, `${md}\n`);
  },
  full ? 36_000_000 : 60_000,
);
