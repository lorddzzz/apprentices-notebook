import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Drawing, ENEMIES, type EnemyId, type MasterId } from '$data';
import { type Profile, startTrip } from '$engine';
import { createEncounterBattle } from '$engine/battle';
import { inkedRoom } from '$engine/districts/inkedPage';
import {
  generateRoom,
  HEART_FRAMES,
  heartEnemyHp,
  parseInkedState,
  weightBand,
} from '$engine/drawing';
import { serializeBoard } from '$engine/notation';
import { compiledFor } from '$engine/run';
import type { BattleState, Trip } from '$engine/types';
import { fullHousehold, heartDrawing, inputFor } from './fixtures';

/**
 * CAL-5G (G3): the drawn heart's HP by weight band. The bonus table is mocked so the test reads
 * the mechanism, not the value CAL-5 settles on; the trial battles are caught where `trial` hands
 * them to the bot (a stub that loses, so every attempt and the fallback trial run quickly).
 */

const hoisted = vi.hoisted(() => ({
  bonus: { light: 0, medium: 0, heavy: 0 },
  states: [] as BattleState[],
}));
vi.mock('$data/drawing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$data/drawing')>()),
  DRAWN_HEART_HP_BONUS: hoisted.bonus,
}));
vi.mock('$engine/drawing/trial', async (importOriginal) => {
  const real = await importOriginal<typeof import('$engine/drawing/trial')>();
  return {
    ...real,
    botTrial: (...args: Parameters<typeof real.botTrial>) => {
      hoisted.states.push(args[0]);
      return { won: false, state: args[0], ops: 0, events: [], actions: [], exhausted: false };
    },
  };
});

const MASTERS = Object.keys(HEART_FRAMES) as MasterId[];
const BANDS = ['light', 'medium', 'heavy'] as const;

/** The master's fixture drawing, padded with rats until it weighs `band`. */
function inBand(master: MasterId, band: (typeof BANDS)[number]): Drawing {
  const base = heartDrawing(master);
  for (let n = 0; n < 24; n++) {
    const d = { ...base, foes: [...base.foes, ...Array<EnemyId>(n).fill('rat')] };
    if (weightBand(d) === band) return d;
  }
  throw new Error(`${master} never reaches ${band}`);
}

const setBonus = (light: number, medium: number, heavy: number): void => {
  Object.assign(hoisted.bonus, { light, medium, heavy });
};

beforeEach(() => {
  setBonus(0, 0, 0);
  hoisted.states.length = 0;
});

describe('CAL-5G: weight-linked heart HP', () => {
  it('CAL-5G: with zero bonuses every heart keeps its frame enemyHp', () => {
    for (const master of MASTERS) {
      for (const band of BANDS) {
        expect(heartEnemyHp(inBand(master, band)), `${master} ${band}`).toBe(
          HEART_FRAMES[master]?.enemyHp,
        );
      }
    }
  });

  it("CAL-5G: every frame's master is an enemy with a base HP", () => {
    for (const master of MASTERS) {
      const frame = HEART_FRAMES[master];
      const foe = frame?.setup.foe as EnemyId;
      expect(ENEMIES[foe], master).toBeDefined();
      const base = frame?.enemyHp?.[foe] ?? ENEMIES[foe].hp;
      expect(base, master).toBeGreaterThan(0);
    }
  });

  it('CAL-5G: a band bonus raises only the master, in the trial, the fallback trial and the played heart', () => {
    setBonus(3, 7, 11);
    for (const master of ['marginalia', 'lamplighter'] as const) {
      const frame = HEART_FRAMES[master];
      const foe = frame?.setup.foe as EnemyId;
      const base = frame?.enemyHp?.[foe] ?? ENEMIES[foe].hp;
      for (const band of BANDS) {
        const drawing = inBand(master, band);
        const want = base + hoisted.bonus[band];
        const raised = heartEnemyHp(drawing);
        expect(raised?.[foe], `${master} ${band}`).toBe(want);
        // Only the master's entry changes.
        expect({ ...raised, [foe]: undefined }).toEqual({ ...frame?.enemyHp, [foe]: undefined });

        // The trial and the fallback trial: every battle the bot is handed spawns the master at `want`.
        hoisted.states.length = 0;
        const room = generateRoom(inputFor(drawing, 1));
        const ran = room.trials.filter((t) => t.guardrails.length === 0).length;
        expect(hoisted.states.length, `${master} ${band} trials`).toBe(ran);
        expect(room.trials.at(-1)?.attempt, 'the fallback trial ran').toBe(4);
        expect(ran, 'a generated attempt ran besides the fallback').toBeGreaterThanOrEqual(2);
        for (const s of hoisted.states) {
          for (const u of s.units.filter((x) => x.kind === 'enemy')) {
            const def = u.def as EnemyId;
            expect(u.maxHp, `${master} ${band} ${def}`).toBe(
              def === foe ? want : (frame?.enemyHp?.[def] ?? ENEMIES[def].hp),
            );
            expect(u.hp).toBe(u.maxHp);
          }
        }
      }
      // The played heart (a drawing a trip accepts): the room's def carries it into the battle.
      {
        const drawing = heartDrawing(master);
        const want = base + hoisted.bonus[weightBand(drawing)];
        const profile: Profile = {
          ...fullHousehold(),
          drawings: [drawing, null, null] as Profile['drawings'],
        };
        const trip = startTrip(
          { ...profile, city: { ...profile.city, open: [...profile.city.open, 'inkedPage'] } },
          1,
          'inkedPage',
          { page: 0 },
        );
        const own = parseInkedState(trip.kit?.state);
        const rooms = own.rooms.map((_, i) =>
          i === drawing.length - 1 && frame ? serializeBoard(frame.fallback) : null,
        );
        const played: Trip = {
          ...trip,
          kit: { ...(trip.kit as NonNullable<Trip['kit']>), state: { ...own, rooms } as never },
        };
        const enc = inkedRoom(played, drawing.length - 1);
        const lineup = inputFor(drawing, 1).party;
        const battle = createEncounterBattle(
          enc,
          Object.fromEntries(lineup.map((id) => [id, { spells: compiledFor(profile, id).spells }])),
          1,
          0,
          'seam',
          {},
          { lineup },
        ).state;
        const master_ = battle.units.find((u) => u.kind === 'enemy' && u.def === foe);
        expect(master_?.maxHp, `${master} played`).toBe(want);
      }
    }
  });
});
