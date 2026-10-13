import { describe, expect, test } from 'vitest';
import { ENCOUNTERS } from '$data';
import {
  beginEncounter,
  type EnemyUnit,
  newProfile,
  parseBoard,
  startTrip,
  step,
  unitAt,
  variantFor,
} from '$engine';

/** Alternate Seam layouts (plan S10): derived from the trip seed, never stored. */

const p = newProfile();
const seeds = Array.from({ length: 60 }, (_, i) => i + 1);

describe('variantFor', () => {
  test('the same seed and depth always give the same variant', () => {
    for (const seed of seeds) {
      const t = startTrip(p, seed);
      for (let depth = 0; depth < ENCOUNTERS.length; depth++) {
        expect(variantFor(t, depth)).toBe(variantFor(startTrip(p, seed), depth));
        // Only the seed matters: progress through the trip doesn't move the pick.
        expect(variantFor({ ...t, hp: { ...t.hp }, encounter: 3 }, depth)).toBe(
          variantFor(t, depth),
        );
      }
    }
  });

  test('all three variants of every depth occur across seeds', () => {
    ENCOUNTERS.forEach((enc, depth) => {
      const seen = new Set(seeds.map((seed) => variantFor(startTrip(p, seed), depth)));
      expect([...seen].sort(), enc.id).toEqual([0, 1, 2]);
    });
  });

  test('depths are picked independently within a trip', () => {
    const combos = new Set(
      seeds.map((seed) => {
        const t = startTrip(p, seed);
        return ENCOUNTERS.map((_, d) => variantFor(t, d)).join('');
      }),
    );
    expect(combos.size).toBeGreaterThan(10);
  });

  test('the pick is always a valid index', () => {
    for (const seed of seeds) {
      const t = startTrip(p, seed);
      ENCOUNTERS.forEach((enc, d) => {
        expect(enc.variants[variantFor(t, d)]).toBeDefined();
      });
    }
  });
});

describe('beginEncounter builds the chosen variant', () => {
  test('the board matches the layout variantFor picked, at every depth', () => {
    for (const seed of seeds) {
      const t0 = startTrip(p, seed);
      ENCOUNTERS.forEach((enc, depth) => {
        const t = { ...t0, encounter: depth };
        const layout = enc.variants[variantFor(t, depth)]?.layout ?? '';
        const want = parseBoard(layout).units.map((u) => `${u.def}@${u.at.x},${u.at.y}`);
        const got = beginEncounter(p, t)
          .state.units.map((u) => `${u.def}@${u.pos.x},${u.pos.y}`)
          .sort();
        expect(got, `seed ${seed} depth ${depth + 1}`).toEqual(want.sort());
      });
    }
  });
});

describe('encounter 1 telegraphs on turn 1', () => {
  test("the original layout opens with a rat's bite aimed at a member", () => {
    const seed = seeds.find((s) => variantFor(startTrip(p, s), 0) === 0);
    if (seed === undefined) throw new Error('no seed picks variant 0');
    const { state } = beginEncounter(p, startTrip(p, seed));
    const threats = state.units.filter(
      (u): u is EnemyUnit =>
        u.kind === 'enemy' &&
        u.hp > 0 &&
        u.intent !== null &&
        unitAt(state, step(u.pos, u.intent.dir))?.kind === 'member',
    );
    expect(threats.length).toBeGreaterThanOrEqual(1);
    expect(state.round).toBe(1);
    expect(state.phase).toBe('player');
  });
});
