import { describe, expect, test } from 'vitest';
import { FOUNDRY_FLOOR_LINE, FOUNDRY_INTRUSION } from '$data/districts/foundry';
import { FLOOR_FORMAT } from '$data/districts/seam';
import { createBattle, parseBoard } from '$engine';
import { toneOfPiece } from '$engine/districts/foundry/pieces';
import { importedRules } from '$engine/districts/intrusion';
import { checkFloor, floorRoom } from '$engine/districts/lowerSeam';
import type { Coord } from '$engine/grid';
import { boardRules, isRuleActive } from '$engine/rules';
import { ev, hums, ringBells, ringTones } from '../districts/foundry/helpers';
import { act, withLattices } from '../scenarios/harness';

/**
 * BF-16 (foundry-plan P13): the foundry's lower-Seam floor. A pair of bells of one tone far
 * apart, the piece-scoped `bells` rule only.
 */

const SHOVER = { kits: { draughtsman: { action: 'shove' as const } } };
const INDEXES = [0, 1, 2] as const;
const bellsAt = (layout: string): Array<{ at: Coord; tone: string | null }> => {
  const b = parseBoard(layout);
  return b.tiles.flatMap((t, i) =>
    t.piece
      ? [
          {
            at: { x: i % b.width, y: Math.floor(i / b.width) },
            tone: toneOfPiece(t.piece.id, t.piece.data),
          },
        ]
      : [],
  );
};

describe('the foundry floor (BF-16)', () => {
  test('BF-16: a foundry floor builds from its IntrusionSpec', () => {
    expect(FOUNDRY_INTRUSION.rooms).toHaveLength(3);
    for (const layout of FOUNDRY_INTRUSION.rooms) {
      const b = parseBoard(layout);
      expect(b.width).toBeGreaterThanOrEqual(FLOOR_FORMAT.minWidth);
      expect(b.width).toBeLessThanOrEqual(FLOOR_FORMAT.maxWidth);
      expect(b.height).toBeGreaterThanOrEqual(FLOOR_FORMAT.minHeight);
      expect(b.height).toBeLessThanOrEqual(FLOOR_FORMAT.maxHeight);
      expect(b.starts.length).toBeGreaterThanOrEqual(FLOOR_FORMAT.minStarts);
      for (const u of b.units) expect(FLOOR_FORMAT.foes).toContain(u.def);
    }
    expect(FOUNDRY_INTRUSION.loot).toBe('basics');
    expect(FOUNDRY_FLOOR_LINE).toBe('The Seam has no bell.');
    const kit = { foundry: { intrusion: FOUNDRY_INTRUSION } } as const;
    expect(floorRoom(['foundry'], 0, kit).variants.map((v) => v.layout)).toEqual([
      ...FOUNDRY_INTRUSION.rooms,
    ]);
    for (const i of INDEXES) {
      const s = createBattle({
        title: 'floor',
        seed: 1,
        board: FOUNDRY_INTRUSION.rooms[i] ?? '',
      }).state;
      expect(s.units.some((u) => u.kind === 'enemy')).toBe(true);
    }
  });

  test('checkFloor passes for each layout', () => {
    expect(checkFloor(FOUNDRY_INTRUSION)).toEqual([]);
  });

  test('a pair of bells of one tone, far apart, on every floor', () => {
    for (const layout of FOUNDRY_INTRUSION.rooms) {
      const bells = bellsAt(layout);
      expect(bells).toHaveLength(2);
      const [a, b] = bells as [(typeof bells)[0], (typeof bells)[0]];
      expect(a.tone).not.toBeNull();
      expect(a.tone).toBe(b.tone);
      expect(Math.abs(a.at.x - b.at.x) + Math.abs(a.at.y - b.at.y)).toBeGreaterThanOrEqual(6);
    }
  });

  test('BF-16: a strike rings the pair and it hums', () => {
    for (const layout of FOUNDRY_INTRUSION.rooms) {
      const [near, far] = bellsAt(layout);
      if (!near || !far) throw new Error('missing bell');
      // The real floor, one apprentice put beside the first bell (below it, or above at the foot).
      const dy = near.at.y + 1 < parseBoard(layout).height ? 1 : -1;
      const rows = layout
        .split('\n')
        .map((row) => row.split(' ').map((c) => (c === 'P' ? '.' : c)));
      const spot = { x: near.at.x, y: near.at.y + dy };
      if (rows[spot.y]?.[spot.x] !== '.') throw new Error('spot taken');
      (rows[spot.y] as string[])[spot.x] = 'D';
      const s = withLattices(rows.map((r) => r.join(' ')).join('\n'), {}, SHOVER);
      const r = act(s, { type: 'shove', unit: 'draughtsman', dir: dy === 1 ? 'up' : 'down' });
      expect(ringTones(r.events)).toEqual([near.tone]);
      expect(ringBells(ev(r.events, 'foundry:ring')[0]).sort()).toEqual(
        [near, far].map((b) => `${b.at.x},${b.at.y}`).sort(),
      );
      expect(hums(r.state)).toEqual([near.tone]);
    }
  });

  test('BF-16: no tune, staff or great bell appears', () => {
    expect(FOUNDRY_INTRUSION.pieces).toEqual(['foundry:bell']);
    expect(FOUNDRY_INTRUSION.rules).toEqual(['foundry:bells']);
    expect(importedRules(FOUNDRY_INTRUSION)).toEqual(['foundry:bells']);
    for (const layout of FOUNDRY_INTRUSION.rooms) {
      const b = parseBoard(layout);
      expect(b.tiles.every((t) => !t.piece || t.piece.id === 'foundry:bell')).toBe(true);
      expect(b.units.every((u) => !['ringer', 'detuner', 'clapper'].includes(u.def))).toBe(true);
      const s = createBattle({ title: 'floor', seed: 1, board: layout }).state;
      expect(s.rules?.['foundry:tune']).toBeUndefined();
      const active = boardRules()
        .filter((rule) => isRuleActive(rule, s))
        .map((rule) => rule.id);
      expect(active.filter((id) => id.startsWith('foundry:'))).toEqual(['foundry:bells']);
    }
  });
});
