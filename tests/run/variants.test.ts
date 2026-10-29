import { describe, expect, test } from 'vitest';
import { DISTRICTS, ENCOUNTERS, ENEMIES, type EnemyId } from '$data';
import {
  beginEncounter,
  neighbors4,
  newProfile,
  parseBoard,
  startTrip,
  step,
  unitAt,
  variantFor,
} from '$engine';

function hasOilAgainstWall(layout: string): boolean {
  const board = parseBoard(layout);
  return board.tiles.some((tile, i) => {
    if (tile.state?.id !== 'slick') return false;
    const at = { x: i % board.width, y: Math.floor(i / board.width) };
    return (
      at.x === 0 ||
      at.y === 0 ||
      at.x === board.width - 1 ||
      at.y === board.height - 1 ||
      neighbors4(at).some(
        (n) =>
          n.x >= 0 &&
          n.y >= 0 &&
          n.x < board.width &&
          n.y < board.height &&
          board.tiles[n.y * board.width + n.x]?.state?.id === 'plate',
      )
    );
  });
}

function hasPlate(layout: string): boolean {
  return parseBoard(layout).tiles.some((tile) => tile.state?.id === 'plate');
}

function hasLandFoeBesideWater(layout: string): boolean {
  const board = parseBoard(layout);
  return board.units.some((unit) => {
    if (unit.kind !== 'enemy') return false;
    const foe = ENEMIES[unit.def as EnemyId];
    if (foe.flies || foe.habitat === 'water') return false;
    return neighbors4(unit.at).some(
      (n) =>
        n.x >= 0 &&
        n.y >= 0 &&
        n.x < board.width &&
        n.y < board.height &&
        board.tiles[n.y * board.width + n.x]?.terrain.water !== null,
    );
  });
}

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
        const board = parseBoard(enc.variants[variantFor(t, depth)]?.layout ?? '');
        const want = board.units.map((u) => `${u.def}@${u.at.x},${u.at.y}`);
        const units = beginEncounter(p, t).state.units;
        const foes = units
          .filter((u) => u.kind === 'enemy')
          .map((u) => `${u.def}@${u.pos.x},${u.pos.y}`);
        expect(foes.sort(), `seed ${seed} depth ${depth + 1}`).toEqual(want.sort());
        // The party stands on the room's start points (HC P4).
        const starts = board.starts.map((c) => `${c.x},${c.y}`);
        for (const m of units.filter((u) => u.kind === 'member'))
          expect(starts, `seed ${seed} depth ${depth + 1}`).toContain(`${m.pos.x},${m.pos.y}`);
      });
    }
  });
});

describe('encounter boards teach the district chemistry', () => {
  test('every Seam depth offers oil beside an edge or plate and a brass plate', () => {
    for (const encounter of DISTRICTS.seam.rooms) {
      expect(
        encounter.variants.some((variant) => hasOilAgainstWall(variant.layout)),
        `${encounter.id} oil by wall`,
      ).toBe(true);
      expect(
        encounter.variants.some((variant) => hasPlate(variant.layout)),
        `${encounter.id} brass plate`,
      ).toBe(true);
    }
  });

  test('every canal room has land foes that can be pushed into water', () => {
    for (const encounter of DISTRICTS.canals.rooms) {
      expect(
        encounter.variants.some((variant) => hasLandFoeBesideWater(variant.layout)),
        `${encounter.id} shore foe`,
      ).toBe(true);
    }
  });
});

describe('encounter 1 telegraphs on turn 1', () => {
  // HC P9: with drawn start points the turn-1 bite is best effort; CN/SM restore it when they
  // re-lay the rooms. Every layout still shows it for some draws.
  test.each([0, 1, 2])("layout %i opens with a rat's bite for some start draws", (variant) => {
    const picks = seeds.filter((s) => variantFor(startTrip(p, s), 0) === variant);
    if (picks.length === 0) throw new Error(`no seed picks variant ${variant}`);
    const bites = picks.filter((seed) => {
      const { state } = beginEncounter(p, startTrip(p, seed));
      expect(state.round).toBe(1);
      expect(state.phase).toBe('player');
      return state.units.some(
        (u) =>
          u.kind === 'enemy' &&
          u.hp > 0 &&
          u.intent?.kind === 'attack' &&
          unitAt(state, step(u.pos, u.intent.dir))?.kind === 'member',
      );
    });
    expect(bites.length).toBeGreaterThanOrEqual(1);
  });
});
