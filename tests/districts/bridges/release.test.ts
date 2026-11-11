import { describe, expect, test } from 'vitest';
import { DISTRICTS, encountersOf, PLAYABLE_DISTRICTS } from '$data';
import {
  BRIDGE_HEART,
  BRIDGES_KIT,
  BRIDGES_PASS_CARD,
  BRIDGES_PASS_GATE,
} from '$data/districts/bridges';
import {
  type BattleState,
  createBattle,
  FOUNDERS,
  finishEncounter,
  newProfile,
  newSave,
  type Profile,
  type SaveData,
  type Trip,
} from '$engine';
import { chooseAt } from '$engine/districts/api';
import { lootLine } from '../../../src/app/describe';
import {
  endBattle,
  goHome,
  leaveDoorway,
  setOut,
  startBattle,
  takeOffer,
} from '../../../src/app/flow';

/** BR-R: the bridges are open: the wardens' pass is the gate and a whole trip (rooms 1-4, heart) plays. */

const open = (): Profile => {
  const p = newProfile();
  return {
    ...p,
    city: { ...p.city, heard: [...p.city.heard, 'bridges'], open: [...p.city.open, 'bridges'] },
  };
};

describe('the gate and the kit', () => {
  test('playable, gated by the wardens’ pass, five rooms with unique ids and the Warden placed', () => {
    expect(PLAYABLE_DISTRICTS).toContain('bridges');
    expect(DISTRICTS.bridges.gate).toEqual(BRIDGES_PASS_GATE);
    expect(DISTRICTS.bridges.gate.kind).toBe('key');
    expect(encountersOf('bridges')).toHaveLength(5);
    const ids = (BRIDGES_KIT.rooms ?? []).map((r) => r.id);
    expect(new Set(ids).size).toBe(5);
    expect(BRIDGES_KIT.rooms.at(-1)?.heart).toBe(true);
    expect(BRIDGES_KIT.recruit).toEqual([{ apprentice: 'warden', room: 2 }]);
    expect(BRIDGES_KIT.recruitPages?.length).toBe(1);
  });

  test('the key card reads as the wardens’ pass', () => {
    expect(lootLine({ kind: 'key', district: 'bridges' })).toEqual({ ...BRIDGES_PASS_CARD });
    expect(lootLine({ kind: 'key', district: 'canals' }).title).toMatch(/key to/i);
  });
});

function winRoom(save: SaveData): SaveData {
  const s: BattleState = structuredClone(startBattle(save).state);
  s.phase = 'won';
  for (const u of s.units) if (u.kind === 'enemy') u.hp = 0;
  return endBattle(save, s, []).save;
}

describe('a whole trip', () => {
  test('rooms 1-4 and the heart play through on both span kinds, then home', () => {
    for (const [seed, span] of [
      [1, 'sound'],
      [2, 'crumbling'],
      [3, 'sound'],
      [4, 'crumbling'],
    ] as const) {
      let save: SaveData = setOut({ ...newSave(seed), profile: open() }, 'bridges');
      const titles: string[] = [];
      for (let guard = 0; guard < 60 && save.trip; guard++) {
        const t: Trip = save.trip;
        if (t.status === 'fight') {
          titles.push(structuredClone(startBattle(save).state).title);
          save = winRoom(save);
        } else if (t.status === 'looting') save = takeOffer(save, 0);
        else if (t.status === 'doorway') save = leaveDoorway(save, save.profile);
        else if (t.status === 'crossroads') save = { ...save, trip: chooseAt(t, span) };
        else break;
      }
      expect(titles, `seed ${seed}`).toHaveLength(5);
      expect(titles.at(-1)).toMatch(/great arch|thin arch/);
      expect(save.trip?.status).toBe('cleared');
      expect(goHome(save).profile.city.hearts).toContain('bridges');
    }
  });

  test('the Chief Warden rival clears the heart and banks his page', () => {
    const save = setOut({ ...newSave(1), profile: open() }, 'bridges');
    const trip = save.trip as Trip;
    const b = structuredClone(
      createBattle({
        title: 'The great arch',
        board: BRIDGE_HEART.variants[0]?.layout ?? '',
        seed: 1,
        edge: 'drop',
        lineup: FOUNDERS,
      }).state,
    );
    b.phase = 'won';
    for (const u of b.units) if (u.kind === 'enemy') u.hp = 0;
    const before = JSON.stringify(save.profile.city);
    const done = finishEncounter(save.profile, { ...trip, encounter: 4 }, b);
    expect(done.profile.pages).toEqual([...save.profile.pages, 'chiefWarden:mindTheEdge']);
    expect(JSON.stringify(save.profile.city)).toBe(before);
  });
});
