import { describe, expect, test } from 'vitest';
import { DISTRICTS } from '$data';
import { BATH_INTRUSION } from '$data/districts/bathhouses';
import { FLOOR_FORMAT } from '$data/districts/seam';
import { createBattle, newProfile, parseBoard } from '$engine';
import { importedRules } from '$engine/districts/intrusion';
import { checkFloor, floorRoom } from '$engine/districts/lowerSeam';
import { boardRules, isRuleActive } from '$engine/rules';

/**
 * BH-11 (bathhouses-plan P12): the steam-vent floor of the lower Seam. The existing vent terrain
 * (the bath-mosaic skin is art only), two vents per floor, no gauge and no heat.
 */

const INDEXES = [0, 1, 2] as const;
const vents = (layout: string) => parseBoard(layout).tiles.filter((t) => t.terrain.vent);
const ventAt = (layout: string) => {
  const b = parseBoard(layout);
  return b.tiles.flatMap((t, i) =>
    t.terrain.vent ? [{ x: i % b.width, y: Math.floor(i / b.width) }] : [],
  );
};

describe('the steam-vent floor (BH-11)', () => {
  test('three layouts in the floor format, Seam foes only, five or more start points', () => {
    expect(BATH_INTRUSION.rooms).toHaveLength(3);
    for (const layout of BATH_INTRUSION.rooms) {
      const b = parseBoard(layout);
      expect(b.width).toBeGreaterThanOrEqual(FLOOR_FORMAT.minWidth);
      expect(b.width).toBeLessThanOrEqual(FLOOR_FORMAT.maxWidth);
      expect(b.height).toBeGreaterThanOrEqual(FLOOR_FORMAT.minHeight);
      expect(b.height).toBeLessThanOrEqual(FLOOR_FORMAT.maxHeight);
      expect(b.starts.length).toBeGreaterThanOrEqual(FLOOR_FORMAT.minStarts);
      expect(b.units.length).toBeGreaterThan(0);
      for (const u of b.units) expect(FLOOR_FORMAT.foes).toContain(u.def);
      expect(b.tiles.every((t) => t.piece === null)).toBe(true);
    }
    expect(BATH_INTRUSION.loot).toBe('basics');
  });

  test('the checker finds nothing wrong but the missing district rule to carry (see report)', () => {
    // No piece-scoped rule reads the vent, so the shared floor check's "carries the intrusion"
    // test has nothing to find; every other check passes.
    const problems = checkFloor(BATH_INTRUSION).map((p) => p.message);
    expect(problems.filter((m) => !m.startsWith('No intrusion piece or terrain'))).toEqual([]);
  });

  test('two vents on every floor, close enough that their clouds overlap', () => {
    for (const layout of BATH_INTRUSION.rooms) {
      const [a, b] = ventAt(layout);
      expect(vents(layout)).toHaveLength(2);
      if (!a || !b) throw new Error('missing vent');
      const apart = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      expect(apart).toBeGreaterThanOrEqual(2);
      expect(apart).toBeLessThanOrEqual(4);
    }
  });

  test('piece-scoped only: no pieces, no rules, nothing district-scoped rides on the floor', () => {
    expect(BATH_INTRUSION.pieces).toEqual([]);
    expect(BATH_INTRUSION.rules).toEqual([]);
    expect(importedRules(BATH_INTRUSION)).toEqual([]);
  });

  test('a fixture floor has vents but no gauge or heat', () => {
    for (const i of INDEXES) {
      const s = createBattle({
        title: 'floor',
        seed: 1,
        board: BATH_INTRUSION.rooms[i] ?? '',
      }).state;
      expect(s.tiles.filter((t) => t.terrain.vent)).toHaveLength(2);
      expect(s.rules?.['bathhouses:boilOver']).toBeUndefined();
      for (const rule of boardRules().filter((r) => r.id.startsWith('bathhouses:'))) {
        expect(isRuleActive(rule, s), rule.id).toBe(false);
      }
    }
  });

  test('the district is still drawing, so no profile can reach the floor yet', () => {
    expect(DISTRICTS.bathhouses.gate).toEqual({ kind: 'drawing' });
    const p = newProfile();
    expect(p.city.open).not.toContain('bathhouses');
  });

  test("as the lower Seam's builder lays it: given the spec, the floor builder lays all three layouts", () => {
    const kit = { bathhouses: { intrusion: BATH_INTRUSION } } as const;
    expect(floorRoom(['bathhouses'], 0, kit).variants.map((v) => v.layout)).toEqual([
      ...BATH_INTRUSION.rooms,
    ]);
  });
});
