import { describe, expect, test } from 'vitest';
import { BRIDGES_INTRUSION } from '$data/districts/bridges';
import { beginEncounter, createBattle, newProfile, type Profile, startTrip } from '$engine';
import { floorLayout } from '$engine/districts/intrusion';
import { checkFloor, floorRoom, LOWER_SEAM } from '$engine/districts/lowerSeam';
import { roundEnd } from '$engine/turn';
import { draft } from '../../scenarios/harness';

/** BR-13 (bridges P19): the lower-Seam floor with a small span. */
const INDEXES = [0, 1, 2] as const;
const layoutBattle = (i: 0 | 1 | 2) =>
  createBattle({
    title: 'f',
    seed: 1,
    board: floorLayout(BRIDGES_INTRUSION, i),
    lineup: ['draughtsman', 'stoker', 'runaway'],
  }).state;
const isSpan = (id: string | undefined) => id === 'bridges:span';

const below = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: ['seam', 'bridges'], open: ['seam', 'bridges'], hearts: ['seam'] },
  };
};

describe('BR-13 intrusion', () => {
  test('passes checkFloor: three layouts, span and pier pieces, basics loot', () => {
    expect(checkFloor(BRIDGES_INTRUSION)).toEqual([]);
    expect(BRIDGES_INTRUSION.rooms).toHaveLength(3);
    expect(BRIDGES_INTRUSION.loot).toBe('basics');
    expect(BRIDGES_INTRUSION.pieces).toEqual(['bridges:span', 'bridges:pier']);
  });

  test('each layout has one pier and 6-9 span tiles', () => {
    for (const i of INDEXES) {
      const tiles = layoutBattle(i).tiles;
      expect(tiles.filter((t) => t.piece?.id === 'bridges:pier')).toHaveLength(1);
      const n = tiles.filter((t) => isSpan(t.piece?.id)).length;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(9);
    }
  });

  test('the Seam floor builder reads it and brings the collapse rule', () => {
    const p = below();
    expect(floorRoom(['bridges'], 0).variants.map((v) => v.layout)).toEqual([
      ...BRIDGES_INTRUSION.rooms,
    ]);
    const s = beginEncounter(p, startTrip(p, 5, LOWER_SEAM)).state;
    expect(Object.keys(s.rules ?? {}).sort()).toEqual(['bridges:collapse', 'lowerSeam:drop']);
  });

  test('a cut span drops a foe and a party member, who leaves the room', () => {
    for (const i of INDEXES) {
      const s = layoutBattle(i);
      for (const t of s.tiles) if (t.piece?.id === 'bridges:pier') t.piece = null;
      const spans = s.tiles
        .map((t, idx) => ({ t, idx }))
        .filter(({ t }) => isSpan(t.piece?.id))
        .map(({ idx }) => ({ x: idx % s.width, y: Math.floor(idx / s.width) }));
      const foe = s.units.find((u) => u.kind === 'enemy');
      const member = s.units.find((u) => u.kind === 'member');
      if (!foe || !member || spans.length < 2) throw new Error('layout lacks units or span');
      for (const u of s.units) {
        if (u !== foe && u !== member) u.pos = { x: 0, y: 0 };
      }
      foe.pos = spans[0] as { x: number; y: number };
      member.pos = spans[1] as { x: number; y: number };
      const foeHp = foe.hp;
      const r = draft(s, (ctx) => roundEnd(ctx));
      expect(r.events.some((e) => e.type === 'bridges:collapse')).toBe(true);
      expect(r.state.units.find((u) => u.id === member.id)?.out).toBe('fell');
      const after = r.state.units.find((u) => u.id === foe.id);
      expect(after && (after.hp <= 0 || after.hp < foeHp || after.out)).toBeTruthy();
    }
  });

  test('no staff and no keystone anywhere on a floor', () => {
    expect(BRIDGES_INTRUSION.pieces).not.toContain('bridges:keystone');
    for (const i of INDEXES) {
      expect(BRIDGES_INTRUSION.rooms[i]).not.toContain('keystone');
      const ids = layoutBattle(i)
        .tiles.map((t) => t.piece?.id)
        .filter(Boolean);
      expect(ids.every((id) => id === 'bridges:span' || id === 'bridges:pier')).toBe(true);
    }
    expect(BRIDGES_INTRUSION.rules).toEqual(['bridges:collapse']);
  });
});
