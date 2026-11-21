import { writeFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { BATH_HEART, BATH_ROOMS_12, BATH_ROOMS_34 } from '$data/districts/bathhouses';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { BOIL_OVER_RULE_ID, type BoilOverEvent } from '$engine/districts/bathhouses/types';
import { listRules } from '$engine/rules';
import { botFight } from './bot';
import { bathTables, freshBathFight } from './calibration/bath-bridges';
import { countEnv } from './calibration/runner';

const TABLE = Boolean(process.env.BATH_TABLE);
const RAW = Boolean(process.env.BATH_RAW_TABLE || (!TABLE && process.env.BATH_SEEDS));
const SEEDS = countEnv('BATH_SEEDS', TABLE || RAW ? 30 : 3);
const ROOMS = [...BATH_ROOMS_12, ...BATH_ROOMS_34, BATH_HEART];
const heatOf = (i: number) => (i >= 4 ? 4 : i + 1) as 1 | 2 | 3 | 4;

interface Cell {
  wins: number;
  fights: number;
  boils: number;
  memberHits: number; // party members stormed by a boil-over
  firstRounds: number[];
}

function run(roomIndex: number, variant: number, gauge: boolean, seeds = SEEDS): Cell {
  const room = ROOMS[roomIndex];
  const v = room?.variants[variant];
  if (!room || !v) throw new Error('no room');
  const cell: Cell = { wins: 0, fights: 0, boils: 0, memberHits: 0, firstRounds: [] };
  for (let seed = 1; seed <= seeds; seed++) {
    const s = structuredClone(
      createBattle({
        title: room.title,
        board: v.layout,
        seed,
        lineup: FOUNDERS,
        party: Object.fromEntries(
          FOUNDERS.map((id) => [id, { spells: compiledFor(newProfile(), id).spells }]),
        ),
      }).state,
    );
    s.rules = listRules(s, [BOIL_OVER_RULE_ID], {
      [BOIL_OVER_RULE_ID]: { heat: heatOf(roomIndex) },
    });
    const f = botFight(s, 40, undefined, { gauge });
    cell.fights++;
    if (f.state.phase === 'won') cell.wins++;
    cell.boils += f.events.filter((e) => e.type === 'bathhouses:boilOver').length;
    for (const e of f.events) {
      if (e.type === 'bathhouses:boilOver') {
        const { units } = (e as BoilOverEvent).data;
        cell.memberHits += units.filter((id) => FOUNDERS.some((m) => m === id)).length;
      }
    }
    if (f.firstBoil !== null) cell.firstRounds.push(f.firstBoil);
  }
  return cell;
}

const median = (a: number[]) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? b[Math.floor(b.length / 2)] : '-';
};

describe('bathhouse bot calibration (BH-16)', () => {
  test('quick: both bots terminate in every room', () => {
    for (let i = 0; i < ROOMS.length; i++) {
      for (const gauge of [false, true]) {
        const c = run(i, 0, gauge, 2);
        expect(c.fights, `${ROOMS[i]?.title} gauge=${gauge}`).toBe(2);
      }
    }
  }, 120_000);

  test.skipIf(!RAW)(
    'historical raw-board table: every room and layout, both bots',
    () => {
      const rows: string[] = [
        '| room | layout | heat | blind win | blind boil/fight | blind party hits/fight | blind 1st boil rd | gauge win | gauge boil/fight | gauge party hits/fight | gauge 1st boil rd |',
        '|---|---|---|---|---|---|---|---|---|---|---|',
      ];
      let fights = 0;
      ROOMS.forEach((room, i) => {
        room.variants.forEach((v, vi) => {
          const b = run(i, vi, false);
          const g = run(i, vi, true);
          fights += b.fights;
          const fmt = (c: Cell) =>
            `${c.wins}/${c.fights} | ${(c.boils / c.fights).toFixed(1)} | ${(c.memberHits / c.fights).toFixed(1)} | ${median(c.firstRounds)}`;
          rows.push(`| ${room.title} | ${v.name} | ${heatOf(i)} | ${fmt(b)} | ${fmt(g)} |`);
        });
      });
      console.log(rows.join('\n'));
      expect(fights).toBeGreaterThan(0);
    },
    1_800_000,
  );
});

/**
 * The authored encounters, as a trip deals them (CAL-3; the player set the targets on 2026-11-20):
 * the fresh pair gets until round three to react to the first boil, wins the ordinary rooms
 * nearly always, and meets a heart it wins about half the time (a win band of 40-55 % over wide
 * samples; this smaller sample asserts only that both outcomes occur).
 */
describe('authored bathhouse encounters (CAL-3)', () => {
  const layouts = [3, 3, 3, 3, 3];
  const fights = (depths: number[], seeds: number) =>
    depths.flatMap((depth) =>
      Array.from({ length: layouts[depth - 1] ?? 0 }, (_, v) =>
        Array.from({ length: seeds }, (_, k) => freshBathFight(2, depth, v, k + 1)),
      ).flat(),
    );

  test('first boil timing: no boil before round 3 in any room or layout', () => {
    const boiled = fights([1, 2, 3, 4, 5], 3).flatMap((f) => f.firstBoil ?? []);
    expect(boiled.length).toBeGreaterThan(0);
    expect(Math.min(...boiled)).toBeGreaterThanOrEqual(3);
  }, 300_000);

  test('ordinary rooms are won almost always; the heart is won and not won', () => {
    const rooms = fights([1, 2, 3, 4], 4);
    expect(rooms.filter((f) => f.outcome === 'win').length / rooms.length).toBeGreaterThanOrEqual(
      0.9,
    );
    const heart = fights([5], 8).map((f) => f.outcome === 'win');
    expect(heart).toContain(true);
    expect(heart).toContain(false);
  }, 600_000);
});

test.skipIf(!TABLE)(
  'live bathhouses: fresh layouts and worn trips',
  () => {
    const candidate = Boolean(process.env.BATH_CANDIDATE);
    const table = bathTables(
      candidate
        ? {
            seeds: SEEDS,
            parties: [2],
            policies: ['aware'],
            freshOnly: true,
            depths: process.env.BATH_DEPTHS?.split(',').map(Number),
          }
        : { seeds: SEEDS },
      !candidate,
    );
    if (process.env.BATH_OUT) writeFileSync(process.env.BATH_OUT, table);
    else process.stdout.write(table);
    expect(table).toContain('| 2 | aware | fresh | 5 | all layouts |');
  },
  36_000_000,
);
