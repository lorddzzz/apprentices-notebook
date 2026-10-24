import { describe, expect, test } from 'vitest';
import {
  APPRENTICE_IDS,
  type ApprenticeId,
  DISTRICTS,
  encountersOf,
  PLAYABLE_DISTRICTS,
  RUNE_IDS,
} from '$data';
import {
  type Action,
  applyAction,
  type BattleState,
  basicDirs,
  castableSpells,
  compiledFor,
  createBattle,
  createEncounterBattle,
  deriveSeed,
  inventionLibrary,
  isOpen,
  isSilent,
  joinHousehold,
  legalAims,
  legalMoves,
  memberById,
  newProfile,
  newSave,
  type Profile,
  type SlotIndex,
  setSlot,
  startTrip,
  type Trip,
  tripParty,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { createRng } from '$engine/rng';
import { checkRoom, startSeedFor } from '$engine/rooms';
import { endBattle, pushOnward, startBattle, takeOffer } from '../../src/app/flow';
import { projectWith, viewOf } from '../../src/app/view';
import { botFight } from './bot';
import baseline from './pre-household-layouts.json';

/**
 * HC-9: the household sweep. Every room variant of every playable district is played by the
 * greedy bot with parties of one, two and three (the founders, then a recruit), on the drawn
 * start points. Always on: a small seed set plus the invariants. `HOUSEHOLD_SWEEP=1` runs the
 * full table (50 seeds) and prints it; `HOUSEHOLD_SEEDS=n` sets the seed count.
 */

const FULL = Boolean(process.env.HOUSEHOLD_SWEEP);
const SEEDS = Number(process.env.HOUSEHOLD_SEEDS) || (FULL ? 50 : 1);
/** Rounds the bot may play: a stalled bot pacing with no charges costs most of a fight's time. */
const ROUNDS = FULL ? 40 : 20;
const seeds = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** A notebook whose slots hold exactly `who` (joining anyone missing). */
function withParty(who: readonly ApprenticeId[]): Profile {
  // A recruit's page may lean on runes the household has not met: the sweep tests fights, not learning.
  const base = newProfile();
  let p: Profile = {
    ...base,
    known: [...RUNE_IDS],
    city: { ...base.city, heard: ['seam', 'canals'], open: ['seam', 'canals'] },
  };
  for (const id of who) p = joinHousehold(p, id);
  for (const slot of [0, 1, 2] as SlotIndex[]) p = setSlot(p, slot, null);
  who.forEach((id, i) => {
    p = setSlot(p, i as SlotIndex, id);
  });
  return p;
}

const LINEUPS: { name: string; who: ApprenticeId[] }[] = [
  { name: 'D alone', who: ['draughtsman'] },
  { name: 'S alone', who: ['stoker'] },
  { name: 'D+S', who: ['draughtsman', 'stoker'] },
  { name: 'D+S+R', who: ['draughtsman', 'stoker', 'runaway'] },
  { name: 'S+R+D', who: ['stoker', 'runaway', 'draughtsman'] },
];

interface Room {
  district: (typeof PLAYABLE_DISTRICTS)[number];
  index: number;
  variant: number;
  name: string;
  layout: string;
}
const ROOMS: Room[] = PLAYABLE_DISTRICTS.flatMap((district) =>
  encountersOf(district).flatMap((enc, index) =>
    enc.variants.map((v, variant) => ({
      district,
      index,
      variant,
      name: `${district}/${index + 1}.${variant + 1} ${v.name}`,
      layout: v.layout,
    })),
  ),
);

/** The room's opening battle for `who` on seed `seed`, the way a trip builds it (HC-4). */
function openRoom(room: Room, who: readonly ApprenticeId[], seed: number): BattleState {
  const p = withParty(who);
  const trip = { seed } as Trip;
  const party = Object.fromEntries(
    who.map((id) => [id, { spells: compiledFor(p, id).spells }] as const),
  );
  const enc = encountersOf(room.district)[room.index];
  if (!enc) throw new Error(`No room ${room.name}`);
  return createEncounterBattle(
    enc,
    party,
    deriveSeed(seed, room.index),
    room.variant,
    room.district,
    inventionLibrary(p),
    { lineup: who, startSeed: startSeedFor(trip, room.index) },
  ).state;
}

const members = (s: BattleState) => s.units.filter((u) => u.kind === 'member');

/** Placement invariants: one unit per apprentice, distinct standable start points, deterministic. */
function checkPlacement(s: BattleState, who: readonly ApprenticeId[], again: BattleState) {
  const ms = members(s);
  expect(ms.map((m) => m.def).sort()).toEqual([...who].sort());
  const spots = new Set(ms.map((m) => `${m.pos.x},${m.pos.y}`));
  expect(spots.size).toBe(who.length);
  for (const m of ms)
    expect(isOpen(s, m.pos, m.id), `${m.def} at ${m.pos.x},${m.pos.y}`).toBe(true);
  expect(ms.map((m) => `${m.def}@${m.pos.x},${m.pos.y}`)).toEqual(
    members(again).map((m) => `${m.def}@${m.pos.x},${m.pos.y}`),
  );
}

describe('rooms hold up for every party size (HC-9)', () => {
  test('the room list covers the Seam (12) and the canals (15)', () => {
    expect(ROOMS).toHaveLength(27);
    for (const r of ROOMS) expect(checkRoom(r.layout), r.name).toEqual([]);
  });

  test('each lineup is placed on distinct standable start points, the same on every replay', () => {
    const rng = createRng(90);
    for (const room of ROOMS) {
      for (const { who } of LINEUPS) {
        for (const seed of seeds(FULL ? 50 : 10)) {
          checkPlacement(openRoom(room, who, seed), who, openRoom(room, who, seed));
        }
      }
      // Any of the nine, in any order, 1–3 at a time.
      for (let n = 0; n < (FULL ? 30 : 6); n++) {
        const pool = [...APPRENTICE_IDS];
        const who: ApprenticeId[] = [];
        for (let k = rng.int(1, 3); k > 0; k--) {
          who.push(pool.splice(rng.int(0, pool.length - 1), 1)[0] as ApprenticeId);
        }
        const seed = rng.int(1, 9999);
        checkPlacement(openRoom(room, who, seed), who, openRoom(room, who, seed));
      }
    }
  });

  test('a smaller party takes the leading spots of the larger party draw', () => {
    for (const room of ROOMS) {
      const trio = members(openRoom(room, ['draughtsman', 'stoker', 'runaway'], 5));
      const pair = members(openRoom(room, ['draughtsman', 'stoker'], 5));
      const at = (ms: typeof trio, id: string) => ms.find((m) => m.def === id)?.pos;
      expect(at(pair, 'draughtsman'), room.name).toEqual(at(trio, 'draughtsman'));
      expect(at(pair, 'stoker'), room.name).toEqual(at(trio, 'stoker'));
    }
  });
});

interface Tally {
  won: number;
  lost: number;
  stalled: number;
  rounds: number;
  hpLeft: number;
}
const blank = (): Tally => ({ won: 0, lost: 0, stalled: 0, rounds: 0, hpLeft: 0 });

function tally(t: Tally, s: BattleState, who: readonly string[]) {
  if (s.phase === 'won') t.won++;
  else if (s.phase === 'lost') t.lost++;
  else t.stalled++;
  t.rounds += s.round;
  t.hpLeft += who.reduce((n, id) => n + memberById(s, id).hp, 0);
}

/** Per-room bot fights with fresh HP and charges (a calibration, not a trip win rate). */
function sweep(who: readonly ApprenticeId[], rooms: readonly Room[], n: number) {
  const out = new Map<string, Tally>();
  for (const room of rooms) {
    const t = blank();
    for (const seed of seeds(n)) {
      const fight = botFight(openRoom(room, who, seed), ROUNDS, who);
      expect(fight.state.round, `${room.name} seed ${seed}`).toBeLessThanOrEqual(ROUNDS + 1);
      tally(t, fight.state, who);
    }
    out.set(room.name, t);
  }
  return out;
}

const pct = (n: number, d: number) => Math.round((100 * n) / d);

/** Slow tests run long only under HOUSEHOLD_SWEEP; otherwise they get 90 s, since a loaded machine slows the bot. */
const LONG = FULL ? 3_600_000 : 90_000;

function report(name: string, rows: Map<string, Tally>, n: number) {
  const total = blank();
  for (const t of rows.values()) {
    total.won += t.won;
    total.lost += t.lost;
    total.stalled += t.stalled;
    total.rounds += t.rounds;
  }
  const fights = rows.size * n;
  const lines = [
    `## ${name}: won ${pct(total.won, fights)}% lost ${pct(total.lost, fights)}% stalled ${pct(total.stalled, fights)}% (${fights} fights)`,
  ];
  for (const [room, t] of rows) {
    lines.push(
      `${room}: won ${pct(t.won, n)}% lost ${pct(t.lost, n)}% stalled ${pct(t.stalled, n)}% rounds ${(t.rounds / n).toFixed(1)}`,
    );
  }
  console.log(lines.join('\n'));
}

describe('the bot plays every room with every party size (HC-9)', () => {
  test.each(LINEUPS)(
    '$name: no throw, no overrun, every room fought',
    ({ name, who }) => {
      const rows = sweep(who, ROOMS, SEEDS);
      let fights = 0;
      for (const t of rows.values()) fights += t.won + t.lost + t.stalled;
      expect(fights).toBe(ROOMS.length * SEEDS);
      if (FULL) report(name, rows, SEEDS);
    },
    LONG,
  );

  // The members sweep (HC-8 follow-up): each of the nine alone, on three quick Seam rooms by default (a lone bot can stall for minutes elsewhere).
  test.each(APPRENTICE_IDS.map((id) => [id]))(
    '%s alone plays their rooms',
    (id) => {
      const rooms = FULL ? ROOMS : ROOMS.filter((_, i) => [0, 3, 9].includes(i));
      const rows = sweep([id], rooms, FULL ? Math.min(SEEDS, 20) : 1);
      if (FULL) report(`${id} alone`, rows, Math.min(SEEDS, 20));
      expect(rows.size).toBe(rooms.length);
    },
    LONG,
  );

  test(
    'the founders on the drawn spots against the old fixed spots',
    () => {
      const who: ApprenticeId[] = ['draughtsman', 'stoker'];
      const p = withParty(who);
      const old = [...baseline.seam, ...baseline.canals];
      expect(old).toHaveLength(ROOMS.length);
      ROOMS.forEach((room, i) => {
        // The old boards only differ from the new ones by D, S and the extra P points.
        const was = (old[i] as string).split('\n');
        const now = room.layout.split('\n');
        expect(now.length, room.name).toBe(was.length);
        now.forEach((row, y) => {
          row
            .trim()
            .split(/\s+/)
            .forEach((cell, x) => {
              const before = (was[y] as string).trim().split(/\s+/)[x] as string;
              if (!cell.startsWith('P') && !/^[DS]/.test(before))
                expect(cell, room.name).toBe(before);
            });
        });
      });
      const n = FULL ? SEEDS : 1;
      let drawn = 0;
      let fixed = 0;
      const table: string[] = [];
      ROOMS.forEach((room, i) => {
        let was = 0;
        let now = 0;
        for (const seed of seeds(n)) {
          const s = createBattle({
            title: room.name,
            board: old[i] as string,
            seed: deriveSeed(seed, room.index),
            party: Object.fromEntries(who.map((id) => [id, { spells: compiledFor(p, id).spells }])),
            edge: DISTRICTS[room.district].edge,
            inventions: inventionLibrary(p),
          }).state;
          if (botFight(s, ROUNDS).state.phase === 'won') was++;
          if (botFight(openRoom(room, who, seed), ROUNDS, who).state.phase === 'won') now++;
        }
        drawn += now;
        fixed += was;
        table.push(`${room.name}: fixed ${pct(was, n)}% drawn ${pct(now, n)}%`);
      });
      if (FULL) {
        console.log(
          `${table.join('\n')}\nTOTAL fixed ${fixed} drawn ${drawn} of ${ROOMS.length * n}`,
        );
        expect(drawn).toBeGreaterThanOrEqual(Math.floor(fixed * 0.8));
      }
    },
    LONG,
  );
});

// ── whole trips ─────────────────────────────────────────

/** A bot trip: every fight to the end, first offer, push on; returns how far it got. */
function botTrip(who: readonly ApprenticeId[], seed: number, district: 'seam' | 'canals') {
  let save = newSave(seed);
  save = { ...save, profile: withParty(who) };
  const nextSeed = seed;
  save = {
    ...save,
    trip: startTrip(save.profile, nextSeed, district),
  };
  let rooms = 0;
  let outcome = 'stuck';
  for (let guard = 0; guard < 40 && save.trip; guard++) {
    const status = save.trip.status;
    if (status === 'fight') {
      expect(tripParty(save.profile)).toEqual(save.trip.party);
      const start = startBattle(save);
      const fight = botFight(start.state, ROUNDS, save.trip.party);
      rooms++;
      if (fight.state.phase === 'player') {
        outcome = 'stalled';
        break;
      }
      const end = endBattle(save, fight.state, fight.events);
      save = end.save;
      if (end.outcome === 'wiped') {
        outcome = 'wiped';
        break;
      }
    } else if (status === 'looting') {
      save = takeOffer(save, 0);
    } else if (status === 'crossroads') {
      save = pushOnward(save);
    } else {
      outcome = status;
      break;
    }
  }
  if (!save.trip && outcome === 'stuck') outcome = 'wiped';
  return { outcome, rooms };
}

describe('whole bot trips with one, two and three (HC-9)', () => {
  test.each(LINEUPS)(
    '$name: trips run to a wipe or the heart without throwing',
    ({ who }) => {
      const n = FULL ? SEEDS : 2;
      const ends: Record<string, number> = {};
      let rooms = 0;
      for (const district of ['seam', 'canals'] as const) {
        for (const seed of seeds(n)) {
          const r = botTrip(who, seed, district);
          ends[`${district}:${r.outcome}`] = (ends[`${district}:${r.outcome}`] ?? 0) + 1;
          rooms += r.rooms;
          expect(r.rooms).toBeGreaterThan(0);
        }
      }
      if (FULL) console.log(`trips ${who.join('+')}: ${JSON.stringify(ends)} rooms ${rooms}`);
    },
    LONG,
  );
});

// ── random legal walks ─────────────────────────────────

/** The visible state: durations and mark lineage are bookkeeping. */
function visible(s: ReturnType<typeof viewOf>) {
  return {
    units: s.units.map((u) =>
      u.alive ? { id: u.id, pos: u.pos, hp: u.hp, shield: u.shield, mark: u.mark } : { id: u.id },
    ),
    tiles: s.tiles.map((t) => ({ state: t.state, hits: t.hits })),
    round: s.round,
    phase: s.phase,
  };
}

describe('random legal walks on every room (HC-9 fuzz)', () => {
  test(
    'any party of 1–3 from all nine apprentices: events project to the engine state',
    () => {
      const rng = createRng(4242);
      const walks = FULL ? 400 : 40;
      for (let w = 0; w < walks; w++) {
        const room = ROOMS[rng.int(0, ROOMS.length - 1)] as Room;
        const pool = [...APPRENTICE_IDS];
        const who: ApprenticeId[] = [];
        for (let k = rng.int(1, 3); k > 0; k--) {
          who.push(pool.splice(rng.int(0, pool.length - 1), 1)[0] as ApprenticeId);
        }
        let state = openRoom(room, who, rng.int(1, 9999));
        for (let n = 0; n < 30 && state.phase === 'player'; n++) {
          const options: Action[] = [{ type: 'endTurn' }];
          for (const id of who) {
            const m = memberById(state, id);
            if (m.hp <= 0) continue;
            for (const to of legalMoves(state, id)) options.push({ type: 'move', unit: id, to });
            for (const dir of m.acted ? [] : basicDirs(state, id)) {
              options.push({ type: m.action, unit: id, dir } as Action);
            }
            for (const { spell, usable } of castableSpells(state, id)) {
              if (!usable) continue;
              for (const aim of legalAims(state, id, spell.key)) {
                options.push({ type: 'cast', unit: id, spell: spell.key, aim });
              }
            }
          }
          const action =
            rng.int(0, 5) === 0
              ? ({ type: 'endTurn' } as Action)
              : options[rng.int(0, options.length - 1)];
          if (!action) throw new Error('no options');
          const before = viewOf(state);
          const result = applyAction(state, action);
          if (action.type !== 'endTurn' && action.type !== 'move') {
            expect(result.events.length, `${room.name} ${action.type}`).toBeLessThanOrEqual(
              CAST_EVENT_CAP + 3,
            );
          }
          const projected = result.events.reduce(
            (v, e) => (isSilent(e) ? v : projectWith(v, e)),
            before,
          );
          expect(visible(projected), `${room.name} ${who.join('+')} #${n} ${action.type}`).toEqual(
            visible(viewOf(result.state)),
          );
          // No two living units share a tile.
          const alive = result.state.units
            .filter((u) => u.hp > 0)
            .map((u) => `${u.pos.x},${u.pos.y}`);
          expect(new Set(alive).size).toBe(alive.length);
          state = result.state;
        }
      }
    },
    LONG,
  );
});
