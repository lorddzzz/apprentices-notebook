import { describe, expect, it } from 'vitest';
import { COSTS, NEEDS } from '$data/drawing';
import { checkGenerated, GEN_KITS, generateRoom, HEART_FRAMES, specFor } from '$engine/drawing';
import { heartDrawing, heartRoom, inputFor } from './fixtures';
import { SCRIPTS } from './kits-a.scripts';

/**
 * Pack I's kits and frames beyond the shared acceptance tests (EN-K1 to EN-K3): what each frame
 * declares, which master stands on the board and that the scripted solves exist.
 */

const MASTERS = ['marginalia', 'mother', 'lamplighter', 'postmaster'] as const;

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

  it('EN-K3: the writs bring a return and an order to every room that draws them', () => {
    const drawing = heartDrawing('postmaster');
    const kit = GEN_KITS.find((k) => k.district === 'inkQuarter');
    expect(kit?.rules.map((r) => r.id)).toEqual(['inkQuarter:writs']);
    expect(kit?.rules[0]?.brings).toEqual(['inkQuarter:return', 'inkQuarter:order']);
    for (const seed of [1, 2, 3]) {
      for (let room = 0; room < drawing.length - 1; room++) {
        const input = inputFor(drawing, seed, room);
        const made = generateRoom(input);
        expect(checkGenerated(made.layout, specFor(input, seed))).toEqual([]);
        const pieces = made.layout.tiles.map((t) => t.piece?.id);
        expect(pieces).toContain('inkQuarter:return');
        expect(pieces).toContain('inkQuarter:order');
      }
    }
  }, 120_000);
});
