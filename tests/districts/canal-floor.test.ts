import { describe, expect, test } from 'vitest';
import { type ApprenticeId, RUNE_IDS } from '$data';
import { CANALS_INTRUSION } from '$data/districts/canals';
import {
  beginEncounter,
  compiledFor,
  createBattle,
  deriveSeed,
  inventionLibrary,
  joinHousehold,
  newProfile,
  type Profile,
  type SlotIndex,
  setSlot,
  startTrip,
} from '$engine';
import { floorLayout } from '$engine/districts/intrusion';
import { checkFloor, floorRoom, LOWER_SEAM } from '$engine/districts/lowerSeam';
import { act } from '../scenarios/harness';
import { botFight } from '../sim/bot';

/** SM-9: the canals' reference floor for the lower Seam (three layouts, a lane with its current). */
const INDEXES = [0, 1, 2] as const;
const TRIO: ApprenticeId[] = ['draughtsman', 'stoker', 'runaway'];

const below = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: ['seam', 'canals'], open: ['seam', 'canals'], hearts: ['seam'] },
  };
};

describe('SM-9 canal floor', () => {
  test('passes checkFloor with three layouts, five or more starts and Seam foes', () => {
    expect(checkFloor(CANALS_INTRUSION)).toEqual([]);
    expect(CANALS_INTRUSION.rooms).toHaveLength(3);
    for (const i of INDEXES) {
      const s = createBattle({ title: 'f', seed: 1, board: floorLayout(CANALS_INTRUSION, i) });
      expect(s.state.tiles.some((t) => t.terrain.water !== null)).toBe(true);
      expect(s.state.units.some((u) => u.kind === 'enemy')).toBe(true);
    }
  });

  test('as a lower-Seam floor, the floor fights with the current and the drop; the current moves a unit', () => {
    const p = below();
    expect(floorRoom(['canals'], 0).variants.map((v) => v.layout)).toEqual([
      ...CANALS_INTRUSION.rooms,
    ]);
    const s = beginEncounter(p, startTrip(p, 5, LOWER_SEAM)).state;
    expect(Object.keys(s.rules ?? {}).sort()).toEqual(['canals:current', 'lowerSeam:drop']);
    const water = s.tiles.findIndex((t) => t.terrain.water !== null);
    const rat = s.units.find((u) => u.def === 'rat');
    if (!rat) throw new Error('no rat');
    const at = { x: water % s.width, y: Math.floor(water / s.width) };
    rat.pos = at;
    const after = act(s, { type: 'endTurn' }).state.units.find((u) => u.id === rat.id);
    expect(after?.pos).not.toEqual(at);
  });

  test('a short bot check: every layout ends within the round cap', () => {
    let p: Profile = { ...newProfile(), known: [...RUNE_IDS] };
    for (const id of TRIO) p = joinHousehold(p, id);
    for (const slot of [0, 1, 2] as SlotIndex[]) p = setSlot(p, slot, null);
    TRIO.forEach((id, i) => {
      p = setSlot(p, i as SlotIndex, id);
    });
    const party = Object.fromEntries(
      TRIO.map((id) => [id, { spells: compiledFor(p, id).spells }] as const),
    );
    for (const i of INDEXES) {
      for (const seed of [1, 2]) {
        const start = createBattle({
          title: 'floor',
          seed: deriveSeed(seed, i),
          board: floorLayout(CANALS_INTRUSION, i),
          lineup: TRIO,
          party,
          inventions: inventionLibrary(p),
        }).state;
        expect(['won', 'lost']).toContain(botFight(start, 25, TRIO).state.phase);
      }
    }
  });
});
