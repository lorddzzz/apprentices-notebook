import { describe, expect, it } from 'vitest';
import { COSTS, NEEDS } from '$data/drawing';
import { GEN_KITS, HEART_FRAMES } from '$engine/drawing';
import { SCRIPTS } from './kits-a.scripts';
import { heartRoom } from './fixtures';

/**
 * Pack I's kits and frames beyond the shared acceptance tests (EN-K1 to EN-K3): what each frame
 * declares, which master stands on the board and that the scripted solves exist.
 */

const MASTERS = ['marginalia', 'mother', 'lamplighter'] as const;

describe('Pack I frames (EN-K1 to EN-K3)', () => {
  it('EN-K1: every frame takes its needs and cost from the drawing table', () => {
    for (const master of MASTERS) {
      const frame = HEART_FRAMES[master];
      expect(frame?.master).toBe(master);
      expect(frame?.cost).toBe(COSTS.hearts[master]);
      expect(frame?.needs.map((n) => n.reason)).toEqual((NEEDS[master] ?? []).map((n) => n.reason));
      expect(frame?.setup.foe).toBe(master);
      expect(frame?.escorts).toEqual([]);
    }
  });

  it('EN-K2: the Lamplighter stands where the lamp-mother stood, on dry ground', () => {
    for (const seed of [1, 2, 3]) {
      const { room, masterOnBoard } = heartRoom('lamplighter', seed);
      expect(masterOnBoard).toBe(true);
      const foes = room.layout.units.filter((u) => u.kind === 'enemy');
      expect(foes.some((u) => u.def === 'mother')).toBe(false);
      const lamplighter = foes.find((u) => u.def === 'lamplighter');
      const tile =
        room.layout.tiles[(lamplighter?.at.y ?? 0) * room.layout.width + (lamplighter?.at.x ?? 0)];
      expect(tile?.terrain.water).toBeNull();
      expect(room.layout.tiles.some((t) => t.terrain.water !== null)).toBe(true);
    }
  });

  it('EN-K2: the lamp-mother stands on the current', () => {
    const { room, masterOnBoard } = heartRoom('mother', 5);
    expect(masterOnBoard).toBe(true);
    const mother = room.layout.units.find((u) => u.def === 'mother');
    const tile = room.layout.tiles[(mother?.at.y ?? 0) * room.layout.width + (mother?.at.x ?? 0)];
    expect(tile?.terrain.water).not.toBeNull();
  });

  it('every master with a frame has a scripted solve, and the canals kit lends the landings', () => {
    for (const master of MASTERS) {
      if (HEART_FRAMES[master]) expect(SCRIPTS[master]?.length).toBeGreaterThan(0);
    }
    expect(GEN_KITS.find((k) => k.district === 'canals')?.shapes.map((s) => s.id)).toEqual([
      'canals:landings',
    ]);
  });
});
