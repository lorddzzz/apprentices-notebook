import { describe, expect, test } from 'vitest';
import { cloneData, createBattle, createRng, type EnemyUnit } from '$engine';
import { planRival, simulate } from '$engine/rivals/plan';

/**
 * RV-10: the planner properties of rivals plan §6, on the real Lamplighter kit and routine (the
 * RV-4 suite in tests/engine/rivals-plan.test.ts pins them on a fixture kit).
 */

function randomBoard(seed: number): string {
  const rng = createRng(seed);
  const cells = Array.from({ length: 25 }, () => '.');
  const free = () => {
    for (;;) {
      const i = rng.int(0, 24);
      if (cells[i] === '.') return i;
    }
  };
  cells[free()] = 'L';
  cells[free()] = 'D';
  if (rng.next() < 0.6) cells[free()] = 'S';
  for (let n = rng.int(0, 4); n > 0; n--)
    cells[free()] = ['*', 'o', '#', 'i', '_'][rng.int(0, 4)] ?? '.';
  return [0, 1, 2, 3, 4].map((y) => cells.slice(y * 5, y * 5 + 5).join(' ')).join('\n');
}

const rivalOf = (s: ReturnType<typeof make>): EnemyUnit => {
  const u = s.units.find((x): x is EnemyUnit => x.kind === 'enemy' && !!x.rival);
  if (!u) throw new Error('no rival');
  return u;
};
const make = (seed: number) => createBattle({ title: 't', board: randomBoard(seed), seed }).state;

describe('RV-10: the Lamplighter planner (real kit)', () => {
  test('same state, same plan; the state and its rng are untouched', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = make(seed);
      const before = JSON.stringify(s);
      const id = rivalOf(s).id;
      for (const move of [false, true]) {
        const a = planRival(s, id, move);
        expect(planRival(cloneData(s), id, move), `seed ${seed}`).toEqual(a);
      }
      expect(JSON.stringify(s), `seed ${seed}`).toBe(before);
    }
  });

  test('a telegraphed plan is never starved, and its fallback tile is adjacent', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = make(seed);
      const e = rivalOf(s);
      const plan = planRival(s, e.id, true);
      const intent = plan?.intent;
      if (intent?.kind !== 'cast' && intent?.kind !== 'trick') continue;
      expect(simulate(s, e.id, plan?.path ?? [], intent).effect, `seed ${seed}`).toBe(true);
      const end = plan?.path.at(-1) ?? e.pos;
      if (intent.fallback)
        expect(
          Math.abs(intent.fallback.x - end.x) + Math.abs(intent.fallback.y - end.y),
          `seed ${seed}`,
        ).toBe(1);
    }
  });
});
