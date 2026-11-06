import { appendFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { type ApprenticeId, RUNE_IDS } from '$data';
import {
  type Action,
  applyAction,
  basicDirs,
  castableSpells,
  joinHousehold,
  legalAims,
  legalMoves,
  memberById,
  newProfile,
  newSave,
  type Profile,
  type SaveData,
  type SlotIndex,
  setSlot,
  startTrip,
} from '$engine';
import { CAST_EVENT_CAP } from '$engine/ctx';
import { chooseAt } from '$engine/districts/api';
import { crackedSet } from '$engine/districts/bridges/preview';
import { createRng } from '$engine/rng';
import { endBattle, leaveDoorway, startBattle, takeOffer } from '../../src/app/flow';
import { botFight } from './bot';

/**
 * Bridges bot, fuzz and calibration (BR-21). Whole trips on both span kinds with parties of one,
 * two and three; the bot never ends a move on a cracked tile when a standing one is reachable.
 * Measures and prints only: no tuning. `BRIDGES_SEEDS=n` (or `BRIDGES_TABLE=1`, 40 seeds) widens
 * the sample and prints the per-room table (docs/plans/bridges-verification.md).
 */

const TABLE = Boolean(process.env.BRIDGES_TABLE);
const SEEDS = Number(process.env.BRIDGES_SEEDS ?? (TABLE ? 12 : 1));
/** Table lines go to the file named by `BRIDGES_OUT` (console output is lost in a long vitest run). */
const out = (text: string) => {
  if (process.env.BRIDGES_OUT) appendFileSync(process.env.BRIDGES_OUT, `${text}\n`);
};
const LONG = TABLE ? 3_600_000 : 120_000;
const PARTIES: { name: string; who: ApprenticeId[] }[] = [
  { name: '1', who: ['draughtsman'] },
  { name: '2', who: ['draughtsman', 'stoker'] },
  { name: '3', who: ['draughtsman', 'stoker', 'runaway'] },
];
type Span = 'sound' | 'crumbling';
const SPANS: Span[] = ['sound', 'crumbling'];

function profileFor(who: readonly ApprenticeId[]): Profile {
  const base = newProfile();
  let p: Profile = {
    ...base,
    known: [...RUNE_IDS],
    city: {
      ...base.city,
      heard: [...base.city.heard, 'bridges'],
      open: [...base.city.open, 'bridges'],
    },
  };
  for (const id of who) p = joinHousehold(p, id);
  for (const slot of [0, 1, 2] as SlotIndex[]) p = setSlot(p, slot, null);
  who.forEach((id, i) => {
    p = setSlot(p, i as SlotIndex, id);
  });
  return p;
}

function begin(who: readonly ApprenticeId[], seed: number): SaveData {
  const save: SaveData = { ...newSave(seed), profile: profileFor(who) };
  return { ...save, trip: startTrip(save.profile, seed, 'bridges') };
}

interface Room {
  won: boolean;
  falls: number; // party members that fell out of the room
  rounds: number;
  board: string;
}

/** One bot trip over one span kind: the rooms it reached, in order, with how each ended. */
function trip(who: readonly ApprenticeId[], seed: number, span: Span, cracks = true): Room[] {
  let save = begin(who, seed);
  const rooms: Room[] = [];
  for (let guard = 0; guard < 60 && save.trip; guard++) {
    const t = save.trip;
    if (t.status === 'fight') {
      const start = startBattle(save);
      const fight = botFight(start.state, 30, t.party, { cracks });
      rooms.push({
        won: fight.state.phase === 'won',
        falls: fight.events.filter((e) => e.type === 'outOfRoom').length,
        rounds: fight.state.round,
        board: `${start.state.width}x${start.state.height} ${start.state.title}`,
      });
      if (fight.state.phase === 'player') break;
      const end = endBattle(save, fight.state, fight.events);
      save = end.save;
      if (end.outcome === 'wiped') break;
    } else if (t.status === 'looting') save = takeOffer(save, 0);
    else if (t.status === 'doorway') save = leaveDoorway(save, save.profile);
    else if (t.status === 'crossroads') save = { ...save, trip: chooseAt(t, span) };
    else break;
  }
  return rooms;
}

describe('the bot reads the cracks (BR-21)', () => {
  test(
    'a move onto a cracked tile is only taken when every legal move is cracked',
    () => {
      let checked = 0;
      for (const span of SPANS) {
        for (let seed = 1; seed <= SEEDS + 2; seed++) {
          let save = begin(['draughtsman', 'stoker'], seed);
          for (let guard = 0; guard < 60 && save.trip; guard++) {
            const t = save.trip;
            if (t.status === 'crossroads') {
              save = { ...save, trip: chooseAt(t, span) };
              continue;
            }
            if (t.status !== 'fight') break;
            const start = startBattle(save);
            const fight = botFight(structuredClone(start.state), 30, t.party, { cracks: true });
            let s = structuredClone(start.state);
            for (const a of fight.actions) {
              if (a.type === 'move') {
                const unit = a.unit;
                const before = s;
                const cracked = (c: { x: number; y: number }) =>
                  crackedSet(applyAction(before, { type: 'move', unit, to: c }).state).some(
                    (k) => k.x === c.x && k.y === c.y,
                  );
                if (cracked(a.to)) {
                  expect(legalMoves(s, unit).every(cracked), `seed ${seed} ${span}`).toBe(true);
                }
                checked++;
              }
              s = applyAction(s, a).state;
            }
            if (fight.state.phase === 'player') break;
            const end = endBattle(save, fight.state, fight.events);
            save = end.save;
            if (end.outcome === 'wiped') break;
            while (save.trip?.status === 'looting') save = takeOffer(save, 0);
            if (save.trip?.status === 'doorway') save = leaveDoorway(save, save.profile);
          }
        }
      }
      expect(checked).toBeGreaterThan(20);
    },
    LONG,
  );
});

describe('whole bot trips on the bridges (BR-21)', () => {
  test(
    'parties of 1, 2 and 3 on both span kinds: win rate by room',
    () => {
      const lines: string[] = [];
      for (const party of PARTIES) {
        for (const span of SPANS) {
          const stats = new Map<
            number,
            { fights: number; wins: number; falls: number; rounds: number }
          >();
          const boards = new Set<string>();
          let cleared = 0;
          for (let seed = 1; seed <= SEEDS; seed++) {
            const rooms = trip(party.who, seed, span);
            expect(rooms.length).toBeGreaterThan(0);
            if (rooms.length === 5 && rooms.every((r) => r.won)) cleared++;
            rooms.forEach((r, i) => {
              const c = stats.get(i) ?? { fights: 0, wins: 0, falls: 0, rounds: 0 };
              c.fights++;
              if (r.won) c.wins++;
              c.falls += r.falls;
              c.rounds += r.rounds;
              stats.set(i, c);
              boards.add(r.board);
            });
          }
          const cells = [...stats.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(
              ([i, c]) =>
                `r${i + 1} ${c.wins}/${c.fights} fall ${(c.falls / c.fights).toFixed(1)} rd ${(c.rounds / c.fights).toFixed(1)}`,
            );
          lines.push(
            `party ${party.name} ${span}: cleared ${cleared}/${SEEDS} | ${cells.join(' | ')} | boards ${boards.size}`,
          );
        }
      }
      if (TABLE) out(lines.join('\n'));
    },
    LONG,
  );

  test(
    'the cracks-reading bot falls no more than the blind one',
    () => {
      const who = PARTIES[1]?.who ?? [];
      let reading = 0;
      let blind = 0;
      for (let seed = 1; seed <= SEEDS + 2; seed++) {
        for (const span of SPANS) {
          reading += trip(who, seed, span, true).reduce((n, r) => n + r.falls, 0);
          blind += trip(who, seed, span, false).reduce((n, r) => n + r.falls, 0);
        }
      }
      if (TABLE) out(`falls: reading ${reading}, blind ${blind}`);
      expect(reading).toBeLessThanOrEqual(blind);
    },
    LONG,
  );
});

describe('random legal walks on every bridges board (BR-21 fuzz)', () => {
  test(
    'no throw, no cap overrun, both spans, parties of 1-3',
    () => {
      const rng = createRng(2121);
      const boards = new Set<string>();
      const walks = TABLE ? 200 : 20;
      for (let w = 0; w < walks; w++) {
        const party = PARTIES[rng.int(0, 2)];
        if (!party) throw new Error('no party');
        const span = SPANS[rng.int(0, 1)] as Span;
        let save = begin(party.who, rng.int(1, 9999));
        // Win the rooms before a random target with the bot, then fuzz the target room.
        const target = rng.int(0, 4);
        for (let guard = 0; guard < 60 && save.trip; guard++) {
          const t = save.trip;
          if (t.status === 'crossroads') save = { ...save, trip: chooseAt(t, span) };
          else if (t.status === 'looting') save = takeOffer(save, 0);
          else if (t.status === 'doorway') save = leaveDoorway(save, save.profile);
          else if (t.status !== 'fight') break;
          else {
            const start = startBattle(save);
            boards.add(`${start.state.width}x${start.state.height} ${start.state.title}`);
            if (t.encounter < target) {
              const fight = botFight(start.state, 30, t.party, { cracks: true });
              if (fight.state.phase !== 'won') break;
              save = endBattle(save, fight.state, fight.events).save;
              continue;
            }
            let state = start.state;
            for (let n = 0; n < 40 && state.phase === 'player'; n++) {
              const options: Action[] = [{ type: 'endTurn' }];
              for (const id of t.party) {
                const m = memberById(state, id);
                if (m.hp <= 0 || m.out) continue;
                for (const to of legalMoves(state, id))
                  options.push({ type: 'move', unit: id, to });
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
              const result = applyAction(state, action);
              if (action.type !== 'endTurn' && action.type !== 'move') {
                expect(
                  result.events.length,
                  `${start.state.title} ${action.type}`,
                ).toBeLessThanOrEqual(CAST_EVENT_CAP + 3);
              }
              state = result.state;
            }
            break;
          }
        }
      }
      if (TABLE) out(`boards fuzzed: ${boards.size}\n${[...boards].sort().join('\n')}`);
      expect(boards.size).toBeGreaterThan(5);
    },
    LONG,
  );
});
