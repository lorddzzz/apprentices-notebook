import { describe, expect, test } from 'vitest';
import { BATH_HEART, BATH_ROOMS_12, BATH_ROOMS_34 } from '$data/districts/bathhouses';
import { compiledFor, createBattle, FOUNDERS, newProfile } from '$engine';
import { BOIL_OVER_RULE_ID, type BoilOverEvent } from '$engine/districts/bathhouses/types';
import { listRules } from '$engine/rules';
import { botFight } from './bot';

/**
 * Bathhouse bot calibration (BH-16): win rate and boil-over frequency by room, layout and bot,
 * driven straight from the room data (the rooms are not in the kit yet). Measures and prints only:
 * the numbers are tuned at the end of the build. `BATH_SEEDS=30` (or `BATH_TABLE=1`) widens the
 * sample and prints the table; the default few seeds keep this fast.
 */

const SEEDS = Number(process.env.BATH_SEEDS ?? (process.env.BATH_TABLE ? 30 : 3));
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
  test('quick: both bots win a layout per room and both terminate', () => {
    for (let i = 0; i < ROOMS.length; i++) {
      for (const gauge of [false, true]) {
        const c = run(i, 0, gauge, 2);
        expect(c.wins, `${ROOMS[i]?.title} gauge=${gauge}`).toBe(2);
      }
    }
  }, 120_000);

  test.skipIf(!process.env.BATH_TABLE && !process.env.BATH_SEEDS)(
    'table: every room and layout, both bots (BATH_TABLE=1, 30 seeds)',
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
